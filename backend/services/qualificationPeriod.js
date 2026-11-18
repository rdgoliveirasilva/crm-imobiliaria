// Compartilhado entre distribuição e drill-down: data da classificação atual.
function qualificationPeriod(query, params) {
    const { de, ate } = query;
    const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number(value.slice(0,4)) >= 1 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
    if ((de && !valid(de)) || (ate && !valid(ate)) || (de && ate && de > ate)) {
        const error = new Error('Informe um período válido, com início anterior ou igual ao fim.');
        error.status = 400; throw error;
    }
    let sql = '';
    if (de) { params.push(de); sql += ` AND l.decidido_em >= $${params.length}::date`; }
    if (ate) { params.push(ate); sql += ` AND l.decidido_em < ($${params.length}::date + INTERVAL '1 day')`; }
    return sql;
}
module.exports = { qualificationPeriod };
