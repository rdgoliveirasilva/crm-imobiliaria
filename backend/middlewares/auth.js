/* =========================================================
   MIDDLEWARE DE AUTENTICAÇÃO JWT
   Atualiza "ultimo_acesso" a cada requisição autenticada.
   ========================================================= */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

async function autenticar(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ erro: 'Token não fornecido.' });
    let payload;
    try { payload = jwt.verify(header.substring(7), process.env.JWT_SECRET); }
    catch { return res.status(401).json({ erro: 'Token inválido ou expirado.' }); }
    try {
        const result = await pool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1 AND ativo = TRUE RETURNING id, nome, usuario, tipo', [payload.id]);
        if (!result.rows.length) return res.status(401).json({ erro: 'Usuário inativo ou não encontrado.' });
        req.usuario = result.rows[0];
        next();
    } catch (err) {
        console.error('[auth]', err.message);
        res.status(503).json({ erro: 'Não foi possível validar a sessão.' });
    }
}

function apenasAdmin(req, res, next) {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
    }
    next();
}

function apenasCorretor(req, res, next) {
    if (!req.usuario || (req.usuario.tipo !== 'corretor' && req.usuario.tipo !== 'teste')) {
        return res.status(403).json({ erro: 'Acesso restrito a corretores.' });
    }
    next();
}

module.exports = { autenticar, apenasAdmin, apenasCorretor };