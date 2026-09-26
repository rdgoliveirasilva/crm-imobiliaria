/* =========================================================
   ROTAS DE AUTENTICAÇÃO
   ========================================================= */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

/**
 * POST /api/login
 * Body: { usuario, senha }
 */
router.post('/login', (req, res) => {
    const { usuario, senha } = req.body || {};

    if (!usuario || !senha) {
        return res.status(400).json({ erro: 'Informe usuário e senha.' });
    }

    const user = db
        .prepare('SELECT * FROM usuarios WHERE usuario = ? AND ativo = 1')
        .get(usuario.toLowerCase().trim());

    if (!user) {
        return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    const senhaCorreta = bcrypt.compareSync(senha, user.senha_hash);
    if (!senhaCorreta) {
        return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    const payload = {
        id: user.id,
        nome: user.nome,
        usuario: user.usuario,
        tipo: user.tipo
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({ token, usuario: payload });
});

/**
 * GET /api/me
 * Retorna dados do usuário logado.
 */
router.get('/me', require('../middlewares/auth').autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
});

module.exports = router;