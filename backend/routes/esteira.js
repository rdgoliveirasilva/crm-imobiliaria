const express=require('express'),multer=require('multer'),crypto=require('node:crypto');
const S=require('../services/esteira');
module.exports=function createRouter(deps={}){
 const pool=deps.pool||require('../config/db').pool,auth=deps.autenticar||require('../middlewares/auth').autenticar;
 const router=express.Router();router.use(auth);router.use((req,res,next)=>['admin','corretor','teste'].includes(req.usuario.tipo)?next():res.status(403).json({erro:'Acesso não permitido.'}));
 const admin=req=>req.usuario.tipo==='admin';
 const error=(res,e)=>{if(!e.status)console.error('[comercial]',e.message);res.status(e.status||500).json({erro:e.status?e.message:'Não foi possível concluir a operação.'});};
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){error(res,e);}};
 const transaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
 async function owned(c,req,lock=false){const params=[S.id(req.params.id)];let sql='SELECT n.* FROM negociacoes n WHERE n.id=$1';if(!admin(req)){params.push(req.usuario.id);sql+=' AND n.corretor_id=$2';}if(lock)sql+=' FOR UPDATE';const n=(await c.query(sql,params)).rows[0];if(!n)S.fail('Negociação não encontrada.',404);return n;}
 const audit=(c,req,n,action,details={},etapa=n.etapa)=>c.query('INSERT INTO negociacao_eventos(negociacao_id,usuario_id,etapa_anterior,etapa,comissao_recebida,acao,detalhes) VALUES($1,$2,$3,$4,0,$5,$6)',[n.id,req.usuario.id,n.etapa,etapa,action,JSON.stringify(details)]);
 const notify=(c,user,n,message)=>user?c.query('INSERT INTO notificacoes_comerciais(usuario_id,negociacao_id,mensagem) VALUES($1,$2,$3)',[user,n.id,message]):Promise.resolve();
 async function assignCredit(c,req,n){
  const user=(await c.query("SELECT u.id FROM usuarios u WHERE u.tipo='admin' AND u.ativo=TRUE ORDER BY (SELECT COUNT(*) FROM negociacoes q WHERE q.analista_id=u.id AND q.credito_status='pendente'),u.id LIMIT 1")).rows[0];
  if(!user)S.fail('Nenhum administrador ativo disponível para análise.',409);
  await c.query("UPDATE negociacoes SET analista_id=$2,credito_status='pendente',status_comercial='ativo' WHERE id=$1",[n.id,user.id]);
  await notify(c,user.id,n,'Nova análise de crédito atribuída a você.');return user.id;
 }
 const base=`SELECT n.*,l.nome,l.telefone,li.nome AS carteira,u.nome AS corretor,e.nome AS empreendimento,a.nome AS analista_nome,v.id AS venda_id,v.unidade,v.valor_venda,v.comissao_prevista,v.assinatura_construtora,v.assinatura_caixa,COALESCE(r.recebido,0)::text AS recebido,COALESCE(r.antecipado,0)::text AS antecipado,COALESCE(r.pendente,0)::text AS pendente,(COALESCE(v.comissao_prevista,0)-COALESCE(r.recebido,0))::text AS saldo FROM negociacoes n JOIN leads l ON l.id=n.lead_id LEFT JOIN listas li ON li.id=n.lista_id LEFT JOIN usuarios u ON u.id=n.corretor_id LEFT JOIN empreendimentos e ON e.id=n.empreendimento_id LEFT JOIN usuarios a ON a.id=n.analista_id LEFT JOIN vendas_comerciais v ON v.negociacao_id=n.id LEFT JOIN LATERAL (SELECT SUM(valor) FILTER(WHERE status='confirmado') AS recebido,SUM(valor) FILTER(WHERE status='confirmado' AND tipo='antecipacao') AS antecipado,SUM(valor) FILTER(WHERE status='pendente') AS pendente FROM recebimentos_comerciais WHERE negociacao_id=n.id) r ON TRUE`;
 async function list(req){const args=[];let where=' WHERE TRUE';const filter=(sql,value)=>{args.push(value);where+=' AND '+sql.replace('?',`$${args.length}`);};
  if(!admin(req))filter('n.corretor_id=?',req.usuario.id);
  if(req.query.corretor_id){if(!admin(req))S.fail('Filtro exclusivo do admin.',403);filter('n.corretor_id=?',S.id(req.query.corretor_id));}
  if(req.query.lista_id)filter('n.lista_id=?',S.id(req.query.lista_id));
  if(req.query.empreendimento_id)filter('n.empreendimento_id=?',S.id(req.query.empreendimento_id));
  if(req.query.status){if(!['ativo','condicionado','reprovado','desistiu','finalizado'].includes(req.query.status))S.fail('Status inválido.');if(req.query.status==='finalizado')where+=' AND v.assinatura_caixa IS NOT NULL';else {filter('n.status_comercial=?',req.query.status);if(req.query.status==='ativo')where+=' AND v.assinatura_caixa IS NULL';}}
  if(req.query.de)filter('n.criado_em>=?::date',S.date(req.query.de));if(req.query.ate)filter("n.criado_em<(?::date + INTERVAL '1 day')",S.date(req.query.ate));
  if(req.query.de&&req.query.ate&&req.query.de>req.query.ate)S.fail('Período inválido.');
  if(req.query.busca){args.push(S.text(req.query.busca,120));where+=` AND (strpos(lower(l.nome),lower($${args.length}))>0 OR strpos(l.telefone,$${args.length})>0)`;}
  return (await pool.query(base+where+' ORDER BY n.atualizado_em DESC,n.id DESC',args)).rows;
 }
 router.get('/',wrap(async(req,res)=>{const rows=await list(req);res.json({etapas:S.ETAPAS,negociacoes:rows,indicadores:S.metrics(rows),admin:admin(req)});}));
 router.get('/resumo',wrap(async(req,res)=>res.json(S.metrics(await list(req)))));
 router.get('/opcoes',wrap(async(req,res)=>{
  const properties=(await pool.query(admin(req)?"SELECT id,nome,status FROM empreendimentos ORDER BY nome":"SELECT e.id,e.nome,e.status FROM empreendimentos e WHERE e.status='publicado' OR EXISTS(SELECT 1 FROM negociacoes n WHERE n.empreendimento_id=e.id AND n.corretor_id=$1) ORDER BY e.nome",admin(req)?[]:[req.usuario.id])).rows;
  const users=admin(req)?(await pool.query("SELECT id,nome FROM usuarios WHERE tipo IN ('corretor','teste') ORDER BY nome")).rows:[];
  res.json({empreendimentos:properties,corretores:users});
 }));
 router.get('/notificacoes',wrap(async(req,res)=>res.json({notificacoes:(await pool.query('SELECT id,negociacao_id,mensagem,criado_em FROM notificacoes_comerciais WHERE usuario_id=$1 AND lida_em IS NULL ORDER BY id DESC LIMIT 50',[req.usuario.id])).rows})));
 router.patch('/notificacoes/:notificacao',wrap(async(req,res)=>{await pool.query('UPDATE notificacoes_comerciais SET lida_em=NOW() WHERE id=$1 AND usuario_id=$2',[S.id(req.params.notificacao),req.usuario.id]);res.json({ok:true});}));
 router.post('/',wrap(async(req,res)=>res.json({negociacao:await transaction(async c=>{
  const lead=(await c.query('SELECT l.* FROM leads l WHERE l.id=$1 FOR UPDATE',[S.id(req.body.lead_id)])).rows[0];if(!lead||(!admin(req)&&lead.corretor_id!==req.usuario.id))S.fail('Cliente não encontrado.',404);if(!lead.corretor_id)S.fail('Atribua um corretor ao cliente.');
  const inserted=await c.query('INSERT INTO negociacoes(lead_id,corretor_id,lista_id) VALUES($1,$2,$3) ON CONFLICT(lead_id) DO NOTHING RETURNING *',[lead.id,lead.corretor_id,lead.lista_id]);
  const n=inserted.rows[0]||(await c.query('SELECT * FROM negociacoes WHERE lead_id=$1',[lead.id])).rows[0];if(!admin(req)&&n.corretor_id!==req.usuario.id)S.fail('Negociação já pertence a outro corretor.',409);
  if(inserted.rows.length)await audit(c,req,n,'criacao');return n;
 })})));
 async function detail(req){const n=await owned(pool,req);const row=(await pool.query(base+' WHERE n.id=$1',[n.id])).rows[0];
  const documents=(await pool.query('SELECT id,categoria,nome,mime,tamanho,criado_em FROM documentos_comerciais WHERE negociacao_id=$1 ORDER BY id',[n.id])).rows;
  const receipts=(await pool.query('SELECT r.*,u.nome AS solicitante FROM recebimentos_comerciais r LEFT JOIN usuarios u ON u.id=r.solicitado_por WHERE negociacao_id=$1 ORDER BY r.id DESC',[n.id])).rows;
  const events=(await pool.query('SELECT e.*,u.nome AS usuario FROM negociacao_eventos e LEFT JOIN usuarios u ON u.id=e.usuario_id WHERE negociacao_id=$1 ORDER BY e.id DESC',[n.id])).rows;
  return {negociacao:row,documentos:documents,recebimentos:receipts,eventos:events};
 }
 router.get('/:id/eventos',wrap(async(req,res)=>res.json({eventos:(await detail(req)).eventos})));
 router.get('/:id',wrap(async(req,res)=>res.json(await detail(req))));
 async function receipt(c,req,n,b){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.chave||''))S.fail('Chave de recebimento inválida.');
  if(!['antecipacao','final','saldo'].includes(b.tipo))S.fail('Tipo de recebimento inválido.');
  const cents=S.money(b.valor,{positive:true}),day=S.date(b.data_recebimento);
  const existing=(await c.query('SELECT *,data_recebimento::text AS data_recebimento FROM recebimentos_comerciais WHERE chave=$1',[b.chave])).rows[0];if(existing){if(existing.negociacao_id!==n.id||S.money(existing.valor)!==cents||String(existing.data_recebimento).slice(0,10)!==day||existing.tipo!==b.tipo)S.fail('Chave de recebimento já utilizada.',409);return existing;}
  const sale=(await c.query('SELECT * FROM vendas_comerciais WHERE negociacao_id=$1',[n.id])).rows[0];if(!sale)S.fail('Cadastre o contrato com a construtora primeiro.');
  const reserved=(await c.query("SELECT COALESCE(SUM(valor),0)::text AS total FROM recebimentos_comerciais WHERE negociacao_id=$1 AND status IN ('pendente','confirmado')",[n.id])).rows[0].total;
  if(S.money(reserved)+cents>S.money(sale.comissao_prevista))S.fail('Valor excede o saldo disponível, considerando confirmações pendentes.');
  const r=(await c.query('INSERT INTO recebimentos_comerciais(negociacao_id,chave,tipo,valor,data_recebimento,solicitado_por) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[n.id,b.chave,b.tipo,S.decimal(cents),day,req.usuario.id])).rows[0];
  await audit(c,req,n,'recebimento_solicitado',{id:r.id,valor:r.valor,tipo:r.tipo,data:day});
  await c.query("INSERT INTO notificacoes_comerciais(usuario_id,negociacao_id,mensagem) SELECT id,$1,'Recebimento aguardando confirmação administrativa.' FROM usuarios WHERE tipo='admin' AND ativo=TRUE",[n.id]);return r;
 }
 router.patch('/:id',wrap(async(req,res)=>{await transaction(async c=>{
  const n=await owned(c,req,true),b=req.body,etapa=S.transition(n,b);let observations=b.observacoes===undefined?n.observacoes:S.text(b.observacoes);
  let property=n.empreendimento_id;if(b.empreendimento_id!==undefined){property=b.empreendimento_id?S.id(b.empreendimento_id):null;if(property){const p=(await c.query('SELECT id,status FROM empreendimentos WHERE id=$1',[property])).rows[0];if(!p||(!admin(req)&&p.status!=='publicado'&&property!==n.empreendimento_id))S.fail('Empreendimento não disponível.');}}
  let checklist=n.checklist;if(b.checklist!==undefined){if(!b.checklist||typeof b.checklist!=='object'||Array.isArray(b.checklist))S.fail('Checklist inválido.');checklist={};for(const [key,value]of Object.entries(b.checklist)){if(!S.DOCS.includes(key)||typeof value!=='boolean')S.fail('Checklist inválido.');checklist[key]=value;}}
  const sale=(await c.query('SELECT * FROM vendas_comerciais WHERE negociacao_id=$1',[n.id])).rows[0];
  if(sale&&property!==n.empreendimento_id)S.fail('O empreendimento da venda registrada não pode ser alterado.');
  if(etapa>=3&&!sale){const contract=b.contrato;if(!contract)S.fail('Informe os dados do contrato com a construtora.');if(!property)S.fail('Selecione o empreendimento.');const unit=S.text(contract.unidade,120);if(!unit)S.fail('Informe a unidade.');const value=S.money(contract.valor_venda,{positive:true}),commission=S.money(contract.comissao_prevista);if(commission>value)S.fail('Comissão superior ao valor da venda.');
   await c.query('INSERT INTO vendas_comerciais(negociacao_id,empreendimento_id,unidade,valor_venda,comissao_prevista,assinatura_construtora) VALUES($1,$2,$3,$4,$5,$6)',[n.id,property,unit,S.decimal(value),S.decimal(commission),S.date(contract.assinatura_construtora)]);await audit(c,req,n,'venda_realizada',{unidade:unit,valor:S.decimal(value),comissao:S.decimal(commission)});
  }
  if(etapa===1&&n.etapa===0)await assignCredit(c,req,n);
  if(etapa===5&&(!sale?.assinatura_caixa)){
   const assinatura=S.date(b.assinatura_caixa);if(b.recebimento)await receipt(c,req,n,{...b.recebimento,tipo:'final'});
   else {const totals=(await c.query("SELECT v.comissao_prevista,COALESCE((SELECT SUM(valor) FROM recebimentos_comerciais r WHERE r.negociacao_id=v.negociacao_id AND r.status IN ('pendente','confirmado')),0)::text AS total FROM vendas_comerciais v WHERE negociacao_id=$1",[n.id])).rows[0];if(S.money(totals.total)<S.money(totals.comissao_prevista))S.fail('Informe o recebimento final e sua data. O saldo não quitado continuará no financeiro.');}
   await c.query('UPDATE vendas_comerciais SET assinatura_caixa=$2 WHERE negociacao_id=$1',[n.id,assinatura]);await audit(c,req,n,'venda_finalizada',{assinatura});
  }
  await c.query('UPDATE negociacoes SET etapa=$2,observacoes=$3,checklist=$4,empreendimento_id=$5,etapa_desde=CASE WHEN etapa<>$2 THEN NOW() ELSE etapa_desde END,versao=versao+1,atualizado_em=NOW(),vendido_em=CASE WHEN $2>=3 THEN COALESCE(vendido_em,NOW()) ELSE vendido_em END,concluido_em=CASE WHEN $2=5 THEN COALESCE(concluido_em,NOW()) ELSE concluido_em END WHERE id=$1',[n.id,etapa,observations,JSON.stringify(checklist),property]);
  await audit(c,req,n,'atualizacao',{observacoes:observations,checklist,empreendimento_id:property},etapa);
 });res.json({ok:true});}));
 router.post('/:id/credito',wrap(async(req,res)=>{await transaction(async c=>{const n=await owned(c,req,true);if(n.etapa!==1)S.fail('Negociação fora da aprovação de crédito.');
  if(req.body.decisao==='reenviar'){if(!['condicionado','reprovado'].includes(n.credito_status))S.fail('Esta análise não precisa de reenvio.');if(n.credito_status==='reprovado'&&!admin(req))S.fail('Somente o admin pode reabrir uma análise reprovada.',403);await assignCredit(c,req,n);await audit(c,req,n,'credito_reenviado');}
  else {if(!admin(req))S.fail('Somente o administrador decide o crédito.',403);if(!['pendente','condicionado'].includes(n.credito_status))S.fail('Análise já concluída. Atualize a ficha.',409);
   const decision=req.body.decisao;if(!['aprovado','condicionado','reprovado'].includes(decision))S.fail('Decisão inválida.');const obs=S.text(req.body.observacoes||'');if(!obs)S.fail('Informe as observações da análise.');
   await c.query('UPDATE negociacoes SET credito_status=$2,status_comercial=$3,analista_id=$4 WHERE id=$1',[n.id,decision,decision==='aprovado'?'ativo':decision,req.usuario.id]);await audit(c,req,n,'credito_'+decision,{observacoes:obs});await notify(c,n.corretor_id,n,'Crédito '+decision+': '+obs);
  }await c.query('UPDATE negociacoes SET versao=versao+1,atualizado_em=NOW() WHERE id=$1',[n.id]);});res.json({ok:true});}));
 router.post('/:id/status',wrap(async(req,res)=>{await transaction(async c=>{const n=await owned(c,req,true),status=req.body.status,obs=S.text(req.body.observacoes||'');if(!obs)S.fail('Informe o motivo.');if(!['desistiu','ativo','condicionado','reprovado'].includes(status))S.fail('Status inválido.');if(status!=='desistiu'&&!admin(req))S.fail('Somente o admin pode alterar esse status.',403);if(n.etapa===5)S.fail('Processo comercial já finalizado.');if(status==='ativo'&&['condicionado','reprovado'].includes(n.credito_status))S.fail('Resolva a análise de crédito antes de reativar.');await c.query('UPDATE negociacoes SET status_comercial=$2,versao=versao+1,atualizado_em=NOW() WHERE id=$1',[n.id,status]);await audit(c,req,n,'status_'+status,{observacoes:obs});await notify(c,n.corretor_id,n,'Status da negociação: '+status+'. '+obs);});res.json({ok:true});}));
 router.post('/:id/recebimentos',wrap(async(req,res)=>res.json({recebimento:await transaction(async c=>receipt(c,req,await owned(c,req,true),req.body))})));
 router.patch('/:id/recebimentos/:recebimento',wrap(async(req,res)=>{if(!admin(req))S.fail('Confirmação exclusiva do administrador.',403);await transaction(async c=>{const n=await owned(c,req,true),rid=S.id(req.params.recebimento);const r=(await c.query('SELECT * FROM recebimentos_comerciais WHERE id=$1 AND negociacao_id=$2 FOR UPDATE',[rid,n.id])).rows[0];if(!r)S.fail('Recebimento não encontrado.',404);const status=req.body.status;if(!['confirmado','rejeitado'].includes(status))S.fail('Decisão inválida.');if(r.status===status)return;if(r.status!=='pendente')S.fail('Recebimento já decidido.',409);const obs=S.text(req.body.observacao||'');if(status==='rejeitado'&&!obs)S.fail('Informe o motivo da rejeição.');await c.query('UPDATE recebimentos_comerciais SET status=$2,confirmado_por=$3,confirmado_em=NOW(),observacao=$4 WHERE id=$1',[rid,status,req.usuario.id,obs]);await audit(c,req,n,'recebimento_'+status,{id:rid,valor:r.valor,observacao:obs});await notify(c,n.corretor_id,n,'Recebimento '+status+': R$ '+r.valor);});res.json({ok:true});}));
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:3*1024*1024,files:1,fields:2}}).single('documento');
 router.post('/:id/documentos',(req,res,next)=>upload(req,res,e=>e?res.status(400).json({erro:'Envie um único arquivo de até 3 MB.'}):next()),wrap(async(req,res)=>{
  if(!req.file)S.fail('Selecione um documento.');const mime=S.fileType(req.file.buffer),category=req.body.categoria;if(!S.DOCS.includes(category))S.fail('Categoria inválida.');
  await transaction(async c=>{const n=await owned(c,req,true);const result=await c.query('INSERT INTO documentos_comerciais(negociacao_id,categoria,nome,mime,tamanho,hash,conteudo,criado_por) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(negociacao_id,categoria,hash) DO NOTHING RETURNING id',[n.id,category,String(req.file.originalname).replace(/[\x00-\x1f\/\\]/g,'_').slice(0,160),mime,req.file.size,crypto.createHash('sha256').update(req.file.buffer).digest('hex'),req.file.buffer,req.usuario.id]);if(result.rows.length)await audit(c,req,n,'documento_enviado',{id:result.rows[0].id,categoria:category});});res.status(201).json({ok:true});
 }));
 router.get('/:id/documentos/:documento',wrap(async(req,res)=>{const n=await owned(pool,req);const d=(await pool.query('SELECT * FROM documentos_comerciais WHERE id=$1 AND negociacao_id=$2',[S.id(req.params.documento),n.id])).rows[0];if(!d)S.fail('Documento não encontrado.',404);await audit(pool,req,n,'documento_acessado',{id:d.id});res.set({'Content-Type':d.mime,'Content-Disposition':`attachment; filename="documento-${d.id}"; filename*=UTF-8''${encodeURIComponent(d.nome)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"});res.send(d.conteudo);}));
 return router;
};
