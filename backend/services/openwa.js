// Adaptador restrito ao contrato OpenWA 0.30.3. A chave nunca sai do backend.
class OpenWAError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
function createOpenWA({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
    function configuration() {
        if (!env.OPENWA_BASE_URL || !env.OPENWA_API_KEY) return null;
        try {
            const url = new URL(env.OPENWA_BASE_URL);
            const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
            if (url.username || url.password || url.search || url.hash ||
                !['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !local)) return null;
            return { base: url.href.replace(/\/$/, ''), key: env.OPENWA_API_KEY };
        } catch { return null; }
    }
    async function request(path, method = 'GET', body) {
        const config = configuration();
        if (!config) throw new OpenWAError(503, 'Integração não configurada. Configure OPENWA_BASE_URL e OPENWA_API_KEY no servidor do Prospect.');
        try {
            const response = await fetchImpl(`${config.base}${path}`, {
                method, redirect: 'error', signal: AbortSignal.timeout(20000),
                headers: { 'x-api-key': config.key, 'Content-Type': 'application/json' },
                ...(body ? { body: JSON.stringify(body) } : {})
            });
            if (!response.ok) {
                const messages = {
                    400: 'A sessão não permite esta ação no estado atual. Atualize e tente novamente.',
                    401: 'O gateway recusou a chave de integração. Revise a configuração no servidor.',
                    403: 'A chave de integração não tem permissão para esta ação.',
                    404: 'Sessão não encontrada. Atualize a lista.',
                    409: 'A sessão já existe ou está ocupada. Atualize antes de repetir a ação.',
                    429: 'Limite do gateway atingido. Aguarde antes de tentar novamente.'
                };
                throw new OpenWAError([400,404,409,429].includes(response.status) ? response.status : 502,
                    messages[response.status] || 'Gateway indisponível. Tente novamente em instantes.');
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            if (error instanceof OpenWAError) throw error;
            throw new OpenWAError(502, 'Não foi possível obter resposta do gateway. Atualize o status antes de repetir uma ação.');
        }
    }
    const idPath = id => {
        if (typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))
            throw new OpenWAError(400, 'Identificador de sessão inválido.');
        return `/sessions/${id}`;
    };
    const session = item => {
        if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.status !== 'string')
            throw new OpenWAError(502, 'Resposta inesperada do gateway.');
        return { id: item.id, name: item.name, status: item.status, phone: item.phone || null,
            pushName: item.pushName || null, connectedAt: item.connectedAt || null,
            lastActive: item.lastActive || null, engineLoaded: item.engineLoaded === true };
    };
    return {
        configured: () => Boolean(configuration()),
        async list(page = 1) {
            if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new OpenWAError(400, 'Página inválida.');
            const data = await request(`/sessions?limit=26&offset=${(page - 1) * 25}`);
            if (!Array.isArray(data)) throw new OpenWAError(502, 'Resposta inesperada do gateway.');
            return { sessions: data.slice(0,25).map(session), hasMore: data.length > 25, page };
        },
        async create(name) {
            if (typeof name !== 'string' || !/^[a-zA-Z0-9-]{3,50}$/.test(name))
                throw new OpenWAError(400, 'Use de 3 a 50 letras, números ou hífens no nome.');
            return session(await request('/sessions', 'POST', { name }));
        },
        async action(id, action) {
            if (!['start', 'stop', 'logout', 'delete'].includes(action)) throw new OpenWAError(400, 'Ação inválida.');
            const path = idPath(id);
            const result = await request(action === 'delete' ? path : `${path}/${action}`, action === 'delete' ? 'DELETE' : 'POST');
            return action === 'delete' || action === 'logout' ? { ok: true } : session(result);
        },
        async qr(id) {
            const data = await request(`${idPath(id)}/qr`);
            if (typeof data?.qrCode !== 'string' || data.qrCode.length > 500000 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.qrCode))
                throw new OpenWAError(502, 'QR Code ainda indisponível. Atualize a sessão.');
            return { qrCode: data.qrCode, status: data.status };
        }
    };
}
module.exports = { createOpenWA, OpenWAError };
