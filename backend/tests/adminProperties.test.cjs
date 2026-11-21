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
 const safe={window:{},URL};vm.runInNewContext(source.replace('return { update, filter, totals, paginate','return { esc, url, update, filter, totals, paginate'),safe);
 assert.equal(safe.window.AdminProperties.url('javascript:alert(1)'),'');
 assert.equal(safe.window.AdminProperties.url('https://example.com/book.pdf'),'https://example.com/book.pdf');
 assert.equal(safe.window.AdminProperties.esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
});

test('paginação mostra oito por página, filtra antes do recorte e ajusta remoções',()=>{
 const rows=Array.from({length:19},(_,id)=>({id,nome:'Imóvel '+id,bairro:id<9?'Centro':'Sul'}));
 const first=hub.paginate(rows,1),last=hub.paginate(rows,3);
 assert.equal(first.items.length,8);assert.equal(first.pages,3);assert.equal(first.items[7].id,7);
 assert.equal(last.items.length,3);assert.equal(last.items[0].id,16);
 const filtered=hub.paginate(hub.filter(rows,'','Centro',''),3);
 assert.equal(filtered.page,2);assert.equal(filtered.items.length,1);assert.equal(filtered.items[0].id,8);
 const empty=hub.paginate([],3);assert.equal(empty.page,1);assert.equal(empty.total,0);assert.equal(empty.items.length,0);
});
test('importação libera o top layer para confirmação e retoma somente quando estava aberta',()=>{
 const classes=new Set();const scope={window:{},URL,document:{body:{classList:{add:c=>classes.add(c)}}}};
 vm.runInNewContext(source.replace('return { update, filter, totals, paginate','return { setImport(d){importDialog=d;}, update, filter, totals, paginate'),scope);
 const api=scope.window.AdminProperties;let closed=0,opened=0;
 const dialog={open:true,close(){this.open=false;closed++;},showModal(){this.open=true;opened++;}};
 api.setImport(dialog);const resume=api.pauseImport();assert.equal(dialog.open,false);resume();assert.equal(dialog.open,true);assert.equal(closed,1);assert.equal(opened,1);
 api.closeImport();assert.equal(dialog.open,false);api.pauseImport()();assert.equal(opened,1);
});
