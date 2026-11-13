const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { montarEvolucao } = require('../services/corretorGraficos');

test('comparação diária calcula alta, queda e igualdade sem dividir por zero', () => {
    for (const [ontem, hoje, percentual] of [[10, 15, 50], [10, 5, -50], [10, 10, 0], [0, 4, null], [0, 0, null], [7, 8, 14.3]]) {
        const result = montarEvolucao([
            { dia: '2026-11-11', mensagens: String(ontem), qualificados: '3', descartados: '1', requalificados: '2' },
            { dia: '2026-11-12', mensagens: String(hoje), qualificados: '0', descartados: '0', requalificados: '5' }
        ]);
        assert.deepEqual(result.comparacao, { hoje, ontem, diferenca: hoje - ontem, percentual });
        assert.deepEqual(result.labels, ['11/11', '12/11']);
        assert.deepEqual(result.requalificados, [2, 5]);
    }
});

test('evolução usa o usuário autenticado, ignora corretor informado e valida carteira', async () => {
    const routes = new Map(), calls = [];
    const router = { use() {}, get(url, fn) { routes.set(url, fn); }, post() {}, patch() {}, delete() {}, put() {} };
    const context = { module: { exports: {} }, console, require(name) {
        if (name === 'express') return { Router: () => router };
        if (name === '../config/db') return { pool: {} };
        if (name === '../middlewares/auth') return {};
        if (name === '../services/corretorGraficos') return { carregarEvolucao: async (...args) => { calls.push(args.slice(1)); return {}; } };
        throw Error('Dependência inesperada: ' + name);
    } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/corretor.js'), 'utf8'), context);
    const route = routes.get('/evolucao');
    let status;
    const res = { json() {}, status(value) { status = value; return this; } };
    await route({ usuario: { id: 8 }, query: { corretor_id: '99', lista_id: '7' } }, res);
    assert.deepEqual(calls[0], [8, 7]);
    await route({ usuario: { id: 8 }, query: {} }, res);
    assert.deepEqual(calls[1], [8, null]);
    for (const lista_id of ['abc', '-1', '0', '1.5', '', '9007199254740992']) {
        await route({ usuario: { id: 8 }, query: { lista_id } }, res);
        assert.equal(status, 400);
    }
    assert.equal(calls.length, 2);
});

test('gráficos respeitam a visibilidade, habilitam desktop temático e ignoram resposta antiga', async () => {
    const elementos = new Map(), pending = [], charts = [];
    const media = { matches: false, addEventListener() {} };
    let desktopTematico = false;
    const get = id => {
        if (!elementos.has(id)) elementos.set(id, { textContent: '', dataset: {}, setAttribute() {}, getContext: () => ({ createLinearGradient: () => ({ addColorStop() {} }) }) });
        return elementos.get(id);
    };
    function Chart(ctx, config) { charts.push(config); this.destroy = () => {}; }
    const window = { Chart, matchMedia: () => media, addEventListener() {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../frontend/js/corretor-graficos.js'), 'utf8'), {
        window, Chart, getComputedStyle: () => ({ getPropertyValue: () => '' }), document: { documentElement: { classList: { contains: () => desktopTematico } }, getElementById: get }, ApiClient: { get: url => new Promise(resolve => pending.push({ url, resolve })) }
    });
    await window.CorretorGraficos.carregar(null);
    assert.equal(pending.length, 0);
    media.matches = true;
    const old = window.CorretorGraficos.carregar(null);
    const current = window.CorretorGraficos.carregar(7);
    const data = montarEvolucao([{ dia: '2026-11-12', mensagens: '2' }]);
    pending[1].resolve(data);
    await current;
    pending[0].resolve(montarEvolucao([{ dia: '2026-11-12', mensagens: '999' }]));
    await old;
    assert.equal(pending[1].url, '/api/corretor/evolucao?lista_id=7');
    assert.match(get('mensagensComparacao').textContent, /^2 hoje/);
    assert.equal(charts.length, 2);
    assert.deepEqual(charts[1].data.datasets[0].data, [2]);
    media.matches = false;
    desktopTematico = true;
    const desktop = window.CorretorGraficos.carregar(7);
    pending[2].resolve(data);
    await desktop;
    assert.equal(charts.length, 4);
});
