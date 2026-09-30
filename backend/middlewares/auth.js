/* =========================================================
   MIDDLEWARE DE AUTENTICAÇÃO JWT
   Atualiza "ultimo_acesso" a cada requisição autenticada.
   ========================================================= */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

function autenticar(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ erro: 'Token não fornecido.' });
    }

    const token = authHeader.substring(7);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;

        pool.query(
            'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1',
            [payload.id]
        ).catch(err => {
            console.error('[auth] erro ao atualizar ultimo_acesso:', err.message);
        });

        next();
    } catch (err) {
        return res.status(401).json({ erro: 'Token inválido ou expirado.' });
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