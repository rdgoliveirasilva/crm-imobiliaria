const test = require('node:test');
const assert = require('node:assert/strict');
const { registrarEvento, carregarAtividade } = require('../services/contatoMetrics');
const event = {evento_id:'12345678-1234-4234-8234-123456789012',lead_id:12,tipo:'ligacao'};
test('eventos rejeitam tipo/identificador inválidos antes de acessar banco',async()=>{
 const pool={query(){throw Error('Não deveria consultar');}};
 for(const body of [{...event,tipo:'audio'},{...event,lead_id:-1},{...event,evento_id:'x'}])
  await assert.rejects(registrarEvento(pool,9,body),{status:400});
});
test('gravação restringe dono e carteira ativa; repetição idempotente não duplica',async()=>{
 const queries=[];const pool={async query(sql,args){queries.push({sql,args});return {rows:queries.length===1?[]:[{id:1}]};}};
 await registrarEvento(pool,9,event);
 assert.match(queries[0].sql,/l.corretor_id = \$2 AND li.inativa_manual = FALSE/);
 assert.match(queries[0].sql,/ON CONFLICT \(evento_id\) DO NOTHING/);
 assert.deepEqual(queries[0].args,[event.evento_id,9,12,'ligacao']);
 assert.match(queries[1].sql,/corretor_id = \$2 AND lead_id = \$3 AND tipo = \$4/);
 await assert.rejects(registrarEvento({query:async()=>({rows:[]})},9,event),{status:404});
});
test('métricas sem atividade permanecem vazias e páginas são limitadas',async()=>{
 const sql=[];const rows=[{total_ligacoes:0,ligacoes_finalizadas:0,media_contatos_dia:null,media_ligacao_segundos:null},{segundos:null,amostras:0}];
 const pool={async query(query,args){sql.push({query,args});return {rows:sql.length<=2?[rows[sql.length-1]]:[]};}};
 const result=await carregarAtividade(pool,50);
 assert.equal(result.pagina,1);assert.equal(result.totalLigacoes,0);
 assert.equal(result.mediaContatosDia,null);assert.equal(result.mediaLigacaoSegundos,null);assert.equal(result.mediaRequalificacaoSegundos,null);
 assert.deepEqual(result.log,[]);assert.deepEqual(sql[2].args,[0]);
 assert.match(sql[0].query,/c.tipo IN \('whatsapp','qualificacao'\)/);
 assert.match(sql[0].query,/ORDER BY c.criado_em,c.id LIMIT 1/);
 assert.match(sql[1].query,/lead_id != lead_anterior/);
 await assert.rejects(carregarAtividade(pool,0),{status:400});
});
