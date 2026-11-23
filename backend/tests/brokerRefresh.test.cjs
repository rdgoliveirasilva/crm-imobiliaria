const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.join(__dirname,'../../frontend');
test('dashboard mantém o tema ao lado das carteiras e prospecção somente na navegação mobile',()=>{
 const html=fs.readFileSync(path.join(root,'corretor.html'),'utf8');
 const nav=html.match(/<nav class="desktop-sidebar-nav"[\s\S]*?<\/nav>/)[0];assert.doesNotMatch(nav,/Prospecção|desktopIniciarProspeccao/);
 assert.match(html,/<a class="broker-building-link" href="empreendimentos.html"/);
 assert.ok(html.indexOf('id="themeControl"')>html.indexOf('class="dash-top-actions"'));
 assert.equal((html.match(/id="themeControl"/g)||[]).length,1);assert.match(html,/class="mobile-prospect"|id="mobileIniciarProspeccao"/);
});
test('vitrine do corretor pagina oito cards e continua sem operações administrativas',()=>{
 const source=fs.readFileSync(path.join(root,'js/empreendimentos.js'),'utf8');
 assert.doesNotMatch(source,/api\/admin|ApiClient\.(post|patch|del)/);
 const start=source.indexOf('    function renderizarEmpreendimentos(lista');const end=source.indexOf('    /* =',start);
 const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{style:{},innerHTML:'',textContent:'',addEventListener(){},querySelectorAll(){return [];}});return nodes.get(id);};
 const ctx={$,paginaAtual:1,listaFiltrada:[],todosEmpreendimentos:[],empTotalCount:$('total'),empVazio:$('empty'),empVazioMensagem:$('message'),empGridVitrine:$('grid'),escapeHtml:s=>String(s||''),abrirDetalhesEmp(){}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const rows=Array.from({length:19},(_,i)=>({id:i+1,nome:'Imóvel '+i}));ctx.renderizarEmpreendimentos(rows,2);
 assert.equal(($('grid').innerHTML.match(/data-id=/g)||[]).length,8);assert.match($('grid').innerHTML,/data-id="9"/);assert.doesNotMatch($('grid').innerHTML,/data-id="17"/);
 ctx.renderizarEmpreendimentos(rows.slice(0,3),9);assert.equal(ctx.paginaAtual,1);assert.equal(($('grid').innerHTML.match(/data-id=/g)||[]).length,3);
 ctx.renderizarEmpreendimentos([]);assert.equal($('grid').innerHTML,'');assert.equal($('empty').style.display,'block');
});
test('detalhes usam dialog consultivo e preservam filtros anteriores',()=>{
 const html=fs.readFileSync(path.join(root,'empreendimentos.html'),'utf8');
 assert.match(html,/<dialog id="modalEmpCorretor"/);assert.match(html,/<\/dialog>/);
 for(const id of ['empFiltroRenda','empFiltroEntrega','empFiltroCidade','empFiltroBairro','empFiltroConstrutora','btnAbrirBook'])assert.ok(html.includes('id="'+id+'"'));
 const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});
