const express=require('express');
const {ETAPAS,transition,fail}=require('../services/esteira');
module.exports=function createRouter(deps={}){
 const pool=deps.pool||require('../config/db').pool;
 const autenticar=deps.autenticar||require('../middlewares/auth').autenticar;
 const router=express.Router();router.use(autenticar);
 router.use((req,res,next)=>['admin','corretor','teste'].includes(req.usuario.tipo)?next():res.status(403).json({erro:'Acesso não permitido.'}));
 const isAdmin=req=>req.usuario.tipo==='admin';
 const id=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)fail('Identificador inválido.');return n;};
 const error=(res,e)=>{if(!e.status)console.error('[esteira]',e);res.status(e.status||500).json({erro:e.status?e.message:'Não foi possível atualizar a esteira.'});};
 const access=(req,lead)=>{if(!lead||(!isAdmin(req)&&(lead.corretor_id!==req.usuario.id||lead.inativa_manual)))fail('Cliente não encontrado.',404);};
 router.get('/',async(req,res)=>{try{
  const args=[];let where='WHERE TRUE';
  if(!isAdmin(req)){args.push(req.usuario.id);where+=' AND l.corretor_id=$1 AND li.inativa_manual=FALSE';}
  if(req.query.corretor_id){if(!isAdmin(req))fail('Filtro exclusivo do administrador.',403);args.push(id(req.query.corretor_id));where+=` AND l.corretor_id=$${args.length}`;}
  if(req.query.lista_id){args.push(id(req.query.lista_id));where+=` AND l.lista_id=$${args.length}`;}
  if(req.query.busca){args.push(String(req.query.busca).slice(0,120));where+=` AND (strpos(lower(l.nome),lower($${args.length}))>0 OR strpos(l.telefone,$${args.length})>0)`;}
  const {rows}=await pool.query(`SELECT n.*,l.nome,l.telefone,l.corretor_id,l.lista_id,li.nome AS carteira,u.nome AS corretor FROM negociacoes n JOIN leads l ON l.id=n.lead_id JOIN listas li ON li.id=l.lista_id LEFT JOIN usuarios u ON u.id=l.corretor_id ${where} ORDER BY n.atualizado_em DESC,n.id DESC`,args);
  res.json({etapas:ETAPAS,negociacoes:rows,admin:isAdmin(req)});
 }catch(e){error(res,e);}});
 router.post('/',async(req,res)=>{
  let client;try{const leadId=id(req.body.lead_id);client=await pool.connect();await client.query('BEGIN');
   const {rows}=await client.query('SELECT l.*,li.inativa_manual FROM leads l JOIN listas li ON li.id=l.lista_id WHERE l.id=$1 FOR UPDATE OF l',[leadId]);access(req,rows[0]);
   if(!rows[0].corretor_id)fail('Atribua um corretor ao cliente antes de iniciar a negociação.');
   const inserted=await client.query('INSERT INTO negociacoes(lead_id) VALUES($1) ON CONFLICT(lead_id) DO NOTHING RETURNING *',[leadId]);
   const deal=inserted.rows[0]||(await client.query('SELECT * FROM negociacoes WHERE lead_id=$1',[leadId])).rows[0];
   if(inserted.rows.length)await client.query('INSERT INTO negociacao_eventos(negociacao_id,usuario_id,etapa,comissao_recebida) VALUES($1,$2,0,0)',[deal.id,req.usuario.id]);
   await client.query('COMMIT');res.status(inserted.rows.length?201:200).json({negociacao:deal});
  }catch(e){if(client)await client.query('ROLLBACK');error(res,e);}finally{client?.release();}
 });
 router.get('/:id/eventos',async(req,res)=>{try{
  const {rows}=await pool.query('SELECT l.corretor_id,li.inativa_manual FROM negociacoes n JOIN leads l ON l.id=n.lead_id JOIN listas li ON li.id=l.lista_id WHERE n.id=$1',[id(req.params.id)]);access(req,rows[0]);
  const events=await pool.query('SELECT e.*,u.nome AS usuario FROM negociacao_eventos e LEFT JOIN usuarios u ON u.id=e.usuario_id WHERE negociacao_id=$1 ORDER BY e.id DESC',[id(req.params.id)]);res.json({eventos:events.rows});
 }catch(e){error(res,e);}});
 router.patch('/:id',async(req,res)=>{
  let client;try{const dealId=id(req.params.id);client=await pool.connect();await client.query('BEGIN');
   // Lock the lead before the deal, matching insertion and ownership changes.
   const lead=await client.query('SELECT l.*,li.inativa_manual FROM leads l JOIN listas li ON li.id=l.lista_id JOIN negociacoes n ON n.lead_id=l.id WHERE n.id=$1 FOR UPDATE OF l',[dealId]);access(req,lead.rows[0]);
   if(!lead.rows[0].corretor_id)fail('Atribua um corretor ao cliente antes de movimentar a negociação.',409);
   const current=(await client.query('SELECT * FROM negociacoes WHERE id=$1 FOR UPDATE',[dealId])).rows[0];
   const next=transition(current,req.body);
   if(next.changed){
    if(current.etapa<3&&next.etapa>=3&&lead.rows[0].resultado!=='vendido'){
     await client.query("UPDATE leads SET status='qualificado',resultado='vendido',decidido_em=NOW(),agendamento_data=NULL,agendamento_local=NULL,data_reenvio=NULL WHERE id=$1",[current.lead_id]);
     await client.query("INSERT INTO historico(lead_id,corretor_id,acao,observacao) VALUES($1,$2,'vendido','Contrato assinado com a construtora na esteira comercial')",[current.lead_id,lead.rows[0].corretor_id]);
    }
    await client.query('UPDATE negociacoes SET etapa=$2,comissao_recebida=$3,versao=versao+1,atualizado_em=NOW(),vendido_em=CASE WHEN $2>=3 THEN COALESCE(vendido_em,NOW()) ELSE vendido_em END,concluido_em=CASE WHEN $2=5 THEN COALESCE(concluido_em,NOW()) ELSE concluido_em END WHERE id=$1',[dealId,next.etapa,next.comissao]);
    await client.query('INSERT INTO negociacao_eventos(negociacao_id,usuario_id,etapa_anterior,etapa,comissao_recebida) VALUES($1,$2,$3,$4,$5)',[dealId,req.usuario.id,current.etapa,next.etapa,next.comissao]);
   }
   await client.query('COMMIT');res.json({ok:true});
  }catch(e){if(client)await client.query('ROLLBACK');error(res,e);}finally{client?.release();}
 });
 return router;
};
