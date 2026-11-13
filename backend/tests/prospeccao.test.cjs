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
