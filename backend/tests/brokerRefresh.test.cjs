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
 vm.createContext(ctx);ctx.window={};ctx.URL=URL;vm.runInContext(fs.readFileSync(path.join(root,'js/property-hub.js'),'utf8'),ctx);ctx.PropertyHub=ctx.window.PropertyHub;vm.runInContext(source.slice(start,end),ctx);
 const rows=Array.from({length:19},(_,i)=>({id:i+1,nome:'Imóvel '+i}));ctx.renderizarEmpreendimentos(rows,2);
 assert.equal(($('grid').innerHTML.match(/data-property=/g)||[]).length,8);assert.match($('grid').innerHTML,/data-property="9"/);assert.doesNotMatch($('grid').innerHTML,/data-property="17"/);
 ctx.renderizarEmpreendimentos(rows.slice(0,3),9);assert.equal(ctx.paginaAtual,1);assert.equal(($('grid').innerHTML.match(/data-property=/g)||[]).length,3);
 ctx.renderizarEmpreendimentos([]);assert.equal($('grid').innerHTML,'');assert.equal($('empty').style.display,'block');
});
test('detalhes usam dialog consultivo e preservam filtros anteriores',()=>{
 const html=fs.readFileSync(path.join(root,'empreendimentos.html'),'utf8');
 assert.match(html,/<dialog id="modalEmpCorretor"/);assert.match(html,/<\/dialog>/);
 for(const id of ['empFiltroRenda','empFiltroEntrega','empFiltroCidade','empFiltroBairro','empFiltroConstrutora'])assert.ok(html.includes('id="'+id+'"'));
 const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});
test('páginas internas carregam shell, sidebar e estilos compartilhados sem duplicar conta admin',()=>{
 for(const file of ['conta','prospeccao','empreendimentos']){
  const html=fs.readFileSync(path.join(root,file+'.html'),'utf8');
  for(const asset of ['js/broker-shell.js','js/desktop-sidebar.js','css/broker-refresh.css','css/corretor-desktop.css'])assert.ok(html.includes(asset),`${file}: ${asset}`);
 }
 const {renderPage}=require('../services/adminPages');
 const admin=renderPage(fs.readFileSync(path.join(root,'admin.html'),'utf8'),fs.readFileSync(path.join(root,'conta.html'),'utf8'),'conta','Minha Conta');
 assert.doesNotMatch(admin,/js\/broker-shell.js|css\/broker-refresh.css/);
 assert.equal((admin.match(/src="js\/desktop-sidebar.js"/g)||[]).length,1);
});
test('shell do corretor não modifica a experiência administrativa',()=>{
 const source=fs.readFileSync(path.join(root,'js/broker-shell.js'),'utf8');
 vm.runInNewContext(source,{AuthSession:{getItem:()=> 'admin'},document:new Proxy({}, {get(){throw Error('Não deve alterar DOM do admin');}})});
 let listener,theme;
 vm.runInNewContext(source,{AuthSession:{getItem:()=> 'corretor'},document:{documentElement:{classList:{add:value=>theme=value}},addEventListener:(name,fn)=>listener=fn}});
 assert.equal(theme,'corretor-desktop-theme');assert.equal(typeof listener,'function');
});

test('prospecção agrupa os controles existentes sem recriar o cliente ou perder seus eventos',()=>{
 const source=fs.readFileSync(path.join(root,'js/broker-shell.js'),'utf8');
 class Element {
  constructor(){this.children=[];this.classList={add(){},contains:name=>name==='prospeccao-page'};}
  append(...nodes){for(const node of nodes){node.remove();this.children.push(node);node.parent=this;}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
  before(node){node.remove();const index=this.parent.children.indexOf(this);this.parent.children.splice(index,0,node);node.parent=this.parent;}
 }
 const body=new Element(),main=new Element(),progress=new Element(),selector=new Element(),theme=new Element(),account=new Element(),header=new Element(),back=new Element();
 body.append(header,progress,selector,main);header.append(back,account);account.append(theme);
 const clientHandler=()=>{};main.clientHandler=clientHandler;
 let ready;
 const elements={'.header-inner':header,'.app-main':main,'.header-user':account,'.desktop-sidebar-nav':new Element(),'.mobile-bottom-nav':new Element()};
 vm.runInNewContext(source,{AuthSession:{getItem:()=> 'corretor'},document:{body,documentElement:new Element(),addEventListener:(_,fn)=>ready=fn,createElement:()=>new Element(),querySelector:key=>elements[key],querySelectorAll:()=>[back],getElementById:id=>({progressBar:progress,carteiraSelectorWrap:selector,themeControl:theme})[id]}});
 ready();
 const workspace=body.children.find(node=>node.className==='broker-prospect-workspace');
 assert.ok(workspace);assert.deepEqual(workspace.children.slice(1),[progress,selector,main]);
 assert.equal(main.clientHandler,clientHandler);assert.equal(theme.parent,account);assert.equal(back.parent,null);
});
