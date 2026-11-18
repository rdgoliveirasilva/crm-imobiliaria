const test = require('node:test');
const assert = require('node:assert/strict');
const { qualificationPeriod } = require('../services/qualificationPeriod');
test('geral não restringe base; período inclui o dia final inteiro em distribuição e detalhe',()=>{
    const all=[];assert.equal(qualificationPeriod({},all),'');assert.deepEqual(all,[]);
    const params=['em_atendimento'];
    const sql=qualificationPeriod({de:'2026-11-18',ate:'2026-11-18'},params);
    assert.deepEqual(params,['em_atendimento','2026-11-18','2026-11-18']);
    assert.equal(sql," AND l.decidido_em >= $2::date AND l.decidido_em < ($3::date + INTERVAL '1 day')");
});
test('rejeita datas inexistentes, entradas inesperadas e intervalos invertidos',()=>{
    for(const query of [{de:'2026-02-30'},{ate:'2026-13-01'},{de:'2026-11-19',ate:'2026-11-18'},{de:['2026-11-18']},{de:"2026-11-18' OR 1=1"}])
        assert.throws(()=>qualificationPeriod(query,[]),{status:400});
    assert.match(qualificationPeriod({de:'2024-02-29'},[]),/\$1::date/);
});
