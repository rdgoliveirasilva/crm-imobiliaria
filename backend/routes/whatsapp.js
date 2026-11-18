const express = require('express');
const { createOpenWA } = require('../services/openwa');

module.exports = function createWhatsAppRouter({ client = createOpenWA(), auth } = {}) {
    const { autenticar, apenasAdmin } = auth || require('../middlewares/auth');
    const router = express.Router();
    router.use(autenticar, apenasAdmin);
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    const handle = fn => async (req, res) => {
        try { res.json(await fn(req)); }
        catch (error) { res.status(error.status || 500).json({ erro: error.status ? error.message : 'Erro na integração WhatsApp.' }); }
    };
    router.get('/status', handle(() => ({ configured: client.configured() })));
    router.get('/sessions', handle(req => client.list(req.query.page === undefined ? 1 : Number(req.query.page))));
    router.post('/sessions', handle(req => client.create(req.body?.name)));
    router.get('/sessions/:id/qr', handle(req => client.qr(req.params.id)));
    router.post('/sessions/:id/:action', handle(req => client.action(req.params.id, req.params.action === 'delete' ? '' : req.params.action)));
    router.delete('/sessions/:id', handle(req => client.action(req.params.id, 'delete')));
    return router;
};
