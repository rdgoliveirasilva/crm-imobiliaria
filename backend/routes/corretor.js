/* =========================================================
   ROTAS DO CORRETOR — CRM SR Lançamentos
   ========================================================= */

const express = require('express');
const { pool } = require('../config/db');
const { autenticar, apenasCorretor } = require('../middlewares/auth');

const router = express.Router();

router.use(autenticar, apenasCorretor);

/* =========================================================
   HELPERS
   ========================================================= */

function limparTimezone(data) {
    if (!data) return null;
    return String(data).replace(/[+-]\d{2}:?\d{2}$|Z$/, '').trim();
}

/* =========================================================
   CONSTANTES
   ========================================================= */

const TAGS_QUALIFICAM = [
    'agendado',
    'em_atendimento',
    'mensagem_enviada',
    'retornar_depois',
    'follow_up',
    'vendido'
];

const TAGS_DESCARTAM = [
    'sem_interesse',
    'telefone_invalido'
];

const TAGS_VALIDAS = [
    ...TAGS_QUALIFICAM,
    ...TAGS_DESCARTAM,
    'sem_resposta'
];

const DIAS_REENVIO = 15;

/* =========================================================
   LAZY CHECK — redistribui leads "sem resposta"
   ========================================================= */

async function reprocessarSemResposta() {
    try {
        const prontos = await pool.query(`
            SELECT id, corretor_id
            FROM leads
            WHERE status = 'sem_resposta'
              AND data_reenvio IS NOT NULL
              AND data_reenvio <= NOW()
        `);

        if (!prontos.rows.length) return;

        for (const lead of prontos.rows) {
            const tentativas = await pool.query(
                'SELECT corretor_id FROM tentativas_corretores WHERE lead_id = $1',
                [lead.id]
            );
            const jaTentaram = new Set(tentativas.rows.map(r => r.corretor_id));
            jaTentaram.add(lead.corretor_id);

            const candidatos = await pool.query(`
                SELECT u.id,
                       COUNT(l.id) FILTER (WHERE l.status = 'novo') AS pendentes
                FROM usuarios u
                LEFT JOIN leads l ON l.corretor_id = u.id
                WHERE u.tipo = 'corretor' AND u.ativo = TRUE
                GROUP BY u.id
                ORDER BY pendentes ASC
            `);

            const elegiveis = candidatos.rows.filter(c => !jaTentaram.has(c.id));

            if (!elegiveis.length) {
                await pool.query(`
                    UPDATE leads
                    SET status = 'descartado',
                        resultado = 'sem_sucesso',
                        decidido_em = NOW(),
                        data_reenvio = NULL
                    WHERE id = $1
                `, [lead.id]);
                console.log(`[lazy-check] lead ${lead.id} → descartado`);
                continue;
            }

            const novoCorretor = elegiveis[0].id;

            await pool.query(`
                INSERT INTO tentativas_corretores (lead_id, corretor_id)
                VALUES ($1, $2)
                ON CONFLICT (lead_id, corretor_id) DO NOTHING
            `, [lead.id, lead.corretor_id]);

            await pool.query(`
                UPDATE leads
                SET status = 'novo',
                    corretor_id = $1,
                    resultado = NULL,
                    decidido_em = NULL,
                    data_reenvio = NULL,
                    distribuido_em = NOW()
                WHERE id = $2
            `, [novoCorretor, lead.id]);

            console.log(`[lazy-check] lead ${lead.id} → redistribuído`);
        }

    } catch (err) {
        console.error('[lazy-check] erro:', err.message);
    }
}

/* =========================================================
   PRÓXIMO LEAD
   ========================================================= */

router.get('/proximo-lead', async (req, res) => {
    try {
        const corretorId = req.usuario.id;
        const listaId = req.query.lista_id ? Number(req.query.lista_id) : null;

        reprocessarSemResposta();

        let query, params;

        if (listaId) {
            query = `
                SELECT l.*, li.nome AS lista_nome, li.mensagem_whatsapp AS lista_mensagem
                FROM leads l
                LEFT JOIN listas li ON li.id = l.lista_id
                WHERE l.corretor_id = $1 AND l.status = 'novo' AND l.lista_id = $2
                ORDER BY l.id ASC
                LIMIT 1
            `;
            params = [corretorId, listaId];
        } else {
            query = `
                SELECT l.*, li.nome AS lista_nome, li.mensagem_whatsapp AS lista_mensagem
                FROM leads l
                LEFT JOIN listas li ON li.id = l.lista_id
                WHERE l.corretor_id = $1 AND l.status = 'novo'
                ORDER BY l.id ASC
                LIMIT 1
            `;
            params = [corretorId];
        }

        const result = await pool.query(query, params);

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
   HISTÓRICO DE UM LEAD
   ========================================================= */

router.get('/lead/:id/historico', async (req, res) => {
    try {
        const corretorId = req.usuario.id;
        const leadId = Number(req.params.id);

        const check = await pool.query(
            'SELECT id FROM leads WHERE id = $1 AND corretor_id = $2',
            [leadId, corretorId]
        );

        if (!check.rows.length) {
            return res.status(404).json({ erro: 'Lead não encontrado.' });
        }

        const result = await pool.query(`
            SELECT id, acao, observacao, criado_em
            FROM historico
            WHERE lead_id = $1
            ORDER BY criado_em DESC
        `, [leadId]);

        res.json({ historico: result.rows });

    } catch (err) {
        console.error('[corretor/lead-historico] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar histórico.' });
    }
});

/* =========================================================
   LEADS POR STATUS/TAG — alimenta o modal dos KPIs
   Regras:
   - trabalhados       → status != 'novo'
   - em_atendimento    → resultado IN ('em_atendimento','agendado')
   - follow_up         → resultado IN ('mensagem_enviada','retornar_depois','follow_up')
   - na_fila           → status = 'novo'
   - mensagens_enviadas→ tem 'mensagem_enviada' no histórico
   ========================================================= */

router.get('/leads-por-status', async (req, res) => {
    try {
        const corretorId = req.usuario.id;
        const status = String(req.query.status || '').trim();
        const listaId = req.query.lista_id ? Number(req.query.lista_id) : null;

        if (!status) {
            return res.status(400).json({ erro: 'Informe o status.' });
        }

        const params = [corretorId];
        let sql = `
            SELECT
                l.id,
                l.nome,
                l.telefone,
                l.status,
                l.resultado,
                l.observacao,
                l.decidido_em,
                l.agendamento_data,
                l.agendamento_local,
                l.lista_id,
                li.nome AS lista_nome
            FROM leads l
            LEFT JOIN listas li ON li.id = l.lista_id
            WHERE l.corretor_id = $1
        `;

        switch (status) {
            case 'trabalhados':
                sql += ` AND l.status != 'novo'`;
                break;

            case 'em_atendimento':
                sql += ` AND l.resultado IN ('em_atendimento', 'agendado')`;
                break;

            case 'follow_up':
                // Só quem está com a TAG follow_up
                sql += ` AND l.resultado = 'follow_up'`;
                break;

            case 'mensagens_enviadas':
                // Só quem está com a TAG mensagem_enviada
                sql += ` AND l.resultado = 'mensagem_enviada'`;
                break;

            case 'retornar_depois':
                sql += ` AND l.resultado = 'retornar_depois'`;
                break;

            case 'na_fila':
                sql += ` AND l.status = 'novo'`;
                break;

            default:
                params.push(status);
                sql += ` AND l.resultado = $${params.length}`;
        }

        if (listaId) {
            params.push(listaId);
            sql += ` AND l.lista_id = $${params.length}`;
        }

        sql += ` ORDER BY l.decidido_em DESC NULLS LAST, l.id DESC`;

        const result = await pool.query(sql, params);

        res.json({
            status,
            total: result.rows.length,
            leads: result.rows
        });

    } catch (err) {
        console.error('[corretor/leads-por-status] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar leads.' });
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

        if (!TAGS_VALIDAS.includes(resultado)) {
            return res.status(400).json({ erro: 'Qualificação inválida.' });
        }

        const precisaAgendamento = ['agendado', 'retornar_depois'].includes(resultado);
        if (precisaAgendamento && !agendamento_data) {
            return res.status(400).json({ erro: 'Informe a data e hora do agendamento.' });
        }

        const agendamentoLimpo = limparTimezone(agendamento_data);

        const leadCheck = await client.query(
            'SELECT id FROM leads WHERE id = $1 AND corretor_id = $2',
            [leadId, corretorId]
        );

        if (!leadCheck.rows.length) {
            return res.status(404).json({ erro: 'Lead não encontrado ou não pertence a você.' });
        }

        let statusFinal;
        let dataReenvio = null;

        if (resultado === 'sem_resposta') {
            statusFinal = 'sem_resposta';
            dataReenvio = new Date();
            dataReenvio.setDate(dataReenvio.getDate() + DIAS_REENVIO);
        } else if (TAGS_QUALIFICAM.includes(resultado)) {
            statusFinal = 'qualificado';
        } else {
            statusFinal = 'descartado';
        }

        await client.query('BEGIN');

        await client.query(`
            UPDATE leads
            SET status = $1,
                resultado = $2,
                observacao = $3,
                agendamento_data = $4,
                agendamento_local = $5,
                data_reenvio = $6,
                decidido_em = NOW()
            WHERE id = $7
        `, [statusFinal, resultado, observacao, agendamentoLimpo, agendamento_local, dataReenvio, leadId]);

        await client.query(`
            INSERT INTO historico (lead_id, corretor_id, acao, observacao)
            VALUES ($1, $2, $3, $4)
        `, [leadId, corretorId, resultado, observacao]);

        if (resultado === 'sem_resposta') {
            await client.query(`
                INSERT INTO tentativas_corretores (lead_id, corretor_id)
                VALUES ($1, $2)
                ON CONFLICT (lead_id, corretor_id) DO NOTHING
            `, [leadId, corretorId]);
        }

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

        if (!TAGS_VALIDAS.includes(resultado)) {
            return res.status(400).json({ erro: 'Qualificação inválida.' });
        }

        const precisaAgendamento = ['agendado', 'retornar_depois'].includes(resultado);
        if (precisaAgendamento && !agendamento_data) {
            return res.status(400).json({ erro: 'Informe a data e hora do agendamento.' });
        }

        const agendamentoLimpo = limparTimezone(agendamento_data);

        const leadCheck = await client.query(
            `SELECT id FROM leads WHERE id = $1 AND corretor_id = $2 AND status IN ('qualificado', 'descartado', 'sem_resposta')`,
            [leadId, corretorId]
        );

        if (!leadCheck.rows.length) {
            return res.status(404).json({ erro: 'Lead não encontrado ou não está qualificado.' });
        }

        let statusFinal;
        let dataReenvio = null;

        if (resultado === 'sem_resposta') {
            statusFinal = 'sem_resposta';
            dataReenvio = new Date();
            dataReenvio.setDate(dataReenvio.getDate() + DIAS_REENVIO);
        } else if (TAGS_QUALIFICAM.includes(resultado)) {
            statusFinal = 'qualificado';
        } else {
            statusFinal = 'descartado';
        }

        await client.query('BEGIN');

        await client.query(`
            UPDATE leads
            SET resultado = $1,
                status = $2,
                agendamento_data = $3,
                agendamento_local = $4,
                data_reenvio = $5
            WHERE id = $6
        `, [resultado, statusFinal, agendamentoLimpo, agendamento_local, dataReenvio, leadId]);

        await client.query(`
            INSERT INTO historico (lead_id, corretor_id, acao, observacao)
            VALUES ($1, $2, $3, $4)
        `, [leadId, corretorId, resultado, `Qualificação alterada para ${resultado}`]);

        if (resultado === 'sem_resposta') {
            await client.query(`
                INSERT INTO tentativas_corretores (lead_id, corretor_id)
                VALUES ($1, $2)
                ON CONFLICT (lead_id, corretor_id) DO NOTHING
            `, [leadId, corretorId]);
        }

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
   MINHAS CARTEIRAS
   ========================================================= */

router.get('/minhas-carteiras', async (req, res) => {
    try {
        const corretorId = req.usuario.id;

        const result = await pool.query(`
            SELECT
                li.id,
                li.nome,
                li.criado_em,
                COUNT(l.id) AS total,
                COUNT(l.id) FILTER (WHERE l.status != 'novo') AS trabalhados,
                COUNT(l.id) FILTER (WHERE l.status = 'novo')  AS restantes
            FROM listas li
            INNER JOIN leads l ON l.lista_id = li.id AND l.corretor_id = $1
            GROUP BY li.id, li.nome, li.criado_em
            ORDER BY li.criado_em ASC
        `, [corretorId]);

        const carteiras = result.rows.map(c => {
            const total = Number(c.total);
            const trabalhados = Number(c.trabalhados);
            const restantes = Number(c.restantes);

            return {
                id: c.id,
                nome: c.nome,
                criado_em: c.criado_em,
                total,
                trabalhados,
                restantes,
                concluida: restantes === 0
            };
        });

        res.json({ carteiras });

    } catch (err) {
        console.error('[corretor/minhas-carteiras] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar carteiras.' });
    }
});

/* =========================================================
   ESTATÍSTICAS — KPIs direto do estado atual do lead
   Regras:
   - trabalhados        = status != 'novo'
   - na_fila            = status = 'novo'
   - em_atendimento     = resultado IN ('em_atendimento','agendado')
   - follow_up          = resultado = 'follow_up'
   - mensagens_enviadas = resultado = 'mensagem_enviada'
   - retornar_depois    = resultado = 'retornar_depois'
   ========================================================= */

router.get('/estatisticas', async (req, res) => {
    try {
        const corretorId = req.usuario.id;
        const listaId = req.query.lista_id ? Number(req.query.lista_id) : null;

        const filtro = listaId ? ' AND lista_id = $2' : '';
        const params = listaId ? [corretorId, listaId] : [corretorId];

        /* =========================================================
           1) Totais de leads
           ========================================================= */
        const stats = await pool.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status != 'novo')       AS trabalhados,
                COUNT(*) FILTER (WHERE status = 'novo')        AS na_fila,
                COUNT(*) FILTER (WHERE status = 'descartado')  AS descartados
            FROM leads
            WHERE corretor_id = $1${filtro}
        `, params);

        const s = stats.rows[0];

        const trabalhados = Number(s.trabalhados) || 0;
        const total       = Number(s.total) || 0;
        const naFila      = Number(s.na_fila) || 0;
        const descartados = Number(s.descartados) || 0;

        /* =========================================================
           2) porTag — estado ATUAL de cada lead
              (cada lead tem UM resultado só, sem somar nada)
           ========================================================= */
        const porTagResult = await pool.query(`
            SELECT resultado, COUNT(*) AS count
            FROM leads
            WHERE corretor_id = $1 AND resultado IS NOT NULL${filtro}
            GROUP BY resultado
        `, params);

        const porTag = {};
        porTagResult.rows.forEach(r => {
            porTag[r.resultado] = Number(r.count);
        });

        /* =========================================================
           3) KPIs — cada um pega SUA tag direto, sem somar
           ========================================================= */
        const emAtendimento     = (porTag.em_atendimento || 0) + (porTag.agendado || 0);
        const followUp          = porTag.follow_up || 0;
        const mensagensEnviadas = porTag.mensagem_enviada || 0;
        const retornarDepois    = porTag.retornar_depois || 0;

        /* =========================================================
           4) Requalificações — total de eventos no histórico
              (mantém pra você saber quantas ações foram feitas)
           ========================================================= */
        const paramsHist = listaId ? [corretorId, listaId] : [corretorId];
        const filtroHist = listaId
            ? 'AND h.lead_id IN (SELECT id FROM leads WHERE lista_id = $2)'
            : '';

        const eventosResult = await pool.query(`
            SELECT COUNT(*) AS count
            FROM historico h
            WHERE h.corretor_id = $1
              ${filtroHist}
        `, paramsHist);

        const totalEventos = Number(eventosResult.rows[0].count) || 0;
        const requalificacoes = Math.max(0, totalEventos - trabalhados);

        /* =========================================================
           5) Tempo médio de requalificação
           ========================================================= */
        const tempoMedioResult = await pool.query(`
            SELECT AVG(EXTRACT(EPOCH FROM (h2.criado_em - h1.criado_em)) / 3600) AS horas
            FROM historico h1
            INNER JOIN historico h2
                ON h2.lead_id = h1.lead_id
               AND h2.criado_em > h1.criado_em
               AND h2.acao != 'mensagem_enviada'
            WHERE h1.acao = 'mensagem_enviada'
              AND h1.corretor_id = $1
              ${listaId ? 'AND h1.lead_id IN (SELECT id FROM leads WHERE lista_id = $2)' : ''}
        `, paramsHist);

        const tempoMedioRequalificacao = Number(tempoMedioResult.rows[0].horas) || 0;

        /* =========================================================
           RESPOSTA
           ========================================================= */
        res.json({
            // Totais
            total,
            trabalhados,
            qualificados: trabalhados,
            restantes: naFila,
            na_fila: naFila,
            descartados,

            // KPIs do dashboard — cada um direto da sua tag
            em_atendimento: emAtendimento,
            follow_up: followUp,
            mensagens_enviadas: mensagensEnviadas,
            retornar_depois: retornarDepois,

            // Detalhamento por tag (estado atual)
            porTag,

            // Info extra
            totalEventos,
            requalificacoes,
            tempoMedioRequalificacao
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
              AND l.status IN ('qualificado', 'descartado', 'sem_resposta')
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
              AND status IN ('qualificado', 'descartado', 'sem_resposta')
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