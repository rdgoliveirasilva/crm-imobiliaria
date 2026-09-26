/* =========================================================
   ROTAS DO CORRETOR
   ========================================================= */

const express = require('express');
const db = require('../config/db');
const { autenticar, apenasCorretor } = require('../middlewares/auth');

const router = express.Router();

// Todas as rotas aqui exigem login de corretor
router.use(autenticar, apenasCorretor);

/* =========================================================
   PRÓXIMO LEAD
   ========================================================= */

// GET /api/corretor/proximo-lead
router.get('/proximo-lead', (req, res) => {
    const corretorId = req.usuario.id;

    const lead = db.prepare(`
        SELECT * FROM leads
        WHERE corretor_id = ? AND status = 'novo'
        ORDER BY id ASC
        LIMIT 1
    `).get(corretorId);

    res.json({ lead: lead || null });
});

/* =========================================================
   REGISTRAR RESULTADO
   ========================================================= */

// POST /api/corretor/leads/:id/resultado
router.post('/leads/:id/resultado', (req, res) => {
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

    // Se for agendado ou retornar_depois, exige data/hora
    const precisaAgendamento = ['agendado', 'retornar_depois'].includes(resultado);
    if (precisaAgendamento && !agendamento_data) {
        return res.status(400).json({ erro: 'Informe a data e hora do agendamento.' });
    }

    const lead = db.prepare('SELECT id FROM leads WHERE id = ? AND corretor_id = ?').get(leadId, corretorId);
    if (!lead) {
        return res.status(404).json({ erro: 'Lead não encontrado ou não pertence a você.' });
    }

    const tx = db.transaction(() => {
        db.prepare(`
            UPDATE leads
            SET status = ?,
                resultado = ?,
                observacao = ?,
                agendamento_data = ?,
                agendamento_local = ?,
                decidido_em = datetime('now', 'localtime')
            WHERE id = ?
        `).run(statusFinal, resultado, observacao, agendamento_data, agendamento_local, leadId);

        db.prepare(`
            INSERT INTO historico (lead_id, corretor_id, acao, observacao)
            VALUES (?, ?, ?, ?)
        `).run(leadId, corretorId, resultado, observacao);
    });

    tx();

    res.json({ ok: true, status: statusFinal });
});

/* =========================================================
   EDITAR QUALIFICAÇÃO (trocar a tag de um lead já qualificado)
   ========================================================= */

// PATCH /api/corretor/leads/:id/qualificacao
router.patch('/leads/:id/qualificacao', (req, res) => {
    const leadId = Number(req.params.id);
    const corretorId = req.usuario.id;
    const {
        resultado,
        agendamento_data = null,
        agendamento_local = null
    } = req.body || {};

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

    // Se for agendado ou retornar_depois, exige data/hora
    const precisaAgendamento = ['agendado', 'retornar_depois'].includes(resultado);
    if (precisaAgendamento && !agendamento_data) {
        return res.status(400).json({ erro: 'Informe a data e hora do agendamento.' });
    }

    const lead = db.prepare(`
        SELECT id, status FROM leads
        WHERE id = ? AND corretor_id = ? AND status = 'qualificado'
    `).get(leadId, corretorId);

    if (!lead) {
        return res.status(404).json({ erro: 'Lead não encontrado ou não está qualificado.' });
    }

    const TAGS_QUALIFICAM = ['agendado', 'em_atendimento', 'mensagem_enviada', 'retornar_depois'];
    const statusFinal = TAGS_QUALIFICAM.includes(resultado) ? 'qualificado' : 'descartado';

    const tx = db.transaction(() => {
        db.prepare(`
            UPDATE leads
            SET resultado = ?,
                status = ?,
                agendamento_data = ?,
                agendamento_local = ?
            WHERE id = ?
        `).run(resultado, statusFinal, agendamento_data, agendamento_local, leadId);

        db.prepare(`
            INSERT INTO historico (lead_id, corretor_id, acao, observacao)
            VALUES (?, ?, ?, ?)
        `).run(leadId, corretorId, resultado, `Qualificação alterada para ${resultado}`);
    });

    tx();

    res.json({ ok: true, status: statusFinal, resultado });
});

/* =========================================================
   ESTATÍSTICAS (agora com filtro por lista)
   ========================================================= */

// GET /api/corretor/estatisticas?lista_id=X
router.get('/estatisticas', (req, res) => {
    const corretorId = req.usuario.id;
    const listaId = req.query.lista_id ? Number(req.query.lista_id) : null;

    // Monta o filtro opcional por lista
    const filtroLista = listaId ? ' AND lista_id = ?' : '';
    const paramsBase = listaId ? [corretorId, listaId] : [corretorId];

    const total        = db.prepare(`SELECT COUNT(*) AS c FROM leads WHERE corretor_id = ?${filtroLista}`).get(...paramsBase).c;
    const trabalhados  = db.prepare(`SELECT COUNT(*) AS c FROM leads WHERE corretor_id = ? AND status != 'novo'${filtroLista}`).get(...paramsBase).c;
    const restantes    = db.prepare(`SELECT COUNT(*) AS c FROM leads WHERE corretor_id = ? AND status = 'novo'${filtroLista}`).get(...paramsBase).c;
    const qualificados = db.prepare(`SELECT COUNT(*) AS c FROM leads WHERE corretor_id = ? AND status = 'qualificado'${filtroLista}`).get(...paramsBase).c;
    const descartados  = db.prepare(`SELECT COUNT(*) AS c FROM leads WHERE corretor_id = ? AND status = 'descartado'${filtroLista}`).get(...paramsBase).c;

    const porTagRows = db.prepare(`
        SELECT resultado, COUNT(*) AS count
        FROM leads
        WHERE corretor_id = ? AND resultado IS NOT NULL${filtroLista}
        GROUP BY resultado
    `).all(...paramsBase);

    const porTag = {};
    porTagRows.forEach(r => porTag[r.resultado] = r.count);

    res.json({ total, trabalhados, restantes, qualificados, descartados, porTag });
});

/* =========================================================
   HISTÓRICO — NÍVEL 1: lista de carteiras
   ========================================================= */

// GET /api/corretor/historico/carteiras
router.get('/historico/carteiras', (req, res) => {
    const corretorId = req.usuario.id;

    const carteiras = db.prepare(`
        SELECT
            l.lista_id,
            li.nome AS lista_nome,
            li.criado_em AS lista_criada_em,
            COUNT(l.id) AS total_qualificados,
            MAX(l.decidido_em) AS ultima_atividade
        FROM leads l
        INNER JOIN listas li ON li.id = l.lista_id
        WHERE l.corretor_id = ?
          AND l.status = 'qualificado'
          AND l.decidido_em IS NOT NULL
        GROUP BY l.lista_id
        ORDER BY ultima_atividade DESC
    `).all(corretorId);

    res.json({ carteiras });
});

/* =========================================================
   HISTÓRICO — NÍVEL 2: leads de uma carteira específica
   ========================================================= */

// GET /api/corretor/historico/carteiras/:listaId?busca=joao
router.get('/historico/carteiras/:listaId', (req, res) => {
    const corretorId = req.usuario.id;
    const listaId = Number(req.params.listaId);
    const busca = (req.query.busca || '').trim().toLowerCase();

    // Info da lista
    const lista = db.prepare('SELECT id, nome, criado_em FROM listas WHERE id = ?').get(listaId);

    if (!lista) {
        return res.status(404).json({ erro: 'Carteira não encontrada.' });
    }

    // Leads qualificados dessa carteira
    let sql = `
        SELECT id, nome, telefone, resultado, observacao, decidido_em
        FROM leads
        WHERE corretor_id = ?
          AND lista_id = ?
          AND status = 'qualificado'
          AND decidido_em IS NOT NULL
    `;
    const params = [corretorId, listaId];

    if (busca) {
        sql += ` AND LOWER(nome) LIKE ?`;
        params.push(`%${busca}%`);
    }

    sql += ` ORDER BY decidido_em DESC`;

    const leads = db.prepare(sql).all(...params);

    res.json({ lista, leads });
});

/* =========================================================
   AGENDAMENTOS FUTUROS (pra notificações)
   ========================================================= */

// GET /api/corretor/agendamentos
router.get('/agendamentos', (req, res) => {
    const corretorId = req.usuario.id;

    const agendamentos = db.prepare(`
        SELECT
            id,
            nome,
            telefone,
            resultado,
            agendamento_data,
            agendamento_local,
            observacao
        FROM leads
        WHERE corretor_id = ?
          AND status = 'qualificado'
          AND resultado IN ('agendado', 'retornar_depois')
          AND agendamento_data IS NOT NULL
          AND agendamento_data >= datetime('now', 'localtime')
        ORDER BY agendamento_data ASC
    `).all(corretorId);

    res.json({ agendamentos });
});

/* =========================================================
   BUSCAR UM LEAD ESPECÍFICO (usado ao clicar numa notificação)
   ========================================================= */

// GET /api/corretor/lead/:id
router.get('/lead/:id', (req, res) => {
    const corretorId = req.usuario.id;
    const leadId = Number(req.params.id);

    const lead = db.prepare(`
        SELECT
            l.*,
            li.nome AS lista_nome
        FROM leads l
        LEFT JOIN listas li ON li.id = l.lista_id
        WHERE l.id = ? AND l.corretor_id = ?
    `).get(leadId, corretorId);

    if (!lead) {
        return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    res.json({ lead });
});

module.exports = router;