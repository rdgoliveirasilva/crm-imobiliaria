/* Barra compacta: reutiliza os destinos e handlers da navegação existente. */
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.admin-nav-inner');
    if (!nav) return;
    const items = Array.from(nav.querySelectorAll('.nav-tab'));
    const names = { dashboard:'Início', listas:'Carteiras', corretores:'Equipe' };
    const primary = items.filter(item => Object.hasOwn(names, item.dataset.tab));
    const compact = items.length > 4 && primary.length === 3;
    items.forEach(item => {
        const span = item.querySelector('span');
        if (span) span.dataset.mobileLabel = names[item.dataset.tab] || (item.getAttribute('href') === 'admin.html' ? 'Início' : span.textContent.trim());
        if (compact) item.dataset.mobilePrimary = String(primary.includes(item));
    });
    if (!compact) return;
    const extra = items.filter(item => !primary.includes(item));
    const more = document.createElement('button');
    more.type = 'button'; more.className = 'nav-tab cc-mobile-more';
    more.setAttribute('aria-haspopup', 'dialog'); more.setAttribute('aria-controls', 'ccMobileNavDialog');
    more.setAttribute('aria-label', 'Mais opções de navegação');
    more.innerHTML = '<i class="fas fa-ellipsis" aria-hidden="true"></i><span>Mais</span>';
    nav.append(more);
    const dialog = document.createElement('dialog');
    dialog.id = 'ccMobileNavDialog'; dialog.className = 'cc-mobile-nav-dialog';
    dialog.setAttribute('aria-labelledby', 'ccMobileNavTitle');
    dialog.innerHTML = '<header><h2 id="ccMobileNavTitle">Mais opções</h2><button type="button" aria-label="Fechar navegação">×</button></header><div class="cc-mobile-menu"></div>';
    const menu = dialog.querySelector('.cc-mobile-menu');
    for (const original of extra) {
        const option = document.createElement('button'); option.type = 'button'; option.className = 'cc-mobile-menu-item';
        const icon = original.querySelector('i'); if (icon) option.append(icon.cloneNode(true));
        const label = document.createElement('span'); label.textContent = original.textContent.trim(); option.append(label);
        option.addEventListener('click', () => { dialog.close(); original.click(); sync(); });
        menu.append(option);
    }
    document.body.append(dialog);
    function sync() {
        more.classList.toggle('active', extra.some(item => item.classList.contains('active')));
        Array.from(menu.children).forEach((option, index) => {
            const active = extra[index].classList.contains('active');
            option.classList.toggle('active', active);
            if (active) option.setAttribute('aria-current', 'page'); else option.removeAttribute('aria-current');
        });
    }
    items.forEach(item => item.addEventListener('click', sync));
    more.addEventListener('click', () => { sync(); dialog.showModal(); });
    dialog.querySelector('header button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    window.matchMedia('(max-width: 900px)').addEventListener('change', event => { if (!event.matches && dialog.open) dialog.close(); });
    sync();
});
