/* =========================================================
   CONTA.JS — Página de perfil (meus dados + senha)
   Obs: o dropdown do avatar é montado pelo avatar.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    /* ---------- ESTADO ---------- */
    let toastTimer = null;

    /* ---------- ELEMENTOS ---------- */
    const headerUserName = $('headerUserName');

    const nomeInput      = $('nome');
    const usuarioInput   = $('usuario');
    const nomeError      = $('nomeError');
    const btnSalvarPerfil = $('btnSalvarPerfil');

    const senhaAtualInput    = $('senhaAtual');
    const senhaNovaInput     = $('senhaNova');
    const senhaConfirmaInput = $('senhaConfirma');
    const senhaAtualError    = $('senhaAtualError');
    const senhaNovaError     = $('senhaNovaError');
    const senhaConfirmaError = $('senhaConfirmaError');
    const btnAlterarSenha    = $('btnAlterarSenha');

    const toast = $('toast');

    /* ---------- TOAST ---------- */
    function mostrarToast(msg, tipo = 'info') {
        toast.textContent = msg;
        toast.className = `toast show ${tipo}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.className = 'toast', 2800);
    }

    /* ---------- CARREGA DADOS DO USUÁRIO ---------- */
    async function carregarPerfil() {
        try {
            const { usuario } = await ApiClient.get('/api/me');

            headerUserName.textContent = usuario.nome.split(' ')[0];
            nomeInput.value = usuario.nome;
            usuarioInput.value = usuario.usuario;

            // Ajusta o botão voltar conforme o tipo
            const btnVoltar = document.querySelector('.btn-voltar');
            if (btnVoltar) {
                if (usuario.tipo === 'admin') {
                    btnVoltar.href = 'admin.html';
                } else {
                    btnVoltar.href = 'corretor.html';
                }
            }

            // Salva no localStorage caso tenha mudado
            localStorage.setItem('sr_usuario', usuario.nome);
            localStorage.setItem('sr_tipo', usuario.tipo);

        } catch (err) {
            console.error('[conta] erro ao carregar perfil:', err);
            mostrarToast('Erro ao carregar dados.', 'error');
        }
    }

    /* ---------- SALVAR PERFIL ---------- */
    async function salvarPerfil() {
        nomeError.textContent = '';
        nomeError.classList.remove('visible');
        nomeInput.classList.remove('error');

        const nome = nomeInput.value.trim();

        if (!nome || nome.length < 3) {
            nomeError.textContent = 'Informe seu nome completo (mínimo 3 caracteres).';
            nomeError.classList.add('visible');
            nomeInput.classList.add('error');
            return;
        }

        btnSalvarPerfil.disabled = true;
        btnSalvarPerfil.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Salvando...';

        try {
            await ApiClient.put('/api/me', { nome });
            mostrarToast('✅ Dados atualizados!', 'success');

            localStorage.setItem('sr_usuario', nome);
            headerUserName.textContent = nome.split(' ')[0];

        } catch (err) {
            console.error('[conta] erro ao salvar perfil:', err);
            mostrarToast(err.message || 'Erro ao salvar.', 'error');
        } finally {
            btnSalvarPerfil.disabled = false;
            btnSalvarPerfil.innerHTML = '<i class="fas fa-check"></i> Salvar informações';
        }
    }

    /* ---------- ALTERAR SENHA ---------- */
    async function alterarSenha() {
        [senhaAtualError, senhaNovaError, senhaConfirmaError].forEach(e => {
            e.textContent = '';
            e.classList.remove('visible');
        });
        [senhaAtualInput, senhaNovaInput, senhaConfirmaInput].forEach(i => i.classList.remove('error'));

        const senhaAtual    = senhaAtualInput.value;
        const senhaNova     = senhaNovaInput.value;
        const senhaConfirma = senhaConfirmaInput.value;

        let temErro = false;

        if (!senhaAtual) {
            senhaAtualError.textContent = 'Informe sua senha atual.';
            senhaAtualError.classList.add('visible');
            senhaAtualInput.classList.add('error');
            temErro = true;
        }

        if (!senhaNova || senhaNova.length < 4) {
            senhaNovaError.textContent = 'A nova senha precisa ter no mínimo 4 caracteres.';
            senhaNovaError.classList.add('visible');
            senhaNovaInput.classList.add('error');
            temErro = true;
        }

        if (senhaNova !== senhaConfirma) {
            senhaConfirmaError.textContent = 'As senhas não coincidem.';
            senhaConfirmaError.classList.add('visible');
            senhaConfirmaInput.classList.add('error');
            temErro = true;
        }

        if (temErro) return;

        btnAlterarSenha.disabled = true;
        btnAlterarSenha.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Alterando...';

        try {
            await ApiClient.put('/api/me/senha', { senhaAtual, senhaNova });
            mostrarToast('✅ Senha alterada com sucesso!', 'success');

            senhaAtualInput.value = '';
            senhaNovaInput.value = '';
            senhaConfirmaInput.value = '';

        } catch (err) {
            console.error('[conta] erro ao alterar senha:', err);
            senhaAtualError.textContent = err.message || 'Erro ao alterar senha.';
            senhaAtualError.classList.add('visible');
            senhaAtualInput.classList.add('error');
        } finally {
            btnAlterarSenha.disabled = false;
            btnAlterarSenha.innerHTML = '<i class="fas fa-key"></i> Alterar senha';
        }
    }

    /* ---------- LISTENERS ---------- */
    btnSalvarPerfil.addEventListener('click', salvarPerfil);
    btnAlterarSenha.addEventListener('click', alterarSenha);

    /* ---------- INIT ---------- */
    async function init() {
        await carregarPerfil();
    }

    init();

});