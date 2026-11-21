const VALID = new Set(['ligacao', 'whatsapp', 'qualificacao']);
async function registrarEvento(pool, corretorId, body = {}) {
    const { evento_id, lead_id, tipo } = body;
    if (!VALID.has(tipo) || !Number.isSafeInteger(lead_id) || lead_id < 1 || typeof evento_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(evento_id)) {
        const error = new Error('Evento inválido.'); error.status = 400; throw error;
    }
    const result = await pool.query(`INSERT INTO eventos_contato (evento_id, corretor_id, lead_id, tipo)
        SELECT $1, $2, l.id, $4 FROM leads l JOIN listas li ON li.id = l.lista_id
        WHERE l.id = $3 AND l.corretor_id = $2 AND li.inativa_manual = FALSE
        ON CONFLICT (evento_id) DO NOTHING RETURNING id`, [evento_id, corretorId, lead_id, tipo]);
    if (!result.rows.length) {
        const existing = await pool.query('SELECT id FROM eventos_contato WHERE evento_id = $1 AND corretor_id = $2 AND lead_id = $3 AND tipo = $4', [evento_id, corretorId, lead_id, tipo]);
        if (!existing.rows.length) { const error = new Error('Contato indisponível para este corretor.'); error.status = 404; throw error; }
    }
}
const EVENTOS = `WITH eventos AS (
    SELECT e.*, u.nome AS corretor_nome, fim.proximo_tipo, fim.proxima_data
    FROM eventos_contato e JOIN usuarios u ON u.id = e.corretor_id
    LEFT JOIN LATERAL (
        SELECT c.tipo AS proximo_tipo, c.criado_em AS proxima_data
        FROM eventos_contato c
        WHERE c.corretor_id = e.corretor_id AND (c.criado_em,c.id) > (e.criado_em,e.id)
            AND c.tipo IN ('whatsapp','qualificacao')
        ORDER BY c.criado_em,c.id LIMIT 1
    ) fim ON e.tipo = 'ligacao'
    WHERE u.tipo = 'corretor' AND e.criado_em >= (((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date)::timestamp AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '29 days'
)`;
async function carregarAtividade(pool, pagina = 1) {
    if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000) { const error = new Error('Página inválida.'); error.status = 400; throw error; }
    const metrics = await pool.query(`${EVENTOS}, dias AS (
        SELECT corretor_id, (criado_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            COUNT(DISTINCT lead_id) AS contatos FROM eventos WHERE tipo IN ('ligacao','whatsapp') GROUP BY 1,2
    ) SELECT (SELECT AVG(contatos) FROM dias) AS media_contatos_dia,
        COUNT(*) FILTER (WHERE tipo = 'ligacao')::int AS total_ligacoes,
        COUNT(*) FILTER (WHERE tipo = 'ligacao' AND proximo_tipo IN ('whatsapp','qualificacao'))::int AS ligacoes_finalizadas,
        AVG(EXTRACT(EPOCH FROM proxima_data - criado_em)) FILTER (WHERE tipo = 'ligacao' AND proximo_tipo IN ('whatsapp','qualificacao')) AS media_ligacao_segundos
        FROM eventos`);
    const requal = await pool.query(`WITH ordenado AS (
        SELECT h.*, ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY criado_em, id) AS ordem
        FROM historico h WHERE acao IN ('agendado','em_atendimento','mensagem_enviada','retornar_depois','follow_up','vendido','sem_interesse','telefone_invalido','sem_resposta')
    ), intervalos AS (
        SELECT h.*, LAG(h.criado_em) OVER (PARTITION BY corretor_id,h.criado_em::date ORDER BY h.criado_em,h.id) AS anterior,
            LAG(h.lead_id) OVER (PARTITION BY corretor_id,h.criado_em::date ORDER BY h.criado_em,h.id) AS lead_anterior
        FROM ordenado h JOIN usuarios u ON u.id = h.corretor_id
        WHERE h.ordem > 1 AND u.tipo = 'corretor' AND h.criado_em >= CURRENT_DATE - INTERVAL '29 days'
    ) SELECT AVG(EXTRACT(EPOCH FROM criado_em - anterior)) FILTER (WHERE lead_id != lead_anterior) AS segundos,
        COUNT(*) FILTER (WHERE lead_id != lead_anterior)::int AS amostras FROM intervalos`);
    const total = Number(metrics.rows[0].total_ligacoes);
    const paginas = Math.max(1, Math.ceil(total / 5)); const atual = Math.min(pagina, paginas);
    const log = await pool.query(`${EVENTOS} SELECT e.id, e.corretor_nome, l.nome AS contato_nome, e.criado_em,
        CASE WHEN e.proximo_tipo IN ('whatsapp','qualificacao') THEN EXTRACT(EPOCH FROM e.proxima_data - e.criado_em) END AS segundos,
        e.proximo_tipo AS encerramento
        FROM eventos e JOIN leads l ON l.id = e.lead_id WHERE e.tipo = 'ligacao'
        ORDER BY e.criado_em DESC, e.id DESC LIMIT 5 OFFSET $1`, [(atual - 1) * 5]);
    const porCorretor = await pool.query(`${EVENTOS} SELECT corretor_id, corretor_nome, COUNT(*)::int AS cliques FROM eventos WHERE tipo = 'ligacao' GROUP BY 1,2 ORDER BY cliques DESC,corretor_nome`);
    const number = value => value === null || value === undefined ? null : Number(value);
    return { periodoDias:30, totalLigacoes:total, ligacoesFinalizadas:Number(metrics.rows[0].ligacoes_finalizadas),
        mediaContatosDia:number(metrics.rows[0].media_contatos_dia), mediaLigacaoSegundos:number(metrics.rows[0].media_ligacao_segundos),
        mediaRequalificacaoSegundos:number(requal.rows[0].segundos), amostrasRequalificacao:Number(requal.rows[0].amostras),
        pagina:atual, paginas, log:log.rows, porCorretor:porCorretor.rows };
}
module.exports = { registrarEvento, carregarAtividade };
