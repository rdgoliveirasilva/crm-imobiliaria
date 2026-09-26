/* =========================================================
   SERVIDOR EXPRESS — CRM SR Lançamentos
   ========================================================= */

const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { inicializarSchema } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const t = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${t}] ${req.method} ${req.url}`);
    next();
});

app.use('/api', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/corretor', require('./routes/corretor'));

app.get('/api/health', (req, res) => {
    res.json({ ok: true, hora: new Date().toISOString() });
});

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('[ERRO]', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;

async function iniciar() {
    try {
        await inicializarSchema();

        app.listen(PORT, () => {
            console.log('');
            console.log('═══════════════════════════════════════════════');
            console.log(`  🚀 CRM SR Lançamentos rodando!`);
            console.log(`  → Servidor:  http://localhost:${PORT}`);
            console.log('═══════════════════════════════════════════════');
            console.log('');
        });

    } catch (err) {
        console.error('❌ Erro ao iniciar:', err);
        process.exit(1);
    }
}

iniciar();