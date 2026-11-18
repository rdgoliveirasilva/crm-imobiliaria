/* Administração de conexões; nenhuma mensagem é enviada por esta página. */
document.addEventListener('DOMContentLoaded', () => {
    if (!AuthSession.getItem('sr_token') || AuthSession.getItem('sr_tipo') !== 'admin') {
        window.location.replace('index.html'); return;
    }
    const $ = id => document.getElementById(id);
    const nav = document.querySelector('.admin-nav');
    document.querySelector('.header-inner').insertBefore(nav, document.querySelector('.header-user'));
    $('headerUserName').textContent = AuthSession.getItem('sr_usuario') || 'Administrador';
    const base = '/api/admin/whatsapp';
    let configured = false, busy = false, loading = false, page = 1, hasMore = false, sessions = [];
    let qrSession = null, qrVersion = 0, qrLoading = false;
    const labels = { created:'Criada', initializing:'Iniciando', qr_ready:'Aguardando QR Code', authenticating:'Autenticando', ready:'Conectada', disconnected:'Desconectada', action_required:'Ação necessária', failed:'Falha na conexão' };
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('pt-BR') : '—';
    function notice(text, error = false) { $('waNotice').textContent = text; $('waNotice').dataset.error = String(error); }
    function controls() {
        $('waCreate').querySelector('button').disabled = !configured || busy || loading;
        $('waRefresh').disabled = busy || loading;
        $('waPrev').disabled = busy || loading || page === 1;
        $('waNext').disabled = busy || loading || !hasMore;
        $('waSessions').querySelectorAll('button').forEach(button => { button.disabled = busy || loading; });
    }
    function render() {
        $('waPage').textContent = `Página ${page}`;
        $('waSessions').innerHTML = sessions.length ? sessions.map(s => {
            const button = (action, label) => `<button type="button" data-action="${action}" data-id="${escape(s.id)}">${label}</button>`;
            return `<article class="cc-panel wa-session"><h3><i class="fab fa-whatsapp" aria-hidden="true"></i>${escape(s.name)}</h3>
                <span class="wa-status" data-state="${escape(s.status)}">${escape(labels[s.status] || s.status)}</span>
                <dl><dt>Conta vinculada</dt><dd>${escape(s.pushName || 'Ainda não vinculada')}${s.phone ? ' · '+escape(s.phone) : ''}</dd><dt>Conectada em</dt><dd>${escape(date(s.connectedAt))}</dd><dt>Última atividade</dt><dd>${escape(date(s.lastActive))}</dd></dl>
                <div class="wa-actions">${!s.engineLoaded ? button('start','Iniciar') : button('stop','Parar')}${s.status === 'qr_ready' ? button('qr','Vincular por QR') : ''}${s.engineLoaded ? button('logout','Desvincular') : ''}${button('delete','Excluir')}</div></article>`;
        }).join('') : '<p>Nenhuma conexão nesta página.</p>';
        controls();
    }
    async function refresh(silent = false) {
        if (loading || busy || document.hidden) return;
        loading = true; controls(); $('waSessions').setAttribute('aria-busy', 'true');
        try {
            const status = await ApiClient.get(`${base}/status`);
            configured = status.configured;
            $('waSetup').hidden = configured;
            if (!configured) { sessions = []; hasMore = false; render(); notice('Aguardando configuração do gateway.'); return; }
            const result = await ApiClient.get(`${base}/sessions?page=${page}`);
            sessions = result.sessions; hasMore = result.hasMore;
            render();
            $('waUpdated').textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
            if (!silent || $('waNotice').dataset.error === 'true') notice('Gateway conectado. Gerencie suas conexões abaixo.');
            if (qrSession) {
                const current = sessions.find(s => s.id === qrSession);
                if (!current || current.status !== 'qr_ready') {
                    hideQrImage(); qrSession = null; qrVersion++;
                    $('waQrState').textContent = current?.status === 'ready' ? 'WhatsApp conectado com sucesso. Você já pode fechar esta janela.' : 'O QR Code não está disponível. Atualize a sessão para acompanhar a conexão.';
                }
            }
        } catch (error) { notice(error.message, true); }
        finally { loading = false; $('waSessions').setAttribute('aria-busy', 'false'); controls(); }
    }
    function hideQrImage() { $('waQrImage').hidden = true; $('waQrImage').removeAttribute('src'); }
    async function loadQr() {
        if (!qrSession || qrLoading || document.hidden) return;
        const id = qrSession, version = qrVersion;
        qrLoading = true;
        try {
            const result = await ApiClient.get(`${base}/sessions/${encodeURIComponent(id)}/qr`);
            if (version !== qrVersion || id !== qrSession) return;
            $('waQrImage').src = result.qrCode; $('waQrImage').hidden = false;
            $('waQrState').textContent = 'Escaneie o QR Code abaixo.';
        } catch (error) {
            if (version !== qrVersion || id !== qrSession) return;
            hideQrImage(); $('waQrState').textContent = error.message;
            await refresh(true);
        } finally { qrLoading = false; }
    }
    $('waCloseQr').addEventListener('click', () => $('waQr').close());
    $('waQr').addEventListener('close', () => { qrSession = null; qrVersion++; hideQrImage(); });
    $('waCreate').addEventListener('submit', async event => {
        event.preventDefault(); if (busy || loading || !configured) return;
        busy = true; controls();
        let success = false;
        try { await ApiClient.post(`${base}/sessions`, { name: $('waName').value.trim() }); $('waName').value = ''; page = 1; success = true; notice('Conexão criada. Clique em Iniciar para gerar o QR Code.'); }
        catch (error) { notice(error.message, true); }
        finally { busy = false; controls(); if (success) await refresh(true); }
    });
    $('waSessions').addEventListener('click', async event => {
        const button = event.target.closest('button[data-action]');
        if (!button || busy || loading) return;
        const { id, action } = button.dataset;
        const session = sessions.find(s => s.id === id); if (!session) return;
        if (action === 'qr') {
            qrSession = id; qrVersion++; hideQrImage(); $('waQrState').textContent = 'Carregando QR Code…';
            $('waQr').showModal(); await loadQr(); return;
        }
        const confirms = { stop:'Parar esta conexão? Ela ficará indisponível até ser iniciada novamente.', logout:'Desvincular esta conta? Será necessário escanear um novo QR Code.', delete:'Excluir esta conexão e seus dados no gateway? Esta ação não pode ser desfeita.' };
        if (confirms[action] && !window.confirm(`${session.name}: ${confirms[action]}`)) return;
        busy = true; controls(); notice('Executando ação…');
        let success = false;
        try {
            if (action === 'delete') await ApiClient.del(`${base}/sessions/${encodeURIComponent(id)}`);
            else await ApiClient.post(`${base}/sessions/${encodeURIComponent(id)}/${action}`, {});
            if (action === 'delete' && sessions.length === 1 && page > 1) page--;
            success = true; notice(action === 'start' ? 'Sessão iniciada. Aguarde o status Aguardando QR Code para vincular.' : 'Ação concluída.');
        } catch (error) { notice(error.message, true); }
        finally { busy = false; controls(); if (success) await refresh(true); }
    });
    $('waRefresh').addEventListener('click', () => refresh());
    $('waPrev').addEventListener('click', () => { if (page > 1 && !busy && !loading) { page--; refresh(); } });
    $('waNext').addEventListener('click', () => { if (hasMore && !busy && !loading) { page++; refresh(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(true); if (qrSession) loadQr(); } else hideQrImage(); });
    let ticks = 0;
    const poll = setInterval(() => { if (qrSession) loadQr(); else if (++ticks % 3 === 0) refresh(true); }, 5000);
    window.addEventListener('pagehide', () => { clearInterval(poll); qrSession = null; qrVersion++; hideQrImage(); });
    refresh();
});
