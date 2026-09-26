/* =========================================================
   SERVIDOR EXPRESS — CRM SR Lançamentos
   ========================================================= */

const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// =========================================================
// MIDDLEWARES
// =========================================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log
app.use((req, res, next) => {
    const t = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${t}] ${req.method} ${req.url}`);
    next();
});

// =========================================================
// ROTAS DA API
// =========================================================

app.use('/api', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/corretor', require('./routes/corretor'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ ok: true, hora: new Date().toISOString() });
});

// =========================================================
// FRONT-END (arquivos estáticos)
// =========================================================

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Fallback: qualquer rota não-API serve o index.html
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// =========================================================
// ERROR HANDLER
// =========================================================

app.use((err, req, res, next) => {
    console.error('[ERRO]', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// =========================================================
// START
// =========================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log(`  🚀 CRM SR Lançamentos rodando!`);
    console.log(`  → Servidor:  http://localhost:${PORT}`);
    console.log(`  → API:       http://localhost:${PORT}/api/health`);
    console.log(`  → Login:     http://localhost:${PORT}/index.html`);
    console.log(`  → Admin:     http://localhost:${PORT}/admin.html`);
    console.log('═══════════════════════════════════════════════');
    console.log('');
});