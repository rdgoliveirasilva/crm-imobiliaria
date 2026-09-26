/* =========================================================
   MIDDLEWARE DE AUTENTICAÇÃO JWT
   ========================================================= */

const jwt = require('jsonwebtoken');
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
    if (!req.usuario || req.usuario.tipo !== 'corretor') {
        return res.status(403).json({ erro: 'Acesso restrito a corretores.' });
    }
    next();
}

module.exports = { autenticar, apenasAdmin, apenasCorretor };