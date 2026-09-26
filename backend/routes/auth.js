/* =========================================================
   ROTAS DE AUTENTICAÇÃO
   ========================================================= */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();

/**
 * POST /api/login
 */
router.post('/login', async (req, res) => {
    try {
        const { usuario, senha } = req.body || {};

        if (!usuario || !senha) {
            return res.status(400).json({ erro: 'Informe usuário e senha.' });
        }

        const result = await pool.query(
            'SELECT * FROM usuarios WHERE usuario = $1 AND ativo = TRUE',
            [usuario.toLowerCase().trim()]
        );

        const user = result.rows[0];

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

    } catch (err) {
        console.error('[auth/login] erro:', err);
        res.status(500).json({ erro: 'Erro no servidor.' });
    }
});

/**
 * GET /api/me
 */
router.get('/me', require('../middlewares/auth').autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
});

module.exports = router;