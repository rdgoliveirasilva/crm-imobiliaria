// Gera segredos localmente sem imprimi-los ou substituir uma instalação existente.
const { randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const target = join(__dirname, '.env');
try {
    writeFileSync(target, `OPENWA_API_KEY=${randomBytes(32).toString('hex')}\nOPENWA_KEY_PEPPER=${randomBytes(32).toString('hex')}\nOPENWA_DOMAIN=\n`, { flag:'wx', mode:0o600 });
    console.log('Credenciais geradas em deploy/openwa/.env. Configure o domínio e guarde este arquivo com segurança.');
} catch (error) {
    if (error.code === 'EEXIST') { console.error('O arquivo .env já existe. Nenhuma credencial foi alterada.'); process.exitCode = 1; }
    else throw error;
}
