/* =========================================================
   CONEXÃO COM O BANCO DE DADOS (SQLite)
   ========================================================= */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Caminho do banco
const dbPath = process.env.DB_PATH
    ? path.resolve(__dirname, '..', process.env.DB_PATH)
    : path.resolve(__dirname, '..', 'database', 'crm.db');

// Garante que a pasta "database" existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Abre conexão
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Executa o schema (cria tabelas se não existirem)
const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
}

console.log(`[DB] SQLite conectado em: ${dbPath}`);

module.exports = db;