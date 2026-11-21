const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {atualizarResponsaveis}=require('../services/listaBatch');
test('redistribuição de 10000 contatos mantém pares em uma única gravação',async()=>{
 const calls=[];const rows=Array.from({length:10000},(_,i)=>[i+1,(i%3)+10]);
 await atualizarResponsaveis({query:async(sql,args)=>calls.push({sql,args})},rows);
 assert.equal(calls.length,1);assert.equal(calls[0].args[0].length,10000);
 for(let i=0;i<rows.length;i++)assert.deepEqual([calls[0].args[0][i],calls[0].args[1][i]],rows[i]);
 await atualizarResponsaveis({query:()=>{throw Error('Lote vazio');}},[]);
 await assert.rejects(atualizarResponsaveis({query:async()=>{throw Error('Falha de gravação');}},rows),/Falha de gravação/);
});
function handlers(pool){const routes=new Map();const router={use(){},get:(url,fn)=>routes.set('GET '+url,fn),patch:(url,fn)=>routes.set('PATCH '+url,fn),post(){},delete(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../routes/admin.js'),'utf8'),{console,module:{exports:{}},require:name=>name==='express'?{Router:()=>router}:name==='../config/db'?{pool}:{}});return routes;
}
test('hub consulta todas as carteiras com custo fixo e mantém totais por corretor',async()=>{
 let count=0;const pool={query:async sql=>{count++;if(sql.includes('ultimo_acesso'))return {rows:[]};if(sql.includes('FROM listas\n'))return {rows:[{id:1,total:'10',trabalhados:'3',nome:'A'},{id:2,total:'7',trabalhados:'2',nome:'B'}]};return {rows:[{lista_id:1,id:4,recebeu:'10',qualificou:'3',fila:'7',descartou:'0'},{lista_id:2,id:4,recebeu:'7',qualificou:'2',fila:'5',descartou:'0'}]};}};
 let output;await handlers(pool).get('GET /dashboard/carteiras')({}, {json:r=>output=r,status:()=>{throw Error('Falha na rota');}});
 assert.equal(count,3);assert.equal(output.carteiras.length,2);
 assert.equal(output.carteiras[0].corretores[0].recebeu,10);assert.equal(output.carteiras[1].corretores[0].recebeu,7);
});
test('mensagem é salva e valida existência em uma única consulta',async()=>{
 let calls=0,params,code=200;
 const routes=handlers({query:async(sql,args)=>{calls++;params=args;assert.match(sql,/UPDATE listas.*RETURNING id/);return {rows:[{id:9}]};}});
 await routes.get('PATCH /listas/:id/mensagem')({params:{id:9},body:{mensagemWhatsapp:'Olá'}},{json(){},status(c){code=c;return this;}});
 assert.equal(calls,1);assert.equal(code,200);assert.equal(params[0],'Olá');assert.equal(params[1],9);
});
