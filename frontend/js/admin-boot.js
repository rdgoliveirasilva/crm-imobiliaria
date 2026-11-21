/* Aplica a geometria da sidebar antes de o navegador pintar o conteúdo. */
(() => {
    document.body.classList.toggle('ps-desktop', window.matchMedia('(min-width: 901px)').matches);
    try { document.body.classList.toggle('ps-collapsed', localStorage.getItem('prospect-sidebar-collapsed') === 'true'); } catch {}
})();
