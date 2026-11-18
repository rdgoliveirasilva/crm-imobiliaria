const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpenWA } = require('../services/openwa');
const id = '6e2d8aa2-8e49-4b68-a3ea-21d192edfed8';
const item = { id, name:'prospect', status:'qr_ready', engineLoaded:true, config:{secret:'private'} };
const env = { OPENWA_BASE_URL:'https://gateway.example/api/', OPENWA_API_KEY:'server-only-secret' };
function fixture(data = item, status = 200) {
    const calls = [];
    const client = createOpenWA({ env, fetchImpl: async (url, options) => {
        calls.push({url, options});
        return { ok:status >= 200 && status < 300, status, json:async()=>data };
    }});
    return {client, calls};
}
test('gateway ausente ou remoto HTTP fica desabilitado sem fazer chamadas', async () => {
    for (const cfg of [{}, {...env,OPENWA_BASE_URL:'http://remote.example/api'}, {...env,OPENWA_BASE_URL:'https://user:pass@host/api'}]) {
        const client = createOpenWA({env:cfg, fetchImpl:()=>assert.fail('não deve chamar gateway')});
        assert.equal(client.configured(),false);
        await assert.rejects(client.list(), {status:503});
    }
    assert.equal(createOpenWA({env:{...env,OPENWA_BASE_URL:'http://127.0.0.1:2785/api'}}).configured(),true);
});
test('lista pagina usando contrato upstream e remove campos privados', async () => {
    const {client,calls} = fixture(Array.from({length:26},()=>item));
    const result = await client.list(2);
    assert.equal(calls[0].url,'https://gateway.example/api/sessions?limit=26&offset=25');
    assert.equal(calls[0].options.headers['x-api-key'],env.OPENWA_API_KEY);
    assert.equal(calls[0].options.redirect,'error');
    assert.equal(result.sessions.length,25); assert.equal(result.hasMore,true);
    assert.equal(result.sessions[0].config,undefined);
    assert.equal(JSON.stringify(result).includes(env.OPENWA_API_KEY),false);
});
test('criação validada e ações restritas sem aceitar URL ou payload arbitrário', async () => {
    const {client,calls} = fixture();
    await assert.rejects(client.create('../evil'),{status:400});
    await assert.rejects(client.action('../auth/api-keys','start'),{status:400});
    await assert.rejects(client.action(id,'send'),{status:400});
    await assert.rejects(client.list(-1),{status:400});
    assert.equal(calls.length,0);
    await client.create('atendimento-prospect');
    assert.equal(calls[0].options.body,JSON.stringify({name:'atendimento-prospect'}));
    await client.action(id,'start');
    assert.equal(calls[1].url,`https://gateway.example/api/sessions/${id}/start`);
    assert.equal(calls[1].options.method,'POST');
});
test('exclusão aceita 204; QR aceita somente PNG embutido', async () => {
    const {client,calls} = fixture(null,204);
    assert.deepEqual(await client.action(id,'delete'),{ok:true});
    assert.equal(calls[0].options.method,'DELETE');
    const png = 'data:image/png;base64,aGVsbG8=';
    assert.deepEqual(await fixture({qrCode:png,status:'qr_ready'}).client.qr(id),{qrCode:png,status:'qr_ready'});
    for (const qrCode of ['https://tracker.example/qr','data:image/svg+xml;base64,PHN2Zz4='])
        await assert.rejects(fixture({qrCode}).client.qr(id),{status:502});
});
test('falhas do gateway não vazam segredos nem causam logout do Prospect', async () => {
    await assert.rejects(fixture({message:env.OPENWA_API_KEY},401).client.list(), error => error.status === 502 && !error.message.includes(env.OPENWA_API_KEY));
    const client = createOpenWA({env,fetchImpl:async()=>{throw Error(env.OPENWA_API_KEY);}});
    await assert.rejects(client.list(), error=>error.status===502 && !error.message.includes(env.OPENWA_API_KEY));
    await assert.rejects(fixture({unexpected:true}).client.list(),{status:502});
});
test('rotas exigem autenticação e papel admin, sem permitir proxy genérico', async t => {
    const express = require('express');
    const createRouter = require('../routes/whatsapp');
    const fs = require('node:fs'), vm = require('node:vm');
    // Usa o apenasAdmin real, sem carregar banco ou autenticação de produção.
    const scope = {module:{exports:{}}, require:name=>name==='dotenv'?{config(){}}:name==='../config/db'?{pool:{}}:{}};
    vm.runInNewContext(fs.readFileSync(require.resolve('../middlewares/auth'),'utf8'),scope);
    let calls = 0;
    const app = express(); app.use(express.json());
    app.use('/api/admin/whatsapp',createRouter({ client:{configured:()=>true,list:async()=>{calls++;return {sessions:[]};}}, auth:{
        autenticar(req,res,next) { const role=req.headers['x-test-role']; if(!role)return res.sendStatus(401); req.usuario={tipo:role};next(); },
        apenasAdmin:scope.module.exports.apenasAdmin
    }}));
    const server = await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
    const url=`http://127.0.0.1:${server.address().port}/api/admin/whatsapp`;
    assert.equal((await fetch(`${url}/sessions`)).status,401);
    assert.equal((await fetch(`${url}/sessions`,{headers:{'x-test-role':'corretor'}})).status,403);
    assert.equal(calls,0);
    const allowed=await fetch(`${url}/sessions`,{headers:{'x-test-role':'admin'}});
    assert.equal(allowed.status,200); assert.equal(allowed.headers.get('cache-control'),'no-store'); assert.equal(calls,1);
    assert.equal((await fetch(`${url}/auth/api-keys`,{headers:{'x-test-role':'admin'}})).status,404);
});
