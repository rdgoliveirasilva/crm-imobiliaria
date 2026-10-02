/* =========================================================
   CONEXÃO COM O BANCO DE DADOS (PostgreSQL — Neon)
   ========================================================= */

const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
    console.error('[DB] ❌ DATABASE_URL não encontrada no .env');
    process.exit(1);
}

/* =========================================================
   CORREÇÃO DE TIMEZONE (pg)
   =========================================================
   Por padrão, o driver `pg` interpreta colunas
   `timestamp without time zone` como UTC, o que desloca
   3h na exibição (Brasil = GMT-3).

   Aqui forçamos ele a devolver a string CRUA do Postgres,
   sem conversão. O frontend é quem formata.
   ========================================================= */

const { types } = require('pg');

// OID 1114 = TIMESTAMP WITHOUT TIME ZONE
// OID 1184 = TIMESTAMP WITH TIME ZONE
// Sobrescreve o parser pra devolver a string crua em vez de Date object

types.setTypeParser(1114, (str) => str);   // timestamp without time zone
types.setTypeParser(1184, (str) => str);   // timestamptz (também sem converter)

// Neon exige SSL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
    console.error('[DB] ❌ Erro inesperado no pool do Postgres:', err);
});

// Executa o schema (cria as tabelas se não existirem)
async function inicializarSchema() {
    const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        console.error(`[DB] ❌ schema.sql não encontrado em ${schemaPath}`);
        return;
    }

    try {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(schema);
        console.log('[DB] ✅ Schema aplicado com sucesso.');
    } catch (err) {
        console.error('[DB] ❌ Erro ao aplicar schema:', err.message);
        throw err;
    }
}

console.log('[DB] Pool PostgreSQL criado.');

module.exports = { pool, inicializarSchema };