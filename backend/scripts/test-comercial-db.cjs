/* Integração real em schema temporário; transação externa sempre revertida. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {pool}=require('../config/db'),createRouter=require('../routes/esteira');
async function run(){const client=await pool.connect();try{
 await client.query('BEGIN');const schema='test_comercial_'+crypto.randomBytes(6).toString('hex');await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET LOCAL search_path TO ${schema}`);
 await client.query(`CREATE TABLE usuarios(id SERIAL PRIMARY KEY,nome TEXT,tipo TEXT,ativo BOOLEAN DEFAULT TRUE);CREATE TABLE listas(id SERIAL PRIMARY KEY,nome TEXT,inativa_manual BOOLEAN DEFAULT FALSE);CREATE TABLE leads(id SERIAL PRIMARY KEY,lista_id INTEGER REFERENCES listas,corretor_id INTEGER REFERENCES usuarios,nome TEXT,telefone TEXT,status TEXT,resultado TEXT);CREATE TABLE empreendimentos(id SERIAL PRIMARY KEY,nome TEXT,status TEXT);CREATE TABLE negociacoes(id SERIAL PRIMARY KEY,lead_id INTEGER UNIQUE REFERENCES leads,etapa SMALLINT DEFAULT 0,comissao_recebida SMALLINT DEFAULT 0,versao INTEGER DEFAULT 1,vendido_em TIMESTAMPTZ,concluido_em TIMESTAMPTZ,criado_em TIMESTAMPTZ DEFAULT NOW(),atualizado_em TIMESTAMPTZ DEFAULT NOW(),CHECK ((etapa<3 AND comissao_recebida=0) OR (etapa IN(3,4) AND comissao_recebida IN(0,50)) OR (etapa=5 AND comissao_recebida=100)));CREATE TABLE negociacao_eventos(id SERIAL PRIMARY KEY,negociacao_id INTEGER REFERENCES negociacoes,usuario_id INTEGER REFERENCES usuarios,etapa_anterior SMALLINT,etapa SMALLINT,comissao_recebida SMALLINT,criado_em TIMESTAMPTZ DEFAULT NOW());`);
 await client.query(await fs.readFile(path.join(__dirname,'../database/migrations/20261126_comercial.sql'),'utf8'));
 await client.query(await fs.readFile(path.join(__dirname,'../database/migrations/20261126_comercial.sql'),'utf8'));
 await client.query("INSERT INTO usuarios(nome,tipo) VALUES('Admin','admin'),('Corretor A','corretor'),('Corretor B','corretor');INSERT INTO listas(nome) VALUES('Teste isolado');INSERT INTO empreendimentos(nome,status) VALUES('Imóvel de teste','publicado');INSERT INTO leads(lista_id,corretor_id,nome,telefone,status,resultado) VALUES(1,2,'Cliente de integração','16999999999','qualificado','em_atendimento')");
 const scoped={query:(...args)=>client.query(...args),connect:async()=>({query:(sql,args)=>client.query(sql==='BEGIN'?'SAVEPOINT route_transaction':sql==='COMMIT'?'RELEASE SAVEPOINT route_transaction':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT route_transaction':sql,args),release(){}})};
 const router=createRouter({pool:scoped,autenticar:(q,r,next)=>next()});
 const broker={id:2,tipo:'corretor'},admin={id:1,tipo:'admin'},other={id:3,tipo:'corretor'};
 async function call(method,url,{user=broker,body={},params={id:1},query={},file}={},expected=200){let data,code=200,headers={};const res={status(n){code=n;return this;},json(v){data=v;},set(v){headers=v;},send(v){data=v;}};const route=router.stack.find(l=>l.route?.path===url&&l.route.methods[method]);assert.ok(route,url);await route.route.stack.at(-1).handle({usuario:user,body,params,query,file},res);assert.equal(code,expected,JSON.stringify(data));return {data,headers};}
 await call('post','/',{body:{lead_id:1}});await call('post','/',{body:{lead_id:1}});assert.equal((await client.query('SELECT COUNT(*)::int n FROM negociacoes')).rows[0].n,1);
 await call('get','/:id',{user:other},404);
 await client.query("INSERT INTO empreendimentos(nome,status) VALUES('Rascunho privado','rascunho')");
 await call('patch','/:id',{body:{etapa:0,versao:1,empreendimento_id:2}},400);
 const doc=Buffer.from('%PDF-1.7\nIntegration test');await call('post','/:id/documentos',{body:{categoria:'identidade'},file:{buffer:doc,size:doc.length,originalname:'identidade.pdf'}},201);
 const full=(await call('get','/:id')).data;assert.equal(full.documentos.length,1);assert.equal(full.documentos[0].conteudo,undefined);
 await call('get','/:id/documentos/:documento',{user:other,params:{id:1,documento:1}},404);
 const download=await call('get','/:id/documentos/:documento',{params:{id:1,documento:1}});assert.ok(download.data.equals(doc));assert.equal(download.headers['Cache-Control'],'no-store');
 async function move(etapa,extra={}){const n=(await call('get','/:id')).data.negociacao;return call('patch','/:id',{body:{etapa,versao:n.versao,...extra}});}
 await move(1,{checklist:{identidade:true},observacoes:'Documentação enviada'});
 let n=(await call('get','/:id')).data.negociacao;assert.equal(n.analista_id,1);assert.equal(n.corretor_id,2);
 await call('patch','/:id',{body:{etapa:2,versao:n.versao}},403);
 await call('post','/:id/credito',{body:{decisao:'aprovado',observacoes:'Tentativa sem permissão'}},403);
 await call('post','/:id/credito',{user:admin,body:{decisao:'condicionado',observacoes:'Complementar renda'}});
 await call('post','/:id/credito',{body:{decisao:'reenviar'}});
 await call('post','/:id/credito',{user:admin,body:{decisao:'aprovado',observacoes:'Crédito aprovado'}});
 assert.ok((await call('get','/notificacoes')).data.notificacoes.length>0);
 await move(2,{observacoes:'Fluxo validado'});n=(await call('get','/:id')).data.negociacao;
 await call('patch','/:id',{body:{etapa:3,versao:n.versao}},400);
 await move(3,{empreendimento_id:1,contrato:{unidade:'101',valor_venda:'200000.00',comissao_prevista:'10000.00',assinatura_construtora:'2026-11-20'}});
 await call('patch','/:id',{body:{etapa:3,versao:n.versao}},409);assert.equal((await client.query('SELECT COUNT(*)::int n FROM vendas_comerciais')).rows[0].n,1);
 assert.equal((await client.query('SELECT resultado FROM leads WHERE id=1')).rows[0].resultado,'em_atendimento');
 await move(4);
 const key=crypto.randomUUID(),body={chave:key,tipo:'antecipacao',valor:'2000.00',data_recebimento:'2026-11-21'};
 const r=(await call('post','/:id/recebimentos',{body})).data.recebimento;await call('post','/:id/recebimentos',{body});
 assert.equal((await call('get','/resumo')).data.recebidas,'0.00');
 await call('patch','/:id/recebimentos/:recebimento',{params:{id:1,recebimento:r.id},body:{status:'confirmado'}},403);
 await call('patch','/:id/recebimentos/:recebimento',{user:admin,params:{id:1,recebimento:r.id},body:{status:'confirmado'}});
 await move(5,{assinatura_caixa:'2026-11-25',recebimento:{chave:crypto.randomUUID(),valor:'5000.00',data_recebimento:'2026-11-25'}});
 let summary=(await call('get','/resumo')).data;assert.equal(summary.vgv,'200000.00');assert.equal(summary.vendidos,1);assert.equal(summary.finalizados,1);assert.equal(summary.recebidas,'2000.00');assert.equal(summary.a_receber,'8000.00');
 const final=(await call('get','/:id')).data.recebimentos.find(r=>r.tipo==='final');await call('patch','/:id/recebimentos/:recebimento',{user:admin,params:{id:1,recebimento:final.id},body:{status:'confirmado'}});
 summary=(await call('get','/resumo')).data;assert.equal(summary.a_receber,'3000.00');assert.equal(summary.recebidas,'7000.00');
 await call('post','/:id/recebimentos',{body:{chave:crypto.randomUUID(),tipo:'saldo',valor:'4000.00',data_recebimento:'2026-11-26'}},400);
 const remaining=(await call('post','/:id/recebimentos',{body:{chave:crypto.randomUUID(),tipo:'saldo',valor:'3000.00',data_recebimento:'2026-11-26'}})).data.recebimento;
 await call('patch','/:id/recebimentos/:recebimento',{user:admin,params:{id:1,recebimento:remaining.id},body:{status:'confirmado'}});
 await call('patch','/:id/recebimentos/:recebimento',{user:admin,params:{id:1,recebimento:remaining.id},body:{status:'confirmado'}});
 assert.equal((await call('get','/resumo')).data.a_receber,'0.00');
 console.log('Integração PostgreSQL aprovada: isolamento, documentos, crédito, venda, recebimentos, saldo, idempotência e migration repetida. Todos os dados de teste serão revertidos.');
 }finally{await client.query('ROLLBACK');client.release();}}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>pool.end());
