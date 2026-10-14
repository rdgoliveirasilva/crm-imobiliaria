/* =========================================================
   AUTH.JS — Login com back-end real
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- REFERÊNCIAS ---------- */
    const form         = document.getElementById('loginForm');
    const usuarioInput = document.getElementById('usuario');
    const senhaInput   = document.getElementById('password');
    const usuarioError = document.getElementById('usuarioError');
    const senhaError   = document.getElementById('passwordError');
    const toggleSenha  = document.getElementById('togglePassword');
    const btnLogin     = document.getElementById('btnLogin');
    const loginMessage = document.getElementById('loginMessage');

    if (!form || !usuarioInput || !senhaInput) {
        console.error('❌ auth.js: elementos do login não encontrados no HTML.');
        return;
    }

    /* ---------- LIMPEZA DEFENSIVA ---------- */
    // Sempre que a tela de login carrega, limpa sessões antigas
    localStorage.removeItem('sr_token');
    localStorage.removeItem('sr_usuario');
    localStorage.removeItem('sr_usuario_login');
    localStorage.removeItem('sr_usuario_id');
    localStorage.removeItem('sr_tipo');

    /* ---------- MOSTRAR / OCULTAR SENHA ---------- */
    toggleSenha.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = senhaInput.type === 'password';
        senhaInput.type = isPassword ? 'text' : 'password';
        toggleSenha.innerHTML = isPassword
            ? '<i class="fas fa-eye-slash"></i>'
            : '<i class="fas fa-eye"></i>';
        toggleSenha.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
        senhaInput.focus();
    });

    /* ---------- VALIDAÇÕES ---------- */
    function validarUsuario(valor) {
        const v = valor.trim();
        if (!v) return 'Informe seu usuário.';
        if (v.length < 3) return 'Usuário muito curto (mínimo 3 caracteres).';
        if (!/^[a-zA-Z0-9._-]+$/.test(v)) {
            return 'Use apenas letras, números, ponto, hífen ou underline.';
        }
        return '';
    }

    function validarSenha(valor) {
        if (!valor) return 'Informe sua senha.';
        if (valor.length < 4) return 'Senha muito curta.';
        return '';
    }

    function exibirErro(input, spanErro, mensagem) {
        const field = input.closest('.input-field');
        if (mensagem) {
            field.classList.add('error');
            spanErro.textContent = mensagem;
            spanErro.classList.add('visible');
        } else {
            field.classList.remove('error');
            spanErro.textContent = '';
            spanErro.classList.remove('visible');
        }
    }

    usuarioInput.addEventListener('input', () => {
        exibirErro(usuarioInput, usuarioError, '');
        esconderMensagem();
    });

    senhaInput.addEventListener('input', () => {
        exibirErro(senhaInput, senhaError, '');
        esconderMensagem();
    });

    /* ---------- MENSAGEM GLOBAL ---------- */
    function mostrarMensagem(texto, tipo = 'error') {
        loginMessage.textContent = texto;
        loginMessage.className = `login-message show ${tipo}`;
    }

    function esconderMensagem() {
        loginMessage.className = 'login-message';
        loginMessage.textContent = '';
    }

    /* ---------- SUBMIT ---------- */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        esconderMensagem();

        const usuario = usuarioInput.value.trim();
        const senha   = senhaInput.value;

        const erroUsuario = validarUsuario(usuario);
        const erroSenha   = validarSenha(senha);

        exibirErro(usuarioInput, usuarioError, erroUsuario);
        exibirErro(senhaInput, senhaError, erroSenha);

        if (erroUsuario || erroSenha) return;

        btnLogin.classList.add('loading');
        btnLogin.disabled = true;

        try {
            const resposta = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha })
            });

            const dados = await resposta.json().catch(() => ({}));

            console.log('[auth] resposta do /api/login:', dados);

            if (!resposta.ok) {
                throw new Error(dados.erro || 'Usuário ou senha inválidos.');
            }

            if (!dados.token || !dados.usuario) {
                throw new Error('Resposta do servidor inválida.');
            }

            // Salva sessão
            localStorage.setItem('sr_token', dados.token);
            localStorage.setItem('sr_usuario', dados.usuario.nome);
            localStorage.setItem('sr_usuario_login', dados.usuario.usuario);
            localStorage.setItem('sr_usuario_id', String(dados.usuario.id));
            localStorage.setItem('sr_tipo', dados.usuario.tipo);

            console.log('[auth] sessão salva. tipo:', dados.usuario.tipo);

            mostrarMensagem(`Bem-vindo, ${dados.usuario.nome}! Redirecionando...`, 'success');

            setTimeout(() => {
                if (dados.usuario.tipo === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'corretor.html';
                }
            }, 700);

        } catch (err) {
            console.error('[auth] erro:', err);
            mostrarMensagem(err.message || 'Falha ao entrar. Tente novamente.', 'error');
            btnLogin.classList.remove('loading');
            btnLogin.disabled = false;
        }

        // Corretor OU teste tentando acessar área de admin? Volta pro login (limpa)
if (pagina === 'corretor.html' && tipo !== 'corretor' && tipo !== 'teste') {
    localStorage.clear();
    window.location.replace('index.html');
    return;
}

// 🔑 NOVO: ninguém sem ser corretor/teste entra na página de empreendimentos
if (pagina === 'empreendimentos.html' && tipo !== 'corretor' && tipo !== 'teste') {
    localStorage.clear();
    window.location.replace('index.html');
    return;
}

    });

});