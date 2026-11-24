const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function routes(pool) {
    const handlers = new Map();
    const router = { use() {}, get(url, fn) { handlers.set(url, fn); }, post() {}, patch() {}, delete() {}, put() {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/corretor.js'), 'utf8'), {
        module: { exports: {} }, console: { error() {}, log() {} }, require(name) {
            if (name === 'express') return { Router: () => router };
            if (name === '../config/db') return { pool };
            return {};
        }
    });
    return handlers;
}

test('próximo lead só responde depois de concluir e liberar a redistribuição', async () => {
    const calls = [];
    let finish;
    const blocked = new Promise(resolve => { finish = resolve; });
    const client = { async query(sql) {
        calls.push(sql);
        if (sql.includes('SELECT id, corretor_id')) { await blocked; return { rows: [] }; }
        return { rows: [] };
    }, release() { calls.push('release'); } };
    const handlers = routes({ connect: async () => client, query: async () => ({ rows: [{ id: 42 }] }) });
    let response;
    const running = handlers.get('/proximo-lead')({ usuario: { id: 1 }, query: {} }, { json(value) { response = value; calls.push('response'); } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(response, undefined);
    assert.ok(calls.some(sql => sql.includes('idle_in_transaction_session_timeout')));
    assert.ok(calls.some(sql => sql.includes('NOWAIT')));
    assert.ok(calls.some(sql => sql.includes('LIMIT 10')));
    finish();
    await running;
    assert.equal(response.lead.id, 42);
    assert.ok(calls.indexOf('COMMIT') < calls.indexOf('release'));
    assert.ok(calls.indexOf('release') < calls.indexOf('response'));
});

test('bloqueio ocupado reverte manutenção e ainda permite buscar o próximo cliente', async () => {
    const calls = [];
    const client = { async query(sql) { calls.push(sql); if (sql.startsWith('LOCK TABLE')) throw Error('lock not available'); return { rows: [] }; }, release() { calls.push('release'); } };
    const handlers = routes({ connect: async () => client, query: async () => ({ rows: [] }) });
    let response;
    await handlers.get('/proximo-lead')({ usuario: { id: 1 }, query: {} }, { json(value) { response = value; } });
    assert.equal(response.lead, null);
    assert.ok(calls.includes('ROLLBACK'));
    assert.equal(calls.at(-1), 'release');
});

test('resumo da prospecção mantém filtro e contadores sem consultar histórico', async () => {
    const queries = [];
    const handlers = routes({ async query(sql, args) {
        queries.push({ sql, args });
        if (sql.includes('GROUP BY resultado')) return { rows: [{ resultado: 'mensagem_enviada', count: '2' }] };
        return { rows: [{ total: '10', trabalhados: '4', na_fila: '6', descartados: '1' }] };
    } });
    let result;
    await handlers.get('/estatisticas')({ usuario: { id: 8 }, query: { resumo: '1', lista_id: '7' } }, { json(value) { result = value; } });
    assert.equal(queries.length, 2);
    assert.ok(queries.every(q => !q.sql.includes('historico') && q.args[0] === 8 && q.args[1] === 7));
    assert.equal(result.mensagens_enviadas, 2);
    assert.equal(result.restantes, 6);
    assert.equal(result.trabalhados, 4);
});

test('qualificação confirmada limpa cliente anterior e busca próximo sem aguardar estatísticas', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../../frontend/js/prospeccao.js'), 'utf8');
    const start = source.indexOf('async function salvarResultadoDireto(');
    const end = source.indexOf('function abrirModalAgendamento(', start);
    const calls = [];
    const context = { processando: false, leadAtual: { id: 42 }, observacao: null,
        ApiClient: { post: async () => calls.push('saved') },
        mostrarTelaEspera: () => calls.push('waiting'),
        carregarProximoLead: async () => calls.push('next'),
        atualizarEstatisticas: () => { throw Error('Não deve bloquear avanço'); },
        mostrarToast: () => { throw Error('Falha inesperada'); } };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end), context);
    await context.salvarResultadoDireto(42, 'mensagem_enviada');
    assert.equal(context.leadAtual, null);
    assert.deepEqual(calls, ['saved', 'waiting', 'next']);
});
test('telemetria de qualificação ocorre no clique e não na atualização dos contadores',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/js/prospeccao.js'),'utf8');
 const before=source.slice(source.indexOf('const tag = btn.dataset.tag;'),source.indexOf('async function handleTagClick'));
 assert.doesNotMatch(before,/record\('qualificacao'/);
 const handler=source.slice(source.indexOf('async function handleTagClick'),source.indexOf('async function handleTagClick')+500);
 const calls=[];
 const prefix=handler.slice(0,handler.indexOf("if (tag === 'agendado'"));
 const context={leadAtual:{id:31},processando:false,window:{ContatoEvents:{record:(...args)=>calls.push(args)}}};
 vm.runInNewContext(prefix+'}\nhandleTagClick({dataset:{tag:"mensagem_enviada"}});',context);
 assert.deepEqual(calls,[['qualificacao',31]]);
});

test('histórico integrado pagina no servidor e ignora respostas de carteiras anteriores', async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/js/prospeccao.js'),'utf8');
 const start=source.indexOf('async function abrirHistorico()');const end=source.indexOf("    $('resumeProspecting').addEventListener",start);
 const requests=[],nodes={historySearch:{value:'Ana'},historyPagination:{querySelectorAll:()=>[],innerHTML:''}};
 const context={historyRequest:0,historyPage:2,carteiraAtiva:{id:7,nome:'Mensal'},URLSearchParams,
  $:id=>nodes[id],historicoLista:{setAttribute(){}},historicoVazio:{style:{}},historicoResumo:{},leadsDaCarteiraAtual:[],
  renderizarListaLeads(leads){context.rendered=leads;},ApiClient:{get:url=>new Promise(resolve=>requests.push({url,resolve}))}};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const older=context.abrirHistorico();context.carteiraAtiva={id:8,nome:'Campanha'};context.historyPage=1;const latest=context.abrirHistorico();
 assert.match(requests[0].url,/pagina=2/);assert.match(requests[0].url,/lista_id=7/);assert.match(requests[1].url,/lista_id=8/);
 requests[1].resolve({pagina:1,paginas:2,total:31,leads:[{id:99}]});await latest;
 requests[0].resolve({pagina:2,paginas:2,total:60,leads:[{id:1}]});await older;
 assert.equal(context.rendered[0].id,99);assert.match(context.historicoResumo.textContent,/Campanha/);assert.match(nodes.historyPagination.innerHTML,/1–30 de 31/);
});

test('abrir cliente do histórico preenche a ficha sem gravar qualificação',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/js/prospeccao.js'),'utf8');
 const start=source.indexOf('async function abrirLeadEspecifico('),end=source.indexOf('function mostrarBadgeAgendamento(',start);
 const selected={id:42,nome:'Cliente',telefone:'16999999999',lista_nome:'Mensal',observacao:'Retorno combinado',resultado:'em_atendimento'};
 const resume={hidden:true},context={processando:false,leadRequest:0,leadAtual:null,$:()=>resume,
 ApiClient:{get:async url=>{assert.equal(url,'/api/corretor/lead/42');return {lead:selected};}},
 leadNome:{focus(){}},leadTelefone:{},leadOrigem:{},Acoes:{formatarTelefone:x=>x},removerBadgeAgendamento(){},mostrarBadgeAgendamento(){},resultList:null,observacao:{},callNotice:{style:{}},mostrarTelaLead(){},atualizarEstatisticas(){},leadState:{scrollIntoView(){}},mostrarToast(){},console};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);await context.abrirLeadEspecifico(42);
 assert.equal(context.leadAtual,selected);assert.equal(context.observacao.value,'Retorno combinado');assert.equal(context.leadNome.textContent,'Cliente');assert.equal(resume.hidden,false);assert.equal(context.processando,false);
});

test('ficha do histórico mostra data, telefone e ação explícita de requalificar',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/js/prospeccao.js'),'utf8');
 const start=source.indexOf('function renderizarListaLeads('),end=source.indexOf('function atualizarCardHistorico(',start);
 const list={innerHTML:''};
 const context={historicoLista:list,tagCor:()=> 'warning',tagParaTexto:()=> 'Mensagem enviada',parseDataSegura:value=>new Date(value),parseDataAgendamento:value=>new Date(value),escapeHtml:value=>String(value),Acoes:{formatarTelefone:value=>value}};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 context.renderizarListaLeads([{id:7,nome:'Cliente com nome completo',telefone:'16999999999',resultado:'mensagem_enviada',decidido_em:'2026-11-24T12:00:00Z',observacao:'Retornar após o almoço'}]);
 assert.match(list.innerHTML,/Qualificado em: 24\/11\/26/);
 assert.match(list.innerHTML,/history-requalify/);assert.match(list.innerHTML,/> Requalificar<\/span>/);
 assert.match(list.innerHTML,/16999999999/);assert.match(list.innerHTML,/Retornar após o almoço/);assert.match(list.innerHTML,/data-open-lead="7"/);
});
