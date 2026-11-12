// Mesma definição de primeira qualificação/requalificação do gráfico do admin.
// O calendário segue CURRENT_DATE e criado_em::date, como o relatório existente.
const SQL_EVOLUCAO = `
    WITH base AS (
        SELECT id FROM leads WHERE corretor_id = $1
            AND ($2::int IS NULL OR lista_id = $2)
    ), eventos AS (
        SELECT h.*, ROW_NUMBER() OVER (
            PARTITION BY h.lead_id ORDER BY h.criado_em, h.id
        ) AS ordem
        FROM historico h INNER JOIN base b ON b.id = h.lead_id
        WHERE h.acao IN ('agendado', 'em_atendimento', 'mensagem_enviada',
            'retornar_depois', 'follow_up', 'vendido', 'sem_interesse',
            'telefone_invalido', 'sem_resposta')
    ), dias AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS dia
    )
    SELECT d.dia::text AS dia,
        COUNT(h.id) FILTER (WHERE h.ordem = 1 AND h.acao NOT IN ('sem_interesse', 'telefone_invalido', 'sem_resposta')) AS qualificados,
        COUNT(h.id) FILTER (WHERE h.ordem = 1 AND h.acao IN ('sem_interesse', 'telefone_invalido', 'sem_resposta')) AS descartados,
        COUNT(h.id) FILTER (WHERE h.ordem > 1) AS requalificados,
        COUNT(DISTINCT h.lead_id) FILTER (WHERE h.acao = 'mensagem_enviada') AS mensagens
    FROM dias d LEFT JOIN eventos h ON h.criado_em::date = d.dia AND h.corretor_id = $1
    GROUP BY d.dia ORDER BY d.dia
`;

function montarEvolucao(rows) {
    const mensagens = rows.map(r => Number(r.mensagens) || 0);
    const hoje = mensagens.at(-1) || 0;
    const ontem = mensagens.at(-2) || 0;
    return {
        labels: rows.map(r => `${r.dia.slice(8, 10)}/${r.dia.slice(5, 7)}`),
        qualificados: rows.map(r => Number(r.qualificados) || 0),
        descartados: rows.map(r => Number(r.descartados) || 0),
        requalificados: rows.map(r => Number(r.requalificados) || 0),
        mensagens,
        comparacao: { hoje, ontem, diferenca: hoje - ontem,
            percentual: ontem > 0 ? Math.round((hoje - ontem) / ontem * 1000) / 10 : null }
    };
}

async function carregarEvolucao(pool, corretorId, listaId) {
    const { rows } = await pool.query(SQL_EVOLUCAO, [corretorId, listaId]);
    return montarEvolucao(rows);
}

module.exports = { carregarEvolucao, montarEvolucao };
