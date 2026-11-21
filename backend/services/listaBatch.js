// Uma gravação por lote dentro da transação existente, preservando a ordem de atribuição.
async function atualizarResponsaveis(client, atribuicoes) {
    if (!atribuicoes.length) return;
    await client.query(`UPDATE leads l SET corretor_id = a.corretor_id
        FROM UNNEST($1::int[], $2::int[]) AS a(id, corretor_id)
        WHERE l.id = a.id`, [atribuicoes.map(a => a[0]), atribuicoes.map(a => a[1])]);
}
module.exports = { atualizarResponsaveis };
