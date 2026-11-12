const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../frontend/js/corretor.js'), 'utf8');
const dashboard = source.slice(source.indexOf('async function carregarDashboard()'), source.indexOf('async function carregarListasAgendamentos()'));

function harness(carteiraAtiva, get) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, { textContent: '', style: {} });
        return elements.get(id);
    };
    const ctx = { $, carteiraAtiva, dashboardRequest: 0, stats: {}, ApiClient: { get },
        Intl, Date, console, carregarListasAgendamentos: async () => {},
        mostrarToast: message => { throw new Error(message); }, formatarTempo: String };
    function $(id) { return element(id); }
    for (const id of ['kpiTrabalhados', 'kpiEmAtendimento', 'kpiFollowUp', 'kpiNaFila', 'kpiMensagens', 'progressMensagens', 'kpiTempoMedio']) ctx[id] = element(id);
    vm.createContext(ctx);
    vm.runInContext(dashboard, ctx);
    return { ctx, element };
}

test('dashboard mantém mensagens classificadas distintas dos trabalhados e filtra agendados pela carteira', async () => {
    const urls = [];
    const { ctx, element } = harness({ id: 42 }, async url => {
        urls.push(url);
        return { trabalhados: 500, mensagens_enviadas: 12, retornar_depois: 8, porTag: { agendado: 3 } };
    });
    await ctx.carregarDashboard();
    assert.equal(urls[0], '/api/corretor/estatisticas?lista_id=42');
    assert.equal(element('kpiMensagens').textContent, 12);
    assert.equal(element('kpiAgendadosMobile').textContent, 3);
    assert.equal(element('kpiRetornosMobile').textContent, 8);
});

test('resposta antiga não substitui os indicadores após trocar a carteira', async () => {
    const pending = [];
    const { ctx, element } = harness(null, url => new Promise(resolve => pending.push({ url, resolve })));
    const oldRequest = ctx.carregarDashboard();
    ctx.carteiraAtiva = { id: 7 };
    const newRequest = ctx.carregarDashboard();
    pending[1].resolve({ mensagens_enviadas: 0, porTag: { agendado: 1 } });
    await newRequest;
    pending[0].resolve({ mensagens_enviadas: 90, porTag: { agendado: 20 } });
    await oldRequest;
    assert.equal(pending[0].url, '/api/corretor/estatisticas');
    assert.equal(element('kpiMensagens').textContent, 0);
    assert.equal(element('kpiAgendadosMobile').textContent, 1);
});
