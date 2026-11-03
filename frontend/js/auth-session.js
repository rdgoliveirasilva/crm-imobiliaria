/* Armazenamento único da sessão: persistente somente ao lembrar de mim. */
const AuthSession = (() => {
    const keys = ['sr_token', 'sr_usuario', 'sr_usuario_login', 'sr_usuario_id', 'sr_tipo'];
    function storage() { return sessionStorage.getItem('sr_token') ? sessionStorage : localStorage; }
    function clear() {
        for (const store of [localStorage, sessionStorage]) keys.forEach(key => store.removeItem(key));
        sessionStorage.removeItem('sr_guard_ok');
    }
    function save(dados, remember) {
        clear();
        const store = remember ? localStorage : sessionStorage;
        const values = [dados.token, dados.usuario.nome, dados.usuario.usuario, dados.usuario.id, dados.usuario.tipo];
        keys.forEach((key, i) => store.setItem(key, String(values[i])));
    }
    return { clear, save, getItem: key => storage().getItem(key), setItem: (key, value) => storage().setItem(key, value) };
})();
