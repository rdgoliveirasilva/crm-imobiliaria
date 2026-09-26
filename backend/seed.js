/* =========================================================
   SEED — cria o admin inicial (Postgres)
   Uso: npm run seed
   ========================================================= */

const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { pool, inicializarSchema } = require('./config/db');

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

async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  🔧 SEED — CRM SR Lançamentos');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    // Garante que o schema está aplicado
    await inicializarSchema();

    const adminExistente = await pool.query(
        "SELECT id, nome, usuario FROM usuarios WHERE tipo = 'admin' LIMIT 1"
    );

    if (adminExistente.rows.length) {
        const a = adminExistente.rows[0];
        console.log(`ℹ️  Já existe um admin cadastrado:`);
        console.log(`   → Nome:    ${a.nome}`);
        console.log(`   → Usuário: ${a.usuario}`);
        console.log('');
        console.log('   Se quiser criar OUTRO admin, preencha abaixo.');
        console.log('   Se quiser sair, aperte Ctrl+C.');
        console.log('');
    } else {
        console.log('Nenhum admin cadastrado ainda.');
        console.log('Vamos criar o primeiro admin do sistema.');
        console.log('');
    }

    const nome = await perguntar('Nome completo do admin: ');
    if (!nome) {
        console.log('❌ Nome é obrigatório. Saindo.');
        process.exit(1);
    }

    const usuario = (await perguntar('Usuário (ex: admin): ')).toLowerCase().trim();
    if (!usuario || !/^[a-z0-9._-]{3,}$/.test(usuario)) {
        console.log('❌ Usuário inválido. Use 3+ caracteres (letras, números, . _ -).');
        process.exit(1);
    }

    const jaExiste = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario]);
    if (jaExiste.rows.length) {
        console.log(`❌ O usuário "${usuario}" já existe. Escolha outro.`);
        process.exit(1);
    }

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

    const result = await pool.query(`
        INSERT INTO usuarios (nome, usuario, senha_hash, tipo)
        VALUES ($1, $2, $3, 'admin')
        RETURNING id, nome, usuario, tipo
    `, [nome, usuario, hash]);

    const criado = result.rows[0];

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

    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
});