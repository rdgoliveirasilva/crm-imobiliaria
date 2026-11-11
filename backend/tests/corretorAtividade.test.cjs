const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture({ fail = false } = {}) {
    let state = { ativo: true, membros: [1], leads: [
        {id:1,lista_id:10,corretor_id:1,resultado:null,status:'novo'},
        {id:2,lista_id:10,corretor_id:1,resultado:'agendado',status:'qualificado'},
        {id:3,lista_id:11,corretor_id:1,resultado:'telefone_invalido',status:'descartado'},
        {id:4,lista_id:10,corretor_id:1,resultado:'sem_interesse',status:'descartado'},
        {id:5,lista_id:10,corretor_id:1,resultado:'sem_resposta',status:'sem_resposta',data_reenvio:'amanha'}
    ]};
    let snapshot, released = 0;
    const protectedLead = l => ['sem_interesse','sem_resposta'].includes(l.resultado) || l.status === 'sem_resposta';
    const client = {release(){released++;}, async query(sql,args=[]) {
        if(sql === 'BEGIN') snapshot=structuredClone(state);
        else if(sql === 'ROLLBACK') state=snapshot;
        else if(sql.startsWith('SELECT id, ativo')) return {rows:[{id:1,ativo:state.ativo}]};
        else if(sql.startsWith('UPDATE usuarios')) state.ativo=args[1];
        else if(sql.startsWith('DELETE FROM lista_corretores')) state.membros=[];
        else if(sql.startsWith('UPDATE leads SET data_reenvio')) state.leads.filter(protectedLead).forEach(l=>l.data_reenvio=null);
        else if(sql.startsWith('SELECT id, lista_id')) return {rows:state.leads.filter(l=>l.corretor_id===1&&!protectedLead(l))};
        else if(sql.startsWith('SELECT u.id')) return {rows:args[0]===10?[{id:2},{id:3}]:[]};
        else if(sql.startsWith('UPDATE leads SET corretor_id')) {if(fail) throw Error('falha de escrita');args[0].forEach((id,i)=>state.leads.find(l=>l.id===id).corretor_id=args[1][i]);}
        else if(sql.startsWith('SELECT id FROM usuarios')) return {rows:args[0].includes(1)&&!state.ativo?[]:args[0].map(id=>({id}))};
        return {rows:[]};
    }};
    const module={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../services/corretorAtividade.js'),'utf8'),{module,require:()=>({pool:{connect:async()=>client}}),console});
    return {...module.exports,client,get state(){return state;},get released(){return released;}};
}
test('inativar distribui na lista, mantém exceções e cria órfãos',async()=>{
    const f=fixture();const r=await f.alterarAtividade(1,false);
    assert.equal(r.redistribuidos,2);assert.equal(r.orfaos,1);
    assert.deepEqual(f.state.leads.map(l=>l.corretor_id),[2,3,null,1,1]);
    assert.equal(f.state.leads[1].resultado,'agendado');
    assert.equal(f.state.leads[4].data_reenvio,null);assert.equal(f.state.membros.length,0);assert.equal(f.released,1);
});
test('reativar não recupera clientes ou listas; repetir inativação é idempotente',async()=>{
    const f=fixture();await f.alterarAtividade(1,false);const r=await f.alterarAtividade(1,false);assert.equal(r.redistribuidos,0);
    await f.alterarAtividade(1,true);assert.equal(f.state.ativo,true);assert.equal(f.state.membros.length,0);assert.deepEqual(f.state.leads.map(l=>l.corretor_id),[2,3,null,1,1]);
});
test('falha reverte atividade, participação e reenvio',async()=>{
    const f=fixture({fail:true});await assert.rejects(f.alterarAtividade(1,false));assert.equal(f.state.ativo,true);assert.deepEqual(f.state.membros,[1]);assert.equal(f.state.leads[4].data_reenvio,'amanha');assert.equal(f.released,1);
});
test('seleção antiga não distribui para inativo',async()=>{
    const f=fixture();await f.alterarAtividade(1,false);await assert.rejects(f.validarCorretoresAtivos(f.client,[1]),{status:400});
});
test('middleware recusa token válido de inativo e usa papel atual do banco',async()=>{
    let rows=[],fail=false,next=0,code;
    const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../middlewares/auth.js'),'utf8'),{module,process:{env:{}},console:{error(){}},require:n=>n==='jsonwebtoken'?{verify:()=>({id:1,tipo:'admin'})}:n==='dotenv'?{config(){}}:{pool:{query:async()=>{if(fail)throw Error('offline');return {rows};}}}});
    const req={headers:{authorization:'Bearer valid'}};const res={status(n){code=n;return this;},json(){}};
    await module.exports.autenticar(req,res,()=>next++);assert.equal(code,401);assert.equal(next,0);
    rows=[{id:1,tipo:'corretor'}];await module.exports.autenticar(req,res,()=>next++);assert.equal(next,1);assert.equal(req.usuario.tipo,'corretor');
    fail=true;await module.exports.autenticar(req,res,()=>next++);assert.equal(code,503);assert.equal(next,1);
});
