/* =========================================================
   ROTAS DO ADMINISTRADOR
   ========================================================= */

const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = express.Router();

// Todas as rotas aqui exigem login de admin
router.use(autenticar, apenasAdmin);

/* =========================================================
   CORRETORES
   ========================================================= */

// GET /api/admin/corretores
router.get('/corretores', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.nome, u.usuario, u.criado_em,
                   (SELECT COUNT(*) FROM leads WHERE corretor_id = u.id) AS total_leads
            FROM usuarios u
            WHERE u.tipo = 'corretor'
            ORDER BY u.nome ASC
        `);

        const corretores = result.rows.map(c => ({
            ...c,
            total_leads: Number(c.total_leads)
        }));

        res.json({ corretores });

    } catch (err) {
        console.error('[admin/corretores] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar corretores.' });
    }
});

// POST /api/admin/corretores
router.post('/corretores', async (req, res) => {
    try {
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

        const existe = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuarioLimpo]);
        if (existe.rows.length) {
            return res.status(409).json({ erro: 'Este usuário já está cadastrado.' });
        }

        const hash = bcrypt.hashSync(senha, 10);

        const result = await pool.query(`
            INSERT INTO usuarios (nome, usuario, senha_hash, tipo)
            VALUES ($1, $2, $3, 'corretor')
            RETURNING id, nome, usuario, criado_em
        `, [nome.trim(), usuarioLimpo, hash]);

        res.status(201).json({ corretor: result.rows[0] });

    } catch (err) {
        console.error('[admin/corretores POST] erro:', err);
        res.status(500).json({ erro: 'Erro ao cadastrar corretor.' });
    }
});

// DELETE /api/admin/corretores/:id
router.delete('/corretores/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const exist = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1 AND tipo = $2',
            [id, 'corretor']
        );

        if (!exist.rows.length) {
            return res.status(404).json({ erro: 'Corretor não encontrado.' });
        }

        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ ok: true });

    } catch (err) {
        console.error('[admin/corretores DELETE] erro:', err);
        res.status(500).json({ erro: 'Erro ao excluir corretor.' });
    }
});

/* =========================================================
   LISTAS
   ========================================================= */

// GET /api/admin/listas
router.get('/listas', async (req, res) => {
    try {
        const listasResult = await pool.query('SELECT * FROM listas ORDER BY criado_em DESC');

        const comStats = [];
        for (const lista of listasResult.rows) {
            const stats = await pool.query(`
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'qualificado') AS qualificados,
                    COUNT(*) FILTER (WHERE status = 'descartado')  AS descartados,
                    COUNT(*) FILTER (WHERE status = 'novo')        AS aguardando
                FROM leads
                WHERE lista_id = $1
            `, [lista.id]);

            const corretores = await pool.query(`
                SELECT DISTINCT u.id, u.nome, u.usuario
                FROM usuarios u
                INNER JOIN leads l ON l.corretor_id = u.id
                WHERE l.lista_id = $1
                ORDER BY u.nome ASC
            `, [lista.id]);

            const s = stats.rows[0];

            comStats.push({
                ...lista,
                total: Number(s.total),
                qualificados: Number(s.qualificados),
                descartados: Number(s.descartados),
                aguardando: Number(s.aguardando),
                corretores: corretores.rows
            });
        }

        res.json({ listas: comStats });

    } catch (err) {
        console.error('[admin/listas] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar listas.' });
    }
});

// POST /api/admin/listas — subir e distribuir
router.post('/listas', async (req, res) => {
    const client = await pool.connect();
    try {
        const { nome, contatos, corretoresIds, mensagemWhatsapp } = req.body || {};

        if (!nome || !Array.isArray(contatos) || !contatos.length) {
            return res.status(400).json({ erro: 'Informe o nome da lista e pelo menos 1 contato.' });
        }

        if (!Array.isArray(corretoresIds) || !corretoresIds.length) {
            return res.status(400).json({ erro: 'Selecione pelo menos 1 corretor.' });
        }

        const placeholders = corretoresIds.map((_, i) => `$${i + 1}`).join(',');
        const corretoresValidos = await client.query(
            `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo = 'corretor'`,
            corretoresIds
        );

        if (corretoresValidos.rows.length !== corretoresIds.length) {
            return res.status(400).json({ erro: 'Um ou mais corretores não existem.' });
        }

        const idsValidos = corretoresValidos.rows.map(c => c.id);

        // Embaralha
        const embaralhados = [...contatos];
        for (let i = embaralhados.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
        }

        await client.query('BEGIN');

        const listaResult = await client.query(
            'INSERT INTO listas (nome, total, mensagem_whatsapp) VALUES ($1, $2, $3) RETURNING id',
            [nome.trim(), contatos.length, mensagemWhatsapp || null]
        );
        const listaId = listaResult.rows[0].id;

        const distribuicao = {};
        idsValidos.forEach(id => distribuicao[id] = 0);

        let idx = 0;
        for (const contato of embaralhados) {
            const corretorId = idsValidos[idx % idsValidos.length];
            await client.query(`
                INSERT INTO leads (lista_id, nome, telefone, corretor_id, status, distribuido_em)
                VALUES ($1, $2, $3, $4, 'novo', NOW())
            `, [listaId, contato.nome, contato.telefone, corretorId]);
            distribuicao[corretorId]++;
            idx++;
        }

        await client.query('COMMIT');

        res.status(201).json({
            ok: true,
            listaId,
            total: contatos.length,
            distribuicao
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[admin/listas POST] erro:', err);
        res.status(500).json({ erro: 'Erro ao subir lista.' });
    } finally {
        client.release();
    }
});

// GET /api/admin/listas/:id/contatos
router.get('/listas/:id/contatos', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const result = await pool.query(`
            SELECT l.*, u.nome AS corretor_nome
            FROM leads l
            LEFT JOIN usuarios u ON u.id = l.corretor_id
            WHERE l.lista_id = $1
            ORDER BY l.id ASC
        `, [id]);

        res.json({ contatos: result.rows });

    } catch (err) {
        console.error('[admin/listas contatos] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar contatos.' });
    }
});

// DELETE /api/admin/listas/:id
router.delete('/listas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await pool.query('DELETE FROM listas WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[admin/listas DELETE] erro:', err);
        res.status(500).json({ erro: 'Erro ao excluir lista.' });
    }
});

// DELETE /api/admin/leads/:id
router.delete('/leads/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await pool.query('DELETE FROM leads WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[admin/leads DELETE] erro:', err);
        res.status(500).json({ erro: 'Erro ao excluir lead.' });
    }
});

/* =========================================================
   DASHBOARD
   ========================================================= */

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const totais = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM listas) AS total_listas,
                (SELECT COUNT(*) FROM leads) AS total_contatos,
                (SELECT COUNT(*) FROM leads WHERE status = 'qualificado') AS qualificados,
                (SELECT COUNT(*) FROM leads WHERE status = 'descartado')  AS descartados,
                (SELECT COUNT(*) FROM leads WHERE status = 'novo')        AS aguardando
        `);

        const t = totais.rows[0];

        const porCorretor = await pool.query(`
            SELECT
                u.id, u.nome, u.usuario,
                COUNT(l.id) AS total,
                COUNT(l.id) FILTER (WHERE l.status = 'qualificado') AS qualificados,
                COUNT(l.id) FILTER (WHERE l.status = 'descartado')  AS descartados,
                COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS aguardando
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo = 'corretor'
            GROUP BY u.id
            ORDER BY u.nome ASC
        `);

        const porTag = await pool.query(`
            SELECT resultado, COUNT(*) AS count
            FROM leads
            WHERE resultado IS NOT NULL
            GROUP BY resultado
        `);

        const porTagObj = {};
        porTag.rows.forEach(r => porTagObj[r.resultado] = Number(r.count));

        res.json({
            totalListas: Number(t.total_listas),
            totalContatos: Number(t.total_contatos),
            qualificados: Number(t.qualificados),
            descartados: Number(t.descartados),
            aguardando: Number(t.aguardando),
            porCorretor: porCorretor.rows.map(c => ({
                ...c,
                total: Number(c.total),
                qualificados: Number(c.qualificados),
                descartados: Number(c.descartados),
                aguardando: Number(c.aguardando)
            })),
            porTag: porTagObj
        });

    } catch (err) {
        console.error('[admin/dashboard] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar dashboard.' });
    }
});

/* =========================================================
   DASHBOARD — CARTEIRAS E CORRETORES
   ========================================================= */

// GET /api/admin/dashboard/carteiras
router.get('/dashboard/carteiras', async (req, res) => {
    try {
        /* ------------------------------------------
           1. Corretores + status online/ausente/offline
        ------------------------------------------ */

        const corretoresResult = await pool.query(`
            SELECT
                u.id,
                u.nome,
                u.usuario,
                u.ultimo_acesso,
                COUNT(l.id) FILTER (WHERE l.status = 'qualificado') AS total_qualificados,
                COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS total_fila,
                COUNT(l.id) AS total_carteira
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo = 'corretor'
            GROUP BY u.id
            ORDER BY u.nome ASC
        `);

        const agora = Date.now();

        const corretoresResumo = corretoresResult.rows.map(c => {
            let status = 'offline';

            if (c.ultimo_acesso) {
                const diffMin = Math.floor((agora - new Date(c.ultimo_acesso).getTime()) / 60000);

                if (diffMin <= 14) status = 'online';
                else if (diffMin <= 19) status = 'ausente';
                else status = 'offline';
            }

            return {
                id: c.id,
                nome: c.nome,
                usuario: c.usuario,
                status,
                ultimo_acesso: c.ultimo_acesso,
                total_qualificados: Number(c.total_qualificados),
                total_fila: Number(c.total_fila),
                total_carteira: Number(c.total_carteira)
            };
        });

        /* ------------------------------------------
           2. Carteiras (listas) + desempenho por corretor
        ------------------------------------------ */

        const listasResult = await pool.query(`
            SELECT id, nome, total, criado_em
            FROM listas
            ORDER BY criado_em DESC
        `);

        const carteiras = [];

        for (const lista of listasResult.rows) {
            // Corretores que participam dessa lista, com desempenho
            const porCorretorResult = await pool.query(`
                SELECT
                    u.id,
                    u.nome,
                    u.usuario,
                    COUNT(l.id) AS recebeu,
                    COUNT(l.id) FILTER (WHERE l.status = 'qualificado') AS qualificou,
                    COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS fila,
                    COUNT(l.id) FILTER (WHERE l.status = 'descartado')  AS descartou
                FROM usuarios u
                INNER JOIN leads l ON l.corretor_id = u.id
                WHERE l.lista_id = $1
                GROUP BY u.id
                ORDER BY u.nome ASC
            `, [lista.id]);

            carteiras.push({
                lista_id: lista.id,
                nome: lista.nome,
                total: lista.total,
                criado_em: lista.criado_em,
                corretores: porCorretorResult.rows.map(c => ({
                    id: c.id,
                    nome: c.nome,
                    usuario: c.usuario,
                    recebeu: Number(c.recebeu),
                    qualificou: Number(c.qualificou),
                    fila: Number(c.fila),
                    descartou: Number(c.descartou)
                }))
            });
        }

        res.json({ corretoresResumo, carteiras });

    } catch (err) {
        console.error('[admin/dashboard/carteiras] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar carteiras.' });
    }
});

module.exports = router;