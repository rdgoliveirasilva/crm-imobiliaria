const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(get) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {innerHTML:'',textContent:'',focus(){}});
        return elements.get(id);
    };
    // Exposição apenas no contexto de teste; não adiciona API pública ao produto.
    const source = fs.readFileSync(path.join(__dirname,'../../frontend/js/admin-command.js'),'utf8')
        .replace('window.AdminCommand={connect', 'window.testApi={state,render,open,walletNumbers,userNumbers}; window.AdminCommand={connect');
    const window={addEventListener(){}};
    vm.runInNewContext(source, { window, document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){},body:{classList:{add(){},remove(){}}}},
        ApiClient:{get},Date,URLSearchParams,clearTimeout,console });
    return {api:window.AdminCommand,testApi:window.testApi,element};
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
