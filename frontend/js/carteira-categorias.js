const CarteiraCategorias = (() => {
    const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    function renderizar(carteiras, item) {
        const grupos = new Map();
        for (const c of carteiras) {
            const categoria = c.categoria || 'Sem categoria';
            if (!grupos.has(categoria)) grupos.set(categoria, []);
            grupos.get(categoria).push(c);
        }
        return [...grupos.keys()].sort((a,b) => a === 'Mensal' ? -1 : b === 'Mensal' ? 1 : a.localeCompare(b, 'pt-BR'))
            .map(nome => `<div class="carteira-categoria" role="group" aria-label="${escape(nome)}"><div class="carteira-categoria-titulo">${escape(nome)}</div>${grupos.get(nome).map(item).join('')}</div>`).join('');
    }
    return { renderizar };
})();
