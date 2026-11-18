/* Sidebar desktop compartilhada; reutiliza navegação, autenticação e logout existentes. */
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const admin = body.classList.contains('admin-command');
    const header = document.querySelector('.app-header .header-inner');
    const nav = document.querySelector(admin ? '.admin-nav-inner' : '.desktop-sidebar-nav');
    if (!header || !nav) return;
    const key = 'prospect-sidebar-collapsed';
    let collapsed = false;
    try { collapsed = localStorage.getItem(key) === 'true'; } catch {}
    const media = window.matchMedia(admin ? '(min-width: 901px)' : '(min-width: 1025px)');
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'ps-sidebar-toggle';
    toggle.innerHTML = '<i class="fas fa-chevron-left" aria-hidden="true"></i>';
    header.append(toggle);
    nav.id ||= 'prospectSidebarNav'; toggle.setAttribute('aria-controls', nav.id);
    nav.querySelectorAll('a,button:not(.cc-mobile-more)').forEach(item => {
        if (item.classList.contains('sidebar-account')) return;
        const title = item.textContent.trim().replace(/\s+/g, ' ');
        item.title = title;
        if (!item.hasAttribute('aria-label')) item.setAttribute('aria-label', title);
        const icon = item.querySelector('i');
        const label = document.createElement('span'); label.className = 'ps-nav-label';
        Array.from(item.childNodes).filter(node => node !== icon).forEach(node => label.append(node));
        item.append(label);
    });
    const footer = document.createElement('div'); footer.className = 'ps-sidebar-footer';
    footer.innerHTML = '<a href="conta.html" title="Minha Conta" aria-label="Minha Conta"><i class="fas fa-user-gear" aria-hidden="true"></i><span>Minha Conta</span></a><button type="button" title="Sair" aria-label="Sair"><i class="fas fa-right-from-bracket" aria-hidden="true"></i><span>Sair</span></button>';
    footer.querySelector('button').addEventListener('click', () => ApiClient.logout());
    header.append(footer);
    function apply() {
        body.classList.toggle('ps-desktop', media.matches);
        body.classList.toggle('ps-collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', collapsed ? 'Expandir navegação' : 'Recolher navegação');
        toggle.title = collapsed ? 'Expandir navegação' : 'Recolher navegação';
        // Chart.js observa o tamanho do conteúdo; os controles mobile não são movidos.
    }
    toggle.addEventListener('click', () => {
        collapsed = !collapsed;
        try { localStorage.setItem(key, String(collapsed)); } catch {}
        apply();
    });
    media.addEventListener('change', apply);
    window.addEventListener('storage', event => {
        if (event.key === key || event.key === null) { collapsed = event.newValue === 'true'; apply(); }
    });
    apply();
});
