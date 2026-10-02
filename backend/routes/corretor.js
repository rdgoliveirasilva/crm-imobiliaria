/* =========================================================
   ROTAS DO CORRETOR
   ========================================================= */

const express = require('express');
const { pool } = require('../config/db');
const { autenticar, apenasCorretor } = require('../middlewares/auth');

const router = express.Router();

router.use(autenticar, apenasCorretor);

/* =========================================================
   HELPERS
   ========================================================= */

/**
 * Remove o timezone de uma string de data.
 * A coluna `agendamento_data` é `timestamp without time zone`,
 * então o Postgres converte o "-03:00" pra UTC ao salvar, o que
 * desloca a hora em 3h. Removendo o timezone aqui, salvamos a
 * hora "crua" que o corretor digitou.
 *
 * Aceita:
 *   "2026-11-09 10:50:00-03:00"  → "2026-11-09 10:50:00"
 *   "2026-11-09T10:50:00.000Z"   → "2026-11-09T10:50:00.000"
 *   "2026-11-09 10:50:00"        → "2026-11-09 10:50:00" (sem alteração)
 */
function limparTimezone(data) {
    if (!data) return null;
    return String(data).replace(/[+-]\d{2}:?\d{2}$|Z$/, '').trim();
}

/* =========================================================
   CONSTANTES
   ========================================================= */

// Tags que qualificam (o lead fica na carteira do corretor)
const TAGS_QUALIFICAM = [
    'agendado',
    'em_atendimento',
    'mensagem_enviada',
    'retornar_depois',
    'follow_up',
    'vendido'
];

// Tags que descartam (o lead sai da carteira)
const TAGS_DESCARTAM = [
    'sem_interesse',
    'telefone_invalido'
];

// Tags válidas
const TAGS_VALIDAS = [
    ...TAGS_QUALIFICAM,
    ...TAGS_DESCARTAM,
    'sem_resposta'
];

// Dias pra redistribuir um lead "sem resposta"
const DIAS_REENVIO = 15;

/* =========================================================
   LAZY CHECK — redistribui leads "sem resposta"
   Roda em background, sem bloquear a resposta
   ========================================================= */

async function reprocessarSemResposta() {
    try {
        // 1. Busca leads "sem_resposta" prontos pra redistribuir
        const prontos = await pool.query(`
            SELECT id, corretor_id
            FROM leads
            WHERE status = 'sem_resposta'
              AND data_reenvio IS NOT NULL
              AND data_reenvio <= NOW()
        `);

        if (!prontos.rows.length) return;

        for (const lead of prontos.rows) {
            // 2. Descobre quem já tentou
            const tentativas = await pool.query(
                'SELECT corretor_id FROM tentativas_corretores WHERE lead_id = $1',
                [lead.id]
            );
            const jaTentaram = new Set(tentativas.rows.map(r => r.corretor_id));
            jaTentaram.add(lead.corretor_id); // inclui o corretor atual

            // 3. Busca corretores que NÃO tentaram ainda, ordenados por menos pendentes
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
                // Ninguém mais pode tentar → descarta automaticamente
                await pool.query(`
    UPDATE leads
    SET status = 'descartado',
        resultado = 'sem_sucesso',
        decidido_em = NOW() AT TIME ZONE 'America/Sao_Paulo',
        data_reenvio = NULL
    WHERE id = $1
`, [lead.id]);

                console.log(`[lazy-check] lead ${lead.id} → descartado (todos já tentaram)`);
                continue;
            }

            // 4. Escolhe o candidato com menos pendentes (primeiro da lista)
            const novoCorretor = elegiveis[0].id;

            // 5. Registra a tentativa do corretor atual antes de remover
            await pool.query(`
                INSERT INTO tentativas_corretores (lead_id, corretor_id)
                VALUES ($1, $2)
                ON CONFLICT (lead_id, corretor_id) DO NOTHING
            `, [lead.id, lead.corretor_id]);

            // 6. Redistribui pro novo corretor
            await pool.query(`
    UPDATE leads
    SET status = 'novo',
        corretor_id = $1,
        resultado = NULL,
        decidido_em = NULL,
        data_reenvio = NULL,
        distribuido_em = NOW() AT TIME ZONE 'America/Sao_Paulo'
    WHERE id = $2
`, [novoCorretor, lead.id]);

            console.log(`[lazy-check] lead ${lead.id} → redistribuído do corretor ${lead.corretor_id} pro ${novoCorretor}`);
        }

    } catch (err) {
        console.error('[lazy-check] erro:', err.message);
    }
}

/* =========================================================
   PRÓXIMO LEAD
   ========================================================= */

// GET /api/corretor/proximo-lead
router.get('/proximo-lead', async (req, res) => {
    try {
        const corretorId = req.usuario.id;

        // 🔄 Lazy check em background (não bloqueia a resposta)
        reprocessarSemResposta();

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

// GET /api/corretor/lead/:id
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
   REGISTRAR RESULTADO (do lead ativo)
   ========================================================= */

// POST /api/corretor/leads/:id/resultado
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

        // ✅ Remove o timezone pra não deslocar 3h (coluna é timestamp without time zone)
        const agendamentoLimpo = limparTimezone(agendamento_data);

        // Verifica se o lead pertence ao corretor
        const leadCheck = await client.query(
            'SELECT id FROM leads WHERE id = $1 AND corretor_id = $2',
            [leadId, corretorId]
        );

        if (!leadCheck.rows.length) {
            return res.status(404).json({ erro: 'Lead não encontrado ou não pertence a você.' });
        }

        // 🔀 Define status final
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

        // Atualiza o lead
        await client.query(`
    UPDATE leads
    SET status = $1,
        resultado = $2,
        observacao = $3,
        agendamento_data = $4,
        agendamento_local = $5,
        data_reenvio = $6,
        decidido_em = NOW() AT TIME ZONE 'America/Sao_Paulo'
    WHERE id = $7
`, [statusFinal, resultado, observacao, agendamentoLimpo, agendamento_local, dataReenvio, leadId]);

        // Registra no histórico
        await client.query(`
            INSERT INTO historico (lead_id, corretor_id, acao, observacao)
            VALUES ($1, $2, $3, $4)
        `, [leadId, corretorId, resultado, observacao]);

        // Se foi "sem resposta", registra a tentativa
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
   EDITAR QUALIFICAÇÃO (do histórico)
   ========================================================= */

// PATCH /api/corretor/leads/:id/qualificacao
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

        // ✅ Remove o timezone pra não deslocar 3h (coluna é timestamp without time zone)
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