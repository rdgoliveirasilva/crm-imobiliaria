const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {renderPage,registerAdminPages,pages}=require('../services/adminPages');
const frontend=path.join(__dirname,'../../frontend');
const admin=fs.readFileSync(path.join(frontend,'admin.html'),'utf8');
const account=fs.readFileSync(path.join(frontend,'conta.html'),'utf8');
test('páginas próprias têm destino fixo, título e painel inicial corretos',()=>{
 for(const [url,[page,title]] of Object.entries(pages)){
  const html=renderPage(admin,account,page,title);
  assert.match(html,new RegExp('<title>Prospect - '+title+'</title>'));
  const nav=html.match(/<nav class="admin-nav"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/class="nav-tab/g)||[]).length,6);
  assert.doesNotMatch(nav,/Subir|Categorias|WhatsApp/);
  assert.match(nav,/href="admin-carteiras.html"/);assert.match(nav,/href="admin-corretores.html"/);
  if(page!=='conta'){
   assert.match(html,new RegExp('data-admin-page="'+page+'"'));
   assert.match(html,new RegExp('class="tab-panel active" id="tab-'+page+'"'));
   assert.equal((html.match(/class="tab-panel active"/g)||[]).length,1);
  }
  const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,`IDs únicos em ${url}`);
 }
});
test('conta admin preserva campos e controladores, com tema e navegação compartilhados',()=>{
 const html=renderPage(admin,account,'conta','Minha Conta');
 for(const id of ['nome','usuario','headerUserName','themeToggle'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const file of ['conta.js','admin-account.js','desktop-sidebar.js','admin-mobile-nav.js'])assert.ok(html.includes('js/'+file));
 assert.match(html,/class="admin-desktop-theme"/);assert.match(html,/css\/admin-account.css/);
 assert.doesNotMatch(html,/mobile-inner-page|js\/admin.js|js\/admin-command.js/);
});
test('rotas retornam HTML próprio em acesso direto sem inicializar banco',async()=>{
 const routes=new Map();registerAdminPages({get:(url,handler)=>routes.set(url,handler)},frontend);
 for(const [url,handler] of routes){
  let result,type;
  await handler({}, {type(value){type=value;return this;},send(value){result=value;}},error=>{throw error;});
  assert.equal(type,'html');assert.ok(result.includes('<title>Prospect - '+pages[url][1]+'</title>'));
 }
});
test('guard protege todas as páginas admin e encaminha conta conforme o perfil',()=>{
 const vm=require('node:vm');const source=fs.readFileSync(path.join(frontend,'js/auth-guard.js'),'utf8');
 function run(page,tipo){let redirect=null,cleared=false;vm.runInNewContext(source,{AuthSession:{getItem:key=>key==='sr_token'?'token':tipo,clear(){cleared=true;}},window:{location:{pathname:'/'+page,replace:url=>redirect=url}},sessionStorage:{setItem(){}}});return {redirect,cleared};}
 for(const url of Object.keys(pages))assert.deepEqual(run(url.slice(1),'corretor'),{redirect:'index.html',cleared:true});
 assert.equal(run('conta.html','admin').redirect,'admin-conta.html');
 assert.equal(run('conta.html','corretor').redirect,null);
 assert.equal(run('admin-conta.html','admin').redirect,null);
});
