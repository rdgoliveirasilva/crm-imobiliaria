/* =========================================================
   ADMIN.JS — Painel Admin
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    let listaSelecionadaAtual = null;
    let todosContatosDaLista = [];
    let confirmCallback = null;
    let toastTimer = null;
    let pollingTimer = null;
    let corretorEditandoId = null;
    let corretorEditandoTipo = 'corretor';

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    // Header
    const headerUserName = $('headerUserName');

    // Nav
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Dashboard
    const kpiListas            = $('kpiListas');
    const kpiTotal             = $('kpiTotal');
    const kpiQualificados      = $('kpiQualificados');
    const kpiAguardando        = $('kpiAguardando');
    const corretoresCarteira   = $('corretoresCarteira');
    const carteirasGrid        = $('carteirasGrid');
    const carteirasVazio       = $('carteirasVazio');
    const badgeTotalCorretores = $('badgeTotalCorretores');
    const badgeTotalCarteiras  = $('badgeTotalCarteiras');

    // Gráficos
    const graficoLinha   = $('graficoLinha');
    const graficoDonut   = $('graficoDonut');
    const graficoColunas = $('graficoColunas');
    const gaugeFill      = $('gaugeFill');
    const gaugeValor     = $('gaugeValor');
    const gaugeLabel     = $('gaugeLabel');

    // Modal tag (drill-down do donut)
    const modalTag        = $('modalTag');
    const modalTagTitulo  = $('modalTagTitulo');
    const modalTagInfo    = $('modalTagInfo');
    const modalTagTbody   = $('modalTagTbody');
    const modalTagVazio   = $('modalTagVazio');
    const modalTagBusca   = $('modalTagBusca');
    const modalTagDe      = $('modalTagDe');
    const modalTagAte     = $('modalTagAte');
    const btnFecharModalTag  = $('btnFecharModalTag');
    const btnLimparFiltroTag = $('btnLimparFiltroTag');

    // Upload
    const modoBtns           = document.querySelectorAll('.modo-btn');
    const blocoArquivo       = $('blocoArquivo');
    const blocoTexto         = $('blocoTexto');
    const nomeListaInput     = $('nomeLista');
    const textoListaInput    = $('textoLista');
    const nomeListaError     = $('nomeListaError');
    const textoListaError    = $('textoListaError');
    const corretoresError    = $('corretoresError');
    const previewContatos    = $('previewContatos');
    const previewCount       = $('previewCount');
    const previewList        = $('previewList');
    const corretoresSelector = $('corretoresSelector');
    const btnSubirLista      = $('btnSubirLista');
    const infoRoleta         = $('infoRoleta');
    const fileDrop           = $('fileDrop');
    const arquivoCsv         = $('arquivoCsv');
    const fileDropContent    = $('fileDropContent');
    const fileInfo           = $('fileInfo');
    const fileInfoNome       = $('fileInfoNome');
    const fileInfoTamanho    = $('fileInfoTamanho');
    const btnRemoverArquivo  = $('btnRemoverArquivo');
    const arquivoCsvError    = $('arquivoCsvError');

    // Atualização de lista (custom select)
    const selectAtualizacaoLista      = $('selectAtualizacaoLista');
    const selectAtualizacaoListaError = $('selectAtualizacaoListaError');
    const customAtualizacao           = $('customAtualizacao');
    const customAtualizacaoTrigger    = $('customAtualizacaoTrigger');
    const customAtualizacaoText       = $('customAtualizacaoText');
    const customAtualizacaoMenu       = $('customAtualizacaoMenu');

    // Listas
    const listasGrid       = $('listasGrid');
    const listasVazio      = $('listasVazio');
    const badgeTotalListas = $('badgeTotalListas');

    // Corretores
    const novoNomeInput            = $('novoNome');
    const novoUsuarioInput         = $('novoUsuario');
    const novaSenhaInput           = $('novaSenha');
    const novoNomeError            = $('novoNomeError');
    const novoUsuarioError         = $('novoUsuarioError');
    const novaSenhaError           = $('novaSenhaError');
    const btnCadastrarCorretor     = $('btnCadastrarCorretor');
    const corretoresList           = $('corretoresList');
    const corretoresVazio          = $('corretoresVazio');
    const badgeTotalCorretoresList = $('badgeTotalCorretoresList');

    // Modal lista
    const modalLista          = $('modalLista');
    const modalListaNome      = $('modalListaNome');
    const modalListaInfo      = $('modalListaInfo');
    const btnFecharModalLista = $('btnFecharModalLista');
    const modalSearchContato  = $('modalSearchContato');
    const contatosVazio       = $('contatosVazio');
    const btnDeletarLista     = $('btnDeletarLista');

    // Modal gerenciar corretores
    const modalGerenciar           = $('modalGerenciar');
    const gerenciarListaNome       = $('gerenciarListaNome');
    const gerenciarListaCorretores = $('gerenciarListaCorretores');
    const btnGerenciarCorretores   = $('btnGerenciarCorretores');
    const btnFecharGerenciar       = $('btnFecharGerenciar');
    const btnCancelarGerenciar     = $('btnCancelarGerenciar');
    const btnSalvarGerenciar       = $('btnSalvarGerenciar');
    const btnSalvarGerenciarTexto  = $('btnSalvarGerenciarTexto');
    const gerenciarMensagem        = $('gerenciarMensagem');
    const btnSalvarMensagem        = $('btnSalvarMensagem');
    const btnSalvarMensagemTexto   = $('btnSalvarMensagemTexto');

    // Modal confirmação
    const modalConfirm     = $('modalConfirm');
    const confirmTitle     = $('confirmTitle');
    const confirmMessage   = $('confirmMessage');
    const btnFecharConfirm = $('btnFecharConfirm');
    const btnConfirmNao    = $('btnConfirmNao');
    const btnConfirmSim    = $('btnConfirmSim');

    // Modal editar corretor
    const modalEditarCorretor          = $('modalEditarCorretor');
    const editarNomeInput              = $('editarNome');
    const editarUsuarioInput           = $('editarUsuario');
    const editarSenhaInput             = $('editarSenha');
    const editarNomeError              = $('editarNomeError');
    const editarUsuarioError           = $('editarUsuarioError');
    const editarSenhaError             = $('editarSenhaError');
    const btnFecharEditarCorretor      = $('btnFecharEditarCorretor');
    const btnCancelarEditarCorretor    = $('btnCancelarEditarCorretor');
    const btnSalvarEditarCorretor      = $('btnSalvarEditarCorretor');
    const btnSalvarEditarCorretorTexto = $('btnSalvarEditarCorretorTexto');

const btnToggleTipo     = $('btnToggleTipo');
const btnToggleTipoText = $('btnToggleTipoText');
    
    // Mensagem WhatsApp (upload)
    const mensagemWhatsappInput = $('mensagemWhatsapp');

    // Toast
    const toast = $('toast');

    /* =========================================================
       ESTADO
       ========================================================= */
    let modoAtual = 'arquivo';
    let contatosDoArquivo = [];
    let enviandoLista = false;

    let listasDisponiveis = [];
    let listaAtualizacaoSelecionada = null;
    let statsListaAtual = {};

    // Gráficos
    let chartLinha   = null;
    let chartDonut   = null;
    let chartColunas = null;

    // Drill-down por tag
    let filtroTagAtual = { chave: null, label: '', busca: '', de: '', ate: '' };
    let leadsTagAtuais = [];

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
       UTILS
       ========================================================= */
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function iniciais(nome) {
        return String(nome || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(p => p[0].toUpperCase())
            .join('');
    }

    function formatarTelefone(tel) {
        const n = String(tel).replace(/\D/g, '');
        if (n.length === 13) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`;
        if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
        if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
        return tel;
    }

    function dataCurta(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        });
    }

    function formatarUltimoAcesso(iso) {
        if (!iso) return 'Nunca acessou';

        const d = new Date(iso);
        const agora = new Date();

        const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const inicioOntem = new Date(inicioHoje);
        inicioOntem.setDate(inicioOntem.getDate() - 1);

        const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (d >= inicioHoje) {
            return `hoje às ${hora}`;
        } else if (d >= inicioOntem) {
            return `ontem às ${hora}`;
        } else {
            const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            return `${data} às ${hora}`;
        }
    }

    function formatarTamanho(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    function tagParaTexto(tag) {
        const mapa = {
            agendado:          'Agendado',
            em_atendimento:    'Em atendimento',
            vendido:           'Vendido',
            mensagem_enviada:  'Mensagem enviada',
            retornar_depois:   'Retornar depois',
            follow_up:         'Follow Up',
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

    /* =========================================================
       MODAL DE CONFIRMAÇÃO
       ========================================================= */
    function abrirConfirm(titulo, mensagem, onConfirm) {
        confirmTitle.textContent = titulo;
        confirmMessage.textContent = mensagem;
        confirmCallback = onConfirm;
        modalConfirm.style.display = 'flex';
    }

    function fecharConfirm() {
        modalConfirm.style.display = 'none';
        confirmCallback = null;
    }

    if (btnConfirmNao) btnConfirmNao.addEventListener('click', fecharConfirm);
    if (btnFecharConfirm) btnFecharConfirm.addEventListener('click', fecharConfirm);
    if (modalConfirm) {
        modalConfirm.addEventListener('click', (e) => {
            if (e.target === modalConfirm) fecharConfirm();
        });
    }
    if (btnConfirmSim) {
        btnConfirmSim.addEventListener('click', async () => {
            if (confirmCallback) await confirmCallback();
            fecharConfirm();
        });
    }

    /* =========================================================
       NAVEGAÇÃO POR ABAS
       ========================================================= */
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const alvo = tab.dataset.tab;

            navTabs.forEach(t => t.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const panel = document.getElementById(`tab-${alvo}`);
            if (panel) panel.classList.add('active');

            if (alvo === 'dashboard')  atualizarDashboard();
            if (alvo === 'upload') {
                renderizarSeletorCorretores();
                carregarListasParaAtualizacao();
            }
            if (alvo === 'listas')     renderizarListas();
            if (alvo === 'corretores') renderizarCorretores();
        });
    });

    /* =========================================================
       DASHBOARD
       ========================================================= */
    async function atualizarDashboard() {
        try {
            const stats = await ApiClient.get('/api/admin/dashboard');

            kpiListas.textContent       = stats.totalListas;
            kpiTotal.textContent        = stats.totalContatos;
            kpiQualificados.textContent = stats.qualificados;
            kpiAguardando.textContent   = stats.aguardando;

            const { corretoresResumo, carteiras } = await ApiClient.get('/api/admin/dashboard/carteiras');

            renderizarCorretoresResumo(corretoresResumo);
            renderizarCarteiras(carteiras);

            if (badgeTotalCorretores) badgeTotalCorretores.textContent = corretoresResumo.length;
            if (badgeTotalCarteiras)  badgeTotalCarteiras.textContent  = carteiras.length;

            adicionarSparklines();
            await carregarGraficos();

        } catch (err) {
            console.error('[dashboard] erro:', err);
            mostrarToast('Erro ao carregar dashboard.', 'error');
        }
    }

function renderizarCorretoresResumo(corretores) {
    if (!corretores.length) {
        corretoresCarteira.innerHTML = `
            <div class="empty-state small">
                <i class="fas fa-users"></i>
                <p>Nenhum corretor cadastrado ainda.</p>
            </div>
        `;
        return;
    }

    corretoresCarteira.innerHTML = corretores.slice(0, 10).map(c => {
        const statusLabel = {
            online:  'Online agora',
            ausente: 'Ausente',
            offline: c.ultimo_acesso
                ? `Último acesso: ${formatarUltimoAcesso(c.ultimo_acesso)}`
                : 'Nunca acessou'
        }[c.status];

        const ehTeste = c.tipo === 'teste';

        const badge = ehTeste
            ? `<span class="badge-teste-inline"><i class="fas fa-flask"></i> Teste</span>`
            : '';

        return `
            <div class="corretor-carteira-item ${ehTeste ? 'is-teste' : ''}">
                <div class="corretor-avatar">
                    ${iniciais(c.nome)}
                    <span class="corretor-avatar-status ${c.status}"></span>
                </div>
                <div class="corretor-info">
                    <strong>${escapeHtml(c.nome)}${badge}</strong>
                    <small>@${escapeHtml(c.usuario)}</small>
                    <span class="corretor-status-text ${c.status}">
                        <i class="fas fa-circle"></i>
                        ${escapeHtml(statusLabel)}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

    function renderizarCarteiras(carteiras) {
        if (!carteiras.length) {
            carteirasGrid.innerHTML = '';
            carteirasVazio.style.display = 'block';
            return;
        }

        carteirasVazio.style.display = 'none';

        carteirasGrid.innerHTML = carteiras.slice(0, 10).map(c => {
            const totalQualif = c.corretores.reduce((acc, x) => acc + x.qualificou, 0);
            const totalFila   = c.corretores.reduce((acc, x) => acc + x.fila, 0);

            const avataresHtml = c.corretores.slice(0, 3).map(cor => `
                <div class="carteira-avatar-mini" title="${escapeHtml(cor.nome)}">
                    ${iniciais(cor.nome)}
                </div>
            `).join('');

            const maisHtml = c.corretores.length > 3
                ? `<div class="carteira-avatar-mais">+${c.corretores.length - 3}</div>`
                : '';

            return `
                <div class="carteira-card" data-lista-id="${c.lista_id}">
                    <div class="carteira-card-top">
                        <div class="carteira-card-icon">
                            <i class="fas fa-folder-open"></i>
                        </div>
                        <div class="carteira-card-data">${dataCurta(c.criado_em)}</div>
                    </div>

                    <div class="carteira-card-nome">${escapeHtml(c.nome)}</div>
                    <div class="carteira-card-total">
                        <i class="fas fa-users"></i>
                        ${c.total} ${c.total === 1 ? 'contato' : 'contatos'}
                    </div>

                    <div class="carteira-avatares">
                        ${avataresHtml}
                        ${maisHtml}
                    </div>

                    <div class="carteira-card-stats">
                        <div class="carteira-stat">
                            <strong>${c.corretores.length}</strong>
                            <small>corretores</small>
                        </div>
                        <div class="carteira-stat green">
                            <strong>${totalQualif}</strong>
                            <small>qualif</small>
                        </div>
                        <div class="carteira-stat orange">
                            <strong>${totalFila}</strong>
                            <small>fila</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        carteirasGrid.querySelectorAll('.carteira-card').forEach(card => {
            card.addEventListener('click', () => {
                const listaId = Number(card.dataset.listaId);
                abrirDetalheCarteira(listaId, carteiras);
            });
        });
    }

  function abrirDetalheCarteira(listaId, carteiras) {
    const carteira = carteiras.find(c => c.lista_id === listaId);
    if (!carteira) return;

    modalListaNome.textContent = carteira.nome;
    modalListaInfo.textContent = `${carteira.total} contatos · subida em ${dataCurta(carteira.criado_em)}`;

    if (modalSearchContato) modalSearchContato.style.display = 'none';
    if (btnDeletarLista)    btnDeletarLista.style.display    = 'none';

    const modalBody = document.querySelector('#modalLista .modal-body');
    if (!modalBody) {
        console.error('[detalhe-carteira] modal-body não encontrado');
        return;
    }

    if (!carteira.corretores.length) {
        modalBody.innerHTML = `
            <div class="empty-state small">
                <i class="fas fa-users"></i>
                <p>Nenhum corretor nessa carteira.</p>
            </div>
        `;
        modalLista.style.display = 'flex';
        return;
    }

    modalBody.innerHTML = `
        <div class="carteira-detalhe-wrapper">
            <div class="carteira-detalhe-lista">
                ${carteira.corretores.map(cor => `
                    <div class="carteira-detalhe-card">
                        <div class="carteira-detalhe-card-header">
                            <div class="corretor-avatar">
                                ${iniciais(cor.nome)}
                            </div>
                            <div class="carteira-detalhe-card-ident">
                                <strong>${escapeHtml(cor.nome)}</strong>
                                <small>@${escapeHtml(cor.usuario)}</small>
                            </div>
                        </div>

                        <div class="carteira-detalhe-card-stats">
                            <div class="carteira-detalhe-stat total">
                                <strong>${cor.recebeu}</strong>
                                <small>recebeu</small>
                            </div>
                            <div class="carteira-detalhe-stat qualif">
                                <strong>${cor.qualificou}</strong>
                                <small>qualif</small>
                            </div>
                            <div class="carteira-detalhe-stat fila">
                                <strong>${cor.fila}</strong>
                                <small>fila</small>
                            </div>
                            <div class="carteira-detalhe-stat descart">
                                <strong>${cor.descartou}</strong>
                                <small>desc</small>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    modalLista.style.display = 'flex';
}

    /* =========================================================
       GRÁFICOS
       ========================================================= */
    const CORES_DONUT = [
        '#0a4a91', '#16a34a', '#f59e0b', '#7c3aed',
        '#0891b2', '#dc2626', '#3b82f6', '#65a30d', '#64748b'
    ];

    async function carregarGraficos() {
        try {
            const dados = await ApiClient.get('/api/admin/dashboard/graficos');
            renderizarGraficoLinha(dados.linha);
            renderizarGraficoDonut(dados.donut);
            renderizarGraficoColunas(dados.colunas);
            renderizarGauge(dados.velocimetro);
        } catch (err) {
            console.error('[graficos] erro:', err);
        }
    }

    function renderizarGraficoLinha(dados) {
        if (!graficoLinha || typeof Chart === 'undefined') return;
        if (chartLinha) chartLinha.destroy();

        const ctx = graficoLinha.getContext('2d');

        const gradQualif = ctx.createLinearGradient(0, 0, 0, 260);
        gradQualif.addColorStop(0, 'rgba(22, 163, 74, 0.28)');
        gradQualif.addColorStop(1, 'rgba(22, 163, 74, 0.02)');

        const gradDesc = ctx.createLinearGradient(0, 0, 0, 260);
        gradDesc.addColorStop(0, 'rgba(220, 38, 38, 0.22)');
        gradDesc.addColorStop(1, 'rgba(220, 38, 38, 0.02)');

        chartLinha = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dados.labels,
                datasets: [
                    {
                        label: 'Qualificados',
                        data: dados.qualificados,
                        borderColor: '#16a34a',
                        backgroundColor: gradQualif,
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: '#16a34a',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    },
                    {
                        label: 'Descartados',
                        data: dados.descartados,
                        borderColor: '#dc2626',
                        backgroundColor: gradDesc,
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: '#dc2626',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11, weight: '600', family: 'Inter' },
                            color: '#3e5370',
                            padding: 14
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0a1628',
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', size: 12, weight: '700' },
                        bodyFont: { family: 'Inter', size: 12 },
                        displayColors: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#7a8ba8',
                            font: { size: 10, family: 'Inter' },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8
                        },
                        border: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 44, 97, 0.05)' },
                        ticks: {
                            color: '#7a8ba8',
                            font: { size: 10, family: 'Inter' },
                            precision: 0
                        },
                        border: { display: false }
                    }
                }
            }
        });
    }

    function renderizarGraficoDonut(dados) {
        if (!graficoDonut || typeof Chart === 'undefined') return;
        if (chartDonut) chartDonut.destroy();

        if (!dados.labels.length) {
            chartDonut = null;
            return;
        }

        const ctx = graficoDonut.getContext('2d');

        chartDonut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: dados.labels,
                datasets: [{
                    data: dados.valores,
                    backgroundColor: CORES_DONUT,
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 8,
                    hoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                onClick: (evt, elements) => {
                    if (!elements.length) return;
                    const idx = elements[0].index;
                    const chave = dados.chaves[idx];
                    const label = dados.labels[idx];
                    abrirModalTag(chave, label);
                },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11, weight: '600', family: 'Inter' },
                            color: '#3e5370',
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0a1628',
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', size: 12, weight: '700' },
                        bodyFont: { family: 'Inter', size: 12 },
                        displayColors: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const v = ctx.parsed;
                                const pct = total ? ((v / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${v} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderizarGraficoColunas(dados) {
        if (!graficoColunas || typeof Chart === 'undefined') return;
        if (chartColunas) chartColunas.destroy();

        const ctx = graficoColunas.getContext('2d');

        chartColunas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dados.labels,
                datasets: [
                    {
                        label: 'Ativos',
                        data: dados.ativos,
                        backgroundColor: '#16a34a',
                        borderRadius: 4,
                        stack: 's'
                    },
                    {
                        label: 'Follow up',
                        data: dados.follow_up,
                        backgroundColor: '#94a3b8',
                        borderRadius: 4,
                        stack: 's'
                    },
                    {
                        label: 'Fila',
                        data: dados.fila,
                        backgroundColor: '#f59e0b',
                        borderRadius: 4,
                        stack: 's'
                    },
                    {
                        label: 'Perdidos',
                        data: dados.perdidos,
                        backgroundColor: '#dc2626',
                        borderRadius: 4,
                        stack: 's'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11, weight: '600', family: 'Inter' },
                            color: '#3e5370',
                            padding: 14
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0a1628',
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', size: 12, weight: '700' },
                        bodyFont: { family: 'Inter', size: 12 },
                        displayColors: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                            color: '#7a8ba8',
                            font: { size: 10, family: 'Inter' },
                            maxRotation: 35,
                            minRotation: 0,
                            autoSkip: false
                        },
                        border: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 44, 97, 0.05)' },
                        ticks: {
                            color: '#7a8ba8',
                            font: { size: 10, family: 'Inter' },
                            precision: 0
                        },
                        border: { display: false }
                    }
                }
            }
        });
    }

    function renderizarGauge(dados) {
        if (!gaugeFill || !gaugeValor) return;

        const valor = Math.max(0, Math.min(100, Number(dados.valor) || 0));

        let gradId = 'gaugeGradOtimo';
        let cor = '#16a34a';
        if (valor < 5) {
            gradId = 'gaugeGradRuim';
            cor = '#dc2626';
        } else if (valor < 15) {
            gradId = 'gaugeGradOk';
            cor = '#f59e0b';
        }

        gaugeFill.setAttribute('stroke', `url(#${gradId})`);

        const dash = valor;
        const gap = 100 - dash;

        gaugeFill.style.strokeDasharray = `0 100`;
        requestAnimationFrame(() => {
            gaugeFill.style.strokeDasharray = `${dash} ${gap}`;
        });

        gaugeValor.textContent = `${valor.toFixed(1).replace('.', ',')}%`;
        gaugeValor.style.color = cor;

        if (gaugeLabel) {
            gaugeLabel.textContent = `${dados.qualificados || 0} de ${dados.trabalhados || 0}`;
        }
    }

    /* =========================================================
       DRILL-DOWN POR TAG
       ========================================================= */
    async function abrirModalTag(chave, label) {
        filtroTagAtual = { chave, label, busca: '', de: '', ate: '' };
        leadsTagAtuais = [];

        modalTagTitulo.textContent = label || chave;
        modalTagInfo.textContent = 'Carregando...';
        modalTagTbody.innerHTML = '';
        modalTagVazio.style.display = 'none';

        if (modalTagBusca) modalTagBusca.value = '';
        if (modalTagDe) modalTagDe.value = '';
        if (modalTagAte) modalTagAte.value = '';

        modalTag.style.display = 'flex';

        await carregarLeadsDaTag();
    }

    async function carregarLeadsDaTag() {
        if (!filtroTagAtual.chave) return;

        modalTagInfo.textContent = 'Carregando...';

        try {
            const params = new URLSearchParams();
            if (filtroTagAtual.de)  params.set('de', filtroTagAtual.de);
            if (filtroTagAtual.ate) params.set('ate', filtroTagAtual.ate);

            const qs = params.toString();
            const url = `/api/admin/dashboard/tag/${encodeURIComponent(filtroTagAtual.chave)}${qs ? `?${qs}` : ''}`;

            const { leads } = await ApiClient.get(url);
            leadsTagAtuais = leads || [];

            renderizarLeadsTag();

        } catch (err) {
            console.error('[modal-tag] erro:', err);
            modalTagInfo.textContent = 'Erro ao carregar.';
            modalTagTbody.innerHTML = '';
            modalTagVazio.style.display = 'block';
        }
    }

    function renderizarLeadsTag() {
        const busca = (filtroTagAtual.busca || '').trim().toLowerCase();

        let lista = leadsTagAtuais;

        if (busca) {
            lista = lista.filter(l => {
                const nome = (l.nome || '').toLowerCase();
                const tel = String(l.telefone || '');
                const cor = (l.corretor_nome || '').toLowerCase();
                return nome.includes(busca) || tel.includes(busca) || cor.includes(busca);
            });
        }

        modalTagInfo.textContent = `${lista.length} ${lista.length === 1 ? 'cliente' : 'clientes'}`;

        if (!lista.length) {
            modalTagTbody.innerHTML = '';
            modalTagVazio.style.display = 'block';
            return;
        }

        modalTagVazio.style.display = 'none';

        modalTagTbody.innerHTML = lista.map(l => {
            let dataStr = '—';
            if (l.decidido_em) {
                const d = new Date(l.decidido_em);
                dataStr = d.toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                });
            }

            return `
                <tr>
                    <td class="col-name">${escapeHtml(l.nome)}</td>
                    <td class="col-phone">${escapeHtml(formatarTelefone(l.telefone))}</td>
                    <td>${escapeHtml(l.corretor_nome || '—')}</td>
                    <td class="col-phone">${dataStr}</td>
                    <td></td>
                </tr>
            `;
        }).join('');
    }

    if (btnFecharModalTag) {
        btnFecharModalTag.addEventListener('click', () => {
            modalTag.style.display = 'none';
            filtroTagAtual = { chave: null, label: '', busca: '', de: '', ate: '' };
        });
    }
    if (modalTag) {
        modalTag.addEventListener('click', (e) => {
            if (e.target === modalTag) {
                modalTag.style.display = 'none';
                filtroTagAtual = { chave: null, label: '', busca: '', de: '', ate: '' };
            }
        });
    }
    if (modalTagBusca) {
        modalTagBusca.addEventListener('input', () => {
            filtroTagAtual.busca = modalTagBusca.value;
            renderizarLeadsTag();
        });
    }
    if (modalTagDe) {
        modalTagDe.addEventListener('change', async () => {
            filtroTagAtual.de = modalTagDe.value;
            await carregarLeadsDaTag();
        });
    }
    if (modalTagAte) {
        modalTagAte.addEventListener('change', async () => {
            filtroTagAtual.ate = modalTagAte.value;
            await carregarLeadsDaTag();
        });
    }
    if (btnLimparFiltroTag) {
        btnLimparFiltroTag.addEventListener('click', async () => {
            filtroTagAtual.busca = '';
            filtroTagAtual.de = '';
            filtroTagAtual.ate = '';
            if (modalTagBusca) modalTagBusca.value = '';
            if (modalTagDe) modalTagDe.value = '';
            if (modalTagAte) modalTagAte.value = '';
            await carregarLeadsDaTag();
        });
    }

    /* =========================================================
       POLLING
       ========================================================= */
    function iniciarPolling() {
        if (pollingTimer) clearInterval(pollingTimer);

        pollingTimer = setInterval(() => {
            const dashTab = document.querySelector('.nav-tab[data-tab="dashboard"]');
            if (dashTab && dashTab.classList.contains('active')) {
                atualizarDashboard();
            }
        }, 60000);
    }

    function pararPolling() {
        if (pollingTimer) {
            clearInterval(pollingTimer);
            pollingTimer = null;
        }
    }

    window.addEventListener('beforeunload', pararPolling);

    /* =========================================================
       SPARKLINES
       ========================================================= */
    function adicionarSparklines() {
        const sparklines = [
            'M0,22 L20,18 L40,20 L60,12 L80,14 L100,8',
            'M0,18 L20,20 L40,14 L60,16 L80,10 L100,6',
            'M0,24 L20,20 L40,16 L60,18 L80,12 L100,8',
            'M0,20 L20,16 L40,18 L60,12 L80,14 L100,10'
        ];

        document.querySelectorAll('.kpi-card').forEach((card, i) => {
            if (card.querySelector('.kpi-sparkline')) return;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'kpi-sparkline');
            svg.setAttribute('viewBox', '0 0 100 30');
            svg.setAttribute('preserveAspectRatio', 'none');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', sparklines[i] || sparklines[0]);
            svg.appendChild(path);
            card.appendChild(svg);

            const pulse = document.createElement('div');
            pulse.className = 'kpi-pulse';
            card.appendChild(pulse);
        });
    }

    /* =========================================================
       SUBIR LISTA
       ========================================================= */
    modoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modo = btn.dataset.modo;
            if (modo === modoAtual) return;

            modoAtual = modo;
            modoBtns.forEach(b => b.classList.toggle('active', b.dataset.modo === modo));

            if (modo === 'arquivo') {
                blocoArquivo.style.display = 'flex';
                blocoTexto.style.display = 'none';
            } else {
                blocoArquivo.style.display = 'none';
                blocoTexto.style.display = 'flex';
            }

            arquivoCsvError.textContent = '';
            arquivoCsvError.classList.remove('visible');
            textoListaError.textContent = '';
            textoListaError.classList.remove('visible');

            atualizarPreview();
        });
    });

    function parseContatos(texto) {
        const linhas = String(texto || '')
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);

        const contatos = [];

        linhas.forEach((linha, i) => {
            const lower = linha.toLowerCase();
            if (i === 0 && (lower.includes('nome') || lower.includes('telefone') || lower.includes('celular') || lower.includes('fone'))) {
                return;
            }

            let partes;
            if (linha.includes('\t')) {
                partes = linha.split('\t');
            } else if (linha.includes(';')) {
                partes = linha.split(';');
            } else {
                partes = linha.split(',');
            }

            partes = partes.map(p => p.trim().replace(/^"|"$/g, ''));

            let nome = '';
            let telefone = '';

            if (partes.length >= 2) {
                nome = partes[0];
                telefone = partes[1];
            } else {
                const unico = partes[0] || '';
                const digitos = unico.replace(/\D/g, '');
                if (digitos.length >= 10) telefone = unico;
                else nome = unico;
            }

            const apenasDigitos = String(telefone || '').replace(/\D/g, '');
            if (apenasDigitos.length < 10) return;

            if (!nome || !nome.trim()) nome = 'Nome desconhecido';

            contatos.push({
                nome: nome.trim(),
                telefone: apenasDigitos
            });
        });

        return contatos;
    }

    function lerArquivoCsv(file) {
        return new Promise((resolve, reject) => {
            const nome = file.name.toLowerCase();
            const valido = nome.endsWith('.csv') || nome.endsWith('.txt') ||
                          file.type === 'text/csv' || file.type === 'text/plain';

            if (!valido) {
                reject(new Error('Formato inválido. Envie um arquivo .csv ou .txt.'));
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande. Limite: 5MB.'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const texto = e.target.result;
                    const contatos = parseContatos(texto);
                    resolve({ texto, contatos, file });
                } catch (err) {
                    reject(new Error('Não foi possível ler o arquivo.'));
                }
            };

            reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    async function carregarArquivo(file) {
        arquivoCsvError.textContent = '';
        arquivoCsvError.classList.remove('visible');

        try {
            const { contatos } = await lerArquivoCsv(file);

            if (!contatos.length) {
                throw new Error('Nenhum contato válido encontrado. Confira as colunas nome e telefone.');
            }

            contatosDoArquivo = contatos;

            fileDrop.classList.add('has-file');
            fileDropContent.style.display = 'none';
            fileInfo.style.display = 'flex';
            fileInfoNome.textContent = file.name;
            fileInfoTamanho.textContent = `${formatarTamanho(file.size)} · ${contatos.length} contatos detectados`;

            atualizarPreview();
            mostrarToast(`✅ ${contatos.length} contatos importados.`, 'success');

        } catch (err) {
            arquivoCsvError.textContent = err.message;
            arquivoCsvError.classList.add('visible');
            mostrarToast(err.message, 'error');
            limparArquivo();
        }
    }

    function limparArquivo() {
        contatosDoArquivo = [];
        if (arquivoCsv) arquivoCsv.value = '';
        if (fileDrop) fileDrop.classList.remove('has-file');
        if (fileDropContent) fileDropContent.style.display = 'flex';
        if (fileInfo) fileInfo.style.display = 'none';
        atualizarPreview();
    }

    if (btnRemoverArquivo) {
        btnRemoverArquivo.addEventListener('click', (e) => {
            e.stopPropagation();
            limparArquivo();
            mostrarToast('Arquivo removido.', 'info');
        });
    }

    if (fileDrop && arquivoCsv) {
        fileDrop.addEventListener('click', (e) => {
            if (e.target.closest('.file-info-remove')) return;
            arquivoCsv.click();
        });

        arquivoCsv.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) carregarArquivo(file);
        });

        ['dragenter', 'dragover'].forEach(ev => {
            fileDrop.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileDrop.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(ev => {
            fileDrop.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileDrop.classList.remove('dragover');
            });
        });

        fileDrop.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) carregarArquivo(file);
        });
    }

    function obterContatosAtuais() {
        if (modoAtual === 'arquivo') return contatosDoArquivo;
        return parseContatos(textoListaInput.value);
    }

    function atualizarPreview() {
        const contatos = obterContatosAtuais();

        if (!contatos.length) {
            previewContatos.style.display = 'none';
            atualizarPreviewRoleta();
            return;
        }

        previewContatos.style.display = 'block';
        previewCount.textContent = contatos.length;

        previewList.innerHTML = contatos.slice(0, 20).map(c => `
            <div class="preview-list-item">
                <strong>${escapeHtml(c.nome)}</strong>
                <span>${escapeHtml(formatarTelefone(c.telefone))}</span>
            </div>
        `).join('') + (contatos.length > 20
            ? `<div class="preview-list-item"><strong>... e mais ${contatos.length - 20}</strong></div>`
            : '');

        atualizarPreviewRoleta();
    }

    /* =========================================================
       CUSTOM SELECT — ATUALIZAÇÃO DE LISTA
       ========================================================= */
    function atualizarTriggerCustomSelect(valor) {
        if (!customAtualizacaoText) return;

        if (!valor) {
            customAtualizacaoText.textContent = 'Não — criar lista nova';
            return;
        }

        const lista = listasDisponiveis.find(l => String(l.id) === String(valor));
        customAtualizacaoText.textContent = lista
            ? `${lista.nome} · ${lista.total} contatos`
            : 'Não — criar lista nova';
    }

    function fecharCustomSelect() {
        if (customAtualizacaoMenu) customAtualizacaoMenu.classList.remove('open');
        if (customAtualizacaoTrigger) customAtualizacaoTrigger.classList.remove('open');
    }

    async function carregarListasParaAtualizacao() {
        if (!customAtualizacaoMenu || !selectAtualizacaoLista) return;

        try {
            const { listas } = await ApiClient.get('/api/admin/listas');
            listasDisponiveis = listas || [];

            const valorAtual = selectAtualizacaoLista.value;

            let html = `
                <button type="button"
                        class="custom-select-option ${!valorAtual ? 'selected' : ''}"
                        data-value="">
                    <i class="fas fa-plus-circle opt-icon"></i>
                    <span class="opt-text">Não — criar lista nova</span>
                </button>
            `;

            if (listasDisponiveis.length) {
                html += `<div class="custom-select-divider"></div>`;
                html += listasDisponiveis.map(l => `
                    <button type="button"
                            class="custom-select-option ${String(l.id) === String(valorAtual) ? 'selected' : ''}"
                            data-value="${l.id}">
                        <i class="fas fa-folder-open opt-icon"></i>
                        <span class="opt-text">${escapeHtml(l.nome)}</span>
                        <span class="opt-count">${l.total}</span>
                    </button>
                `).join('');
            } else {
                html += `
                    <div class="custom-select-empty">
                        Nenhuma lista criada ainda.
                    </div>
                `;
            }

            customAtualizacaoMenu.innerHTML = html;

            atualizarTriggerCustomSelect(valorAtual);

            customAtualizacaoMenu.querySelectorAll('.custom-select-option').forEach(opc => {
                opc.addEventListener('click', () => {
                    const novoValor = opc.dataset.value || '';
                    selectAtualizacaoLista.value = novoValor;

                    fecharCustomSelect();

                    customAtualizacaoMenu.querySelectorAll('.custom-select-option')
                        .forEach(o => o.classList.toggle('selected', o === opc));
                    atualizarTriggerCustomSelect(novoValor);

                    handleMudancaAtualizacao();
                });
            });

        } catch (err) {
            console.error('[atualizacao] erro ao carregar listas:', err);
        }
    }

    async function buscarStatsDaLista(listaId) {
        try {
            const { corretores } = await ApiClient.get(`/api/admin/listas/${listaId}/corretores`);

            const mapa = {};
            corretores.forEach(c => {
                mapa[c.id] = {
                    total:  c.total_na_lista,
                    qualif: c.qualificados_na_lista,
                    fila:   c.pendentes_na_lista
                };
            });
            statsListaAtual = mapa;

        } catch (err) {
            console.error('[atualizacao] erro ao buscar stats:', err);
            statsListaAtual = {};
        }
    }

    function renderizarStatsNosCorretores() {
        if (!corretoresSelector) return;

        corretoresSelector.querySelectorAll('.corretor-check').forEach(label => {
            const antigo = label.querySelector('.corretor-check-stats');
            if (antigo) antigo.remove();

            const input = label.querySelector('input[type="checkbox"]');
            if (!input) return;

            const corretorId = Number(input.value);
            const stats = statsListaAtual[corretorId];

            if (!listaAtualizacaoSelecionada || !stats) return;

            const statsEl = document.createElement('div');
            statsEl.className = 'corretor-check-stats';
            statsEl.innerHTML = `
                <div class="corretor-check-stat total">
                    <strong>${stats.total}</strong>
                    <small>total</small>
                </div>
                <div class="corretor-check-stat qualif">
                    <strong>${stats.qualif}</strong>
                    <small>qualif</small>
                </div>
                <div class="corretor-check-stat fila">
                    <strong>${stats.fila}</strong>
                    <small>fila</small>
                </div>
            `;
            label.appendChild(statsEl);
        });
    }

    function limparContatosColados() {
        contatosDoArquivo = [];
        if (arquivoCsv) arquivoCsv.value = '';
        if (textoListaInput) textoListaInput.value = '';
        if (fileDrop) fileDrop.classList.remove('has-file');
        if (fileDropContent) fileDropContent.style.display = 'flex';
        if (fileInfo) fileInfo.style.display = 'none';
        if (previewContatos) previewContatos.style.display = 'none';
    }

    function atualizarBotaoSubirLista() {
        if (!btnSubirLista) return;
        if (listaAtualizacaoSelecionada) {
            btnSubirLista.innerHTML = '<i class="fas fa-plus-circle"></i> Atualizar lista';
        } else {
            btnSubirLista.innerHTML = '<i class="fas fa-check"></i> Subir e distribuir';
        }
    }

    async function handleMudancaAtualizacao() {
        if (!selectAtualizacaoLista) return;

        const valor = selectAtualizacaoLista.value;

        if (selectAtualizacaoListaError) {
            selectAtualizacaoListaError.textContent = '';
            selectAtualizacaoListaError.classList.remove('visible');
        }

        limparContatosColados();

        if (!valor) {
            listaAtualizacaoSelecionada = null;
            statsListaAtual = {};

            if (nomeListaInput) {
                nomeListaInput.disabled = false;
                nomeListaInput.value = '';
            }
            if (mensagemWhatsappInput) {
                mensagemWhatsappInput.disabled = false;
                mensagemWhatsappInput.value = '';
            }

            corretoresSelector.querySelectorAll('input[type="checkbox"]').forEach(chk => {
                chk.checked = false;
            });

            atualizarBotaoSubirLista();
            renderizarStatsNosCorretores();
            atualizarPreviewRoleta();
            return;
        }

        const lista = listasDisponiveis.find(l => String(l.id) === String(valor));
        if (!lista) return;

        listaAtualizacaoSelecionada = {
            id: lista.id,
            nome: lista.nome,
            mensagem_whatsapp: lista.mensagem_whatsapp || ''
        };

        if (nomeListaInput) {
            nomeListaInput.value = lista.nome;
            nomeListaInput.disabled = true;
        }
        if (mensagemWhatsappInput) {
            mensagemWhatsappInput.value = lista.mensagem_whatsapp || '';
            mensagemWhatsappInput.disabled = true;
        }

        corretoresSelector.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.checked = false;
        });

        await buscarStatsDaLista(lista.id);

        atualizarBotaoSubirLista();
        renderizarStatsNosCorretores();
        atualizarPreviewRoleta();
    }

    /* =========================================================
       SELETOR DE CORRETORES
       ========================================================= */
    async function renderizarSeletorCorretores() {
        try {
            const { corretores } = await ApiClient.get('/api/admin/corretores');

            if (!corretores.length) {
                corretoresSelector.innerHTML = `
                    <div class="empty-state small" style="padding: 1rem;">
                        <p style="font-size: 0.85rem;">Nenhum corretor cadastrado. Vá para a aba <strong>Corretores</strong> primeiro.</p>
                    </div>
                `;
                return;
            }

            const marcadosAntes = listaAtualizacaoSelecionada
                ? new Set()
                : new Set(
                    Array.from(corretoresSelector.querySelectorAll('input:checked'))
                        .map(i => i.value)
                );

            corretoresSelector.innerHTML = corretores.map(c => `
                <label class="corretor-check">
                    <input type="checkbox" value="${c.id}"
                        ${marcadosAntes.has(String(c.id)) ? 'checked' : ''}>
                    <span class="check-box"><i class="fas fa-check"></i></span>
                    <span class="corretor-check-info">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>@${escapeHtml(c.usuario)}</small>
                    </span>
                </label>
            `).join('');

            corretoresSelector.querySelectorAll('input[type="checkbox"]')
                .forEach(chk => chk.addEventListener('change', atualizarPreviewRoleta));

            renderizarStatsNosCorretores();
            atualizarPreviewRoleta();

        } catch (err) {
            console.error('[seletor] erro:', err);
        }
    }

    async function atualizarPreviewRoleta() {
        const contatos = obterContatosAtuais();
        const marcados = Array.from(corretoresSelector.querySelectorAll('input:checked'))
            .map(i => Number(i.value));

        const avisoModo = listaAtualizacaoSelecionada
            ? `<div class="roleta-modo-atualizacao">
                   <i class="fas fa-sync-alt"></i>
                   <span>
                       Atualizando <strong>${escapeHtml(listaAtualizacaoSelecionada.nome)}</strong> —
                       apenas contatos novos serão adicionados.
                   </span>
               </div>`
            : '';

        if (!contatos.length || !marcados.length) {
            infoRoleta.innerHTML = `
                ${avisoModo}
                <div class="info-empty">
                    <i class="fas fa-chart-pie"></i>
                    <p>Envie os contatos e selecione os corretores para ver como será a distribuição.</p>
                </div>
            `;
            return;
        }

        try {
            const dedupe = await ApiClient.post('/api/admin/listas/preview-dedupe', {
                contatos
            });

            const totalNovos = dedupe.novos;
            const totalDescartados = dedupe.descartados;

            if (totalNovos === 0) {
                infoRoleta.innerHTML = `
                    ${avisoModo}
                    <div class="info-empty" style="color: #b91c1c;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p><strong>Nenhum contato novo.</strong><br>
                        Todos os ${totalDescartados} contatos já existem no sistema.</p>
                    </div>
                `;
                return;
            }

            const { corretores } = await ApiClient.get('/api/admin/corretores');
            const selecionados = corretores.filter(c => marcados.includes(c.id));

            const distribuicao = {};
            selecionados.forEach(c => distribuicao[c.id] = 0);
            for (let i = 0; i < totalNovos; i++) {
                const c = selecionados[i % selecionados.length];
                distribuicao[c.id]++;
            }

            let avisoDescartados = '';
            if (totalDescartados > 0) {
                avisoDescartados = `
                    <div class="roleta-descartados">
                        <i class="fas fa-info-circle"></i>
                        <span>
                            <strong>${totalDescartados}</strong>
                            ${totalDescartados === 1 ? 'contato foi descartado' : 'contatos foram descartados'}
                            por já existir no sistema.
                        </span>
                    </div>
                `;
            }

            infoRoleta.innerHTML = `
                ${avisoModo}
                <div class="roleta-preview-list">
                    ${selecionados.map(c => `
                        <div class="roleta-preview-item">
                            <div class="corretor-avatar">${iniciais(c.nome)}</div>
                            <span class="corretor-nome">${escapeHtml(c.nome)}</span>
                            <span class="corretor-qtd">${distribuicao[c.id]}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="roleta-resumo">
                    <strong>${totalNovos}</strong> ${totalNovos === 1 ? 'contato novo será distribuído' : 'contatos novos serão distribuídos'}
                    entre <strong>${selecionados.length}</strong>
                    ${selecionados.length === 1 ? 'corretor' : 'corretores'},
                    de forma equilibrada e aleatória.
                </div>
                ${avisoDescartados}
            `;

        } catch (err) {
            console.error('[roleta] erro:', err);
        }
    }

    /* =========================================================
       SUBMETER LISTA
       ========================================================= */
    async function handleSubirLista() {
        if (enviandoLista) return;
        enviandoLista = true;

        [nomeListaError, textoListaError, corretoresError, arquivoCsvError, selectAtualizacaoListaError]
            .forEach(e => { if (e) { e.textContent = ''; e.classList.remove('visible'); } });

        nomeListaInput.classList.remove('error');
        textoListaInput.classList.remove('error');

        const emModoAtualizacao = !!listaAtualizacaoSelecionada;

        let nome;
        if (emModoAtualizacao) {
            nome = listaAtualizacaoSelecionada.nome;
        } else {
            nome = nomeListaInput.value.trim();
            if (!nome) {
                nomeListaError.textContent = 'Informe um nome pra lista.';
                nomeListaError.classList.add('visible');
                nomeListaInput.classList.add('error');
                enviandoLista = false;
                return;
            }
        }

        const contatos = obterContatosAtuais();
        if (!contatos.length) {
            if (modoAtual === 'arquivo') {
                arquivoCsvError.textContent = 'Anexe um arquivo CSV válido com pelo menos 1 contato.';
                arquivoCsvError.classList.add('visible');
            } else {
                textoListaError.textContent = 'Cole pelo menos 1 contato válido.';
                textoListaError.classList.add('visible');
                textoListaInput.classList.add('error');
            }
            enviandoLista = false;
            return;
        }

        const marcados = Array.from(corretoresSelector.querySelectorAll('input:checked'))
            .map(i => Number(i.value));
        if (!marcados.length) {
            corretoresError.textContent = 'Selecione pelo menos 1 corretor.';
            corretoresError.classList.add('visible');
            enviandoLista = false;
            return;
        }

        btnSubirLista.disabled = true;
        btnSubirLista.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' +
            (emModoAtualizacao ? 'Atualizando...' : 'Distribuindo...');

        try {
            const mensagemWhatsapp = emModoAtualizacao
                ? null
                : (mensagemWhatsappInput ? mensagemWhatsappInput.value.trim() : '');

            const body = {
                nome,
                contatos,
                corretoresIds: marcados,
                mensagemWhatsapp: mensagemWhatsapp || null
            };

            if (emModoAtualizacao) {
                body.listaIdExistente = listaAtualizacaoSelecionada.id;
            }

            const res = await ApiClient.post('/api/admin/listas', body);

            let msg;
            if (res.atualizada) {
                msg = `✅ ${res.adicionados} contato(s) adicionado(s) à lista`;
                if (res.descartados > 0) msg += ` · ${res.descartados} descartado(s)`;
            } else {
                msg = `✅ ${res.total} contatos distribuídos`;
                if (res.descartados > 0) msg += ` · ${res.descartados} descartado(s)`;
            }
            mostrarToast(msg, 'success');

            if (nomeListaInput) nomeListaInput.value = '';
            if (textoListaInput) textoListaInput.value = '';
            if (mensagemWhatsappInput) mensagemWhatsappInput.value = '';
            if (nomeListaInput) nomeListaInput.disabled = false;
            if (mensagemWhatsappInput) mensagemWhatsappInput.disabled = false;
            if (selectAtualizacaoLista) selectAtualizacaoLista.value = '';

            listaAtualizacaoSelecionada = null;
            statsListaAtual = {};

            limparArquivo();
            if (previewContatos) previewContatos.style.display = 'none';
            infoRoleta.innerHTML = `
                <div class="info-empty">
                    <i class="fas fa-chart-pie"></i>
                    <p>Envie os contatos e selecione os corretores para ver como será a distribuição.</p>
                </div>
            `;
            renderizarStatsNosCorretores();
            atualizarBotaoSubirLista();

            await carregarListasParaAtualizacao();
            atualizarTriggerCustomSelect('');

            setTimeout(() => {
                document.querySelector('.nav-tab[data-tab="listas"]').click();
            }, 500);

        } catch (err) {
            mostrarToast(err.message || 'Erro ao processar.', 'error');
        } finally {
            btnSubirLista.disabled = false;
            atualizarBotaoSubirLista();
            enviandoLista = false;
        }
    }

    if (textoListaInput) textoListaInput.addEventListener('input', atualizarPreview);
    if (btnSubirLista)    btnSubirLista.addEventListener('click', handleSubirLista);

    /* =========================================================
       LISTAS
       ========================================================= */
    async function renderizarListas() {
        try {
            const { listas } = await ApiClient.get('/api/admin/listas');

            badgeTotalListas.textContent = listas.length;

            if (!listas.length) {
                listasGrid.innerHTML = '';
                listasVazio.style.display = 'block';
                return;
            }

            listasVazio.style.display = 'none';

            listasGrid.innerHTML = listas.map(lista => `
                <div class="lista-card" data-lista-id="${lista.id}">
                    <div class="lista-card-top">
                        <div class="lista-card-icon">
                            <i class="fas fa-folder-open"></i>
                        </div>
                        <div class="lista-card-data">${dataCurta(lista.criado_em)}</div>
                    </div>
                    <div class="lista-card-nome">${escapeHtml(lista.nome)}</div>
                    <div class="lista-card-stats">
                        <div class="lista-card-stat">
                            <strong>${lista.total}</strong>
                            <small>Total</small>
                        </div>
                        <div class="lista-card-stat green">
                            <strong>${lista.qualificados}</strong>
                            <small>Qualif</small>
                        </div>
                        <div class="lista-card-stat orange">
                            <strong>${lista.aguardando}</strong>
                            <small>Fila</small>
                        </div>
                    </div>
                </div>
            `).join('');

            listasGrid.querySelectorAll('.lista-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = Number(card.dataset.listaId);
                    abrirModalLista(id);
                });
            });

        } catch (err) {
            console.error('[listas] erro:', err);
            mostrarToast('Erro ao carregar listas.', 'error');
        }
    }

    /* =========================================================
       MODAL LISTA
       ========================================================= */
    async function abrirModalLista(listaId) {
        try {
            const { listas } = await ApiClient.get('/api/admin/listas');
            const lista = listas.find(l => l.id === listaId);
            if (!lista) return;

            listaSelecionadaAtual = lista;

            modalListaNome.textContent = lista.nome;
            modalListaInfo.textContent = `${lista.total} contatos · subida em ${dataCurta(lista.criado_em)}`;

            const { contatos } = await ApiClient.get(`/api/admin/listas/${listaId}/contatos`);
            todosContatosDaLista = contatos;

            const modalBody = document.querySelector('#modalLista .modal-body');
            if (!modalBody) {
                console.error('[modal-lista] modal-body não encontrado');
                mostrarToast('Erro: estrutura do modal quebrada.', 'error');
                return;
            }

            modalBody.innerHTML = `
                <div class="contatos-table-wrapper">
                    <table class="contatos-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Corretor</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="contatosTableBody"></tbody>
                    </table>
                </div>

                <div class="empty-state small" id="contatosVazio" style="display: none;">
                    <i class="fas fa-search"></i>
                    <p>Nenhum contato encontrado.</p>
                </div>
            `;

            const tbody = document.getElementById('contatosTableBody');
            if (!tbody) {
                console.error('[modal-lista] tbody não encontrado');
                return;
            }

            renderizarContatosModal(contatos, tbody);

            if (btnDeletarLista)    btnDeletarLista.style.display    = '';
            if (modalSearchContato) {
                modalSearchContato.style.display = '';
                modalSearchContato.value = '';
            }

            modalLista.style.display = 'flex';

        } catch (err) {
            console.error('[modal-lista] erro:', err);
            mostrarToast('Erro ao abrir lista.', 'error');
        }
    }

    function renderizarContatosModal(contatos, tbody) {
        const vazio = document.getElementById('contatosVazio');

        if (!contatos.length) {
            tbody.innerHTML = '';
            vazio.style.display = 'block';
            return;
        }

        vazio.style.display = 'none';

        tbody.innerHTML = contatos.map(c => {
            const nomeCorretor = c.corretor_nome || '—';

            let labelTag;
            let classeTag;

            if (c.resultado) {
                labelTag = tagParaTexto(c.resultado);
                classeTag = tagCor(c.resultado);
            } else {
                const statusClass = c.status || 'novo';
                labelTag = {
                    novo: 'Novo',
                    qualificado: 'Qualificado',
                    descartado: 'Descartado',
                    sem_resposta: 'Sem resposta'
                }[statusClass] || statusClass;
                classeTag = statusClass;
            }

            return `
                <tr>
                    <td class="col-name">${escapeHtml(c.nome)}</td>
                    <td class="col-phone">${escapeHtml(formatarTelefone(c.telefone))}</td>
                    <td>${escapeHtml(nomeCorretor)}</td>
                    <td>
                        <span class="tag-status ${classeTag}">
                            ${escapeHtml(labelTag)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-row-delete" data-contato-id="${c.id}" title="Excluir contato">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-row-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const contatoId = btn.dataset.contatoId;
                const contato = contatos.find(c => String(c.id) === String(contatoId));
                if (!contato) return;

                abrirConfirm(
                    'Excluir contato?',
                    `Tem certeza que quer excluir "${contato.nome}"? Esta ação não pode ser desfeita.`,
                    async () => {
                        try {
                            await ApiClient.del(`/api/admin/leads/${contatoId}`);
                            mostrarToast('Contato removido.', 'success');

                            const { contatos: atualizados } = await ApiClient.get(`/api/admin/listas/${listaSelecionadaAtual.id}/contatos`);
                            todosContatosDaLista = atualizados;
                            renderizarContatosModal(atualizados, tbody);
                            renderizarListas();
                        } catch (err) {
                            mostrarToast('Erro ao remover contato.', 'error');
                        }
                    }
                );
            });
        });
    }

    if (modalSearchContato) {
        modalSearchContato.addEventListener('input', () => {
            const tbody = document.getElementById('contatosTableBody');
            if (!tbody) return;

            const termo = modalSearchContato.value.trim().toLowerCase();
            if (!termo) {
                renderizarContatosModal(todosContatosDaLista, tbody);
                return;
            }

            const filtrados = todosContatosDaLista.filter(c =>
                c.nome.toLowerCase().includes(termo) ||
                String(c.telefone).includes(termo)
            );
            renderizarContatosModal(filtrados, tbody);
        });
    }

    if (btnFecharModalLista) {
        btnFecharModalLista.addEventListener('click', () => {
            modalLista.style.display = 'none';
            listaSelecionadaAtual = null;
        });
    }
    if (modalLista) {
        modalLista.addEventListener('click', (e) => {
            if (e.target === modalLista) {
                modalLista.style.display = 'none';
                listaSelecionadaAtual = null;
            }
        });
    }

    if (btnDeletarLista) {
        btnDeletarLista.addEventListener('click', () => {
            if (!listaSelecionadaAtual) return;

            const lista = listaSelecionadaAtual;
            abrirConfirm(
                'Excluir lista inteira?',
                `Tem certeza que quer excluir "${lista.nome}" e todos os seus ${lista.total} contatos? Esta ação não pode ser desfeita.`,
                async () => {
                    try {
                        await ApiClient.del(`/api/admin/listas/${lista.id}`);
                        mostrarToast('Lista excluída.', 'success');
                        modalLista.style.display = 'none';
                        listaSelecionadaAtual = null;
                        renderizarListas();
                        carregarListasParaAtualizacao();
                    } catch (err) {
                        mostrarToast('Erro ao excluir lista.', 'error');
                    }
                }
            );
        });
    }

    /* =========================================================
       GERENCIAR CORRETORES DA LISTA
       ========================================================= */
    async function abrirGerenciarCorretores() {
        if (!listaSelecionadaAtual) return;

        modalLista.style.display = 'none';
        modalGerenciar.style.display = 'flex';

        await carregarGerenciarLista();
    }

    async function carregarGerenciarLista() {
        if (!listaSelecionadaAtual) return;

        const listaId = listaSelecionadaAtual.id;

        try {
            const { lista, corretores } = await ApiClient.get(`/api/admin/listas/${listaId}/corretores`);

            gerenciarListaNome.textContent = `${lista.nome} · escolha quem participa`;

            if (gerenciarMensagem) {
                gerenciarMensagem.value = lista.mensagem_whatsapp || '';
            }

            gerenciarListaCorretores.innerHTML = corretores.map(c => `
                <div class="corretor-gerenciar-item ${c.participa ? 'selected' : ''}" data-corretor-id="${c.id}">
                    <div class="corretor-gerenciar-check">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="corretor-gerenciar-info">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>@${escapeHtml(c.usuario)}</small>
                    </div>
                    <div class="corretor-gerenciar-stats">
                        <div class="corretor-gerenciar-stat pend">
                            <strong>${c.pendentes_na_lista}</strong>
                            <small>pendentes</small>
                        </div>
                        <div class="corretor-gerenciar-stat qual">
                            <strong>${c.qualificados_na_lista}</strong>
                            <small>qualif</small>
                        </div>
                    </div>
                </div>
            `).join('');

            gerenciarListaCorretores.querySelectorAll('.corretor-gerenciar-item').forEach(item => {
                item.addEventListener('click', () => {
                    item.classList.toggle('selected');
                });
            });

        } catch (err) {
            console.error('[gerenciar-carregar] erro:', err);
            mostrarToast('Erro ao carregar corretores.', 'error');
        }
    }

    async function salvarGerenciarCorretores() {
        if (!listaSelecionadaAtual) return;

        const listaId = listaSelecionadaAtual.id;

        const selecionados = Array.from(
            gerenciarListaCorretores.querySelectorAll('.corretor-gerenciar-item.selected')
        ).map(el => Number(el.dataset.corretorId));

        if (!selecionados.length) {
            mostrarToast('Selecione pelo menos 1 corretor.', 'error');
            return;
        }

        btnSalvarGerenciar.disabled = true;
        btnSalvarGerenciarTexto.textContent = 'Salvando...';

        try {
            const res = await ApiClient.patch(`/api/admin/listas/${listaId}/corretores`, {
                corretoresIds: selecionados
            });

            const partes = [];
            if (res.adicionados)    partes.push(`${res.adicionados} adicionado(s)`);
            if (res.removidos)      partes.push(`${res.removidos} removido(s)`);
            if (res.redistribuidos) partes.push(`${res.redistribuidos} redistribuído(s)`);

            mostrarToast(`✅ ${partes.join(' · ') || 'Salvo'}`, 'success');

            await carregarGerenciarLista();

            renderizarListas();
            atualizarDashboard();

        } catch (err) {
            console.error('[gerenciar-salvar] erro:', err);
            mostrarToast(err.message || 'Erro ao salvar.', 'error');
        } finally {
            btnSalvarGerenciar.disabled = false;
            btnSalvarGerenciarTexto.textContent = 'Salvar alterações';
        }
    }

    async function salvarMensagemWhatsApp() {
        if (!listaSelecionadaAtual) return;

        const listaId = listaSelecionadaAtual.id;
        const mensagem = gerenciarMensagem ? gerenciarMensagem.value.trim() : '';

        btnSalvarMensagem.disabled = true;
        btnSalvarMensagemTexto.textContent = 'Salvando...';

        try {
            await ApiClient.patch(`/api/admin/listas/${listaId}/mensagem`, {
                mensagemWhatsapp: mensagem || null
            });

            mostrarToast('✅ Mensagem atualizada!', 'success');

            if (listaSelecionadaAtual) {
                listaSelecionadaAtual.mensagem_whatsapp = mensagem || null;
            }

        } catch (err) {
            console.error('[salvar-mensagem] erro:', err);
            mostrarToast(err.message || 'Erro ao salvar mensagem.', 'error');
        } finally {
            btnSalvarMensagem.disabled = false;
            btnSalvarMensagemTexto.textContent = 'Salvar mensagem';
        }
    }

    function fecharGerenciar() {
        if (modalGerenciar) modalGerenciar.style.display = 'none';
    }

    /* =========================================================
       CORRETORES
       ========================================================= */
    function limparErrosCorretor() {
        [novoNomeError, novoUsuarioError, novaSenhaError].forEach(e => {
            e.textContent = '';
            e.classList.remove('visible');
        });
        [novoNomeInput, novoUsuarioInput, novaSenhaInput].forEach(i => i.classList.remove('error'));
    }

    async function renderizarCorretores() {
    try {
        const { corretores } = await ApiClient.get('/api/admin/corretores');

        badgeTotalCorretoresList.textContent = corretores.length;

        if (!corretores.length) {
            corretoresList.innerHTML = '';
            corretoresVazio.style.display = 'block';
            return;
        }

        corretoresVazio.style.display = 'none';

        corretoresList.innerHTML = corretores.map(c => {
            const total = c.total_leads || 0;
            const ehTeste = c.tipo === 'teste';

            const badge = ehTeste
                ? `<span class="badge-teste-inline"><i class="fas fa-flask"></i> Teste</span>`
                : '';

            return `
                <div class="corretor-item ${ehTeste ? 'is-teste' : ''}" data-corretor-id="${c.id}" style="cursor: pointer;">
                    <div class="corretor-avatar">${iniciais(c.nome)}</div>
                    <div class="corretor-info">
                        <strong>${escapeHtml(c.nome)}${badge}</strong>
                        <small>
                            <i class="fas fa-at"></i> ${escapeHtml(c.usuario)}
                            · ${total} ${total === 1 ? 'contato' : 'contatos'}
                        </small>
                    </div>
                    <button class="btn-corretor-delete" data-corretor-id="${c.id}" title="Excluir corretor">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        corretoresList.querySelectorAll('.corretor-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-corretor-delete')) return;

                const id = Number(item.dataset.corretorId);
                const corretor = corretores.find(c => c.id === id);
                if (corretor) abrirEditarCorretor(corretor);
            });
        });

        corretoresList.querySelectorAll('.btn-corretor-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = Number(btn.dataset.corretorId);
                const corretor = corretores.find(c => c.id === id);
                if (!corretor) return;

                abrirConfirm(
                    'Excluir corretor?',
                    `Tem certeza que quer excluir "${corretor.nome}"? Os contatos dele continuarão no sistema, mas sem responsável.`,
                    async () => {
                        try {
                            await ApiClient.del(`/api/admin/corretores/${id}`);
                            mostrarToast('Corretor removido.', 'success');
                            renderizarCorretores();
                            renderizarSeletorCorretores();
                        } catch (err) {
                            mostrarToast('Erro ao remover corretor.', 'error');
                        }
                    }
                );
            });
        });

    } catch (err) {
        console.error('[corretores] erro:', err);
        mostrarToast('Erro ao carregar corretores.', 'error');
    }
}

    async function handleCadastrarCorretor() {
        limparErrosCorretor();

        const nome    = novoNomeInput.value.trim();
        const usuario = novoUsuarioInput.value.trim().toLowerCase();
        const senha   = novaSenhaInput.value;

        let temErro = false;

        if (!nome || nome.length < 3) {
            novoNomeError.textContent = 'Informe o nome completo (mínimo 3 caracteres).';
            novoNomeError.classList.add('visible');
            novoNomeInput.classList.add('error');
            temErro = true;
        }

        if (!usuario || usuario.length < 3) {
            novoUsuarioError.textContent = 'Usuário muito curto (mínimo 3 caracteres).';
            novoUsuarioError.classList.add('visible');
            novoUsuarioInput.classList.add('error');
            temErro = true;
        } else if (!/^[a-z0-9._-]+$/.test(usuario)) {
            novoUsuarioError.textContent = 'Use apenas letras minúsculas, números, ponto, hífen ou underline.';
            novoUsuarioError.classList.add('visible');
            novoUsuarioInput.classList.add('error');
            temErro = true;
        }

        if (!senha || senha.length < 4) {
            novaSenhaError.textContent = 'Senha muito curta (mínimo 4 caracteres).';
            novaSenhaError.classList.add('visible');
            novaSenhaInput.classList.add('error');
            temErro = true;
        }

        if (temErro) return;

        btnCadastrarCorretor.disabled = true;
        btnCadastrarCorretor.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Cadastrando...';

        try {
            await ApiClient.post('/api/admin/corretores', { nome, usuario, senha });
            mostrarToast(`✅ Corretor "${nome}" cadastrado!`, 'success');

            novoNomeInput.value = '';
            novoUsuarioInput.value = '';
            novaSenhaInput.value = '';

            renderizarCorretores();
            renderizarSeletorCorretores();

        } catch (err) {
            novoUsuarioError.textContent = err.message || 'Erro ao cadastrar.';
            novoUsuarioError.classList.add('visible');
            novoUsuarioInput.classList.add('error');
        } finally {
            btnCadastrarCorretor.disabled = false;
            btnCadastrarCorretor.innerHTML = '<i class="fas fa-check"></i> Cadastrar corretor';
        }
    }

    if (btnCadastrarCorretor) {
        btnCadastrarCorretor.addEventListener('click', handleCadastrarCorretor);
    }

    /* =========================================================
       EDITAR CORRETOR
       ========================================================= */
function abrirEditarCorretor(corretor) {
    corretorEditandoId = corretor.id;
    corretorEditandoTipo = corretor.tipo || 'corretor';

    editarNomeInput.value = corretor.nome || '';
    editarUsuarioInput.value = corretor.usuario || '';
    editarSenhaInput.value = '';

    [editarNomeError, editarUsuarioError, editarSenhaError].forEach(e => {
        e.textContent = '';
        e.classList.remove('visible');
    });
    [editarNomeInput, editarUsuarioInput, editarSenhaInput].forEach(i => i.classList.remove('error'));

    // Atualiza botão do tipo
    atualizarBotaoTipo();

    modalEditarCorretor.style.display = 'flex';
    setTimeout(() => editarNomeInput.focus(), 100);
}

function fecharEditarCorretor() {
    modalEditarCorretor.style.display = 'none';
    corretorEditandoId = null;
    corretorEditandoTipo = 'corretor';
}

function atualizarBotaoTipo() {
    if (!btnToggleTipo || !btnToggleTipoText) return;

    if (corretorEditandoTipo === 'teste') {
        btnToggleTipo.classList.add('is-teste');
        btnToggleTipo.dataset.tipo = 'teste';
        btnToggleTipoText.textContent = 'Usuário de teste (não conta nas estatísticas)';
    } else {
        btnToggleTipo.classList.remove('is-teste');
        btnToggleTipo.dataset.tipo = 'corretor';
        btnToggleTipoText.textContent = 'Marcar como usuário de teste';
    }
}

// Handler do botão toggle
if (btnToggleTipo) {
    btnToggleTipo.addEventListener('click', () => {
        if (!corretorEditandoId) return;

        const vaiVirarTeste = corretorEditandoTipo !== 'teste';

        const titulo = vaiVirarTeste
            ? 'Marcar como usuário de teste?'
            : 'Voltar para corretor normal?';

        const mensagem = vaiVirarTeste
            ? 'Os leads dele vão parar de contar em KPIs, gráficos e estatísticas gerais. Ele continua podendo logar e trabalhar normalmente.'
            : 'Os leads dele voltam a contar em TODAS as estatísticas (KPIs, gráficos, donut, velocímetro).';

        abrirConfirm(titulo, mensagem, async () => {
            try {
                const novoTipo = vaiVirarTeste ? 'teste' : 'corretor';

                await ApiClient.patch(`/api/admin/corretores/${corretorEditandoId}/tipo`, {
                    tipo: novoTipo
                });

                corretorEditandoTipo = novoTipo;
                atualizarBotaoTipo();

                mostrarToast(
                    novoTipo === 'teste'
                        ? '✅ Marcado como usuário de teste.'
                        : '✅ Voltou a contar nas estatísticas.',
                    'success'
                );

                renderizarCorretores();
                atualizarDashboard();

            } catch (err) {
                console.error('[toggle-tipo] erro:', err);
                mostrarToast(err.message || 'Erro ao alterar tipo.', 'error');
            }
        });
    });
}

    async function salvarEditarCorretor() {
        if (!corretorEditandoId) return;

        [editarNomeError, editarUsuarioError, editarSenhaError].forEach(e => {
            e.textContent = '';
            e.classList.remove('visible');
        });
        [editarNomeInput, editarUsuarioInput, editarSenhaInput].forEach(i => i.classList.remove('error'));

        const nome    = editarNomeInput.value.trim();
        const usuario = editarUsuarioInput.value.trim().toLowerCase();
        const senha   = editarSenhaInput.value.trim();

        let temErro = false;

        if (!nome || nome.length < 3) {
            editarNomeError.textContent = 'Nome muito curto (mínimo 3 caracteres).';
            editarNomeError.classList.add('visible');
            editarNomeInput.classList.add('error');
            temErro = true;
        }

        if (!usuario || usuario.length < 3) {
            editarUsuarioError.textContent = 'Usuário muito curto (mínimo 3 caracteres).';
            editarUsuarioError.classList.add('visible');
            editarUsuarioInput.classList.add('error');
            temErro = true;
        } else if (!/^[a-z0-9._-]+$/.test(usuario)) {
            editarUsuarioError.textContent = 'Use apenas letras minúsculas, números, ponto, hífen ou underline.';
            editarUsuarioError.classList.add('visible');
            editarUsuarioInput.classList.add('error');
            temErro = true;
        }

        if (senha && senha.length < 4) {
            editarSenhaError.textContent = 'A nova senha precisa ter no mínimo 4 caracteres.';
            editarSenhaError.classList.add('visible');
            editarSenhaInput.classList.add('error');
            temErro = true;
        }

        if (temErro) return;

        btnSalvarEditarCorretor.disabled = true;
        btnSalvarEditarCorretorTexto.textContent = 'Salvando...';

        try {
            const body = { nome, usuario };
            if (senha) body.senha = senha;

            await ApiClient.patch(`/api/admin/corretores/${corretorEditandoId}`, body);

            mostrarToast('✅ Corretor atualizado!', 'success');
            fecharEditarCorretor();
            renderizarCorretores();

        } catch (err) {
            console.error('[editar-corretor] erro:', err);

            if (err.message && err.message.toLowerCase().includes('usuário')) {
                editarUsuarioError.textContent = err.message;
                editarUsuarioError.classList.add('visible');
                editarUsuarioInput.classList.add('error');
            } else {
                mostrarToast(err.message || 'Erro ao salvar.', 'error');
            }
        } finally {
            btnSalvarEditarCorretor.disabled = false;
            btnSalvarEditarCorretorTexto.textContent = 'Salvar';
        }
    }

    /* =========================================================
       HEADER
       ========================================================= */
    if (headerUserName) {
        const nome = localStorage.getItem('sr_usuario') || 'Administrador';
        headerUserName.textContent = nome.split(' ')[0];
    }

    /* =========================================================
       INIT
       ========================================================= */
    async function init() {
        blocoArquivo.style.display = 'flex';
        blocoTexto.style.display = 'none';

        await atualizarDashboard();
        await renderizarSeletorCorretores();
        await renderizarListas();
        await renderizarCorretores();
        await carregarListasParaAtualizacao();

        // Botão gerenciar
        if (btnGerenciarCorretores) btnGerenciarCorretores.addEventListener('click', abrirGerenciarCorretores);
        if (btnFecharGerenciar)     btnFecharGerenciar.addEventListener('click', fecharGerenciar);
        if (btnCancelarGerenciar)   btnCancelarGerenciar.addEventListener('click', fecharGerenciar);
        if (btnSalvarGerenciar)     btnSalvarGerenciar.addEventListener('click', salvarGerenciarCorretores);
        if (modalGerenciar) {
            modalGerenciar.addEventListener('click', (e) => {
                if (e.target === modalGerenciar) fecharGerenciar();
            });
        }

        // Salvar mensagem WhatsApp
        if (btnSalvarMensagem) btnSalvarMensagem.addEventListener('click', salvarMensagemWhatsApp);

        // Modal editar corretor
        if (btnFecharEditarCorretor)   btnFecharEditarCorretor.addEventListener('click', fecharEditarCorretor);
        if (btnCancelarEditarCorretor) btnCancelarEditarCorretor.addEventListener('click', fecharEditarCorretor);
        if (btnSalvarEditarCorretor)   btnSalvarEditarCorretor.addEventListener('click', salvarEditarCorretor);
        if (modalEditarCorretor) {
            modalEditarCorretor.addEventListener('click', (e) => {
                if (e.target === modalEditarCorretor) fecharEditarCorretor();
            });
        }

        // Custom select "É atualização de lista?"
        if (customAtualizacaoTrigger && customAtualizacaoMenu) {
            customAtualizacaoTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const aberto = customAtualizacaoMenu.classList.contains('open');
                customAtualizacaoMenu.classList.toggle('open', !aberto);
                customAtualizacaoTrigger.classList.toggle('open', !aberto);
            });

            document.addEventListener('click', (e) => {
                if (customAtualizacao && !customAtualizacao.contains(e.target)) {
                    fecharCustomSelect();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') fecharCustomSelect();
            });
        }

        // Botões de variáveis (funciona nos 2 textareas)
        document.querySelectorAll('.variavel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const wrap = btn.closest('.variaveis-wrap');
                const grupo = wrap ? wrap.parentElement : null;
                const textarea = grupo ? grupo.querySelector('textarea') : null;

                if (!textarea) return;

                const variavel = btn.dataset.var;
                const inicio = textarea.selectionStart;
                const fim = textarea.selectionEnd;
                const texto = textarea.value;

                textarea.value = texto.substring(0, inicio) + variavel + texto.substring(fim);

                const novaPos = inicio + variavel.length;
                textarea.setSelectionRange(novaPos, novaPos);
                textarea.focus();
            });
        });

        // Fecha modais com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (modalLista)          modalLista.style.display = 'none';
                if (modalConfirm)        modalConfirm.style.display = 'none';
                if (modalGerenciar)      modalGerenciar.style.display = 'none';
                if (modalEditarCorretor) modalEditarCorretor.style.display = 'none';
                if (modalTag)            modalTag.style.display = 'none';
            }
        });

        iniciarPolling();

        console.log('[admin] Sistema pronto.');
    }

    init();

});