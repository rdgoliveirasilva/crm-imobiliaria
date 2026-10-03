/* =========================================================
   CORRETOR.JS — Painel do corretor
   Depende de: api-client.js, acoes.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    /* =========================================================
       ESTADO
       ========================================================= */
    let leadAtual = null;
    let processando = false;
    let toastTimer = null;
    let carteiraAtual = null;
    let leadsDaCarteiraAtual = [];
    let agendamentoPendente = null;
    let agendamentosNotificados = {};
    let leadEmModoAgendamento = false;

    /* =========================================================
       ELEMENTOS
       ========================================================= */
    const headerUserName       = $('headerUserName');
    const progressCount        = $('progressCount');
    const progressFill         = $('progressFill');
    const statQualificadosTop  = $('statQualificadosTop');
    const statRestantesTop     = $('statRestantesTop');
    const waitingState         = $('waitingState');
    const leadState            = $('leadState');
    const btnVerificar         = $('btnVerificar');
    const leadNome             = $('leadNome');
    const leadTelefone         = $('leadTelefone');
    const leadOrigem           = $('leadOrigem');
    const btnLigar             = $('btnLigar');
    const btnWhatsApp          = $('btnWhatsApp');
    const callNotice           = $('callNotice');
    const callNoticeText       = $('callNoticeText');
    const resultList           = $('resultList');
    const observacao           = $('observacao');
    const toast                = $('toast');
    const btnHistorico         = $('btnHistorico');
    const historicoCount       = $('historicoCount');
    const btnHistoricoEspera   = $('btnHistoricoEspera');
    const historicoCountEspera = $('historicoCountEspera');
    const modalHistorico       = $('modalHistorico');
    const btnFecharHistorico   = $('btnFecharHistorico');
    const historicoLista       = $('historicoLista');
    const historicoVazio       = $('historicoVazio');
    const historicoResumo      = $('historicoResumo');
    const modalLigar           = $('modalLigar');
    const modalLigarNome       = $('modalLigarNome');
    const modalLigarNumero     = $('modalLigarNumero');
    const btnFecharLigar       = $('btnFecharLigar');
    const btnCopiarNumero      = $('btnCopiarNumero');
    const btnModalWhatsApp     = $('btnModalWhatsApp');

    // Agendamento
    const modalAgendamento          = $('modalAgendamento');
    const agendamentoTitulo         = $('agendamentoTitulo');
    const agendamentoSubtitulo      = $('agendamentoSubtitulo');
    const agendamentoLeadNome       = $('agendamentoLeadNome');
    const agendamentoLeadTelefone   = $('agendamentoLeadTelefone');
    const agendamentoData           = $('agendamentoData');
    const agendamentoHora           = $('agendamentoHora');
    const agendamentoLocal          = $('agendamentoLocal');
    const agendamentoDataError      = $('agendamentoDataError');
    const agendamentoHoraError      = $('agendamentoHoraError');
    const btnFecharAgendamento      = $('btnFecharAgendamento');
    const btnCancelarAgendamento    = $('btnCancelarAgendamento');
    const btnSalvarAgendamento      = $('btnSalvarAgendamento');
    const btnSalvarAgendamentoTexto = $('btnSalvarAgendamentoTexto');

    // Notificações
    const notifContainer = $('notifContainer');

    /* =========================================================
       TOAST
       ========================================================= */
    function mostrarToast(msg, tipo = 'info') {
        toast.textContent = msg;
        toast.className = `toast show ${tipo}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.className = 'toast', 2800);
    }

    /* =========================================================
       INIT
       ========================================================= */
    async function init() {
        const nome = localStorage.getItem('sr_usuario') || 'Corretor';
        headerUserName.textContent = nome.split(' ')[0];

        if (btnVerificar) btnVerificar.addEventListener('click', () => carregarCena());
        if (btnLigar)     btnLigar.addEventListener('click', handleLigar);
        if (btnWhatsApp)  btnWhatsApp.addEventListener('click', handleWhatsApp);

        if (resultList) {
            resultList.querySelectorAll('.result-tag').forEach(btn => {
                btn.addEventListener('click', () => handleTagClick(btn));
            });
        }

        if (btnHistorico)       btnHistorico.addEventListener('click', abrirHistorico);
        if (btnHistoricoEspera) btnHistoricoEspera.addEventListener('click', abrirHistorico);
        if (btnFecharHistorico) btnFecharHistorico.addEventListener('click', fecharHistorico);
        if (modalHistorico) {
            modalHistorico.addEventListener('click', (e) => {
                if (e.target === modalHistorico) fecharHistorico();
            });
        }

        if (btnFecharLigar) btnFecharLigar.addEventListener('click', () => modalLigar.style.display = 'none');
        if (modalLigar) {
            modalLigar.addEventListener('click', (e) => {
                if (e.target === modalLigar) modalLigar.style.display = 'none';
            });
        }
        if (btnCopiarNumero) btnCopiarNumero.addEventListener('click', copiarNumero);

        if (btnFecharAgendamento)   btnFecharAgendamento.addEventListener('click', fecharModalAgendamento);
        if (btnCancelarAgendamento) btnCancelarAgendamento.addEventListener('click', fecharModalAgendamento);
        if (btnSalvarAgendamento)   btnSalvarAgendamento.addEventListener('click', salvarAgendamento);
        if (modalAgendamento) {
            modalAgendamento.addEventListener('click', (e) => {
                if (e.target === modalAgendamento) fecharModalAgendamento();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (modalHistorico)   modalHistorico.style.display = 'none';
                if (modalLigar)       modalLigar.style.display = 'none';
                if (modalAgendamento) modalAgendamento.style.display = 'none';
                const editor = document.querySelector('.tag-editor');
                if (editor) editor.remove();
            }
        });

        await carregarCena();

        // Polling de agendamentos a cada 60s
        setTimeout(() => verificarAgendamentos(), 5000);
        setInterval(verificarAgendamentos, 60000);
    }

    /* =========================================================
       CARREGAR CENA
       ========================================================= */
    async function carregarCena() {
        await atualizarEstatisticas();
        await carregarProximoLead();
    }

    function mostrarTelaEspera() {
        if (waitingState) waitingState.style.display = 'block';
        if (leadState)    leadState.style.display = 'none';
        removerBadgeAgendamento();
    }

    function mostrarTelaLead() {
        if (waitingState) waitingState.style.display = 'none';
        if (leadState)    leadState.style.display = 'block';
    }

    /* =========================================================
       PRÓXIMO LEAD
       ========================================================= */
    async function carregarProximoLead() {
        try {
            leadEmModoAgendamento = false;
            removerBadgeAgendamento();

            const { lead } = await ApiClient.get('/api/corretor/proximo-lead');

            if (!lead) {
                leadAtual = null;
                await mostrarTelaEsperaInteligente();
                return;
            }

            leadAtual = lead;
            processando = false;

            if (leadNome)     leadNome.textContent = lead.nome;
            if (leadTelefone) leadTelefone.textContent = Acoes.formatarTelefone(lead.telefone) || lead.telefone;
            if (leadOrigem)   leadOrigem.textContent = lead.lista_nome || 'SR Lançamentos';

            if (resultList) {
                resultList.querySelectorAll('.result-tag').forEach(btn => {
                    btn.classList.remove('processing');
                });
            }

            if (observacao) observacao.value = '';
            if (callNotice) callNotice.style.display = 'none';

            mostrarTelaLead();
            await atualizarEstatisticas();

        } catch (err) {
            console.error('[corretor] erro ao carregar lead:', err);
            mostrarToast(err.message || 'Erro ao carregar.', 'error');
        }
    }

    /* =========================================================
       TELA DE ESPERA INTELIGENTE
       ========================================================= */
    async function mostrarTelaEsperaInteligente() {
        if (waitingState) waitingState.style.display = 'block';
        if (leadState)    leadState.style.display = 'none';

        try {
            const stats = await ApiClient.get('/api/corretor/estatisticas');
            const temHistorico = stats.trabalhados > 0;

            const waitingIcon  = document.getElementById('waitingIcon');
            const waitingTitle = document.getElementById('waitingTitle');
            const waitingText  = document.getElementById('waitingText');
            const waitingPulse = document.getElementById('waitingPulse');
            const waitingHist  = document.getElementById('waitingHistorico');
            const histCountEsp = document.getElementById('historicoCountEspera');

            if (temHistorico) {
                waitingState.classList.add('all-done');
                if (waitingIcon)  waitingIcon.innerHTML = '<i class="fas fa-check-double"></i>';
                if (waitingTitle) waitingTitle.textContent = 'Você concluiu sua carteira! 🎉';
                if (waitingText)  waitingText.textContent =
                    'Todos os clientes liberados já foram trabalhados. ' +
                    'Assim que o administrador liberar uma nova lista, ela aparecerá aqui automaticamente.';
                if (waitingPulse) waitingPulse.style.display = 'none';
                if (waitingHist)  waitingHist.style.display = 'block';
                if (histCountEsp) histCountEsp.textContent = stats.trabalhados;
            } else {
                waitingState.classList.remove('all-done');
                if (waitingIcon)  waitingIcon.innerHTML = '<i class="fas fa-hourglass-half"></i>';
                if (waitingTitle) waitingTitle.textContent = 'Aguarde seu gerente liberar sua nova carteira';
                if (waitingText)  waitingText.textContent =
                    'Você está na fila para receber os próximos clientes. ' +
                    'Assim que o administrador liberar uma nova lista, ela aparecerá aqui automaticamente.';
                if (waitingPulse) waitingPulse.style.display = 'flex';
                if (waitingHist)  waitingHist.style.display = 'none';
            }
        } catch (err) {
            console.error('[corretor] erro na tela de espera:', err);
        }
    }

    /* =========================================================
       ESTATÍSTICAS
       ========================================================= */
    async function atualizarEstatisticas() {
        try {
            const listaId = leadAtual ? leadAtual.lista_id : null;
            const url = listaId
                ? `/api/corretor/estatisticas?lista_id=${listaId}`
                : '/api/corretor/estatisticas';

            const stats = await ApiClient.get(url);

            if (progressCount) progressCount.textContent = `${stats.trabalhados} de ${stats.total} trabalhados`;
            const pct = stats.total > 0 ? (stats.trabalhados / stats.total) * 100 : 0;
            if (progressFill) progressFill.style.width = `${pct}%`;

            if (statQualificadosTop) statQualificadosTop.textContent = stats.trabalhados;
            if (statRestantesTop)    statRestantesTop.textContent    = stats.restantes;
            if (historicoCount)       historicoCount.textContent       = stats.trabalhados;
            if (historicoCountEspera) historicoCountEspera.textContent = stats.trabalhados;

            if (resultList) {
                resultList.querySelectorAll('.result-tag').forEach(btn => {
                    const tag = btn.dataset.tag;
                    const count = (stats.porTag && stats.porTag[tag]) || 0;
                    const el = btn.querySelector('.tag-count');
                    if (el) el.textContent = `+${count}`;
                });
            }
        } catch (err) {
            console.error('[corretor] erro nas estatísticas:', err);
        }
    }

    /* =========================================================
       LIGAR
       ========================================================= */
    function handleLigar() {
        if (!leadAtual) return;

        const res = Acoes.ligar(leadAtual.telefone);
        if (!res.ok) {
            mostrarToast(res.erro || 'Telefone inválido.', 'error');
            return;
        }

        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (res.modo === 'desktop') {
            if (modalLigarNome)   modalLigarNome.textContent = leadAtual.nome;
            if (modalLigarNumero) modalLigarNumero.textContent = Acoes.formatarTelefone(leadAtual.telefone);
            if (btnModalWhatsApp) btnModalWhatsApp.href = Acoes.linkWhatsApp(
                leadAtual,
                localStorage.getItem('sr_usuario') || 'Corretor'
            );
            if (modalLigar) modalLigar.style.display = 'flex';
        }

        if (callNoticeText) callNoticeText.textContent = `Chamada iniciada às ${hora}. Registre o resultado abaixo.`;
        if (callNotice)     callNotice.style.display = 'flex';
    }

    /* =========================================================
       WHATSAPP
       ========================================================= */
    function handleWhatsApp() {
        if (!leadAtual) return;

        const nomeCorretor = localStorage.getItem('sr_usuario') || 'Corretor';
        const res = Acoes.abrirWhatsApp(leadAtual, nomeCorretor);

        if (!res.ok) {
            mostrarToast(res.erro || 'Telefone inválido.', 'error');
            return;
        }

        if (callNoticeText) callNoticeText.textContent = 'WhatsApp aberto com mensagem pronta. Registre o resultado abaixo.';
        if (callNotice)     callNotice.style.display = 'flex';

        mostrarToast('WhatsApp aberto em nova aba.', 'success');
    }

    /* =========================================================
       COPIAR NÚMERO
       ========================================================= */
    async function copiarNumero() {
        const texto = modalLigarNumero.textContent;
        try {
            await navigator.clipboard.writeText(texto);
            mostrarToast('Número copiado!', 'success');
        } catch {
            const range = document.createRange();
            range.selectNode(modalLigarNumero);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            mostrarToast('Número copiado!', 'success');
        }
    }

    /* =========================================================
       CLIQUE NA TAG (lead ativo)
       ========================================================= */
    async function handleTagClick(btn) {
        if (!leadAtual || processando) return;

        const tag = btn.dataset.tag;

        if (tag === 'agendado' || tag === 'retornar_depois') {
            abrirModalAgendamento({
                leadId: leadAtual.id,
                leadNome: leadAtual.nome,
                leadTelefone: leadAtual.telefone,
                tag,
                modo: 'novo',
                agendamentoAtual: null,
                localAtual: ''
            });
            return;
        }

        await salvarResultadoDireto(leadAtual.id, tag);
    }

    async function salvarResultadoDireto(leadId, tag, agendamentoData = null, agendamentoLocal = null) {
        if (processando) return;
        processando = true;

        const textoObs = observacao ? observacao.value.trim() : '';

        try {
            await ApiClient.post(`/api/corretor/leads/${leadId}/resultado`, {
                resultado: tag,
                observacao: textoObs,
                agendamento_data: agendamentoData,
                agendamento_local: agendamentoLocal
            });

            mostrarToast(`Registrado: ${tagParaTexto(tag)}`, 'success');

            await atualizarEstatisticas();
            await new Promise(r => setTimeout(r, 400));
            await carregarProximoLead();

        } catch (err) {
            mostrarToast(err.message || 'Erro ao registrar.', 'error');
            processando = false;
        }
    }

    /* =========================================================
       MODAL DE AGENDAMENTO
       ========================================================= */
    function abrirModalAgendamento({ leadId, leadNome, leadTelefone, tag, modo, agendamentoAtual = null, localAtual = '' }) {
        if (!modalAgendamento) {
            console.error('[agendamento] modal não encontrado');
            mostrarToast('Modal de agendamento não está no HTML.', 'error');
            return;
        }

        agendamentoPendente = { leadId, tag, modo };

        if (tag === 'agendado') {
            if (agendamentoTitulo)    agendamentoTitulo.innerHTML = '<i class="fas fa-calendar-check"></i> Agendamento';
            if (agendamentoSubtitulo) agendamentoSubtitulo.textContent = 'Informe data, hora e local do agendamento';
        } else {
            if (agendamentoTitulo)    agendamentoTitulo.innerHTML = '<i class="fas fa-clock"></i> Retornar depois';
            if (agendamentoSubtitulo) agendamentoSubtitulo.textContent = 'Informe quando quer retornar a ligar';
        }

        if (agendamentoLeadNome)     agendamentoLeadNome.textContent = leadNome || '—';
        if (agendamentoLeadTelefone) agendamentoLeadTelefone.textContent = Acoes.formatarTelefone(leadTelefone) || '—';

        if (agendamentoDataError) agendamentoDataError.textContent = '';
        if (agendamentoHoraError) agendamentoHoraError.textContent = '';
        if (agendamentoDataError) agendamentoDataError.classList.remove('visible');
        if (agendamentoHoraError) agendamentoHoraError.classList.remove('visible');
        if (agendamentoData) agendamentoData.classList.remove('error');
        if (agendamentoHora) agendamentoHora.classList.remove('error');

        if (agendamentoAtual) {
            try {
                const dt = parseDataAgendamento(agendamentoAtual);
                const ano    = dt.getFullYear();
                const mes    = String(dt.getMonth() + 1).padStart(2, '0');
                const dia    = String(dt.getDate()).padStart(2, '0');
                const hora   = String(dt.getHours()).padStart(2, '0');
                const minuto = String(dt.getMinutes()).padStart(2, '0');

                if (agendamentoData) agendamentoData.value = `${ano}-${mes}-${dia}`;
                if (agendamentoHora) agendamentoHora.value = `${hora}:${minuto}`;
            } catch {
                if (agendamentoData) agendamentoData.value = '';
                if (agendamentoHora) agendamentoHora.value = '';
            }
        } else {
            if (agendamentoData) agendamentoData.value = '';
            if (agendamentoHora) agendamentoHora.value = '';
        }

        if (agendamentoLocal) agendamentoLocal.value = localAtual || '';

        const hoje = new Date();
        const anoHoje = hoje.getFullYear();
        const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
        const diaHoje = String(hoje.getDate()).padStart(2, '0');
        if (agendamentoData) agendamentoData.min = `${anoHoje}-${mesHoje}-${diaHoje}`;

        if (btnSalvarAgendamentoTexto) {
            btnSalvarAgendamentoTexto.textContent = modo === 'novo' ? 'Salvar agendamento' : 'Salvar alteração';
        }

        modalAgendamento.style.display = 'flex';
        setTimeout(() => { if (agendamentoData) agendamentoData.focus(); }, 120);
    }

    function fecharModalAgendamento() {
        if (modalAgendamento) modalAgendamento.style.display = 'none';
        agendamentoPendente = null;
    }

    async function salvarAgendamento() {
        if (!agendamentoPendente) return;

        const { leadId, tag, modo } = agendamentoPendente;

        const data  = agendamentoData ? agendamentoData.value : '';
        const hora  = agendamentoHora ? agendamentoHora.value : '';
        const local = agendamentoLocal ? agendamentoLocal.value.trim() : '';

        let temErro = false;

        if (!data) {
            if (agendamentoDataError) {
                agendamentoDataError.textContent = 'Informe a data.';
                agendamentoDataError.classList.add('visible');
            }
            if (agendamentoData) agendamentoData.classList.add('error');
            temErro = true;
        }

        if (!hora) {
            if (agendamentoHoraError) {
                agendamentoHoraError.textContent = 'Informe a hora.';
                agendamentoHoraError.classList.add('visible');
            }
            if (agendamentoHora) agendamentoHora.classList.add('error');
            temErro = true;
        }

        if (temErro) return;

        const agendamentoDataISO = `${data} ${hora}:00-03:00`;

        if (btnSalvarAgendamento) btnSalvarAgendamento.disabled = true;
        if (btnSalvarAgendamentoTexto) btnSalvarAgendamentoTexto.textContent = 'Salvando...';

        try {
            if (modo === 'novo') {
                await ApiClient.post(`/api/corretor/leads/${leadId}/resultado`, {
                    resultado: tag,
                    observacao: observacao ? observacao.value.trim() : '',
                    agendamento_data: agendamentoDataISO,
                    agendamento_local: local
                });

                mostrarToast(`${tag === 'agendado' ? 'Agendado' : 'Retorno'}: ${formatarDataHora(data, hora)}`, 'success');

                fecharModalAgendamento();
                processando = false;
                await atualizarEstatisticas();
                await new Promise(r => setTimeout(r, 300));
                await carregarProximoLead();

            } else {
                await ApiClient.patch(`/api/corretor/leads/${leadId}/qualificacao`, {
                    resultado: tag,
                    agendamento_data: agendamentoDataISO,
                    agendamento_local: local
                });

                mostrarToast('Agendamento atualizado', 'success');
                fecharModalAgendamento();

                const lead = leadsDaCarteiraAtual.find(l => Number(l.id) === Number(leadId));
                if (lead) {
                    lead.agendamento_data = agendamentoDataISO;
                    lead.agendamento_local = local;
                    lead.resultado = tag;
                }

                const itemBtn = document.querySelector(`.historico-item .tag-editavel[data-lead-id="${leadId}"]`);
                if (itemBtn) {
                    const card = itemBtn.closest('.historico-item');

                    itemBtn.dataset.resultado = tag;
                    itemBtn.className = `historico-item-tag ${tagCor(tag)} tag-editavel`;
                    itemBtn.innerHTML = `${escapeHtml(tagParaTexto(tag))} <i class="fas fa-pen"></i>`;

                    const ehDescartado = ['sem_interesse', 'telefone_invalido', 'sem_resposta'].includes(tag);
                    card.classList.toggle('descartado', ehDescartado);

                    const linhaAntiga = card.querySelector('.historico-item-agendamento');
                    if (linhaAntiga) linhaAntiga.remove();

                    const dtAg = parseDataAgendamento(agendamentoDataISO);
                    const dtAgStr = dtAg.toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    });

                    const linhaNova = document.createElement('div');
                    linhaNova.className = 'historico-item-agendamento';
                    linhaNova.innerHTML = `
                        <i class="fas fa-calendar-alt"></i>
                        <span>${dtAgStr}${local ? ` · ${escapeHtml(local)}` : ''}</span>
                    `;

                    const obsAntiga = card.querySelector('.historico-item-obs');
                    if (obsAntiga) {
                        card.insertBefore(linhaNova, obsAntiga);
                    } else {
                        card.appendChild(linhaNova);
                    }
                }
            }

        } catch (err) {
            mostrarToast(err.message || 'Erro ao salvar.', 'error');
        } finally {
            if (btnSalvarAgendamento) btnSalvarAgendamento.disabled = false;
            if (btnSalvarAgendamentoTexto) {
                btnSalvarAgendamentoTexto.textContent = modo === 'novo' ? 'Salvar agendamento' : 'Salvar alteração';
            }
        }
    }

    /* =========================================================
       HISTÓRICO — NÍVEL 1 (carteiras)
       ========================================================= */
    async function abrirHistorico() {
        carteiraAtual = null;
        leadsDaCarteiraAtual = [];
        if (modalHistorico) modalHistorico.style.display = 'flex';

        historicoLista.innerHTML = `
            <div class="historico-loading">
                <i class="fas fa-circle-notch fa-spin"></i>
                <p>Carregando...</p>
            </div>
        `;
        if (historicoVazio) historicoVazio.style.display = 'none';
        if (historicoResumo) historicoResumo.textContent = 'Carregando...';

        await carregarCarteiras();
    }

    async function carregarCarteiras() {
        try {
            const { carteiras } = await ApiClient.get('/api/corretor/historico/carteiras');

            historicoLista.innerHTML = '';

            if (!carteiras.length) {
                if (historicoVazio) historicoVazio.style.display = 'block';
                historicoLista.style.display = 'none';
                if (historicoResumo) historicoResumo.textContent = 'Você ainda não trabalhou nenhum cliente.';
                return;
            }

            if (historicoVazio) historicoVazio.style.display = 'none';
            historicoLista.style.display = 'flex';

            const totalTrabalhados = carteiras.reduce((acc, c) => acc + c.total_qualificados, 0);
            if (historicoResumo) {
                historicoResumo.textContent = `${carteiras.length} ${carteiras.length === 1 ? 'carteira' : 'carteiras'} · ${totalTrabalhados} trabalhados`;
            }

            historicoLista.innerHTML = carteiras.map(c => `
                <button class="carteira-item" data-lista-id="${c.lista_id}">
                    <div class="carteira-item-icon">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <div class="carteira-item-info">
                        <strong>${escapeHtml(c.lista_nome)}</strong>
                        <small>
                            <i class="fas fa-check-circle"></i>
                            ${c.total_qualificados} ${c.total_qualificados === 1 ? 'trabalhado' : 'trabalhados'}
                            · Última atividade ${dataCurta(c.ultima_atividade)}
                        </small>
                    </div>
                    <i class="fas fa-chevron-right carteira-item-arrow"></i>
                </button>
            `).join('');

            historicoLista.querySelectorAll('.carteira-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const listaId = Number(btn.dataset.listaId);
                    abrirCarteira(listaId);
                });
            });

        } catch (err) {
            console.error('[historico] erro:', err);
            historicoLista.innerHTML = '';
            if (historicoVazio) historicoVazio.style.display = 'block';
            if (historicoResumo) historicoResumo.textContent = 'Erro ao carregar.';
        }
    }

    /* =========================================================
       HISTÓRICO — NÍVEL 2 (leads de uma carteira)
       ========================================================= */
    async function abrirCarteira(listaId) {
        carteiraAtual = { listaId, busca: '' };
        await carregarCarteira();
    }

    function renderizarListaLeads(leads) {
        const leadsContainer = document.getElementById('carteiraLeadsLista');
        if (!leadsContainer) return;

        if (!leads.length) {
            leadsContainer.innerHTML = `
                <div class="historico-vazio" style="padding: 1.5rem;">
                    <i class="fas fa-search"></i>
                    <p>Nenhum cliente encontrado.</p>
                </div>
            `;
            return;
        }

        leadsContainer.innerHTML = leads.map(item => {
            const classeCor = tagCor(item.resultado);
            const ehDescartado = item.status === 'descartado' || item.status === 'sem_resposta';
            const data = parseDataSegura(item.decidido_em)?.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit'
            }) || '—';

            let linhaAgendamento = '';
            if (item.agendamento_data) {
                const dtAg = parseDataAgendamento(item.agendamento_data);
                const dtAgStr = dtAg.toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                });
                linhaAgendamento = `
                    <div class="historico-item-agendamento">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${dtAgStr}${item.agendamento_local ? ` · ${escapeHtml(item.agendamento_local)}` : ''}</span>
                    </div>
                `;
            }

            return `
                <div class="historico-item ${ehDescartado ? 'descartado' : ''}">
                    <div class="historico-item-top">
                        <span class="historico-item-nome">${escapeHtml(item.nome)}</span>
                        <button
                            class="historico-item-tag ${classeCor} tag-editavel"
                            data-lead-id="${item.id}"
                            data-resultado="${item.resultado}"
                            title="Clique para alterar"
                        >
                            ${escapeHtml(tagParaTexto(item.resultado))}
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>
                    <div class="historico-item-info">
                        <span><i class="fas fa-phone"></i> ${escapeHtml(Acoes.formatarTelefone(item.telefone))}</span>
                        <span><i class="fas fa-clock"></i> ${data}</span>
                    </div>
                    ${linhaAgendamento}
                    ${item.observacao
                        ? `<div class="historico-item-obs">
                               <i class="fas fa-comment-dots"></i>
                               <span>${escapeHtml(item.observacao)}</span>
                           </div>`
                        : ''}
                </div>
            `;
        }).join('');

        leadsContainer.querySelectorAll('.tag-editavel').forEach(btn => {
            btn.addEventListener('click', () => abrirSeletorTag(btn));
        });
    }

    async function carregarCarteira(silencioso = false) {
        if (!carteiraAtual) return;

        const { listaId, busca } = carteiraAtual;

        if (!silencioso) {
            historicoLista.innerHTML = `
                <div class="historico-loading">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <p>Carregando carteira...</p>
                </div>
            `;
        }

        try {
            const url = busca
                ? `/api/corretor/historico/carteiras/${listaId}?busca=${encodeURIComponent(busca)}`
                : `/api/corretor/historico/carteiras/${listaId}`;

            const { lista, leads } = await ApiClient.get(url);

            leadsDaCarteiraAtual = leads;

            if (historicoResumo) {
                historicoResumo.textContent = `${lista.nome} · ${leads.length} ${
                    leads.length === 1 ? 'cliente' : 'clientes'
                }`;
            }

            historicoLista.innerHTML = `
                <div class="carteira-header">
                    <button class="btn-voltar" id="btnVoltarCarteiras">
                        <i class="fas fa-arrow-left"></i>
                        Voltar
                    </button>
                    <strong class="carteira-header-nome">${escapeHtml(lista.nome)}</strong>
                </div>
                <div class="carteira-busca">
                    <i class="fas fa-search"></i>
                    <input
                        type="text"
                        id="carteiraBusca"
                        placeholder="Buscar cliente por nome..."
                        value="${escapeHtml(busca)}"
                    >
                </div>
                <div id="carteiraLeadsLista"></div>
            `;

            document.getElementById('btnVoltarCarteiras').addEventListener('click', () => {
                carteiraAtual = null;
                leadsDaCarteiraAtual = [];
                carregarCarteiras();
            });

            const inputBusca = document.getElementById('carteiraBusca');
            let timeoutBusca = null;
            inputBusca.addEventListener('input', (e) => {
                clearTimeout(timeoutBusca);
                const valor = e.target.value.trim();
                timeoutBusca = setTimeout(() => {
                    carteiraAtual.busca = valor;
                    atualizarListaLeadsCarteira();
                }, 600);
            });

            renderizarListaLeads(leads);

        } catch (err) {
            console.error('[historico-carteira] erro:', err);
            historicoLista.innerHTML = '';
            if (historicoVazio) historicoVazio.style.display = 'block';
            if (historicoResumo) historicoResumo.textContent = 'Erro ao carregar carteira.';
        }
    }

    async function atualizarListaLeadsCarteira() {
        if (!carteiraAtual) return;

        const { listaId, busca } = carteiraAtual;

        try {
            const url = busca
                ? `/api/corretor/historico/carteiras/${listaId}?busca=${encodeURIComponent(busca)}`
                : `/api/corretor/historico/carteiras/${listaId}`;

            const { lista, leads } = await ApiClient.get(url);
            leadsDaCarteiraAtual = leads;

            if (historicoResumo) {
                historicoResumo.textContent = `${lista.nome} · ${leads.length} ${
                    leads.length === 1 ? 'cliente' : 'clientes'
                }`;
            }

            renderizarListaLeads(leads);

        } catch (err) {
            console.error('[busca-carteira] erro:', err);
        }
    }

    function fecharHistorico() {
        if (modalHistorico) modalHistorico.style.display = 'none';
        carteiraAtual = null;
        leadsDaCarteiraAtual = [];
        const editor = document.querySelector('.tag-editor');
        if (editor) editor.remove();
    }

    /* =========================================================
       EDITAR TAG NO HISTÓRICO
       ========================================================= */
    function abrirSeletorTag(btn) {
        const leadId = Number(btn.dataset.leadId);
        const resultadoAtual = btn.dataset.resultado;

        const aberto = document.querySelector('.tag-editor');
        if (aberto) aberto.remove();

        const editor = document.createElement('div');
        editor.className = 'tag-editor';
        editor.innerHTML = `
            <div class="tag-editor-header">
                <span>Alterar qualificação</span>
                <button class="tag-editor-close" type="button">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="tag-editor-list">
                ${[
                    { key: 'vendido',           label: 'Vendido',               cor: 'success' },
                    { key: 'agendado',          label: 'Agendado',              cor: 'success' },
                    { key: 'em_atendimento',    label: 'Em atendimento',        cor: 'success' },
                    { key: 'mensagem_enviada',  label: 'Mensagem enviada',      cor: 'warning' },
                    { key: 'retornar_depois',   label: 'Retornar depois',       cor: 'warning' },
                    { key: 'follow_up',         label: 'Follow up',             cor: 'warning' },
                    { key: 'sem_interesse',     label: 'Cliente sem interesse', cor: 'danger'  },
                    { key: 'telefone_invalido', label: 'Telefone inexistente',  cor: 'danger'  },
                    { key: 'sem_resposta',      label: 'Sem resposta',          cor: 'danger'  }
                ].map(t => `
                    <button
                        class="tag-opcao ${t.cor} ${t.key === resultadoAtual ? 'atual' : ''}"
                        type="button"
                        data-novo-resultado="${t.key}"
                    >
                        <span>${t.label}</span>
                        ${t.key === resultadoAtual ? '<i class="fas fa-check"></i>' : ''}
                    </button>
                `).join('')}
            </div>
        `;

        document.body.appendChild(editor);

        const rect = btn.getBoundingClientRect();
        const editorWidth = 260;
        const margem = 8;

        let left = rect.right - editorWidth;
        let top = rect.bottom + margem;

        if (left < margem) left = margem;
        if (left + editorWidth > window.innerWidth - margem) {
            left = window.innerWidth - editorWidth - margem;
        }
        if (top + 400 > window.innerHeight) {
            top = rect.top - Math.min(400, window.innerHeight - rect.top) - margem;
            if (top < margem) top = margem;
        }

        editor.style.left = `${left + window.scrollX}px`;
        editor.style.top  = `${top + window.scrollY}px`;

        editor.querySelector('.tag-editor-close').addEventListener('click', () => editor.remove());

        setTimeout(() => {
            const fechar = (e) => {
                if (!editor.contains(e.target) && e.target !== btn) {
                    editor.remove();
                    document.removeEventListener('click', fechar);
                }
            };
            document.addEventListener('click', fechar);
        }, 0);

        editor.querySelectorAll('.tag-opcao').forEach(opc => {
            opc.addEventListener('click', async () => {
                const novoResultado = opc.dataset.novoResultado;

                if (novoResultado === resultadoAtual) {
                    editor.remove();
                    return;
                }

                if (novoResultado === 'agendado' || novoResultado === 'retornar_depois') {
                    const lead = leadsDaCarteiraAtual.find(l => Number(l.id) === Number(leadId));
                    editor.remove();

                    abrirModalAgendamento({
                        leadId,
                        leadNome: lead ? lead.nome : '—',
                        leadTelefone: lead ? lead.telefone : '—',
                        tag: novoResultado,
                        modo: 'editar',
                        agendamentoAtual: lead ? lead.agendamento_data : null,
                        localAtual: lead ? lead.agendamento_local : ''
                    });
                    return;
                }

                try {
                    await ApiClient.patch(`/api/corretor/leads/${leadId}/qualificacao`, {
                        resultado: novoResultado
                    });

                    mostrarToast(`Alterado para: ${tagParaTexto(novoResultado)}`, 'success');
                    editor.remove();

                    btn.dataset.resultado = novoResultado;
                    btn.className = `historico-item-tag ${tagCor(novoResultado)} tag-editavel`;
                    btn.innerHTML = `${escapeHtml(tagParaTexto(novoResultado))} <i class="fas fa-pen"></i>`;

                    const lead = leadsDaCarteiraAtual.find(l => Number(l.id) === Number(leadId));
                    if (lead) {
                        lead.resultado = novoResultado;
                        lead.status = ['sem_interesse', 'telefone_invalido', 'sem_resposta'].includes(novoResultado)
                            ? 'descartado'
                            : 'qualificado';
                    }

                    const card = btn.closest('.historico-item');
                    if (card && lead) {
                        const ehDescartado = lead.status === 'descartado';
                        card.classList.toggle('descartado', ehDescartado);
                    }

                } catch (err) {
                    console.error('[editar-tag] erro:', err);
                    mostrarToast(err.message || 'Erro ao alterar.', 'error');
                }
            });
        });
    }

    /* =========================================================
       NOTIFICAÇÕES
       ========================================================= */
    async function verificarAgendamentos() {
        try {
            const { agendamentos } = await ApiClient.get('/api/corretor/agendamentos');
            const agora = new Date();

            agendamentos.forEach(ag => {
                if (!ag.agendamento_data) return;

                const dataAgendada = parseDataAgendamento(ag.agendamento_data);
                const diffMin = Math.round((dataAgendada - agora) / 60000);

                const chave30 = `30min-${ag.id}`;
                const chaveHora = `hora-${ag.id}`;

                if (diffMin > 25 && diffMin <= 35 && !agendamentosNotificados[chave30]) {
                    agendamentosNotificados[chave30] = true;
                    mostrarNotificacao({
                        tipo: 'warning',
                        titulo: `Faltam 30min — ${ag.nome}`,
                        msg: `${ag.resultado === 'agendado' ? 'Agendamento' : 'Retorno'} às ${
                            dataAgendada.toLocaleTimeString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                        }${ag.agendamento_local ? ` · ${ag.agendamento_local}` : ''}`,
                        leadId: ag.id
                    });
                }

                if (diffMin >= -5 && diffMin <= 5 && !agendamentosNotificados[chaveHora]) {
                    agendamentosNotificados[chaveHora] = true;
                    mostrarNotificacao({
                        tipo: 'danger',
                        titulo: `É agora! — ${ag.nome}`,
                        msg: `Ligar para ${Acoes.formatarTelefone(ag.telefone)}${
                            ag.agendamento_local ? ` · ${ag.agendamento_local}` : ''
                        }`,
                        leadId: ag.id
                    });
                }
            });

        } catch (err) {
            console.error('[notif] erro:', err);
        }
    }

    function mostrarNotificacao({ tipo, titulo, msg, leadId }) {
        if (!notifContainer) return;

        const el = document.createElement('div');
        el.className = `notif-card ${tipo}`;
        el.innerHTML = `
            <div class="notif-icon">
                <i class="fas ${tipo === 'danger' ? 'fa-bell' : 'fa-clock'}"></i>
            </div>
            <div class="notif-body">
                <span class="notif-title">${escapeHtml(titulo)}</span>
                <span class="notif-msg">${escapeHtml(msg)}</span>
            </div>
            <button class="notif-close" type="button" aria-label="Fechar">
                <i class="fas fa-times"></i>
            </button>
        `;

        el.querySelector('.notif-close').addEventListener('click', (e) => {
            e.stopPropagation();
            el.remove();
        });

        el.addEventListener('click', async (e) => {
            if (e.target.closest('.notif-close')) return;
            el.remove();

            if (leadId) {
                await abrirLeadEspecifico(leadId);
            }
        });

        notifContainer.appendChild(el);

        setTimeout(() => {
            if (el.parentElement) el.remove();
        }, 120000);
    }

    /* =========================================================
       ABRIR LEAD ESPECÍFICO (via notificação)
       ========================================================= */
    async function abrirLeadEspecifico(leadId) {
        try {
            const { lead } = await ApiClient.get(`/api/corretor/lead/${leadId}`);

            if (!lead) {
                mostrarToast('Lead não encontrado.', 'error');
                return;
            }

            leadEmModoAgendamento = true;
            leadAtual = lead;
            processando = false;

            if (leadNome)     leadNome.textContent = lead.nome;
            if (leadTelefone) leadTelefone.textContent = Acoes.formatarTelefone(lead.telefone) || lead.telefone;
            if (leadOrigem)   leadOrigem.textContent = lead.lista_nome || 'SR Lançamentos';

            mostrarBadgeAgendamento(lead);

            if (resultList) {
                resultList.querySelectorAll('.result-tag').forEach(btn => {
                    btn.classList.remove('processing');
                });
            }

            if (observacao) observacao.value = lead.observacao || '';
            if (callNotice) callNotice.style.display = 'none';

            mostrarTelaLead();
            await atualizarEstatisticas();

            mostrarToast('Lead agendado aberto', 'info');

        } catch (err) {
            console.error('[abrir-lead] erro:', err);
            mostrarToast(err.message || 'Erro ao abrir lead.', 'error');
        }
    }

    function mostrarBadgeAgendamento(lead) {
        const antigo = document.getElementById('badgeAgendamento');
        if (antigo) antigo.remove();

        if (!lead.agendamento_data) return;

        const dt = parseDataAgendamento(lead.agendamento_data);
        const dataStr = dt.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });

        const badge = document.createElement('div');
        badge.id = 'badgeAgendamento';
        badge.className = 'badge-agendamento';
        badge.innerHTML = `
            <i class="fas fa-calendar-check"></i>
            <span>
                <strong>${lead.resultado === 'agendado' ? 'Agendamento' : 'Retorno'}</strong>
                ${dataStr}
                ${lead.agendamento_local ? ` · ${escapeHtml(lead.agendamento_local)}` : ''}
            </span>
        `;

        const leadCard = document.querySelector('.lead-card');
        if (leadCard) {
            leadCard.insertBefore(badge, leadCard.firstChild);
        }
    }

    function removerBadgeAgendamento() {
        const badge = document.getElementById('badgeAgendamento');
        if (badge) badge.remove();
    }

    /* =========================================================
       UTILS
       ========================================================= */

    /* =========================================================
       HELPER DE DATA — normaliza timezone
       Aceita:
         - "2026-10-02 22:59:37.289+00"  → UTC explícito
         - "2026-10-02 22:59:37"          → SEM timezone (colunas migradas: UTC)
         - "2026-10-02T22:59:37Z"         → já ISO com Z
         - Date                            → retorna direto
       ========================================================= */
    function parseDataSegura(iso) {
        if (!iso) return null;

        if (iso instanceof Date) return iso;

        let str = String(iso).trim();
        if (!str || str === 'null' || str === 'undefined') return null;

        str = str.replace(' ', 'T');

        if (str.endsWith('Z')) return new Date(str);

        const match = str.match(/([+-])(\d{2})(:?(\d{2}))?$/);
        if (match) {
            const sinal = match[1];
            const hh = match[2];
            const mm = match[4] || '00';
            str = str.replace(/([+-]\d{2})(:?\d{2})?$/, sinal + hh + ':' + mm);
            return new Date(str);
        }

        return new Date(str + 'Z');
    }

    function tagParaTexto(tag) {
        const mapa = {
            agendado:          'Agendado',
            em_atendimento:    'Em atendimento',
            vendido:           'Vendido',
            mensagem_enviada:  'Mensagem enviada',
            retornar_depois:   'Retornar depois',
            follow_up:         'Follow up',
            sem_interesse:     'Cliente sem interesse',
            telefone_invalido: 'Telefone inexistente',
            sem_resposta:      'Sem resposta'
        };
        return mapa[tag] || tag;
    }

    function tagCor(tag) {
        if (['agendado', 'em_atendimento', 'vendido'].includes(tag)) return 'success';
        if (['mensagem_enviada', 'retornar_depois', 'follow_up'].includes(tag)) return 'warning';
        return 'danger';
    }

    function dataCurta(iso) {
        if (!iso) return '—';
        const d = parseDataSegura(iso);
        if (!d || isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit'
        });
    }

    function formatarDataHora(dataStr, horaStr) {
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes} às ${horaStr}`;
    }

    function parseDataAgendamento(valor) {
        if (!valor) return null;

        const s = String(valor);

        const matchISO = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z$/);
        if (matchISO) {
            const [, ano, mes, dia, hora, min, seg] = matchISO;
            return new Date(
                Number(ano),
                Number(mes) - 1,
                Number(dia),
                Number(hora),
                Number(min),
                Number(seg || 0)
            );
        }

        const matchLocal = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (matchLocal) {
            const [, ano, mes, dia, hora, min, seg] = matchLocal;
            return new Date(
                Number(ano),
                Number(mes) - 1,
                Number(dia),
                Number(hora),
                Number(min),
                Number(seg || 0)
            );
        }

        if (/[+-]\d{2}:?\d{2}$/.test(s)) {
            return new Date(s);
        }

        return new Date(s);
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* =========================================================
       START
       ========================================================= */
    init();

});