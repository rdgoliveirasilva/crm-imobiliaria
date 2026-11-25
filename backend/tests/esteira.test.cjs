const test=require('node:test'),assert=require('node:assert/strict');
const {transition,ETAPAS}=require('../services/esteira');
const createRouter=require('../routes/esteira');
const broker={id:7,tipo:'corretor'},admin={id:1,tipo:'admin'};
function handler(pool,method,path){const router=createRouter({pool,autenticar:(req,res,next)=>next()});return router.stack.find(layer=>layer.route?.path===path&&layer.route.methods[method]).route.stack[0].handle;}
function response(){return {code:200,status(code){this.code=code;return this;},json(data){this.data=data;}};}
test('etapas e comissão acumulada: venda na construtora e 100% na Caixa, nunca 150%',()=>{
 assert.equal(ETAPAS.length,6);
 assert.deepEqual(transition({etapa:2,versao:1,comissao_recebida:0},{etapa:3,versao:1,meia_comissao:false}),{etapa:3,comissao:0,changed:true});
 assert.equal(transition({etapa:3,versao:2,comissao_recebida:0},{etapa:3,versao:2,meia_comissao:true}).comissao,50);
 assert.equal(transition({etapa:4,versao:3,comissao_recebida:50},{etapa:5,versao:3}).comissao,100);
 assert.equal(transition({etapa:5,versao:4,comissao_recebida:100},{etapa:5,versao:4}).changed,false);
 for(const body of [{etapa:5,versao:1},{etapa:-1,versao:1},{etapa:0,versao:1,meia_comissao:true},{etapa:1,versao:9}])assert.throws(()=>transition({etapa:0,versao:1,comissao_recebida:0},body));
});
test('corretor só consulta seus leads; filtro de outro corretor é recusado',async()=>{
 const calls=[],pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}};
 const get=handler(pool,'get','/');let res=response();await get({usuario:broker,query:{}},res);
 assert.match(calls[0].sql,/l.corretor_id=\$1/);assert.deepEqual(calls[0].args,[7]);assert.match(calls[0].sql,/inativa_manual=FALSE/);
 res=response();await get({usuario:broker,query:{corretor_id:8}},res);assert.equal(res.code,403);assert.equal(calls.length,1);
 res=response();await get({usuario:admin,query:{corretor_id:8,lista_id:12}},res);assert.deepEqual(calls[1].args,[8,12]);
});
test('inserção repetida reaproveita negociação sem duplicar evento',async()=>{
 const calls=[],client={query:async(sql,args)=>{calls.push(sql);if(sql.startsWith('SELECT l.'))return {rows:[{corretor_id:7,inativa_manual:false}]};if(sql.startsWith('SELECT *'))return {rows:[{id:4,lead_id:10}]};return {rows:[]};},release(){calls.push('release');}};
 const post=handler({connect:async()=>client},'post','/'),res=response();await post({usuario:broker,body:{lead_id:10}},res);
 assert.equal(res.code,200);assert.equal(res.data.negociacao.id,4);assert.ok(calls.includes('COMMIT'));assert.ok(!calls.some(s=>s.startsWith('INSERT INTO negociacao_eventos')));
});
test('cliente de outro corretor não pode ser movido nem incluído',async()=>{
 for(const [method,path,body] of [['post','/',{lead_id:10}],['patch','/:id',{etapa:3,versao:1}]]){
  const calls=[],client={query:async sql=>{calls.push(sql);return {rows:[{corretor_id:8,inativa_manual:false}]};},release(){}};
  const res=response();await handler({connect:async()=>client},method,path)({usuario:broker,body,params:{id:4}},res);
  assert.equal(res.code,404);assert.ok(calls.includes('ROLLBACK'));assert.ok(!calls.some(s=>/^(INSERT|UPDATE)/.test(s)));
 }
});
test('movimento registra venda, comissão e auditoria na mesma transação',async()=>{
 const calls=[],current={id:4,lead_id:10,etapa:2,versao:3,comissao_recebida:0};
 const client={query:async(sql,args)=>{calls.push({sql,args});if(sql.startsWith('SELECT l.'))return {rows:[{corretor_id:7,inativa_manual:false,resultado:'em_atendimento'}]};if(sql.startsWith('SELECT *'))return {rows:[current]};return {rows:[]};},release(){}};
 const res=response();await handler({connect:async()=>client},'patch','/:id')({usuario:admin,params:{id:4},body:{etapa:3,versao:3,meia_comissao:true}},res);
 assert.equal(res.code,200);assert.ok(calls.some(c=>c.sql.startsWith('UPDATE leads')));assert.ok(calls.some(c=>c.sql.startsWith('INSERT INTO historico')&&c.args[1]===7));
 assert.deepEqual(calls.find(c=>c.sql.startsWith('UPDATE negociacoes')).args,[4,3,50]);assert.equal(calls.at(-1).sql,'COMMIT');
});
test('versão obsoleta reverte sem registrar venda',async()=>{
 const calls=[],client={query:async sql=>{calls.push(sql);return {rows:sql.startsWith('SELECT l.')?[{corretor_id:7}]:[{etapa:2,versao:4,comissao_recebida:0}]};},release(){}};
 const res=response();await handler({connect:async()=>client},'patch','/:id')({usuario:broker,params:{id:4},body:{etapa:3,versao:3}},res);
 assert.equal(res.code,409);assert.ok(calls.includes('ROLLBACK'));assert.ok(!calls.some(s=>s.startsWith('UPDATE')));
});

test('eventos também exigem titularidade e não vazam dados de outro corretor',async()=>{
 let queries=0;const pool={query:async()=>{queries++;return {rows:[{corretor_id:8}]};}};
 const res=response();await handler(pool,'get','/:id/eventos')({usuario:broker,params:{id:4}},res);
 assert.equal(res.code,404);assert.equal(queries,1);
});
test('falha de auditoria reverte a venda e não confirma transação',async()=>{
 const calls=[],client={query:async sql=>{calls.push(sql);if(sql.startsWith('SELECT l.'))return {rows:[{corretor_id:7}]};if(sql.startsWith('SELECT *'))return {rows:[{id:4,lead_id:10,etapa:2,versao:1,comissao_recebida:0}]};if(sql.startsWith('INSERT INTO negociacao_eventos'))throw Object.assign(Error('Falha simulada'),{status:503});return {rows:[]};},release(){}};
 const res=response();await handler({connect:async()=>client},'patch','/:id')({usuario:broker,params:{id:4},body:{etapa:3,versao:1}},res);
 assert.equal(res.code,503);assert.ok(calls.includes('ROLLBACK'));assert.ok(!calls.includes('COMMIT'));
});
test('páginas possuem IDs únicos, scripts necessários e navegação ativa para cada perfil',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const name of ['esteira','admin-esteira']){
  const html=fs.readFileSync(path.join(__dirname,'../../frontend/'+name+'.html'),'utf8');
  const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const asset of ['api-client.js','esteira.js','corretor-theme.js','desktop-sidebar.js'])assert.ok(html.includes(asset));
  for(const id of ['pipelineMetrics','pipelineBoard','pipelineDialog','pipelineBroker','pipelineWallet'])assert.ok(ids.includes(id));
  if(name==='admin-esteira'){assert.match(html,/admin-desktop-theme/);assert.match(html,/nav-tab active" data-tab="esteira"/);}
  else assert.match(html,/href="esteira.html" aria-current="page"/);
 }
});
