const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const S=require('../services/esteira'),createRouter=require('../routes/esteira');
function handler(pool,method,url){return createRouter({pool,autenticar:(q,r,next)=>next()}).stack.find(l=>l.route?.path===url&&l.route.methods[method]).route.stack.at(-1).handle;}
function res(){return {code:200,status(n){this.code=n;return this;},json(data){this.data=data;}};}
test('valores financeiros usam centavos, rejeitam formatos ambíguos e datas inexistentes',()=>{
 assert.equal(S.money('123.45'),12345);assert.equal(S.decimal(12345),'123.45');
 for(const v of ['-1','1.234','1,20','NaN',true,'1e4'])assert.throws(()=>S.money(v));assert.throws(()=>S.date('2026-02-30'));assert.equal(S.date('2026-11-26'),'2026-11-26');
});
test('aprovação de crédito administrativa é pré-requisito para fluxo; versão evita sobrescrita',()=>{
 const n={etapa:1,versao:2,status_comercial:'ativo',credito_status:'pendente'};
 assert.throws(()=>S.transition(n,{etapa:2,versao:2}),e=>e.status===403);
 assert.equal(S.transition({...n,credito_status:'aprovado'},{etapa:2,versao:2}),2);
 assert.throws(()=>S.transition(n,{etapa:1,versao:1}),e=>e.status===409);
 assert.throws(()=>S.transition({...n,status_comercial:'desistiu'},{etapa:2,versao:2}));
});
test('indicadores distinguem venda, finalização e recebimento confirmado, sem usar percentuais legados',()=>{
 const m=S.metrics([{etapa:3,status_comercial:'ativo',venda_id:1,valor_venda:'200000.00',comissao_prevista:'10000',recebido:'2000',pendente:'3000'},{etapa:5,status_comercial:'ativo',venda_id:2,assinatura_caixa:'2026-11-26',valor_venda:'300000',comissao_prevista:'15000',recebido:'5000'},{etapa:5,status_comercial:'ativo',comissao_recebida:100}]);
 assert.equal(m.vgv,'500000.00');assert.equal(m.vendidos,2);assert.equal(m.finalizados,1);assert.equal(m.recebidas,'7000.00');assert.equal(m.a_receber,'18000.00');
});
test('documentos aceitam somente assinaturas binárias de PDF, PNG e JPEG',()=>{
 assert.equal(S.fileType(Buffer.from('%PDF-1.7')),'application/pdf');assert.equal(S.fileType(Buffer.from([255,216,255,0])),'image/jpeg');assert.throws(()=>S.fileType(Buffer.from('<html>documento falso</html>')));
});
test('corretor não pode confirmar recebimentos ou consultar filtro de outro corretor',async()=>{
 const pool={query(){throw Error('Não deve consultar dados');}},user={id:7,tipo:'corretor'};
 let response=res();await handler(pool,'patch','/:id/recebimentos/:recebimento')({usuario:user,params:{id:1,recebimento:2},body:{status:'confirmado'}},response);assert.equal(response.code,403);
 response=res();await handler(pool,'get','/')({usuario:user,query:{corretor_id:8}},response);assert.equal(response.code,403);
});
test('listagem restringe negociações à titularidade persistida e combina filtros parametrizados',async()=>{
 const calls=[],pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}},response=res();
 await handler(pool,'get','/')({usuario:{id:7,tipo:'corretor'},query:{empreendimento_id:'4',de:'2026-11-01',ate:'2026-11-26',status:'ativo'}},response);
 assert.equal(response.code,200);assert.match(calls[0].sql,/n.corretor_id=\$1/);assert.deepEqual(calls[0].args,[7,4,'ativo','2026-11-01','2026-11-26']);
});
test('acesso a documento exige negociação própria antes de ler o conteúdo',async()=>{
 let queries=0;const response=res();await handler({query:async()=>{queries++;return {rows:[]};}},'get','/:id/documentos/:documento')({usuario:{id:7,tipo:'corretor'},params:{id:3,documento:4}},response);
 assert.equal(response.code,404);assert.equal(queries,1);
});
test('páginas de esteira e vendas usam filtros, tema e IDs únicos',()=>{
 for(const name of ['esteira','admin-esteira','vendas','admin-vendas']){const html=fs.readFileSync(path.join(__dirname,'../../frontend/'+name+'.html'),'utf8'),ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const id of ['pipelineMetrics','pipelineDialog','pipelineProperty','pipelineStatus','pipelineFrom','pipelineTo'])assert.ok(ids.includes(id));assert.ok(html.includes('js/esteira.js'));}
});
