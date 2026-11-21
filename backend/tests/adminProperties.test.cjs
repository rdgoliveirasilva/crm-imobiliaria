const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../frontend/js/admin-properties.js'),'utf8');
const context={window:{},URL};vm.runInNewContext(source,context);const hub=context.window.AdminProperties;
const items=[{id:1,nome:'Águas',construtora:'A',bairro:'Centro',fase:'Entregue',status:'rascunho'},{id:2,nome:'Jardim',construtora:'A',bairro:'Sul',fase:'Em obras',status:'publicado'},{id:3,nome:'Bosque',construtora:'B',bairro:'Centro',fase:'Lançamento'},{id:4,nome:'Sem cadastro'}];
test('indicadores usam registros reais, valores distintos e fase entregue independente da publicação',()=>{
 assert.deepEqual(Array.from(hub.totals(items)),[4,2,2,1]);assert.deepEqual(Array.from(hub.totals([])),[0,0,0,0]);
});
test('busca ignora acentos e combina bairro e construtora sem alterar dados',()=>{
 assert.equal(hub.filter(items,'aguas','Centro','A')[0].id,1);
 assert.equal(hub.filter(items,'','Centro','B')[0].id,3);
 assert.equal(hub.filter(items,'','Sul','B').length,0);
 assert.equal(hub.filter(items,'','','').length,4);assert.equal(items[0].status,'rascunho');
});
test('detalhes não permitem URLs executáveis e escapam dados cadastrados',()=>{
 const safe={window:{},URL};vm.runInNewContext(source.replace('return { update, filter, totals, fail','return { esc, url, update, filter, totals, fail'),safe);
 assert.equal(safe.window.AdminProperties.url('javascript:alert(1)'),'');
 assert.equal(safe.window.AdminProperties.url('https://example.com/book.pdf'),'https://example.com/book.pdf');
 assert.equal(safe.window.AdminProperties.esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
});
