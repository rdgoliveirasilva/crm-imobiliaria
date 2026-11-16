// Sem --apply: apenas conta candidatos. --incluir-trabalhados exige autorização explícita
// para reiniciar também qualificações posteriores à redistribuição.
const { pool } = require('../config/db');
const incluirTrabalhados = process.argv.includes('--incluir-trabalhados');
const candidatos = `
    SELECT l.id, h.corretor_id AS origem
    FROM leads l
    JOIN LATERAL (
        SELECT id, corretor_id, criado_em, observacao FROM historico
        WHERE lead_id = l.id AND acao = 'corretor_inativado'
        ORDER BY criado_em DESC, id DESC LIMIT 1
    ) h ON TRUE
    WHERE l.status <> 'novo'
      AND l.distribuido_em = h.criado_em
      ${incluirTrabalhados ? '' : 'AND (l.decidido_em IS NULL OR l.decidido_em <= h.criado_em)'}
      AND ((l.corretor_id IS NULL AND h.observacao LIKE 'Sem corretor ativo na lista;%')
        OR h.observacao LIKE 'Redistribuído para corretor ' || l.corretor_id || ' por inativação.%')
      ${incluirTrabalhados ? '' : `AND NOT EXISTS (SELECT 1 FROM historico posterior WHERE posterior.lead_id = l.id
          AND (posterior.criado_em > h.criado_em OR (posterior.criado_em = h.criado_em AND posterior.id > h.id)))`}
`;
async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '2s'");
        await client.query("SET LOCAL statement_timeout = '30s'");
        if (!process.argv.includes('--apply')) {
            const result = await client.query(`SELECT count(*)::int AS candidatos FROM (${candidatos}) c`);
            console.log(JSON.stringify(result.rows[0]));
        } else {
            // Bloqueia os clientes selecionados e revalida após adquirir os locks.
            await client.query(`SELECT l.id FROM leads l WHERE l.id IN (SELECT id FROM (${candidatos}) c) FOR UPDATE`);
            await client.query(`CREATE TEMP TABLE fila_reparo ON COMMIT DROP AS ${candidatos}`);
            await client.query(`INSERT INTO historico (lead_id, corretor_id, acao, observacao)
                SELECT l.id, c.origem, 'fila_apos_inativacao',
                    'Correção de redistribuição solicitada pelo gestor; anterior: ' || jsonb_build_object(
                        'corretor_id',l.corretor_id,'observacao',l.observacao,
                        'status',l.status,'resultado',l.resultado,'decidido_em',l.decidido_em,
                        'agendamento_data',l.agendamento_data,'agendamento_local',l.agendamento_local)::text
                FROM leads l JOIN fila_reparo c ON c.id = l.id`);
            const result = await client.query(`UPDATE leads SET status = 'novo', resultado = NULL,
                decidido_em = NULL, agendamento_data = NULL, agendamento_local = NULL, data_reenvio = NULL
                WHERE id IN (SELECT id FROM fila_reparo)`);
            console.log(JSON.stringify({ corrigidos: result.rowCount }));
        }
        await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
