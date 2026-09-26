/* =========================================================
   API-CLIENT.JS — Cliente HTTP centralizado
   Todas as chamadas ao back-end passam por aqui.
   Cuida do token JWT e do tratamento de erros.
   ========================================================= */

const ApiClient = (() => {

    function getToken() {
        return localStorage.getItem('sr_token');
    }

    function logout() {
        localStorage.clear();
        window.location.replace('index.html');
    }

    async function request(url, options = {}) {
        const token = getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const resposta = await fetch(url, {
            ...options,
            headers
        });

        // Se o token expirou ou é inválido → logout automático
        if (resposta.status === 401) {
            logout();
            throw new Error('Sessão expirada. Faça login de novo.');
        }

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(dados.erro || `Erro ${resposta.status}`);
        }

        return dados;
    }

    return {
        request,
        get:   (url)       => request(url, { method: 'GET' }),
        post:  (url, body) => request(url, { method: 'POST',  body: JSON.stringify(body) }),
        put:   (url, body) => request(url, { method: 'PUT',   body: JSON.stringify(body) }),
        patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
        del:   (url)       => request(url, { method: 'DELETE' }),
        logout
    };

})();