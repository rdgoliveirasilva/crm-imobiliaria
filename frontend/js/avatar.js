/* =========================================================
   AVATAR.JS — Blindado contra duplicação
   ========================================================= */

(function() {

    function iniciais(nome) {
        return String(nome || '?')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(p => p[0].toUpperCase())
            .join('');
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function montarAvatar() {
        const btn = document.getElementById('btnAvatar');
        const headerUser = document.querySelector('.header-user');

        if (!btn || !headerUser) return;

        /* 🛡️ Remove QUALQUER dropdown antigo (evita duplicação) */
        document.querySelectorAll('.dropdown-menu').forEach(el => el.remove());

        const nome  = localStorage.getItem('sr_usuario') || '—';
        const login = localStorage.getItem('sr_usuario_login') || '—';

        btn.textContent = iniciais(nome);

        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        dropdown.id = 'avatarDropdown';

        dropdown.innerHTML = `
            <div class="dropdown-header">
                <strong>${escapeHtml(nome)}</strong>
                <small>@${escapeHtml(login)}</small>
            </div>
            <a href="conta.html" class="dropdown-item">
                <i class="fas fa-user"></i>
                Minha conta
            </a>
            <button class="dropdown-item danger" id="btnDropdownSair" type="button">
                <i class="fas fa-sign-out-alt"></i>
                Sair
            </button>
        `;

        headerUser.appendChild(dropdown);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn) {
                dropdown.classList.remove('open');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') dropdown.classList.remove('open');
        });

        const btnSair = dropdown.querySelector('#btnDropdownSair');
        if (btnSair) {
            btnSair.addEventListener('click', () => {
                if (typeof ApiClient !== 'undefined' && ApiClient.logout) {
                    ApiClient.logout();
                } else {
                    localStorage.clear();
                    window.location.href = 'index.html';
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', montarAvatar);
    } else {
        montarAvatar();
    }

})();