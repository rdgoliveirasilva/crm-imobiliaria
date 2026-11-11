const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'frontend/js/corretor.js'), 'utf8');
function scope() {
    const context = { window: { location: {} }, ApiClient: { get: async () => ({carteiras:[{id:1,nome:'Novembro',restantes:10},{id:2,nome:'Campanha',restantes:5}]}) }, console };
    vm.createContext(context);
    const carregar = source.slice(source.indexOf('    async function carregarCarteiras()'), source.indexOf('    function renderizarMenuCarteiras()'));
    const iniciar = source.slice(source.indexOf('    function iniciarProspeccao()'), source.indexOf('    /* =========================================================',source.indexOf('    function iniciarProspeccao()')));
    vm.runInContext(`let carteiras=[]; let carteiraAtiva=null; const carteiraNomeTop={}; function renderizarMenuCarteiras() {} function mostrarToast() {} ${carregar} ${iniciar}
        globalThis.load=carregarCarteiras; globalThis.start=iniciarProspeccao; globalThis.select=id=>carteiraAtiva=carteiras.find(c=>c.id===id)||null;
        globalThis.selected=()=>carteiraAtiva;`, context);
    return context;
}
test('entrada abre visão geral mesmo com carteiras que têm fila',async()=>{const c=scope();await c.load();assert.equal(c.selected(),null);c.start();assert.equal(c.window.location.href,'prospeccao.html?visao=geral');});
test('seleção explícita vai para a carteira escolhida e pode voltar à visão geral',async()=>{const c=scope();await c.load();c.select(2);c.start();assert.equal(c.window.location.href,'prospeccao.html?lista=2');c.select(null);c.start();assert.equal(c.window.location.href,'prospeccao.html?visao=geral');});
test('categorias mensais precedem campanhas; texto externo é escapado',()=>{
 const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'frontend/js/carteira-categorias.js'),'utf8')+';globalThis.render=CarteiraCategorias.renderizar;',c);
 const html=c.render([{categoria:'Campanhas'},{categoria:'Mensal'},{categoria:'<script>'},{}],()=>'<button>Lista</button>');
 assert.ok(html.indexOf('>Mensal<')<html.indexOf('>Campanhas<'));assert.ok(html.includes('Sem categoria'));assert.ok(!html.includes('<script>'));assert.equal(c.render([],()=>''),'');
});
