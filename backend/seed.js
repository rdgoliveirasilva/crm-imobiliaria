/* =========================================================
   SEED — cria o admin inicial
   Uso:  npm run seed
         npm run seed:reset -- --sim  (apaga tudo e recria)
   ========================================================= */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Verifica se é pra resetar tudo
const RESET = process.argv.includes('--reset');
const CONFIRMA_RESET = process.argv.includes('--sim');

// Caminho do banco
const dbPath = process.env.DB_PATH
    ? path.resolve(__dirname, process.env.DB_PATH)
    : path.resolve(__dirname, 'database', 'crm.db');

// Se for reset, apaga o banco antes
if (RESET) {
    if (!CONFIRMA_RESET) {
        console.log('');
        console.log('⚠️  Você está prestes a APAGAR TODOS OS DADOS do banco.');
        console.log('   Rode com --sim se tiver certeza:');
        console.log('   npm run seed:reset -- --sim');
        console.log('');
        process.exit(0);
    }

    [dbPath, `${dbPath}-wal`, `${dbPath}-shm`].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    console.log('🗑️  Banco apagado.\n');
}

// Importa o db (que já cria as tabelas se não existirem)
const db = require('./config/db');

// =========================================================
// PROMPT INTERATIVO
// =========================================================

function perguntar(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

// =========================================================
// MAIN
// =========================================================

async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  🔧 SEED — CRM SR Lançamentos');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    // Verifica se já existe algum admin
    const adminExistente = db.prepare("SELECT id, nome, usuario FROM usuarios WHERE tipo = 'admin'").get();

    if (adminExistente) {
        console.log(`ℹ️  Já existe um admin cadastrado:`);
        console.log(`   → Nome:    ${adminExistente.nome}`);
        console.log(`   → Usuário: ${adminExistente.usuario}`);
        console.log('');
        console.log('   Se quiser criar OUTRO admin, preencha abaixo.');
        console.log('   Se quiser sair, aperte Ctrl+C.');
        console.log('');
    } else {
        console.log('Nenhum admin cadastrado ainda.');
        console.log('Vamos criar o primeiro admin do sistema.');
        console.log('');
    }

    // Nome
    const nome = await perguntar('Nome completo do admin: ');
    if (!nome) {
        console.log('❌ Nome é obrigatório. Saindo.');
        process.exit(1);
    }

    // Usuário
    const usuario = (await perguntar('Usuário (ex: admin): ')).toLowerCase().trim();
    if (!usuario || !/^[a-z0-9._-]{3,}$/.test(usuario)) {
        console.log('❌ Usuário inválido. Use 3+ caracteres (letras, números, . _ -).');
        process.exit(1);
    }

    // Verifica duplicado
    const jaExiste = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario);
    if (jaExiste) {
        console.log(`❌ O usuário "${usuario}" já existe. Escolha outro.`);
        process.exit(1);
    }

    // Senha
    const senha = await perguntar('Senha (mínimo 6 caracteres): ');
    if (!senha || senha.length < 6) {
        console.log('❌ Senha muito curta. Mínimo 6 caracteres.');
        process.exit(1);
    }

    const senhaConfirma = await perguntar('Confirme a senha: ');
    if (senha !== senhaConfirma) {
        console.log('❌ As senhas não coincidem.');
        process.exit(1);
    }

    console.log('');
    console.log('Criando admin...');

    const hash = bcrypt.hashSync(senha, 10);

    const info = db.prepare(`
        INSERT INTO usuarios (nome, usuario, senha_hash, tipo)
        VALUES (?, ?, ?, 'admin')
    `).run(nome, usuario, hash);

    const criado = db.prepare('SELECT id, nome, usuario, tipo, criado_em FROM usuarios WHERE id = ?').get(info.lastInsertRowid);

    console.log('');
    console.log('✅ Admin criado com sucesso!');
    console.log('');
    console.log('───────────────────────────────────────────────');
    console.log(`   ID:      ${criado.id}`);
    console.log(`   Nome:    ${criado.nome}`);
    console.log(`   Usuário: ${criado.usuario}`);
    console.log(`   Tipo:    ${criado.tipo}`);
    console.log('───────────────────────────────────────────────');
    console.log('');
    console.log('Guarde essas credenciais. Você vai usar pra logar.');
    console.log('');

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
});