/* =========================================================
   CORRETOR.JS — Dashboard "Minha Carteira"
   A prospecção ativa fica em prospeccao.html
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    /* ---------- ESTADO ---------- */
    let carteiras = [];
    let carteiraAtiva = null;
    let stats = {};
    let toastTimer = null;
    let kpiStatusAtual = null;

    /* ---------- ELEMENTOS ---------- */
    const toast              = $('toast');
    const headerUserName     = $('headerUserName');

    const kpiTrabalhados     = $('kpiTrabalhados');
    const kpiEmAtendimento   = $('kpiEmAtendimento');
    const kpiFollowUp        = $('kpiFollowUp');
    const kpiNaFila          = $('kpiNaFila');
    const kpiMensagens       = $('kpiMensagens');
    const progressMensagens  = $('progressMensagens');
    const kpiTempoMedio      = $('kpiTempoMedio');

    const listaRetornar      = $('listaRetornar');
    const listaAgendamentos  = $('listaAgendamentos');

    const carteiraNomeTop    = $('carteiraNomeTop');
    const btnCarteiras       = $('btnCarteiras');
    const carteirasMenu      = $('carteirasMenu');
    const dashSelectWrap     = $('dashSelectWrap');
    const btnIniciar         = $('btnIniciarProspeccao');

    /* =========================================================
       TOAST
       ========================================================= */
    function mostrarToast(msg, tipo = 'info') {
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast show ${tipo}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.className = 'toast', 2800);
    }

    /* =========================================================
       HELPERS
       ========================================================= */
    function iniciais(nome) {
        return String(nome || '?')
            .trim().split(/\s+/).filter(Boolean).slice(0, 2)
            .map(p => p[0].toUpperCase()).join('');
    }

    function corDoNome(nome) {
        const cores = ['#002c61', '#0a4a91', '#3b82f6', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#0ea5e9'];
        let hash = 0;
        for (let i = 0; i < (nome || '').length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
        return cores[Math.abs(hash) % cores.length];
    }

    function formatarTempo(horas) {
        if (!horas || horas < 0.01) return '—';
        if (horas < 1) return `${Math.round(horas * 60)} min`;
        if (horas < 24) return `${horas.toFixed(1)} h`;
        return `${(horas / 24).toFixed(1)} d`;
    }

    function formatarDataCurta(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const hora = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dia}/${mes} ${hora}:${min}`;
    }

    function classeTagPorResultado(resultado) {
        if (['agendado', 'em_atendimento', 'vendido'].includes(resultado)) return 'success';
        if (['mensagem_enviada', 'retornar_depois', 'follow_up'].includes(resultado)) return 'warning';
        return 'danger';
    }

function labelTag(tag) {
    const mapa = {
        agendado:          'Agendado',
        em_atendimento:    'Em atendimento',
        vendido:           'Vendido',
        mensagem_enviada:  'Mensagem enviada',
        retornar_depois:   'Retornar depois',
        follow_up:         'Follow up',
        sem_interesse:     'Cliente sem interesse',
        telefone_invalido: 'Telefone inexistente',
        sem_resposta:      'Sem resposta',
        sem_sucesso:       'Sem sucesso',
        novo:              'Novo'
    };
    return mapa[tag] || tag || '—';
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
       USUÁRIO
       ========================================================= */
    async function carregarUsuario() {
        try {
            const { usuario } = await ApiClient.get('/api/me');
            if (headerUserName) headerUserName.textContent = usuario.nome.split(' ')[0];
            localStorage.setItem('sr_usuario', usuario.nome);
        } catch (err) {
            console.error('[corretor] erro ao carregar usuário:', err);
        }
    }

    /* =========================================================
       CARTEIRAS
       ========================================================= */
    async function carregarCarteiras() {
        try {
            const { carteiras: lista } = await ApiClient.get('/api/corretor/minhas-carteiras');
            carteiras = lista || [];

            const comFila = carteiras.find(c => c.restantes > 0);
            carteiraAtiva = comFila || carteiras[0] || null;

            if (carteiraNomeTop) {
                carteiraNomeTop.textContent = carteiraAtiva ? carteiraAtiva.nome : 'Carteiras';
            }

            renderizarMenuCarteiras();
        } catch (err) {
            console.error('[corretor] erro ao carregar carteiras:', err);
            mostrarToast('Erro ao carregar carteiras.', 'error');
        }
    }

    function renderizarMenuCarteiras() {
        if (!carteirasMenu) return;

        if (!carteiras.length) {
            carteirasMenu.innerHTML = `
                <div style="padding:1rem;text-align:center;color:var(--gray-500);font-size:0.85rem;">
                    Nenhuma carteira.
                </div>`;
            return;
        }

        carteirasMenu.innerHTML = carteiras.map(c => {
            const isAtual = carteiraAtiva && c.id === carteiraAtiva.id;
            return `
                <button class="dash-select-item ${isAtual ? 'active' : ''}"
                        data-id="${c.id}" type="button">
                    <i class="fas fa-folder-open"></i>
                    <span>${escapeHtml(c.nome)}</span>
                    <span class="badge-mini">${c.restantes}</span>
                </button>
            `;
        }).join('');

        carteirasMenu.querySelectorAll('.dash-select-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.id);
                carteiraAtiva = carteiras.find(c => c.id === id) || null;
                if (carteiraNomeTop) {
                    carteiraNomeTop.textContent = carteiraAtiva ? carteiraAtiva.nome : 'Carteiras';
                }
                dashSelectWrap?.classList.remove('open');
                await carregarDashboard();
            });
        });
    }

    /* =========================================================
       DASHBOARD — KPIs
       ========================================================= */
    async function carregarDashboard() {
        try {
            const url = carteiraAtiva
                ? `/api/corretor/estatisticas?lista_id=${carteiraAtiva.id}`
                : '/api/corretor/estatisticas';

            stats = await ApiClient.get(url);

            if (kpiTrabalhados)   kpiTrabalhados.textContent   = stats.trabalhados || 0;
            if (kpiEmAtendimento) kpiEmAtendimento.textContent = stats.em_atendimento || 0;
            if (kpiFollowUp)      kpiFollowUp.textContent      = stats.follow_up || 0;
            if (kpiNaFila)        kpiNaFila.textContent        = stats.na_fila || 0;

            const mensagens = stats.mensagens_enviadas || 0;
            if (kpiMensagens) kpiMensagens.textContent = mensagens;
            const trabalhados = Number(stats.trabalhados) || 0;
            const pct = trabalhados > 0 ? Math.round((mensagens / trabalhados) * 100) : 0;
            if (progressMensagens) progressMensagens.style.width = pct + '%';

            if (kpiTempoMedio) {
                if (stats.tempoMedioRequalificacao > 0) {
                    kpiTempoMedio.textContent = formatarTempo(Number(stats.tempoMedioRequalificacao));
                } else {
                    kpiTempoMedio.textContent = '—';
                }
            }

            await carregarListasAgendamentos();

        } catch (err) {
            console.error('[corretor] erro no dashboard:', err);
            mostrarToast('Erro ao carregar dashboard.', 'error');
        }
    }

    /* =========================================================
       LISTAS — Retornar / Agendamentos
       ========================================================= */
    async function carregarListasAgendamentos() {
        try {
            const { agendamentos } = await ApiClient.get('/api/corretor/agendamentos');

            const retornar = (agendamentos || [])
                .filter(a => a.resultado === 'retornar_depois')
                .slice(0, 3);

            const ags = (agendamentos || [])
                .filter(a => a.resultado === 'agendado')
                .slice(0, 3);

            renderizarLista(listaRetornar, retornar, 'retornar');
            renderizarLista(listaAgendamentos, ags, 'agendamento');

        } catch (err) {
            console.error('[corretor] erro agendamentos:', err);
        }
    }

    function renderizarLista(container, itens, tipo) {
        if (!container) return;

        if (!itens.length) {
            container.innerHTML = `
                <div class="list-empty">
                    <i class="fas fa-inbox"></i>
                    <p>Nenhum ${tipo === 'retornar' ? 'retorno agendado' : 'agendamento'}.</p>
                </div>`;
            return;
        }

        container.innerHTML = itens.map(item => renderizarItemLista(item, tipo)).join('');
    }

    function renderizarItemLista(item, tipo) {
        const nome = item.nome || '—';
        const ini = iniciais(nome);
        const cor = corDoNome(nome);

        let subtitulo = '';
        let tag = '';
        let tagClasse = 'tag-ok';

        if (tipo === 'retornar') {
            subtitulo = item.observacao || 'Retornar depois';
            tag = 'Retornar';
            tagClasse = 'tag-hoje';
        } else {
            const data = item.agendamento_data ? new Date(item.agendamento_data) : null;
            const hora = data
                ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

            subtitulo = item.agendamento_local
                ? `${item.agendamento_local}${hora ? ' · ' + hora : ''}`
                : (hora || 'Agendado');

            if (data) {
                const hoje = new Date();
                const amanha = new Date();
                amanha.setDate(hoje.getDate() + 1);

                const d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
                const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                const a = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate());

                if (d.getTime() === h.getTime()) {
                    tag = 'Hoje'; tagClasse = 'tag-hoje';
                } else if (d.getTime() === a.getTime()) {
                    tag = 'Amanhã'; tagClasse = 'tag-amanha';
                } else if (d < h) {
                    tag = 'Atrasado'; tagClasse = 'tag-atrasado';
                } else {
                    tag = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    tagClasse = 'tag-amanha';
                }
            } else {
                tag = 'Agendado';
                tagClasse = 'tag-amanha';
            }
        }

        return `
            <div class="list-item" data-id="${item.id}">
                <div class="list-item-avatar" style="background:${cor};">${ini}</div>
                <div class="list-item-info">
                    <strong>${escapeHtml(nome)}</strong>
                    <small>${escapeHtml(subtitulo)}</small>
                </div>
                <span class="list-item-tag ${tagClasse}">${tag}</span>
            </div>
        `;
    }

    /* =========================================================
       INICIAR PROSPECÇÃO
       ========================================================= */
    function iniciarProspeccao() {
        const listaId = carteiraAtiva ? carteiraAtiva.id : '';
        const url = listaId
            ? `prospeccao.html?lista=${listaId}`
            : 'prospeccao.html';
        window.location.href = url;
    }

    /* =========================================================
       MODAL DOS KPIs
       ========================================================= */
    const MAPA_KPIS = {
        kpiTrabalhados:   { status: 'trabalhados',        titulo: 'Clientes Trabalhados' },
        kpiEmAtendimento: { status: 'em_atendimento',     titulo: 'Em Atendimento' },
        kpiFollowUp:      { status: 'follow_up',          titulo: 'Follow Up' },
        kpiNaFila:        { status: 'na_fila',            titulo: 'Na Fila' },
        kpiMensagens:     { status: 'mensagens_enviadas', titulo: 'Mensagens Enviadas' }
    };

    const MAPA_LISTAS = {
        retornar:     { status: 'retornar_depois', titulo: 'Retornar Depois' },
        agendamento:  { status: 'agendado',        titulo: 'Agendamentos' }
    };

    function configurarCliquesKpis() {
        Object.entries(MAPA_KPIS).forEach(([idCard, config]) => {
            const valorEl = $(idCard);
            if (!valorEl) return;

            const card = valorEl.closest('.kpi-card');
            if (!card) return;

            card.style.cursor = 'pointer';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');

            card.addEventListener('click', () => abrirModalKpi(config.status, config.titulo));

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    abrirModalKpi(config.status, config.titulo);
                }
            });
        });
    }

    async function abrirModalKpi(status, titulo) {
        const modal = $('modalKpi');
        if (!modal) return;

        kpiStatusAtual = status;

        $('modalKpiTituloTexto').textContent = titulo;
        $('modalKpiInfo').textContent = 'Carregando...';
        $('modalKpiBusca').value = '';

        modal.style.display = 'flex';
        setTimeout(() => $('modalKpiBusca')?.focus(), 100);

        await carregarLeadsKpi();
    }

    async function carregarLeadsKpi() {
        if (!kpiStatusAtual) return;

        const listaEl = $('modalKpiLista');
        const loadingEl = $('modalKpiLoading');
        const vazioEl = $('modalKpiVazio');

        listaEl.innerHTML = '';
        vazioEl.style.display = 'none';
        loadingEl.style.display = 'block';

        try {
            const listaId = carteiraAtiva ? carteiraAtiva.id : null;

            const url = `/api/corretor/leads-por-status?status=${kpiStatusAtual}` +
                (listaId ? `&lista_id=${listaId}` : '');

            const { leads, total } = await ApiClient.get(url);

            loadingEl.style.display = 'none';
            $('modalKpiInfo').textContent = `${total} cliente${total !== 1 ? 's' : ''}`;

            if (!leads || !leads.length) {
                listaEl.innerHTML = '';
                vazioEl.style.display = 'block';
                return;
            }

            vazioEl.style.display = 'none';
            listaEl.innerHTML = leads.map(l => renderizarItemKpi(l)).join('');

            listaEl.querySelectorAll('.btn-ver-historico').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    abrirHistoricoLead(Number(btn.dataset.id));
                });
            });

        } catch (err) {
            console.error('[corretor] erro KPI:', err);
            loadingEl.style.display = 'none';
            $('modalKpiInfo').textContent = 'Erro ao carregar';
            mostrarToast(err.message || 'Erro ao carregar.', 'error');
        }
    }

    function renderizarItemKpi(l) {
        const classe = classeTagPorResultado(l.resultado);
        const data = l.decidido_em ? formatarDataCurta(l.decidido_em) : '';
        const tag = labelTag(l.resultado) || labelTag(l.status);

        let agendamentoHtml = '';
        if (l.agendamento_data) {
            const dtAg = formatarDataCurta(l.agendamento_data);
            const local = l.agendamento_local || '';
            agendamentoHtml = `
                <div class="historico-item-agendamento">
                    <i class="fas fa-calendar-check"></i>
                    <span>${dtAg}${local ? ' · ' + escapeHtml(local) : ''}</span>
                </div>
            `;
        }

        const obsHtml = l.observacao
            ? `<div class="historico-item-obs">
                   <i class="fas fa-comment-dots"></i>
                   <span>${escapeHtml(l.observacao)}</span>
               </div>`
            : '';

        return `
            <div class="historico-item ${l.status === 'descartado' ? 'descartado' : ''}" data-lead-id="${l.id}">
                <div class="historico-item-top">
                    <div class="historico-item-nome">${escapeHtml(l.nome || '—')}</div>
                    <button
                        class="historico-item-tag ${classe} tag-editavel"
                        data-lead-id="${l.id}"
                        data-resultado="${l.resultado}"
                        title="Clique para alterar"
                        type="button"
                    >
                        <span>${tag}</span>
                        <i class="fas fa-pen"></i>
                    </button>
                </div>
                <div class="historico-item-info">
                    <span><i class="fas fa-phone"></i> ${Acoes.formatarTelefone(l.telefone)}</span>
                    <span><i class="fas fa-folder-open"></i> ${escapeHtml(l.lista_nome || '—')}</span>
                    ${data ? `<span><i class="fas fa-clock"></i> ${data}</span>` : ''}
                </div>
                ${agendamentoHtml}
                ${obsHtml}
                <button class="btn-ver-historico" data-id="${l.id}" type="button">
                    <i class="fas fa-history"></i>
                    Ver histórico
                </button>
            </div>
        `;
    }

    /* =========================================================
       HISTÓRICO INDIVIDUAL DO LEAD
       ========================================================= */
    async function abrirHistoricoLead(leadId) {
        try {
            const { historico } = await ApiClient.get(`/api/corretor/lead/${leadId}/historico`);

            if (!historico || !historico.length) {
                mostrarToast('Sem histórico registrado.', 'info');
                return;
            }

            const linhas = historico.map(h => {
                const data = formatarDataCurta(h.criado_em);
                const tag = labelTag(h.acao);
                const obs = h.observacao ? ` — ${h.observacao}` : '';
                return `• ${data} → ${tag}${obs}`;
            }).join('\n');

            alert(`Histórico do lead:\n\n${linhas}`);

        } catch (err) {
            console.error('[corretor] erro histórico lead:', err);
            mostrarToast('Erro ao carregar histórico.', 'error');
        }
    }

    /* =========================================================
       EDITOR DE TAG INLINE (9 tags)
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

                try {
                    await ApiClient.patch(`/api/corretor/leads/${leadId}/qualificacao`, {
                        resultado: novoResultado
                    });

                    mostrarToast(`Alterado para: ${labelTag(novoResultado)}`, 'success');
                    editor.remove();

                    btn.dataset.resultado = novoResultado;
                    btn.className = `historico-item-tag ${classeTagPorResultado(novoResultado)} tag-editavel`;
                    btn.innerHTML = `<span>${labelTag(novoResultado)}</span> <i class="fas fa-pen"></i>`;

                    const card = btn.closest('.historico-item');
                    const ehDescartado = ['sem_interesse', 'telefone_invalido', 'sem_resposta'].includes(novoResultado);
                    card?.classList.toggle('descartado', ehDescartado);

                    await carregarDashboard();

                } catch (err) {
                    console.error('[editar-tag] erro:', err);
                    mostrarToast(err.message || 'Erro ao alterar.', 'error');
                }
            });
        });
    }

    /* =========================================================
       EVENTOS
       ========================================================= */
    function configurarEventosModalKpi() {
        $('btnFecharModalKpi')?.addEventListener('click', fecharModalKpi);

        $('modalKpi')?.addEventListener('click', (e) => {
            if (e.target.id === 'modalKpi') fecharModalKpi();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && $('modalKpi')?.style.display === 'flex') {
                fecharModalKpi();
            }
        });

        $('modalKpiBusca')?.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase().trim();
            const cards = $('modalKpiLista').querySelectorAll('.historico-item');
            let visiveis = 0;

            cards.forEach(card => {
                const texto = card.textContent.toLowerCase();
                const mostrar = !termo || texto.includes(termo);
                card.style.display = mostrar ? '' : 'none';
                if (mostrar) visiveis++;
            });

            const temCards = cards.length > 0;
            $('modalKpiVazio').style.display = (temCards && visiveis === 0) ? 'block' : 'none';
        });

        // DELEGAÇÃO — clique nas tags do modal KPI
        const listaKpi = $('modalKpiLista');
        if (listaKpi && !listaKpi.dataset.delegado) {
            listaKpi.addEventListener('click', (e) => {
                const btn = e.target.closest('.tag-editavel');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();
                abrirSeletorTag(btn);
            });
            listaKpi.dataset.delegado = '1';
        }
    }

    function fecharModalKpi() {
        const modal = $('modalKpi');
        if (modal) modal.style.display = 'none';
        kpiStatusAtual = null;
        const editor = document.querySelector('.tag-editor');
        if (editor) editor.remove();
    }

    /* =========================================================
       INIT
       ========================================================= */
    async function init() {
        await carregarUsuario();
        await carregarCarteiras();
        await carregarDashboard();

        configurarCliquesKpis();
        configurarEventosModalKpi();

        btnIniciar.addEventListener('click', iniciarProspeccao);

        btnCarteiras.addEventListener('click', (e) => {
            e.stopPropagation();
            dashSelectWrap?.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (dashSelectWrap && !dashSelectWrap.contains(e.target)) {
                dashSelectWrap.classList.remove('open');
            }
        });

        $('linkVerTodosRetornar')?.addEventListener('click', () => {
            abrirModalKpi(MAPA_LISTAS.retornar.status, MAPA_LISTAS.retornar.titulo);
        });

        $('linkVerTodosAgendamentos')?.addEventListener('click', () => {
            abrirModalKpi(MAPA_LISTAS.agendamento.status, MAPA_LISTAS.agendamento.titulo);
        });

        setInterval(() => {
            carregarDashboard();
        }, 120000);
    }

    init();
});