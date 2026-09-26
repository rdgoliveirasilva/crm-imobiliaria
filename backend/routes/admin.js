/* =========================================================
   ROTAS DO ADMINISTRADOR
   ========================================================= */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = express.Router();

// Todas as rotas aqui exigem login de admin
router.use(autenticar, apenasAdmin);

/* =========================================================
   UTILS
   ========================================================= */

function embaralhar(arr) {
    const copia = [...arr];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/* =========================================================
   CORRETORES
   ========================================================= */

// GET /api/admin/corretores
router.get('/corretores', (req, res) => {
    const corretores = db.prepare(`
        SELECT id, nome, usuario, criado_em,
               (SELECT COUNT(*) FROM leads WHERE corretor_id = usuarios.id) AS total_leads
        FROM usuarios
        WHERE tipo = 'corretor'
        ORDER BY nome ASC
    `).all();

    res.json({ corretores });
});

// POST /api/admin/corretores
router.post('/corretores', (req, res) => {
    const { nome, usuario, senha } = req.body || {};

    if (!nome || !usuario || !senha) {
        return res.status(400).json({ erro: 'Informe nome, usuário e senha.' });
    }

    const usuarioLimpo = usuario.toLowerCase().trim();

    if (!/^[a-z0-9._-]{3,}$/.test(usuarioLimpo)) {
        return res.status(400).json({ erro: 'Usuário inválido. Use 3+ caracteres (letras, números, . _ -).' });
    }

    if (senha.length < 4) {
        return res.status(400).json({ erro: 'Senha muito curta (mínimo 4 caracteres).' });
    }

    const existe = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuarioLimpo);
    if (existe) {
        return res.status(409).json({ erro: 'Este usuário já está cadastrado.' });
    }

    const hash = bcrypt.hashSync(senha, 10);

    const info = db.prepare(`
        INSERT INTO usuarios (nome, usuario, senha_hash, tipo)
        VALUES (?, ?, ?, 'corretor')
    `).run(nome.trim(), usuarioLimpo, hash);

    const novo = db.prepare('SELECT id, nome, usuario, criado_em FROM usuarios WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ corretor: novo });
});

// DELETE /api/admin/corretores/:id
router.delete('/corretores/:id', (req, res) => {
    const id = Number(req.params.id);
    const corretor = db.prepare('SELECT id FROM usuarios WHERE id = ? AND tipo = ?').get(id, 'corretor');

    if (!corretor) {
        return res.status(404).json({ erro: 'Corretor não encontrado.' });
    }

    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
    res.json({ ok: true });
});

/* =========================================================
   LISTAS — CRUD
   ========================================================= */

// GET /api/admin/listas — listar com stats
router.get('/listas', (req, res) => {
    const listas = db.prepare('SELECT * FROM listas ORDER BY criado_em DESC').all();

    const comStats = listas.map(lista => {
        const total        = db.prepare('SELECT COUNT(*) AS c FROM leads WHERE lista_id = ?').get(lista.id).c;
        const qualificados = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE lista_id = ? AND status = 'qualificado'").get(lista.id).c;
        const aguardando   = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE lista_id = ? AND status = 'novo'").get(lista.id).c;
        const descartados  = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE lista_id = ? AND status = 'descartado'").get(lista.id).c;

        // Corretores que fazem parte dessa lista
        const corretores = db.prepare(`
            SELECT DISTINCT u.id, u.nome, u.usuario
            FROM usuarios u
            INNER JOIN leads l ON l.corretor_id = u.id
            WHERE l.lista_id = ?
            ORDER BY u.nome ASC
        `).all(lista.id);

        return { ...lista, total, qualificados, aguardando, descartados, corretores };
    });

    res.json({ listas: comStats });
});

// POST /api/admin/listas — subir e distribuir
router.post('/listas', (req, res) => {
    const { nome, contatos, corretoresIds } = req.body || {};

    if (!nome || !contatos || !Array.isArray(contatos) || !contatos.length) {
        return res.status(400).json({ erro: 'Informe o nome da lista e pelo menos 1 contato.' });
    }

    if (!Array.isArray(corretoresIds) || !corretoresIds.length) {
        return res.status(400).json({ erro: 'Selecione pelo menos 1 corretor.' });
    }

    // Valida que os corretores existem
    const placeholders = corretoresIds.map(() => '?').join(',');
    const corretoresValidos = db.prepare(`
        SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo = 'corretor'
    `).all(...corretoresIds);

    if (corretoresValidos.length !== corretoresIds.length) {
        return res.status(400).json({ erro: 'Um ou mais corretores não existem.' });
    }

    const idsValidos = corretoresValidos.map(c => c.id);
    const contatosEmbaralhados = embaralhar(contatos);

    const tx = db.transaction(() => {
        // Cria a lista
        const listaInfo = db.prepare('INSERT INTO listas (nome, total) VALUES (?, ?)').run(nome.trim(), contatos.length);
        const listaId = listaInfo.lastInsertRowid;

        // Distribui em rodadas
        const insertLead = db.prepare(`
            INSERT INTO leads (lista_id, nome, telefone, corretor_id, status, distribuido_em)
            VALUES (?, ?, ?, ?, 'novo', datetime('now', 'localtime'))
        `);

        const distribuicao = {};
        idsValidos.forEach(id => distribuicao[id] = 0);

        let idx = 0;
        for (const contato of contatosEmbaralhados) {
            const corretorId = idsValidos[idx % idsValidos.length];
            insertLead.run(listaId, contato.nome, contato.telefone, corretorId);
            distribuicao[corretorId]++;
            idx++;
        }

        return { listaId, distribuicao };
    });

    const { listaId, distribuicao } = tx();

    res.status(201).json({
        ok: true,
        listaId,
        total: contatos.length,
        distribuicao
    });
});

// GET /api/admin/listas/:id/contatos
router.get('/listas/:id/contatos', (req, res) => {
    const id = Number(req.params.id);

    const contatos = db.prepare(`
        SELECT l.*, u.nome AS corretor_nome
        FROM leads l
        LEFT JOIN usuarios u ON u.id = l.corretor_id
        WHERE l.lista_id = ?
        ORDER BY l.id ASC
    `).all(id);

    res.json({ contatos });
});

// DELETE /api/admin/listas/:id
router.delete('/listas/:id', (req, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM listas WHERE id = ?').run(id);
    res.json({ ok: true });
});

// DELETE /api/admin/leads/:id
router.delete('/leads/:id', (req, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    res.json({ ok: true });
});

/* =========================================================
   DASHBOARD
   ========================================================= */

// GET /api/admin/dashboard
router.get('/dashboard', (req, res) => {
    const totalListas    = db.prepare('SELECT COUNT(*) AS c FROM listas').get().c;
    const totalContatos  = db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
    const qualificados   = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE status = 'qualificado'").get().c;
    const descartados    = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE status = 'descartado'").get().c;
    const aguardando     = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE status = 'novo'").get().c;

    const porCorretor = db.prepare(`
        SELECT u.id, u.nome, u.usuario,
               COUNT(l.id) AS total,
               SUM(CASE WHEN l.status = 'qualificado' THEN 1 ELSE 0 END) AS qualificados,
               SUM(CASE WHEN l.status = 'descartado' THEN 1 ELSE 0 END) AS descartados,
               SUM(CASE WHEN l.status = 'novo' THEN 1 ELSE 0 END) AS aguardando
        FROM usuarios u
        LEFT JOIN leads l ON l.corretor_id = u.id
        WHERE u.tipo = 'corretor'
        GROUP BY u.id
        ORDER BY u.nome ASC
    `).all();

    const porTagRows = db.prepare(`
        SELECT resultado, COUNT(*) AS count
        FROM leads
        WHERE resultado IS NOT NULL
        GROUP BY resultado
    `).all();

    const porTag = {};
    porTagRows.forEach(t => porTag[t.resultado] = t.count);

    res.json({
        totalListas,
        totalContatos,
        qualificados,
        descartados,
        aguardando,
        porCorretor,
        porTag
    });
});

module.exports = router;