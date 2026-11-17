const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(get, withCharts=false) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {innerHTML:'',textContent:'',focus(){}});
        return elements.get(id);
    };
    // Exposição apenas no contexto de teste; não adiciona API pública ao produto.
    const source = fs.readFileSync(path.join(__dirname,'../../frontend/js/admin-command.js'),'utf8')
        .replace('window.AdminCommand={connect', 'window.testApi={state,render,open,walletNumbers,userNumbers,tags,filterHealth,withoutRecentAccess,teamTable,walletHub,liveTeam}; window.AdminCommand={connect');
    const charts=[];
    function Chart(canvas,config){Object.assign(this,config);this.destroy=()=>{};charts.push(this);}
    const window={addEventListener(){},matchMedia:()=>({matches:false}),Chart:withCharts?Chart:undefined};
    vm.runInNewContext(source, { window, Chart, getComputedStyle:()=>({getPropertyValue:()=>''}), document:{documentElement:{},getElementById:element,querySelectorAll:()=>[],addEventListener(){},body:{classList:{add(){},remove(){}}}},
        ApiClient:{get},Date,URLSearchParams,clearTimeout,console });
    return {api:window.AdminCommand,testApi:window.testApi,element,charts};
}
const sample = {
    '/api/admin/dashboard':{totalContatos:10,qualificados:4,porTag:{em_atendimento:2},porCorretor:[{id:9,total:10,qualificados:3}]},
    '/api/admin/dashboard/graficos':{linha:{labels:['01/11'],qualificados:[2],descartados:[1],requalificados:[5]},donut:{labels:['Sem qualificação'],chaves:['sem_qualificacao'],valores:[6]}},
    '/api/admin/dashboard/carteiras':{carteiras:[{lista_id:23,nome:'<Carteira>',total:'10',corretores:[{id:9,nome:'Nome privado',qualificou:4,recebeu:10}]}],corretoresResumo:[]},
    '/api/admin/corretores':{corretores:[{id:9,nome:'Corretor',ativo:true,tipo:'corretor',total_leads:10}]}
};
test('admin usa APIs existentes, totais reais e não mostra desempenho individual no card',async()=>{
    const urls=[];
    const f=fixture(async url=>{urls.push(url);return sample[url];});
    await f.api.refresh();
    assert.equal(urls.length,4);
    f.testApi.state.view='carteira';f.testApi.render();
    const html=f.element('ccContent').innerHTML;
    assert.match(html,/40%/);assert.match(html,/&lt;Carteira&gt;/);
    assert.doesNotMatch(html,/Nome privado/);
    assert.equal(f.testApi.walletNumbers(sample['/api/admin/dashboard/carteiras'].carteiras[0]).pending,6);
    f.testApi.state.view='corretor';f.testApi.render();
    assert.match(f.element('ccContent').innerHTML,/Não fornecido pela API atual/);
    assert.equal(f.testApi.userNumbers(sample['/api/admin/corretores'].corretores[0]).rate,30);
});
test('admin agrupa atualizações concorrentes e permite tentar novamente após falha',async()=>{
    let fail=true,calls=0;
    const f=fixture(async url=>{calls++;if(fail)throw Error('offline');return sample[url];});
    await Promise.all([f.api.refresh(),f.api.refresh()]);
    assert.equal(calls,4);assert.match(f.element('ccContent').innerHTML,/Não foi possível/);
    fail=false;await f.api.refresh();assert.equal(calls,8);
    assert.match(f.element('ccContent').innerHTML,/Saúde da operação/);
});
test('slide over ignora resposta de carteira anterior e sinaliza requalificações indisponíveis',async()=>{
    let resolve;
    const f=fixture(async url=> url.includes('?lista_id=') ? new Promise(r=>resolve=r) : sample[url]);
    await f.api.refresh();
    const old=f.testApi.open('wallet',23);
    await f.testApi.open('user',9,'requalificacoes');
    resolve(sample['/api/admin/dashboard/graficos']);await old;
    assert.match(f.element('ccDrawerContent').innerHTML,/não estão disponíveis/);
    assert.doesNotMatch(f.element('ccDrawerContent').innerHTML,/Progresso da carteira/);
});

test('saúde mantém cores e ordem por qualificação mesmo quando os totais mudam',()=>{
    const f=fixture(async()=>({}));
    const a=f.testApi.tags({chaves:['em_atendimento','sem_qualificacao'],labels:['Em atendimento','Sem qualificação'],valores:[4,6]});
    const b=f.testApi.tags({chaves:['sem_qualificacao','em_atendimento'],labels:['Sem qualificação','Em atendimento'],valores:[1,9]});
    for(const html of [a,b]) {
        assert.ok(html.indexOf('data-tag="sem_qualificacao"')<html.indexOf('data-tag="em_atendimento"'));
        assert.match(html,/data-tag="em_atendimento"[^>]*--tag:#23cba5/);
    }
    assert.match(a,/40% da base trabalhada/);assert.match(b,/90% da base trabalhada/);
});
test('filtro da saúde ignora respostas antigas e persiste ao trocar de visão',async()=>{
    const pending=[];
    const f=fixture(url=>url.includes('?corretor_id=')?new Promise(resolve=>pending.push(resolve)):Promise.resolve(sample[url]));
    await f.api.refresh();
    const old=f.testApi.filterHealth('1'),current=f.testApi.filterHealth('9');
    pending[1]({donut:{chaves:['em_atendimento'],labels:['Em atendimento'],valores:[3]}});await current;
    pending[0]({donut:{chaves:['em_atendimento'],labels:['Em atendimento'],valores:[999]}});await old;
    assert.equal(f.testApi.state.healthUser,'9');assert.equal(f.testApi.state.healthData.valores[0],3);
    f.testApi.state.view='carteira';f.testApi.render();f.testApi.state.view='geral';f.testApi.render();
    assert.match(f.element('ccContent').innerHTML,/value="9" selected/);assert.doesNotMatch(f.element('ccHealth').innerHTML,/999/);
});
test('atualização automática não busca nem redesenha durante detalhe aberto',async()=>{
    let calls=0;const f=fixture(async url=>{calls++;return sample[url];});
    await f.api.refresh();f.testApi.state.drawer={type:'wallet',id:23};
    await f.api.refresh({background:true});assert.equal(calls,4);
    f.testApi.state.drawer=null;await f.api.refresh({background:true});assert.equal(calls,8);
});
test('KPIs têm ações reais e alerta de acesso restringe a tabela',async()=>{
    const f=fixture(async url=>sample[url]);await f.api.refresh();
    assert.match(f.element('ccContent').innerHTML,/class="cc-metric cc-metric-action" data-tag="em_atendimento" data-global="true"/);
    f.testApi.state.userAttention=true;
    f.testApi.state.summary=[{id:9,ultimo_acesso:new Date().toISOString()}];
    assert.doesNotMatch(f.testApi.teamTable(),/data-user="9"/);
    f.testApi.state.summary=[];assert.match(f.testApi.teamTable(),/data-user="9"/);
});

test('hub pagina seis carteiras, limita a página após filtro e não perde itens',async()=>{
    const f=fixture(async url=>sample[url]);await f.api.refresh();
    f.testApi.state.wallets=Array.from({length:14},(_,i)=>({lista_id:i+1,nome:'Carteira '+(i+1),total:5,corretores:[]}));
    const seen=[];
    for(let page=1;page<=3;page++){
        f.testApi.state.hubPage=page;
        const html=f.testApi.walletHub(true);
        const ids=[...html.matchAll(/data-wallet="(\d+)"/g)].map(m=>Number(m[1]));
        assert.equal(ids.length,page===3?2:6);seen.push(...ids);
    }
    assert.deepEqual(seen,Array.from({length:14},(_,i)=>i+1));
    f.testApi.state.search='Carteira 14';const filtered=f.testApi.walletHub(false);
    assert.equal(f.testApi.state.hubPage,1);assert.match(filtered,/1–1 de 1 carteiras/);
});
test('tooltip por dia contém as três séries inclusive valores zero',async()=>{
    const f=fixture(async url=>sample[url],true);await f.api.refresh();
    const chart=f.charts[0];assert.equal(chart.options.interaction.mode,'index');
    assert.equal(chart.options.interaction.intersect,false);
    assert.deepEqual(Array.from(chart.data.datasets,d=>d.label),['Primeiras qualificações','Descartados','Requalificações']);
    const callback=chart.options.plugins.tooltip.callbacks;
    assert.equal(callback.title([{label:'17/11'}]),'Dia 17/11');
    assert.equal(callback.label({dataset:{label:'Descartados'},parsed:{y:0}}),'Descartados: 0');
});
test('equipe ao vivo mostra presença e último acesso sem tratar offline como online',async()=>{
    const f=fixture(async url=>sample[url]);await f.api.refresh();
    f.testApi.state.summary=[{id:9,nome:'Maria',status:'offline',ultimo_acesso:null,total_carteira:10,total_qualificados:2}];
    const html=f.testApi.liveTeam();assert.match(html,/data-presence="offline"/);
    assert.match(html,/Último acesso: Nunca acessou/);assert.match(html,/2 \/ 10 trabalhados/);
});
