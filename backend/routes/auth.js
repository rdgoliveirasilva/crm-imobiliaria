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

/**
 * PUT /api/me — Atualiza dados do usuário logado
 */
router.put('/me', require('../middlewares/auth').autenticar, async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { nome } = req.body || {};

        if (!nome || nome.trim().length < 3) {
            return res.status(400).json({ erro: 'Informe o nome completo (mínimo 3 caracteres).' });
        }

        const result = await pool.query(
            'UPDATE usuarios SET nome = $1 WHERE id = $2 RETURNING id, nome, usuario, tipo',
            [nome.trim(), userId]
        );

        res.json({ usuario: result.rows[0] });

    } catch (err) {
        console.error('[auth/me PUT] erro:', err);
        res.status(500).json({ erro: 'Erro ao atualizar dados.' });
    }
});

/**
 * PUT /api/me/senha — Altera senha do usuário logado
 */
router.put('/me/senha', require('../middlewares/auth').autenticar, async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { senhaAtual, senhaNova } = req.body || {};

        if (!senhaAtual || !senhaNova) {
            return res.status(400).json({ erro: 'Informe senha atual e nova senha.' });
        }

        if (senhaNova.length < 4) {
            return res.status(400).json({ erro: 'A nova senha precisa ter no mínimo 4 caracteres.' });
        }

        const result = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [userId]);
        if (!result.rows.length) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        const senhaCorreta = bcrypt.compareSync(senhaAtual, result.rows[0].senha_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Senha atual incorreta.' });
        }

        const hash = bcrypt.hashSync(senhaNova, 10);
        await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [hash, userId]);

        res.json({ ok: true });

    } catch (err) {
        console.error('[auth/me/senha PUT] erro:', err);
        res.status(500).json({ erro: 'Erro ao alterar senha.' });
    }
});

module.exports = router;