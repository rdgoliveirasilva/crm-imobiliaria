/* Executado no head para aplicar o tema antes da primeira pintura. */
(() => {
    const key = 'prospect-theme';
    const root = document.documentElement;
    const mobile = window.matchMedia('(max-width: 1024px)');
    const valid = value => ['auto', 'light', 'dark'].includes(value) ? value : 'auto';
    let preference = 'auto', timer;
    try { preference = valid(localStorage.getItem(key)); } catch { /* Armazenamento indisponível: mantém escolha nesta aba. */ }

    function update() {
        const now = new Date();
        const theme = preference === 'auto' ? (now.getHours() >= 6 && now.getHours() < 18 ? 'light' : 'dark') : preference;
        const changed = root.dataset.theme !== theme;
        root.dataset.theme = theme;
        root.dataset.themePreference = preference;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = mobile.matches ? (theme === 'dark' ? '#061126' : '#f3f6fc') : '#002c61';
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.setAttribute('aria-label', `Tema ${theme === 'dark' ? 'escuro' : 'claro'}${preference === 'auto' ? ' automático' : ''}. Escolher tema`);
            toggle.title = preference === 'auto' ? 'Tema automático' : `Tema ${theme === 'dark' ? 'escuro' : 'claro'}`;
            toggle.querySelector('i').className = `fas fa-${preference === 'auto' ? 'circle-half-stroke' : theme === 'dark' ? 'moon' : 'sun'}`;
        }
        document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference)));
        if (changed) window.dispatchEvent(new CustomEvent('prospect:themechange', { detail: { theme } }));
        clearTimeout(timer);
        if (preference === 'auto') {
            const next = new Date(now);
            next.setHours(now.getHours() < 6 ? 6 : now.getHours() < 18 ? 18 : 30, 0, 0, 0);
            timer = setTimeout(update, next - now + 50);
        }
    }

    function choose(value) {
        preference = valid(value);
        try { localStorage.setItem(key, preference); } catch { /* A escolha continua funcionando sem persistência. */ }
        update();
    }

    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
    window.addEventListener('storage', event => { if (event.key === key || event.key === null) { preference = valid(event.newValue); update(); } });
    mobile.addEventListener('change', update);
    document.addEventListener('DOMContentLoaded', () => {
        update();
        const control = document.getElementById('themeControl');
        const toggle = document.getElementById('themeToggle');
        const options = document.getElementById('themeOptions');
        function close(focus = false) {
            options.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            if (focus) toggle.focus();
        }
        toggle.addEventListener('click', () => {
            const open = options.hidden;
            options.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            if (open) options.querySelector('[aria-pressed="true"]').focus();
        });
        options.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => { choose(button.dataset.themeChoice); close(true); }));
        control.addEventListener('keydown', event => { if (event.key === 'Escape') { close(true); event.stopPropagation(); } });
        document.addEventListener('click', event => { if (!control.contains(event.target)) close(); });
        // Safari pode emitir focusout com relatedTarget nulo antes do click de toque.
        // Não esconda as opções nessa fase: o click externo já fecha o menu.
        control.addEventListener('focusout', event => { if (event.relatedTarget && !control.contains(event.relatedTarget)) close(); });
    });
})();
