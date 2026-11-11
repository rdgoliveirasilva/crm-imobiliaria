const { pool } = require('../config/db');

async function validarCorretoresAtivos(client, ids) {
    // Serializa a distribuição com alterações de atividade.
    await client.query('LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE');
    const result = await client.query("SELECT id FROM usuarios WHERE id = ANY($1::int[]) AND ativo = TRUE AND tipo IN ('corretor', 'teste')", [ids]);
    if (result.rows.length !== new Set(ids.map(Number)).size) {
        const error = new Error('Selecione apenas corretores ativos.');
        error.status = 400;
        throw error;
    }
}

async function alterarAtividade(id, ativo) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE');
        const user = await client.query("SELECT id, ativo FROM usuarios WHERE id = $1 AND tipo IN ('corretor', 'teste') FOR UPDATE", [id]);
        if (!user.rows.length) { const e = new Error('Corretor não encontrado.'); e.status = 404; throw e; }
        let redistribuidos = 0, orfaos = 0;
        if (user.rows[0].ativo !== ativo) {
            await client.query('UPDATE usuarios SET ativo = $2, ultimo_acesso = NULL WHERE id = $1', [id, ativo]);
            if (!ativo) {
                await client.query('DELETE FROM lista_corretores WHERE corretor_id = $1', [id]);
                // Congela também o reenvio futuro dos clientes preservados.
                await client.query("UPDATE leads SET data_reenvio = NULL WHERE corretor_id = $1 AND (resultado IN ('sem_interesse', 'sem_resposta') OR status = 'sem_resposta')", [id]);
                const leads = await client.query("SELECT id, lista_id FROM leads WHERE corretor_id = $1 AND COALESCE(resultado, '') NOT IN ('sem_interesse', 'sem_resposta') AND status <> 'sem_resposta' ORDER BY lista_id, id FOR UPDATE", [id]);
                const carteiras = new Map();
                for (const lead of leads.rows) {
                    if (!carteiras.has(lead.lista_id)) carteiras.set(lead.lista_id, []);
                    carteiras.get(lead.lista_id).push(lead.id);
                }
                for (const [listaId, leadIds] of carteiras) {
                    const recipients = await client.query("SELECT u.id FROM lista_corretores lc JOIN usuarios u ON u.id = lc.corretor_id WHERE lc.lista_id = $1 AND u.ativo = TRUE AND u.tipo IN ('corretor', 'teste') ORDER BY u.id", [listaId]);
                    const ids = recipients.rows.map(r => r.id);
                    const destinos = leadIds.map((_, index) => ids.length ? ids[index % ids.length] : null);
                    await client.query(`UPDATE leads SET corretor_id = destino.corretor_id, distribuido_em = NOW()
                        FROM unnest($1::int[], $2::int[]) AS destino(lead_id, corretor_id)
                        WHERE leads.id = destino.lead_id`, [leadIds, destinos]);
                    await client.query(`INSERT INTO historico (lead_id, corretor_id, acao, observacao)
                        SELECT lead_id, $3, 'corretor_inativado', CASE WHEN corretor_id IS NULL
                            THEN 'Sem corretor ativo na lista; cliente órfão.'
                            ELSE 'Redistribuído para corretor ' || corretor_id || ' por inativação.' END
                        FROM unnest($1::int[], $2::int[]) AS destino(lead_id, corretor_id)`, [leadIds, destinos, id]);
                    if (ids.length) redistribuidos += leadIds.length; else orfaos += leadIds.length;
                }
            }
        }
        await client.query('COMMIT');
        return { ok: true, ativo, redistribuidos, orfaos };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
}
module.exports = { alterarAtividade, validarCorretoresAtivos };
