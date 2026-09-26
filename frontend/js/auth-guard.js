/* =========================================================
   AUTH-GUARD.JS — Protege páginas internas
   - Roda no <head> de admin.html e corretor.html
   - Se não tiver token → volta pro login
   - Se tiver token mas o tipo estiver errado → volta pro login
   - NUNCA redireciona em loop
   ========================================================= */

(function () {
    const token = localStorage.getItem('sr_token');
    const tipo  = localStorage.getItem('sr_tipo');

    // Se não tem token, volta pro login e PARA
    if (!token || !tipo) {
        window.location.replace('index.html');
        return;
    }

    // Página atual
    const pagina = (window.location.pathname.split('/').pop() || '').toLowerCase();

    // Admin tentando acessar área de corretor? Volta pro login (limpa)
    if (pagina === 'admin.html' && tipo !== 'admin') {
        localStorage.clear();
        window.location.replace('index.html');
        return;
    }

    // Corretor tentando acessar área de admin? Volta pro login (limpa)
    if (pagina === 'corretor.html' && tipo !== 'corretor') {
        localStorage.clear();
        window.location.replace('index.html');
        return;
    }

    // Guarda um marcador de "página validada"
    // pra o auth.js do index saber que essa página rodou de fato
    sessionStorage.setItem('sr_guard_ok', '1');
})();