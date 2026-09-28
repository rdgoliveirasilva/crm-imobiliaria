/* =========================================================
   ROTAS DO CORRETOR
   ========================================================= */

const express = require('express');
const { pool } = require('../config/db');
const { autenticar, apenasCorretor } = require('../middlewares/auth');

const router = express.Router();

router.use(autenticar, apenasCorretor);

/* =========================================================
   PRÓXIMO LEAD
   ========================================================= */

router.get('/proximo-lead', async (req, res) => {
    try {
        const corretorId = req.usuario.id;

        const result = await pool.query(`
            SELECT l.*, li.nome AS lista_nome, li.mensagem_whatsapp AS lista_mensagem
            FROM leads l
            LEFT JOIN listas li ON li.id = l.lista_id
            WHERE l.corretor_id = $1 AND l.status = 'novo'
            ORDER BY l.id ASC
            LIMIT 1
        `, [corretorId]);

        res.json({ lead: result.rows[0] || null });

    } catch (err) {
        console.error('[corretor/proximo-lead] erro:', err);
        res.status(500).json({ erro: 'Erro ao buscar lead.' });
    }
});

/* =========================================================
   BUSCAR UM LEAD ESPECÍFICO
   ========================================================= */

router.get('/lead/:id', async (req, res) => {
    try {
        const corretorId = req.usuario.id;
        const leadId = Number(req.params.id);

        const result = await pool.query(`
            SELECT l.*, li.nome AS lista_nome, li.mensagem_whatsapp AS lista_mensagem
            FROM leads l
            LEFT JOIN listas li ON li.id = l.lista_id
            WHERE l.id = $1 AND l.corretor_id = $2
        `, [leadId, corretorId]);

        if (!result.rows.length) {
            return res.status(404).json({ erro: 'Lead não encontrado.' });
        }

        res.json({ lead: result.rows[0] });

    } catch (err) {
        console.error('[corretor/lead] erro:', err);
        res.status(500).json({ erro: 'Erro ao buscar lead.' });
    }
});

/* =========================================================
   REGISTRAR RESULTADO
   ========================================================= */

router.post('/leads/:id/resultado', async (req, res) => {
    const client = await pool.connect();
    try {
        const leadId = Number(req.params.id);
        const corretorId = req.usuario.id;
        const {
            resultado,
            observacao = '',
            agendamento_data = null,
            agendamento_local = null
        } = req.body || {};

        if (!resultado) {
            return res.status(400).json({ erro: 'Informe o resultado.' });
        }

        const TAGS_QUALIFICAM = ['agendado', 'em_atendimento', 'mensagem_enviada', 'retornar_depois'];
        const statusFinal = TAGS_QUALIFICAM.includes(resultado) ? 'qualificado' : 'descartado';

        const precisaAgendamento = ['agendado', 'retornar_depois'].includes(resultado);
        if (precisaAgendamento && !agendamento_data) {
            return res.status(400).json({ erro: 'Informe a data e hora do agendamento.' });
        }

        const leadCheck = await client.query(
            'SELECT id FROM leads WHERE id = $1 AND corretor_id = $2',
            [leadId, corretorId]
        );

        if (!leadCheck.rows.length) {
            return res.status(404).json({ erro: 'Lead não encontrado ou não pertence a você.' });
        }

        await client.query('BEGIN');

        await client.query(`
            UPDATE leads
            SET status = $1,
                resultado = $2,
                observacao = $3,
                agendamento_data = $4,
                agendamento_local = $5,
                decidido_em = NOW()
            WHERE id = $6
        `, [statusFinal, resultado, observacao, agendamento_data, agendamento_local, leadId]);

        await client.query(`
            INSERT INTO historico (lead_id, corretor_id, acao, observacao)
            VALUES ($1, $2, $3, $4)
        `, [leadId, corretorId, resultado, observacao]);

        await client.query('COMMIT');

        res.json({ ok: true, status: statusFinal });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[corretor/resultado] erro:', err);
        res.status(500).json({ erro: 'Erro ao registrar resultado.' });
    } finally {
        client.release();
    }
});

/* =========================================================
   EDITAR QUALIFICAÇÃO
   ========================================================= */

router.patch('/leads/:id/qualificacao', async (req, res) => {
    const client = await pool.connect();
    try {
        const leadId = Number(req.params.id);
        const corretorId = req.usuario.id;
        const { resultado, agendamento_data = null, agendamento_local = null } = req.body || {};

        if (!resultado) {
            return res.status(400).json({ erro: 'Informe a nova qualificação.' });
        }

        const TAGS_VALIDAS = [
            'agendado', 'em_atendimento', 'mensagem_enviada', 'retornar_depois',
            'sem_interesse', 'telefone_invalido'
        ];

        if (!TAGS_VALIDAS.includes(resultado)) {
            return res.status(400).json({ erro: 'Qualificação inválida.' });
        }

        const precisaAgendamento = ['agendado', 'retornar_depois'].includes(resultado);
        if (precisaAgendamento && !agendamento_data) {
            return res.status(400).json({ erro: 'Informe a data e hora do agendamento.' });
        }

        const leadCheck = await client.query(
            `SELECT id FROM leads WHERE id = $1 AND corretor_id = $2 AND status IN ('qualificado', 'descartado')`,
            [leadId, corretorId]
        );

        if (!leadCheck.rows.length) {
            return res.status(404).json({ erro: 'Lead não encontrado ou não está qualificado.' });
        }

        const TAGS_QUALIFICAM = ['agendado', 'em_atendimento', 'mensagem_enviada', 'retornar_depois'];
        const statusFinal = TAGS_QUALIFICAM.includes(resultado) ? 'qualificado' : 'descartado';

        await client.query('BEGIN');

        await client.query(`
            UPDATE leads
            SET resultado = $1,
                status = $2,
                agendamento_data = $3,
                agendamento_local = $4
            WHERE id = $5
        `, [resultado, statusFinal, agendamento_data, agendamento_local, leadId]);

        await client.query(`
            INSERT INTO historico (lead_id, corretor_id, acao, observacao)
            VALUES ($1, $2, $3, $4)
        `, [leadId, corretorId, resultado, `Qualificação alterada para ${resultado}`]);

        await client.query('COMMIT');

        res.json({ ok: true, status: statusFinal, resultado });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[corretor/qualificacao] erro:', err);
        res.status(500).json({ erro: 'Erro ao alterar qualificação.' });
    } finally {
        client.release();
    }
});

/* =========================================================
   ESTATÍSTICAS
   ========================================================= */

router.get('/estatisticas', async (req, res) => {
    try {
        const corretorId = req.usuario.id;
        const listaId = req.query.lista_id ? Number(req.query.lista_id) : null;

        const filtro = listaId ? ' AND lista_id = $2' : '';
        const params = listaId ? [corretorId, listaId] : [corretorId];

        const stats = await pool.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status != 'novo')       AS trabalhados,
                COUNT(*) FILTER (WHERE status = 'novo')        AS restantes,
                COUNT(*) FILTER (WHERE status = 'qualificado') AS qualificados,
                COUNT(*) FILTER (WHERE status = 'descartado')  AS descartados
            FROM leads
            WHERE corretor_id = $1${filtro}
        `, params);

        const s = stats.rows[0];

        const porTagResult = await pool.query(`
            SELECT resultado, COUNT(*) AS count
            FROM leads
            WHERE corretor_id = $1 AND resultado IS NOT NULL${filtro}
            GROUP BY resultado
        `, params);

        const porTag = {};
        porTagResult.rows.forEach(r => porTag[r.resultado] = Number(r.count));

        res.json({
            total: Number(s.total),
            trabalhados: Number(s.trabalhados),
            restantes: Number(s.restantes),
            qualificados: Number(s.qualificados),
            descartados: Number(s.descartados),
            porTag
        });

    } catch (err) {
        console.error('[corretor/estatisticas] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar estatísticas.' });
    }
});

/* =========================================================
   HISTÓRICO — CARTEIRAS
   ========================================================= */

router.get('/historico/carteiras', async (req, res) => {
    try {
        const corretorId = req.usuario.id;

        const result = await pool.query(`
            SELECT
                l.lista_id,
                li.nome AS lista_nome,
                li.criado_em AS lista_criada_em,
                COUNT(l.id) AS total_qualificados,
                MAX(l.decidido_em) AS ultima_atividade
            FROM leads l
            INNER JOIN listas li ON li.id = l.lista_id
            WHERE l.corretor_id = $1
              AND l.status IN ('qualificado', 'descartado')
              AND l.decidido_em IS NOT NULL
            GROUP BY l.lista_id, li.nome, li.criado_em
            ORDER BY ultima_atividade DESC
        `, [corretorId]);

        const carteiras = result.rows.map(c => ({
            ...c,
            total_qualificados: Number(c.total_qualificados)
        }));

        res.json({ carteiras });

    } catch (err) {
        console.error('[corretor/carteiras] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar carteiras.' });
    }
});

/* =========================================================
   HISTÓRICO — LEADS DE UMA CARTEIRA
   ========================================================= */

router.get('/historico/carteiras/:listaId', async (req, res) => {
    try {
        const corretorId = req.usuario.id;
        const listaId = Number(req.params.listaId);
        const busca = (req.query.busca || '').trim().toLowerCase();

        const listaResult = await pool.query(
            'SELECT id, nome, criado_em FROM listas WHERE id = $1',
            [listaId]
        );

        if (!listaResult.rows.length) {
            return res.status(404).json({ erro: 'Carteira não encontrada.' });
        }

        let sql = `
            SELECT id, nome, telefone, resultado, observacao,
                   decidido_em, agendamento_data, agendamento_local, status
            FROM leads
            WHERE corretor_id = $1
              AND lista_id = $2
              AND status IN ('qualificado', 'descartado')
              AND decidido_em IS NOT NULL
        `;
        
        const params = [corretorId, listaId];

        if (busca) {
            sql += ` AND LOWER(nome) LIKE $3`;
            params.push(`%${busca}%`);
        }

        sql += ` ORDER BY decidido_em DESC`;

        const leadsResult = await pool.query(sql, params);

        res.json({
            lista: listaResult.rows[0],
            leads: leadsResult.rows
        });

    } catch (err) {
        console.error('[corretor/carteira] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar carteira.' });
    }
});

/* =========================================================
   AGENDAMENTOS FUTUROS
   ========================================================= */

router.get('/agendamentos', async (req, res) => {
    try {
        const corretorId = req.usuario.id;

        const result = await pool.query(`
            SELECT
                id, nome, telefone, resultado,
                agendamento_data, agendamento_local, observacao
            FROM leads
            WHERE corretor_id = $1
              AND status = 'qualificado'
              AND resultado IN ('agendado', 'retornar_depois')
              AND agendamento_data IS NOT NULL
              AND agendamento_data >= NOW() - INTERVAL '2 hours'
            ORDER BY agendamento_data ASC
        `, [corretorId]);

        res.json({ agendamentos: result.rows });

    } catch (err) {
        console.error('[corretor/agendamentos] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar agendamentos.' });
    }
});

module.exports = router;