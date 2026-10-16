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

    // Upload — abas Nova/Atualizar
const uploadModeTabs           = document.querySelectorAll('.upload-mode-tab');
const uploadTitulo             = $('uploadTitulo');
const grupoSelecionarLista     = $('grupoSelecionarLista');
const grupoNomeLista           = $('grupoNomeLista');
const selectListaAtualizar     = $('selectListaAtualizar');
const selectListaAtualizarError = $('selectListaAtualizarError');
const customSelectLista        = $('customSelectLista');
const customSelectListaTrigger = $('customSelectListaTrigger');
const customSelectListaText    = $('customSelectListaText');
const customSelectListaMenu    = $('customSelectListaMenu');

// Config avançada
const configAvancada = $('configAvancada');
const btnToggleConfig = $('btnToggleConfig');

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
    let modoUpload = 'nova';  // 'nova' | 'atualizar'

    // Gráficos
    let chartLinha   = null;
    let chartDonut   = null;
    let chartColunas = null;

    // Drill-down por tag
    let filtroTagAtual = { chave: null, label: '', busca: '', de: '', ate: '' };
    let leadsTagAtuais = [];

    let empEditandoId = null;
    let empCapaAtual = null;      // { url, public_id } ou null
    let empPdfAtual = null;       // { url, public_id } ou null
    let empComodidadesTemp = [];  // array de strings

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
        if (n.length === 13) return '+' + n.slice(0,2) + ' (' + n.slice(2,4) + ') ' + n.slice(4,9) + '-' + n.slice(9);
        if (n.length === 11) return '(' + n.slice(0,2) + ') ' + n.slice(2,7) + '-' + n.slice(7);
        if (n.length === 10) return '(' + n.slice(0,2) + ') ' + n.slice(2,6) + '-' + n.slice(6);
        return tel;
    }

    /**
     * Normaliza qualquer timestamp vindo do backend pra formato ISO completo.
     * Aceita: "2026-10-02 22:59:37.289+00", "2026-10-02 22:59:37", "2026-10-02T22:59:37Z"
     */
    function normalizarDataISO(iso) {
        if (!iso) return null;

        let str = String(iso).trim();
        if (!str || str === 'null' || str === 'undefined') return null;

        // Converte Date pra string ISO
        if (typeof iso === 'object' && iso instanceof Date) {
            return iso.toISOString();
        }

        // Troca espaço por T
        str = str.replace(' ', 'T');

        // Se já tem Z no final, ok
        if (str.endsWith('Z')) return str;

        // Detecta timezone no final: +HH, +HHMM, +HH:MM, -HH, etc
        const match = str.match(/([+-])(\d{2})(:?(\d{2}))?$/);
        if (match) {
            const sinal = match[1];
            const hh = match[2];
            const mm = match[4] || '00';
            // Remove o timezone atual e recoloca normalizado
            str = str.replace(/([+-]\d{2})(:?\d{2})?$/, sinal + hh + ':' + mm);
            return str;
        }

        // Sem timezone: assume UTC
        return str + 'Z';
    }

    function dataCurta(iso) {
        if (!iso) return '—';
        const normalizado = normalizarDataISO(iso);
        if (!normalizado) return '—';
        const d = new Date(normalizado);
        if (isNaN(d.getTime())) return '—';

        return d.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }

    function formatarUltimoAcesso(iso) {
        if (!iso) return 'Nunca acessou';

        const normalizado = normalizarDataISO(iso);
        if (!normalizado) return 'Nunca acessou';

        const d = new Date(normalizado);
        if (isNaN(d.getTime())) return 'Nunca acessou';

        const OPCOES_DATA = { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit' };
        const OPCOES_HORA = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' };

        const agora   = new Date();
        const hojeSP  = agora.toLocaleDateString('pt-BR', OPCOES_DATA);
        const ontemSP = new Date(agora.getTime() - 86400000).toLocaleDateString('pt-BR', OPCOES_DATA);
        const dataSP  = d.toLocaleDateString('pt-BR', OPCOES_DATA);
        const hora    = d.toLocaleTimeString('pt-BR', OPCOES_HORA);

        if (dataSP === hojeSP) return 'hoje às ' + hora;
        if (dataSP === ontemSP) return 'ontem às ' + hora;
        return dataSP + ' às ' + hora;
    }

    function formatarTamanho(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
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
            if (alvo === 'empreendimentos') renderizarEmpreendimentos();
            if (alvo === 'listas')     renderizarListas();
            if (alvo === 'corretores') renderizarCorretores();
        });
    });

    /* =========================================================
       GOOGLE DRIVE — Analisar pasta
       ========================================================= */

    async function analisarPastaDrive() {
        const input = $('empDriveLink');
        const btn = $('btnAnalisarDrive');

        if (!input || !btn) return;

        const driveUrl = input.value.trim();

        if (!driveUrl) {
            mostrarToast('Cole o link da pasta do Drive primeiro.', 'error');
            input.focus();
            return;
        }

        // Feedback visual
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analisando...';

        try {
            const { pdfs, totalArquivos, totalPdfs, outros, tipo } = await ApiClient.post(
                '/api/admin/empreendimentos/drive/analisar',
                { driveUrl }
            );

            renderizarPreviewDrive(pdfs, totalArquivos, totalPdfs, outros, tipo);

            if (totalPdfs === 0) {
                mostrarToast('Nenhum PDF encontrado nessa pasta.', 'info');
            } else {
                mostrarToast(`✅ ${totalPdfs} PDF${totalPdfs > 1 ? 's' : ''} encontrado${totalPdfs > 1 ? 's' : ''}!`, 'success');
            }

        } catch (err) {
            console.error('[drive/analisar] erro:', err);
            mostrarToast(err.message || 'Erro ao analisar pasta.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search"></i> Analisar pasta';
        }
    }

    function renderizarPreviewDrive(pdfs, totalArquivos, totalPdfs, outros, tipo) {
        const preview = $('empDrivePreview');
        const info = $('empDrivePreviewInfo');
        const lista = $('empDrivePreviewLista');
        const btnImportar = $('btnImportarDrive');

        if (!preview || !lista) return;

        preview.style.display = 'block';

        // Título conforme tipo
        const tituloEl = $('empDrivePreviewTitulo');
        if (tituloEl) {
            tituloEl.textContent = tipo === 'arquivo'
                ? 'Arquivo analisado'
                : 'Pasta analisada';
        }

        const labelInfo = totalPdfs === 1
            ? '1 PDF encontrado'
            : `${totalPdfs} PDFs encontrados`;

        const extraOutros = outros > 0
            ? ` · ${outros} outro${outros > 1 ? 's' : ''} arquivo${outros > 1 ? 's' : ''}`
            : '';

        if (info) info.textContent = labelInfo + extraOutros;

        if (totalPdfs === 0) {
            lista.innerHTML = `
                <div class="emp-drive-empty">
                    <i class="fas fa-file-pdf"></i>
                    <p>Nenhum PDF encontrado.</p>
                </div>
            `;
            if (btnImportar) btnImportar.disabled = true;
            return;
        }

        const ICONES = {
            book: 'fa-book',
            tabela: 'fa-table',
            planta: 'fa-drafting-compass',
            memorial: 'fa-file-alt',
            imagem: 'fa-image',
            contrato: 'fa-file-signature',
            regulamento: 'fa-gavel',
            outro: 'fa-file'
        };

        const LABELS = {
            book: 'Book',
            tabela: 'Tabela',
            planta: 'Planta',
            memorial: 'Memorial',
            imagem: 'Imagem',
            contrato: 'Contrato',
            regulamento: 'Regulamento',
            outro: 'Documento'
        };

        // Checkbox "selecionar todos" no topo
        const headerSelecionarTodos = `
            <div class="emp-drive-selecionar-todos">
                <label class="emp-drive-check-label">
                    <input type="checkbox" id="empDriveCheckTodos" checked>
                    <span class="emp-drive-check-box"></span>
                    <span>Selecionar todos</span>
                </label>
                <small id="empDriveSelecionados">${pdfs.length} de ${pdfs.length} selecionados</small>
            </div>
        `;

        lista.innerHTML = headerSelecionarTodos + pdfs.map((pdf, idx) => {
            const tamanho = pdf.tamanho
                ? (pdf.tamanho > 1024 * 1024
                    ? (pdf.tamanho / 1024 / 1024).toFixed(1) + ' MB'
                    : Math.round(pdf.tamanho / 1024) + ' KB')
                : '—';

            const icone = ICONES[pdf.tipo] || ICONES.outro;
            const label = LABELS[pdf.tipo] || LABELS.outro;

            return `
                <label class="emp-drive-file emp-drive-file-checkable" data-idx="${idx}">
                    <input type="checkbox" class="emp-drive-file-check" data-pdf-id="${pdf.id}" checked>
                    <span class="emp-drive-check-box"></span>
                    <div class="emp-drive-file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="emp-drive-file-info">
                        <strong>${escapeHtml(pdf.nome)}</strong>
                        <small>${tamanho}</small>
                    </div>
                    <span class="emp-drive-file-tag tag-${pdf.tipo}">
                        <i class="fas ${icone}"></i>
                        ${label}
                    </span>
                </label>
            `;
        }).join('');

        // Listeners dos checkboxes
        const checkTodos = $('empDriveCheckTodos');
        const checkIndividuais = lista.querySelectorAll('.emp-drive-file-check');

        function atualizarContador() {
            const total = checkIndividuais.length;
            const marcados = Array.from(checkIndividuais).filter(c => c.checked).length;

            const el = $('empDriveSelecionados');
            if (el) el.textContent = `${marcados} de ${total} selecionados`;

            if (btnImportar) {
                btnImportar.disabled = marcados === 0;
            }
        }

        if (checkTodos) {
            checkTodos.addEventListener('change', () => {
                checkIndividuais.forEach(c => c.checked = checkTodos.checked);
                atualizarContador();
            });
        }

        checkIndividuais.forEach(c => {
            c.addEventListener('change', () => {
                const todos = Array.from(checkIndividuais).every(x => x.checked);
                const nenhum = Array.from(checkIndividuais).every(x => !x.checked);

                if (checkTodos) {
                    checkTodos.checked = todos;
                    checkTodos.indeterminate = !todos && !nenhum;
                }

                atualizarContador();
            });
        });

        // Botão "Importar" habilitado (Fase 4)
        if (btnImportar) {
            btnImportar.disabled = false;

            // ✅ Anexa o listener AQUI, toda vez que o preview é (re)renderizado
            btnImportar.onclick = null;
            btnImportar.addEventListener('click', importarPdfsDrive);
        }
    }

    function fecharPreviewDrive() {
        const preview = $('empDrivePreview');
        if (preview) preview.style.display = 'none';
    }


    
    /* =========================================================
       GOOGLE DRIVE — Importar PDFs selecionados
       ========================================================= */

    async function importarPdfsDrive() {
        const lista = $('empDrivePreviewLista');
        const btn = $('btnImportarDrive');
        const btnTxt = $('btnImportarDriveTexto');

        if (!lista || !btn) return;

        // Pega os PDFs marcados
        const checkboxes = lista.querySelectorAll('.emp-drive-file-check');
        const pdfsSelecionados = [];

        checkboxes.forEach(cb => {
            if (!cb.checked) return;

            const pdfId = cb.dataset.pdfId;

            // Pega o nome do arquivo do card pai
            const card = cb.closest('.emp-drive-file');
            const nomeEl = card?.querySelector('.emp-drive-file-info strong');
            const nome = nomeEl?.textContent || 'documento.pdf';

            // Pega o tipo (da tag)
            const tagEl = card?.querySelector('.emp-drive-file-tag');
            const tipoClasse = tagEl?.className || '';
            const tipoMatch = tipoClasse.match(/tag-(\w+)/);
            const tipo = tipoMatch ? tipoMatch[1] : 'outro';

            pdfsSelecionados.push({ id: pdfId, nome, tipo });
        });

        if (!pdfsSelecionados.length) {
            mostrarToast('Selecione pelo menos 1 PDF.', 'error');
            return;
        }

        // Confirma
        const confirmar = await new Promise(resolve => {
            abrirConfirm(
                'Importar PDFs?',
                `Vamos baixar ${pdfsSelecionados.length} PDF${pdfsSelecionados.length > 1 ? 's' : ''} do Drive e extrair o texto. Isso pode levar até 1 minuto.`,
                () => resolve(true)
            );
            // Se fechar sem confirmar, resolve false depois de um tempo
            const check = setInterval(() => {
                const modal = $('modalConfirm');
                if (!modal || modal.style.display === 'none') {
                    clearInterval(check);
                    resolve(false);
                }
            }, 200);
        });

        if (!confirmar) return;

        // Feedback visual
        btn.disabled = true;
        btnTxt.textContent = 'Processando...';
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span id="btnImportarDriveTexto">Processando PDFs...</span>';

        try {
            const resposta = await ApiClient.post('/api/admin/empreendimentos/drive/importar', {
                pdfs: pdfsSelecionados
            });

            // Abre a tela de revisão
            abrirTelaRevisao(resposta);

            mostrarToast(`✅ ${resposta.sucesso} PDF${resposta.sucesso > 1 ? 's' : ''} processado${resposta.sucesso > 1 ? 's' : ''}!`, 'success');

        } catch (err) {
            console.error('[drive/importar] erro:', err);
            mostrarToast(err.message || 'Erro ao importar.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bolt"></i> <span id="btnImportarDriveTexto">Importar e processar</span>';
        }
    }

    /* =========================================================
       TELA DE REVISÃO — abre o modal já preenchido pela IA
       ========================================================= */

function abrirTelaRevisao(resposta) {
    const { resultados } = resposta;
    const pdfOk = resultados.find(r => r.sucesso && r.dados_ia)
                 || resultados.find(r => r.sucesso);

    if (!pdfOk) {
        mostrarToast('Nenhum PDF processado com sucesso.', 'error');
        return;
    }

    fecharPreviewDrive();
    const importerCard = document.querySelector('.emp-importer-card');
    if (importerCard) importerCard.style.display = 'none';

    limparFormularioEmp();

    // ---- Se for PDF escaneado, abre em branco ----
    if (pdfOk.pdf_escaneado) {
        if (pdfOk.capa_url) {
            empCapaAtual = { url: pdfOk.capa_url, public_id: pdfOk.capa_public_id };
            $('empCoverImg').src = pdfOk.capa_url;
            $('empCoverImg').onload = () => {
                $('empCoverPreview').style.display = 'block';
                $('empCoverEmpty').style.display = 'none';
                $('empUploadCover')?.classList.remove('emp-sem-capa');
            };
        } else {
            $('empUploadCover')?.classList.add('emp-sem-capa');
        }

        if (pdfOk.drive_url) {
            empPdfAtual = { url: pdfOk.drive_url, public_id: null };
            $('empPdfNome').textContent = pdfOk.nome || 'book.pdf';
            $('empPdfInfo').style.display = 'flex';
            $('empPdfEmpty').style.display = 'none';
        }

        const modal = $('modalEmpreendimento');
        if (modal) modal.style.display = 'flex';

        const titulo = $('empModalTituloTexto');
        if (titulo) titulo.textContent = '📝 Cadastrar empreendimento (PDF escaneado)';

        const subtitulo = $('empModalSubtitulo');
        if (subtitulo) subtitulo.textContent = 'A IA não conseguiu ler esse PDF. Preencha os dados manualmente.';

        mostrarToast('PDF escaneado. Preencha manualmente.', 'info');
        return;
    }

    // ---- Fluxo normal (IA preencheu) ----
    const d = pdfOk.dados_ia || {};

    $('empNome').value        = d.nome || '';
    $('empConstrutora').value = d.construtora || '';
    $('empTipoImovel').value  = d.tipo_imovel || '';
    $('empDormitorios').value = d.dormitorios || '';
    $('empMetragens').value   = d.metragens || '';
    $('empVagas').value       = d.vagas || '';
    $('empCidade').value      = d.cidade || '';
    $('empEstado').value      = d.estado || '';
    $('empBairro').value      = d.bairro || '';
    $('empEndereco').value    = d.endereco || '';
    $('empDescricao').value   = d.descricao || '';

    const comodidades = d.comodidades || [];
    $('empComodidades').value = Array.isArray(comodidades) ? comodidades.join(', ') : '';

    // ---- CAPA (com log pra debugar) ----
    console.log('[revisao] capa_url:', pdfOk.capa_url);

    if (pdfOk.capa_url) {
        empCapaAtual = { url: pdfOk.capa_url, public_id: pdfOk.capa_public_id };
        const img = $('empCoverImg');
        img.src = pdfOk.capa_url;
        img.onerror = () => {
            console.warn('[revisao] erro ao carregar capa:', pdfOk.capa_url);
            $('empUploadCover')?.classList.add('emp-sem-capa');
        };
        img.onload = () => {
            $('empCoverPreview').style.display = 'block';
            $('empCoverEmpty').style.display = 'none';
            $('empUploadCover')?.classList.remove('emp-sem-capa');
        };
    } else {
        $('empUploadCover')?.classList.add('emp-sem-capa');
        console.warn('[revisao] sem capa_url na resposta');
    }

    // ---- PDF ----
    if (pdfOk.drive_url) {
        empPdfAtual = { url: pdfOk.drive_url, public_id: null };
        $('empPdfNome').textContent = pdfOk.nome || 'book.pdf';
        $('empPdfInfo').style.display = 'flex';
        $('empPdfEmpty').style.display = 'none';
    } else if (pdfOk.cloudinary_url) {
        empPdfAtual = { url: pdfOk.cloudinary_url, public_id: pdfOk.cloudinary_public_id };
        $('empPdfNome').textContent = pdfOk.nome || 'book.pdf';
        $('empPdfInfo').style.display = 'flex';
        $('empPdfEmpty').style.display = 'none';
    }

    marcarCamposComIA();

    const modal = $('modalEmpreendimento');
    if (modal) modal.style.display = 'flex';

    const titulo = $('empModalTituloTexto');
    if (titulo) titulo.textContent = '✨ Revisar dados extraídos pela IA';

    const subtitulo = $('empModalSubtitulo');
    if (subtitulo) subtitulo.textContent = 'Confira e edite o que precisar antes de salvar';
}

    /* Marca visualmente os campos como preenchidos pela IA */
    function marcarCamposComIA() {
        const ids = [
            'empNome','empConstrutora','empDormitorios',
            'empMetragens','empVagas','empComodidades','empDescricao'
        ];
        ids.forEach(id => {
            const el = $(id);
            if (!el) return;
            el.classList.add('campo-preenchido-ia');
        });
    }

    /* =========================================================
       DASHBOARD
       ========================================================= */
        async function atualizarDashboard() {
        try {
            const stats = await ApiClient.get('/api/admin/dashboard');

            const elListas = document.getElementById('kpiListas');
            const elTotal = document.getElementById('kpiTotal');
            const elQualif = document.getElementById('kpiQualificados');
            const elAguard = document.getElementById('kpiAguardando');

            if (elListas) elListas.textContent = stats.totalListas;
            if (elTotal)  elTotal.textContent  = stats.totalContatos;
            if (elQualif) elQualif.textContent = stats.qualificados;
            if (elAguard) elAguard.textContent = stats.aguardando;

        } catch (err) {
            console.error('[dashboard] erro:', err);
        }
    }

    /* =========================================================
       MODAL DE EMPREENDIMENTO — Cadastrar / Editar
       ========================================================= */

function limparFormularioEmp() {
    empEditandoId = null;
    empCapaAtual = null;
    empPdfAtual = null;
    empComodidadesTemp = [];

    ['empNome', 'empConstrutora', 'empPrevisao', 'empEndereco',
     'empBairro', 'empCidade', 'empEstado', 'empDormitorios',
     'empMetragens', 'empVagas', 'empComodidades', 'empDescricao'
    ].forEach(id => {
        const el = $(id);
        if (el) el.value = '';
    });

    ['empTipoImovel', 'empFase'].forEach(id => {
        const el = $(id);
        if (el) el.value = '';
    });

    const empNomeError = $('empNomeError');
    if (empNomeError) {
        empNomeError.textContent = '';
        empNomeError.classList.remove('visible');
    }
    const empNome = $('empNome');
    if (empNome) empNome.classList.remove('error');

    // Limpa preview de capa
    const coverPreview = $('empCoverPreview');
    const coverEmpty = $('empCoverEmpty');
    const coverImg = $('empCoverImg');
    if (coverPreview) coverPreview.style.display = 'none';
    if (coverEmpty) coverEmpty.style.display = 'flex';
    if (coverImg) {
        coverImg.src = '';
        coverImg.onload = null;
        coverImg.onerror = null;
    }
    $('empUploadCover')?.classList.remove('emp-sem-capa');

    // Limpa info do PDF
    const pdfInfo = $('empPdfInfo');
    const pdfEmpty = $('empPdfEmpty');
    if (pdfInfo) pdfInfo.style.display = 'none';
    if (pdfEmpty) pdfEmpty.style.display = 'flex';

    // Esconde badge + botão de status (só aparecem após salvar)
    const badge = $('empStatusBadgeAtual');
    const btnToggle = $('btnToggleStatus');
    if (badge) badge.style.display = 'none';
    if (btnToggle) {
        btnToggle.style.display = 'none';
        btnToggle.classList.remove('publicado', 'loading');
    }
}

    function abrirModalEmpreendimento(empreendimento = null) {
        limparFormularioEmp();

        const titulo = $('empModalTituloTexto');
        const subtitulo = $('empModalSubtitulo');
        const btnTxt = $('btnSalvarEmpTexto');

        if (empreendimento) {
            // Modo edição
            empEditandoId = empreendimento.id;

            if (titulo) titulo.textContent = 'Editar empreendimento';
            if (subtitulo) subtitulo.textContent = 'Atualize as informações';
            if (btnTxt) btnTxt.textContent = 'Salvar alterações';

            // Preenche os campos
            $('empNome').value = empreendimento.nome || '';
            $('empConstrutora').value = empreendimento.construtora || '';
            $('empTipoImovel').value = empreendimento.tipo_imovel || '';
            $('empFase').value = empreendimento.fase || '';
            $('empPrevisao').value = empreendimento.previsao_entrega || '';
            $('empEndereco').value = empreendimento.endereco || '';
            $('empBairro').value = empreendimento.bairro || '';
            $('empCidade').value = empreendimento.cidade || '';
            $('empEstado').value = empreendimento.estado || '';
            $('empDormitorios').value = empreendimento.dormitorios || '';
            $('empMetragens').value = empreendimento.metragens || '';
            $('empVagas').value = empreendimento.vagas || '';
            $('empDescricao').value = empreendimento.descricao || '';

            // Comodidades: array → string separada por vírgula
            const comodidades = empreendimento.comodidades || [];
            empComodidadesTemp = Array.isArray(comodidades) ? [...comodidades] : [];
            $('empComodidades').value = empComodidadesTemp.join(', ');

            // Capa
            if (empreendimento.capa_url) {
                empCapaAtual = {
                    url: empreendimento.capa_url,
                    public_id: empreendimento.capa_public_id
                };
                $('empCoverImg').src = empreendimento.capa_url;
                $('empCoverPreview').style.display = 'block';
                $('empCoverEmpty').style.display = 'none';
            }

            // PDF
            if (empreendimento.pdf_url) {
                empPdfAtual = {
                    url: empreendimento.pdf_url,
                    public_id: empreendimento.pdf_public_id
                };
                // Pega só o nome do arquivo da URL do Cloudinary
                const nomePdf = decodeURIComponent(
                    empreendimento.pdf_url.split('/').pop() || 'book.pdf'
                ).replace(/^\d+_/, '');
                $('empPdfNome').textContent = nomePdf;
                $('empPdfInfo').style.display = 'flex';
                $('empPdfEmpty').style.display = 'none';
            }

        } else {
            // Modo criação
            if (titulo) titulo.textContent = 'Cadastrar empreendimento';
            if (subtitulo) subtitulo.textContent = 'Preencha as informações principais';
            if (btnTxt) btnTxt.textContent = 'Salvar empreendimento';
        }

// Atualiza o badge de status + botão de publicar
const statusAtual = empreendimento?.status || 'rascunho';
atualizarBadgeStatusEmp(statusAtual);
atualizarBotaoStatusEmp(statusAtual);

// Só permite publicar se já existe (tem ID)
const btnToggle = $('btnToggleStatus');
if (btnToggle) {
    btnToggle.style.display = empEditandoId ? 'inline-flex' : 'none';
}

        // Abre o modal
        const modal = $('modalEmpreendimento');
        if (modal) modal.style.display = 'flex';

        setTimeout(() => {
            const inp = $('empNome');
            if (inp) inp.focus();
        }, 120);
    }

function fecharModalEmpreendimento() {
    const modal = $('modalEmpreendimento');
    if (modal) modal.style.display = 'none';

    // Reset o input file (senão não deixa subir a mesma imagem 2x)
    const capaInput = $('empCapaInput');
    const pdfInput = $('empPdfInput');
    if (capaInput) capaInput.value = '';
    if (pdfInput) pdfInput.value = '';

    limparFormularioEmp();

    // 🔑 Reexibe o card do importador (que foi escondido pela abrirTelaRevisao)
    const importerCard = document.querySelector('.emp-importer-card');
    if (importerCard) importerCard.style.display = '';

    // 🔑 Limpa o campo de link pra próxima importação
    const inputLink = $('empDriveLink');
    if (inputLink) inputLink.value = '';

    // 🔑 Esconde o preview de arquivos (que ficou aberto)
    const preview = $('empDrivePreview');
    if (preview) preview.style.display = 'none';
}

    async function uploadCapaEmp(file) {
        const formData = new FormData();
        formData.append('capa', file);

        const token = localStorage.getItem('sr_token');
        const res = await fetch('/api/admin/empreendimentos/upload-capa', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            const erro = await res.json().catch(() => ({}));
            throw new Error(erro.erro || 'Erro ao subir a capa.');
        }

        return res.json(); // { url, public_id }
    }

    async function uploadPdfEmp(file) {
        const formData = new FormData();
        formData.append('pdf', file);

        const token = localStorage.getItem('sr_token');
        const res = await fetch('/api/admin/empreendimentos/upload-pdf', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            const erro = await res.json().catch(() => ({}));
            throw new Error(erro.erro || 'Erro ao subir o PDF.');
        }

        return res.json(); // { url, public_id }
    }

    function processarComodidades() {
        const input = $('empComodidades');
        if (!input) return [];

        return input.value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }

    async function salvarEmpreendimento() {
        const btn = $('btnSalvarEmp');
        const btnTxt = $('btnSalvarEmpTexto');

        // Limpa erros visuais
        const empNomeError = $('empNomeError');
        const empNome = $('empNome');
        if (empNomeError) {
            empNomeError.textContent = '';
            empNomeError.classList.remove('visible');
        }
        if (empNome) empNome.classList.remove('error');

        // Validação
        const nome = ($('empNome')?.value || '').trim();

        if (!nome) {
            if (empNomeError) {
                empNomeError.textContent = 'Informe o nome do empreendimento.';
                empNomeError.classList.add('visible');
            }
            if (empNome) empNome.classList.add('error');
            return;
        }

        if (!empCapaAtual) {
            mostrarToast('Adicione uma capa para o empreendimento.', 'error');
            return;
        }

        btn.disabled = true;
        btnTxt.textContent = 'Salvando...';

        try {
            const body = {
                nome,
                construtora: ($('empConstrutora')?.value || '').trim() || null,
                tipo_imovel: $('empTipoImovel')?.value || null,
                fase: $('empFase')?.value || null,
                previsao_entrega: ($('empPrevisao')?.value || '').trim() || null,
                endereco: ($('empEndereco')?.value || '').trim() || null,
                bairro: ($('empBairro')?.value || '').trim() || null,
                cidade: ($('empCidade')?.value || '').trim() || null,
                estado: (($('empEstado')?.value || '').trim() || '').toUpperCase() || null,
                dormitorios: ($('empDormitorios')?.value || '').trim() || null,
                metragens: ($('empMetragens')?.value || '').trim() || null,
                vagas: ($('empVagas')?.value || '').trim() || null,
                comodidades: processarComodidades(),
                descricao: ($('empDescricao')?.value || '').trim() || null,
                capa_url: empCapaAtual.url,
                capa_public_id: empCapaAtual.public_id,
                pdf_url: empPdfAtual ? empPdfAtual.url : null,
                pdf_public_id: empPdfAtual ? empPdfAtual.public_id : null
            };

            if (empEditandoId) {
                // Editar
                await ApiClient.patch(`/api/admin/empreendimentos/${empEditandoId}`, body);
                mostrarToast('✅ Empreendimento atualizado!', 'success');
            } else {
                // Criar
                await ApiClient.post('/api/admin/empreendimentos', body);
                mostrarToast('✅ Empreendimento cadastrado!', 'success');
            }

            fecharModalEmpreendimento();
            await renderizarEmpreendimentos();

        } catch (err) {
            console.error('[emp-salvar] erro:', err);
            mostrarToast(err.message || 'Erro ao salvar.', 'error');
        } finally {
            btn.disabled = false;
            btnTxt.textContent = empEditandoId ? 'Salvar alterações' : 'Salvar empreendimento';
        }
    }

    async function excluirEmpreendimento(id, nome) {
        abrirConfirm(
            'Excluir empreendimento?',
            `Tem certeza que quer excluir "${nome}"? A capa e o PDF serão removidos também.`,
            async () => {
                try {
                    await ApiClient.del(`/api/admin/empreendimentos/${id}`);
                    mostrarToast('Empreendimento excluído.', 'success');
                    await renderizarEmpreendimentos();
                } catch (err) {
                    console.error('[emp-excluir] erro:', err);
                    mostrarToast(err.message || 'Erro ao excluir.', 'error');
                }
            }
        );
    }

/* =========================================================
   PUBLICAR / DESPUBLICAR EMPREENDIMENTO
   ========================================================= */

async function toggleStatusEmpreendimento() {
    if (!empEditandoId) {
        mostrarToast('Salve o empreendimento antes de publicar.', 'error');
        return;
    }

    const btn = $('btnToggleStatus');
    const btnTexto = $('btnToggleStatusTexto');
    const badge = $('empStatusBadgeAtual');

    const statusAtual = badge?.dataset.status || 'rascunho';
    const vaiPublicar = statusAtual !== 'publicado';
    const novostatus = vaiPublicar ? 'publicado' : 'rascunho';

    if (!btn || !btnTexto) return;

    // 🔑 Feedback visual IMEDIATO
    btn.disabled = true;
    btn.classList.add('loading');
    btnTexto.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' +
                         (vaiPublicar ? 'Publicando...' : 'Despublicando...');

    try {
        const { empreendimento } = await ApiClient.patch(
            `/api/admin/empreendimentos/${empEditandoId}/status`,
            { status: novostatus }
        );

        // 🔑 Confirma que o backend REALMENTE mudou o status
        const statusFinal = empreendimento?.status || novostatus;

        if (statusFinal !== novostatus) {
            throw new Error(`O servidor não alterou o status. Esperado: "${novostatus}", recebido: "${statusFinal}".`);
        }

        // 🔑 Atualiza badge + botão com o status FINAL confirmado pelo backend
        atualizarBadgeStatusEmp(statusFinal);
        atualizarBotaoStatusEmp(statusFinal);

        // 🔑 Se despublicou, fecha o modal (não faz sentido continuar editando)
        if (novostatus === 'rascunho') {
            mostrarToast('📝 Empreendimento despublicado.', 'success');
        } else {
            mostrarToast('✅ Publicado! O corretor já consegue ver.', 'success');
        }

        // 🔑 Recarrega a lista em background (não bloqueia a UX)
        renderizarEmpreendimentos();

    } catch (err) {
        console.error('[toggle-status] erro:', err);
        mostrarToast(err.message || 'Erro ao alterar status.', 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');

        // 🔑 Reconstrói o botão pro estado correto
        const statusFinalAtual = badge?.dataset.status || 'rascunho';
        atualizarBotaoStatusEmp(statusFinalAtual);
    }
}

function atualizarBadgeStatusEmp(status) {
    const badge = $('empStatusBadgeAtual');
    if (!badge) return;

    badge.dataset.status = status;
    badge.className = `emp-status-badge ${status}`;

    const labels = {
        rascunho: 'Rascunho',
        publicado: 'Publicado',
        arquivado: 'Arquivado'
    };
    badge.textContent = labels[status] || status;
}

function atualizarBotaoStatusEmp(status) {
    const btn = $('btnToggleStatus');
    const btnTexto = $('btnToggleStatusTexto');
    if (!btn || !btnTexto) return;

    // Remove classes antigas
    btn.classList.remove('publicado', 'loading');

    if (status === 'publicado') {
        btn.classList.add('publicado');
        btnTexto.innerHTML = '<i class="fas fa-eye-slash"></i> Despublicar';
    } else {
        btnTexto.innerHTML = '<i class="fas fa-eye"></i> Publicar';
    }
}

    function configurarEventosModalEmpreendimento() {
        // Fechar
        $('btnFecharModalEmp')?.addEventListener('click', fecharModalEmpreendimento);
        $('btnCancelarEmp')?.addEventListener('click', fecharModalEmpreendimento);

        // Clicar no overlay fecha
        $('modalEmpreendimento')?.addEventListener('click', (e) => {
            if (e.target.id === 'modalEmpreendimento') fecharModalEmpreendimento();
        });

        // ESC fecha
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && $('modalEmpreendimento')?.style.display === 'flex') {
                fecharModalEmpreendimento();
            }
        });

        // Salvar
        $('btnSalvarEmp')?.addEventListener('click', salvarEmpreendimento);

        // ---- Upload de capa ----
        const capaInput = $('empCapaInput');
        const uploadCoverEl = $('empUploadCover');

        if (uploadCoverEl && capaInput) {
            uploadCoverEl.addEventListener('click', (e) => {
                // Se clicou no botão de remover, ignora
                if (e.target.closest('#btnRemoverCapa')) return;
                capaInput.click();
            });

            capaInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    mostrarToast('Envie uma imagem (JPG, PNG).', 'error');
                    return;
                }

                if (file.size > 10 * 1024 * 1024) {
                    mostrarToast('Imagem muito grande (máx. 10MB).', 'error');
                    return;
                }

                try {
                    mostrarToast('Subindo capa...', 'info');
                    const res = await uploadCapaEmp(file);

                    empCapaAtual = { url: res.url, public_id: res.public_id };
                    $('empCoverImg').src = res.url;
                    $('empCoverPreview').style.display = 'block';
                    $('empCoverEmpty').style.display = 'none';

                    mostrarToast('✅ Capa carregada!', 'success');
                } catch (err) {
                    console.error('[capa] erro:', err);
                    mostrarToast(err.message || 'Erro ao subir a capa.', 'error');
                } finally {
                    capaInput.value = '';
                }
            });
        }

        // Remover capa
        $('btnRemoverCapa')?.addEventListener('click', (e) => {
            e.stopPropagation();
            empCapaAtual = null;
            $('empCoverImg').src = '';
            $('empCoverPreview').style.display = 'none';
            $('empCoverEmpty').style.display = 'flex';
        });

        // ---- Upload de PDF ----
        const pdfInput = $('empPdfInput');
        const uploadPdfEl = $('empUploadPdf');

        if (uploadPdfEl && pdfInput) {
            uploadPdfEl.addEventListener('click', (e) => {
                if (e.target.closest('#btnRemoverPdf')) return;
                pdfInput.click();
            });

            pdfInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (file.type !== 'application/pdf') {
                    mostrarToast('Envie um arquivo PDF.', 'error');
                    return;
                }

                if (file.size > 20 * 1024 * 1024) {
                    mostrarToast('PDF muito grande (máx. 20MB).', 'error');
                    return;
                }

                try {
                    mostrarToast('Subindo PDF...', 'info');
                    const res = await uploadPdfEmp(file);

                    empPdfAtual = { url: res.url, public_id: res.public_id };
                    $('empPdfNome').textContent = file.name;
                    $('empPdfInfo').style.display = 'flex';
                    $('empPdfEmpty').style.display = 'none';

                    mostrarToast('✅ PDF carregado!', 'success');
                } catch (err) {
                    console.error('[pdf] erro:', err);
                    mostrarToast(err.message || 'Erro ao subir o PDF.', 'error');
                } finally {
                    pdfInput.value = '';
                }
            });
        }

        // Remover PDF
        $('btnRemoverPdf')?.addEventListener('click', (e) => {
            e.stopPropagation();
            empPdfAtual = null;
            $('empPdfInfo').style.display = 'none';
            $('empPdfEmpty').style.display = 'flex';
        });
    }


    /* =========================================================
       EMPREENDIMENTOS
       ========================================================= */

    async function renderizarEmpreendimentos() {
        const grid = document.getElementById('empGrid');
        const vazio = document.getElementById('empVazio');
        const badge = document.getElementById('empBadgeTotal');
        if (!grid) return;

        try {
            const { empreendimentos } = await ApiClient.get('/api/admin/empreendimentos');

            if (badge) badge.textContent = empreendimentos.length;

            if (!empreendimentos.length) {
                grid.innerHTML = '';
                if (vazio) vazio.style.display = 'block';
                return;
            }

            if (vazio) vazio.style.display = 'none';

        grid.innerHTML = empreendimentos.map(e => {
            // Monta as infos estruturadas com ícone + label
            const quartosTxt = e.dormitorios
                ? `<i class="fas fa-bed"></i> ${escapeHtml(e.dormitorios)}`
                : '';

            const metragemTxt = e.metragens
                ? `<i class="fas fa-ruler-combined"></i> ${escapeHtml(e.metragens)}`
                : '';

            const vagasTxt = e.vagas
                ? `<i class="fas fa-car"></i> ${escapeHtml(e.vagas)}`
                : '';

            return `
                <article class="emp-card" data-id="${e.id}">
                    <div class="emp-card-cover">
                        ${e.capa_url
                            ? `<img src="${e.capa_url}" alt="${escapeHtml(e.nome)}">`
                            : `<i class="fas fa-building placeholder"></i>`
                        }
                        <span class="emp-card-status ${e.status}">${e.status}</span>
                    </div>
                    <div class="emp-card-body">
                        <div class="emp-card-body-head">
                            <h4>${escapeHtml(e.nome)}</h4>
                            <button class="emp-card-delete" data-id="${e.id}" title="Excluir" type="button">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>

                        ${e.construtora ? `
                            <div class="emp-card-info">
                                <i class="fas fa-industry"></i>
                                ${escapeHtml(e.construtora)}
                            </div>
                        ` : ''}

                        ${(e.cidade || e.estado) ? `
                            <div class="emp-card-info">
                                <i class="fas fa-map-marker-alt"></i>
                                ${escapeHtml([e.cidade, e.estado].filter(Boolean).join('/'))}
                            </div>
                        ` : ''}

                        ${(quartosTxt || metragemTxt || vagasTxt) ? `
                            <div class="emp-card-meta">
                                ${quartosTxt  ? `<span class="emp-card-chip">${quartosTxt}</span>`  : ''}
                                ${metragemTxt ? `<span class="emp-card-chip">${metragemTxt}</span>` : ''}
                                ${vagasTxt    ? `<span class="emp-card-chip">${vagasTxt}</span>`    : ''}
                            </div>
                        ` : ''}

                        ${e.descricao ? `
                            <p class="emp-card-desc">${escapeHtml(e.descricao)}</p>
                        ` : ''}
                    </div>
                </article>
            `;
        }).join('');

        // Listeners: botão de excluir em cada card
        grid.querySelectorAll('.emp-card-delete').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const id = Number(btn.dataset.id);
                const emp = empreendimentos.find(e => e.id === id);
                if (emp) excluirEmpreendimento(emp.id, emp.nome);
            });
        });

        // Listeners: clicar no card abre o modal de edição
        grid.querySelectorAll('.emp-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = Number(card.dataset.id);
                const emp = empreendimentos.find(e => e.id === id);
                if (emp) abrirModalEmpreendimento(emp);
            });
        });

        } catch (err) {
            console.error('[empreendimentos] erro:', err);
            mostrarToast('Erro ao carregar empreendimentos.', 'error');
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
   ATUALIZAÇÃO DE LISTA — SELECT NATIVO
   ========================================================= */

async function carregarListasParaAtualizacao() {
    if (!customSelectListaMenu || !selectListaAtualizar) return;

    try {
        const { listas } = await ApiClient.get('/api/admin/listas');
        listasDisponiveis = listas || [];

        const valorAtual = selectListaAtualizar.value;

        // Se não tem lista nenhuma
        if (!listasDisponiveis.length) {
            customSelectListaMenu.innerHTML = `
                <div class="custom-select-empty">
                    Nenhuma lista criada ainda.
                </div>
            `;
            atualizarTriggerCustomSelectLista('');
            return;
        }

        // Monta as opções
        customSelectListaMenu.innerHTML = listasDisponiveis.map(l => `
            <button type="button"
                    class="custom-select-option ${String(l.id) === String(valorAtual) ? 'selected' : ''}"
                    data-value="${l.id}">
                <i class="fas fa-folder-open opt-icon"></i>
                <span class="opt-text">${escapeHtml(l.nome)}</span>
                <span class="opt-count">${l.total}</span>
            </button>
        `).join('');

        atualizarTriggerCustomSelectLista(valorAtual);

        // Listeners das opções
        customSelectListaMenu.querySelectorAll('.custom-select-option').forEach(opc => {
            opc.addEventListener('click', () => {
                const novoValor = opc.dataset.value || '';
                selectListaAtualizar.value = novoValor;

                fecharCustomSelectLista();

                customSelectListaMenu.querySelectorAll('.custom-select-option')
                    .forEach(o => o.classList.toggle('selected', o === opc));

                atualizarTriggerCustomSelectLista(novoValor);

                handleMudancaAtualizacao();
            });
        });

    } catch (err) {
        console.error('[atualizacao] erro ao carregar listas:', err);
    }
}

function atualizarTriggerCustomSelectLista(valor) {
    if (!customSelectListaText) return;

    if (!valor) {
        customSelectListaText.textContent = 'Selecione uma lista...';
        return;
    }

    const lista = listasDisponiveis.find(l => String(l.id) === String(valor));
    customSelectListaText.textContent = lista
        ? `${lista.nome} · ${lista.total} contatos`
        : 'Selecione uma lista...';
}

function fecharCustomSelectLista() {
    if (customSelectListaMenu) customSelectListaMenu.classList.remove('open');
    if (customSelectListaTrigger) customSelectListaTrigger.classList.remove('open');
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
    if (!selectListaAtualizar) return;

    const valor = selectListaAtualizar.value;

    if (selectListaAtualizarError) {
        selectListaAtualizarError.textContent = '';
        selectListaAtualizarError.classList.remove('visible');
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

        [nomeListaError, textoListaError, corretoresError, arquivoCsvError, selectListaAtualizarError]
    .forEach(e => { if (e) { e.textContent = ''; e.classList.remove('visible'); } });

        nomeListaInput.classList.remove('error');
        textoListaInput.classList.remove('error');

        const emModoAtualizacao = modoUpload === 'atualizar' && !!listaAtualizacaoSelecionada;

        let nome;

        // Se está no modo atualizar mas não escolheu lista
if (modoUpload === 'atualizar' && !listaAtualizacaoSelecionada) {
    if (selectListaAtualizarError) {
        selectListaAtualizarError.textContent = 'Escolha uma lista para atualizar.';
        selectListaAtualizarError.classList.add('visible');
    }
    enviandoLista = false;
    return;
}

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
            if (selectListaAtualizar) selectListaAtualizar.value = '';
            atualizarTriggerCustomSelectLista('');
fecharCustomSelectLista();

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

        // 🔑 Carrega tudo em paralelo (o que sobrar de duplicado a gente resolve)
        await Promise.all([
            renderizarSeletorCorretores(),   // GET /api/admin/corretores
            renderizarListas(),              // GET /api/admin/listas
            initDashboardV2()                // GET /api/admin/dashboard + /graficos + /carteiras
        ]);

        // Google Drive — analisar pasta
        const btnAnalisarDrive = $('btnAnalisarDrive');
        if (btnAnalisarDrive) {
            btnAnalisarDrive.addEventListener('click', analisarPastaDrive);
        }

        const btnFecharPreviewDrive = $('btnFecharPreviewDrive');
        if (btnFecharPreviewDrive) {
            btnFecharPreviewDrive.addEventListener('click', fecharPreviewDrive);
        }

        // Enter no input dispara análise
        const empDriveLink = $('empDriveLink');
        if (empDriveLink) {
            empDriveLink.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    analisarPastaDrive();
                }
            });
        }

        // Botão "Cadastrar manualmente" do empreendimento
        const btnNovoEmp = document.getElementById('btnNovoEmpreendimento');
        if (btnNovoEmp) {
            btnNovoEmp.addEventListener('click', () => abrirModalEmpreendimento());
        }

        // Eventos do modal de empreendimento
        configurarEventosModalEmpreendimento();

        // 🔑 Toggle de status (publicar/despublicar)
        $('btnToggleStatus')?.addEventListener('click', toggleStatusEmpreendimento);

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

        // Abas Nova / Atualizar
        uploadModeTabs.forEach(tab => {
            tab.addEventListener('click', () => trocarModoUpload(tab.dataset.modoUpload));
        });

        // Select de lista (modo atualizar)
        if (customSelectListaTrigger && customSelectListaMenu) {
            customSelectListaTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const aberto = customSelectListaMenu.classList.contains('open');
                customSelectListaMenu.classList.toggle('open', !aberto);
                customSelectListaTrigger.classList.toggle('open', !aberto);
            });

            document.addEventListener('click', (e) => {
                if (customSelectLista && !customSelectLista.contains(e.target)) {
                    fecharCustomSelectLista();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') fecharCustomSelectLista();
            });
        }

        // Config avançada (colapsável)
        if (btnToggleConfig && configAvancada) {
            btnToggleConfig.addEventListener('click', () => {
                configAvancada.classList.toggle('aberta');
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

    /* =========================================================
       UPLOAD — TROCA DE ABA (Nova vs Atualizar)
       ========================================================= */

    function trocarModoUpload(novoModo) {
        if (novoModo === modoUpload) return;

        modoUpload = novoModo;

        // Atualiza visual das abas
        uploadModeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.modoUpload === novoModo);
        });

        // Ajusta título
        if (uploadTitulo) {
            uploadTitulo.textContent = novoModo === 'atualizar'
                ? 'Atualizar lista existente'
                : 'Subir nova lista';
        }

        // Mostra/esconde campos
        if (novoModo === 'atualizar') {
            grupoSelecionarLista.style.display = 'flex';
            grupoNomeLista.style.display = 'none';
        } else {
            grupoSelecionarLista.style.display = 'none';
            grupoNomeLista.style.display = 'flex';
        }

        // Reseta a seleção de lista e os campos relacionados
        if (selectListaAtualizar) selectListaAtualizar.value = '';
atualizarTriggerCustomSelectLista('');
fecharCustomSelectLista();
customSelectListaMenu?.querySelectorAll('.custom-select-option')
    .forEach(o => o.classList.remove('selected'));
listaAtualizacaoSelecionada = null;
statsListaAtual = {};

        // Reabilita nome e whatsapp
        if (nomeListaInput) {
            nomeListaInput.disabled = false;
            nomeListaInput.value = '';
        }
        if (mensagemWhatsappInput) {
            mensagemWhatsappInput.disabled = false;
            mensagemWhatsappInput.value = '';
        }

        limparContatosColados();

        // Desmarca todos os corretores
        corretoresSelector.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.checked = false;
        });

        atualizarBotaoSubirLista();
        renderizarStatsNosCorretores();
        atualizarPreviewRoleta();

        // Atualiza o select de listas pro modo "atualizar"
        if (novoModo === 'atualizar') {
            carregarListasParaAtualizacao();
        }
    }

    /* =========================================================
       DASHBOARD v2 — Renderização com dados reais
       ========================================================= */

    let chartLinhaDash = null;
    let chartDonutDash = null;

    let corretoresResumoDash = [];
    let carteirasDash = [];
    let filtroStatusCorretores = 'todos';

    /* =========================================================
       KPIs + Progresso da base
       ========================================================= */
    function renderizarKpisDash(kpis) {
        const trabalhados = (kpis.qualificados || 0) + (kpis.descartados || 0);
        const total = kpis.totalContatos || 0;
        const pct = total > 0 ? Math.round((trabalhados / total) * 100) : 0;

        const elTrab = document.getElementById('dashTrabalhados');
        const elBase = document.getElementById('dashBaseTotal');
        const elPct  = document.getElementById('dashPct');
        const elFill = document.getElementById('dashProgressFill');
        const elRest = document.getElementById('dashProgressRest');

        if (elTrab) elTrab.textContent = trabalhados.toLocaleString('pt-BR');
        if (elBase) elBase.textContent = total.toLocaleString('pt-BR');
        if (elPct)  elPct.textContent  = pct + '%';
        if (elFill) elFill.style.width = pct + '%';
        if (elRest) elRest.textContent = (total - trabalhados).toLocaleString('pt-BR') + ' restantes';
    }

    /* =========================================================
       Trend chart (linha)
       ========================================================= */
    function renderizarTrendDash(dados) {
        const canvas = document.getElementById('graficoLinha');
        if (!canvas || typeof Chart === 'undefined') return;
        if (chartLinhaDash) chartLinhaDash.destroy();

        const ctx = canvas.getContext('2d');

        const gradGreen = ctx.createLinearGradient(0, 0, 0, 220);
        gradGreen.addColorStop(0, 'rgba(34, 197, 94, 0.28)');
        gradGreen.addColorStop(1, 'rgba(34, 197, 94, 0)');

        const gradRed = ctx.createLinearGradient(0, 0, 0, 220);
        gradRed.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
        gradRed.addColorStop(1, 'rgba(239, 68, 68, 0)');

        chartLinhaDash = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dados.labels,
                datasets: [
                    {
                        label: 'Qualificados',
                        data: dados.qualificados,
                        borderColor: '#22c55e',
                        backgroundColor: gradGreen,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#22c55e',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    },
                    {
                        label: 'Descartados',
                        data: dados.descartados,
                        borderColor: '#ef4444',
                        backgroundColor: gradRed,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#ef4444',
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
                    legend: { display: false },
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
                            color: '#94a3b8',
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
                            color: '#94a3b8',
                            font: { size: 10, family: 'Inter' },
                            precision: 0
                        },
                        border: { display: false }
                    }
                }
            }
        });
    }

    /* =========================================================
       Donut de tags + legenda clicável
       ========================================================= */
    const CORES_TAGS = {
        mensagem_enviada:  '#f59e0b',
        follow_up:         '#64748b',
        em_atendimento:    '#22c55e',
        retornar_depois:   '#8b5cf6',
        sem_interesse:     '#dc2626',
        telefone_invalido: '#1e293b',
        agendado:          '#0ea5e9',
        vendido:           '#16a34a',
        sem_resposta:      '#94a3b8'
    };

    const LABELS_TAGS = {
        mensagem_enviada:  'Mensagem Enviada',
        follow_up:         'Follow Up',
        em_atendimento:    'Em Atendimento',
        retornar_depois:   'Retornar Depois',
        sem_interesse:     'Sem Interesse',
        telefone_invalido: 'Telefone Inválido',
        agendado:          'Agendado',
        vendido:           'Vendido',
        sem_resposta:      'Sem Resposta'
    };

    function corParaTag(chave, indexFallback) {
        if (CORES_TAGS[chave]) return CORES_TAGS[chave];
        const fallback = ['#002c61', '#0a4a91', '#3b82f6', '#60a5fa', '#dc2626', '#64748b'];
        return fallback[indexFallback % fallback.length];
    }

    function labelParaTag(chave) {
        return LABELS_TAGS[chave] || chave;
    }

    function renderizarDonutDash(dados) {
        const canvas = document.getElementById('graficoDonut');
        if (!canvas || typeof Chart === 'undefined') return;
        if (chartDonutDash) chartDonutDash.destroy();

        if (!dados.labels || !dados.labels.length) {
            const legend = document.getElementById('dashTagLegend');
            if (legend) legend.innerHTML = '<p style="color: rgba(148,163,184,.7); font-size: .85rem;">Sem dados ainda.</p>';
            return;
        }

        const ctx = canvas.getContext('2d');
        const cores = dados.chaves.map((chave, i) => corParaTag(chave, i));
        const total = dados.valores.reduce((a, b) => a + b, 0);

        chartDonutDash = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: dados.labels,
                datasets: [{
                    data: dados.valores,
                    backgroundColor: cores,
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 3,
                    hoverOffset: 10,
                    hoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                onClick: (evt, elements) => {
                    if (!elements.length) return;
                    const idx = elements[0].index;
                    const chave = dados.chaves[idx];
                    abrirModalTagDash(chave, dados.labels[idx]);
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0a1628',
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', size: 12, weight: '700' },
                        bodyFont: { family: 'Inter', size: 12 },
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.parsed;
                                const pct = total ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        const legend = document.getElementById('dashTagLegend');
        if (!legend) return;

        legend.innerHTML = dados.labels.map((label, i) => {
            const val = dados.valores[i];
            const pct = total ? Math.round((val / total) * 100) : 0;
            const cor = cores[i];
            return `
                <div class="dash-tag-legend-item" data-tag="${dados.chaves[i]}" data-label="${escapeHtml(label)}">
                    <span class="dash-tag-legend-dot" style="background:${cor}; color:${cor};"></span>
                    <span class="label">${escapeHtml(label)}</span>
                    <span class="count">${val.toLocaleString('pt-BR')}</span>
                    <span class="pct">${pct}%</span>
                </div>
            `;
        }).join('');

        legend.querySelectorAll('.dash-tag-legend-item').forEach(el => {
            el.addEventListener('click', () => {
                abrirModalTagDash(el.dataset.tag, el.dataset.label);
            });
        });
    }

    /* =========================================================
       Corretores ativos (com filtro de status)
       ========================================================= */
    function renderizarCorretoresDash(corretores, filtro = 'todos') {
        const list = document.getElementById('dashActiveList');
        if (!list) return;

        const online = corretores.filter(c => c.status === 'online').length;
        const offline = corretores.length - online;

        const elOnline = document.getElementById('dashOnlineCount');
        const elOffline = document.getElementById('dashOfflineCount');
        if (elOnline)  elOnline.textContent = online;
        if (elOffline) elOffline.textContent = offline;

        const items = corretores.filter(c => filtro === 'todos' || c.status === filtro);

        if (!items.length) {
            list.innerHTML = `
                <div class="empty-state small" style="padding: 1rem;">
                    <p style="font-size: 0.85rem;">Nenhum corretor ${filtro}.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = items.map(c => {
            const total = c.total_carteira || 0;
            const qualif = c.total_qualificados || 0;
            const pct = total > 0 ? Math.round((qualif / total) * 100) : 0;
            const pctClass = pct >= 70 ? '' : pct >= 40 ? 'amber' : 'red';
            const ultimo = c.status === 'online'
                ? 'Online agora'
                : (c.ultimo_acesso ? 'Último: ' + formatarUltimoAcesso(c.ultimo_acesso) : 'Nunca acessou');

            return `
                <div class="dash-active-item" data-status="${c.status}">
                    <div class="dash-active-avatar-wrap">
                        <div class="corretor-avatar">${iniciais(c.nome)}</div>
                        <span class="dash-active-status ${c.status}"></span>
                    </div>
                    <div class="dash-active-info">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>${escapeHtml(ultimo)}</small>
                    </div>
                    <div class="dash-active-progress">
                        <div class="dash-active-pct ${pctClass}">${qualif}/${total}</div>
                        <div class="dash-active-mini-bar"><span style="width:${pct}%"></span></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* =========================================================
       Carteiras — só as ativas (não concluídas)
       ========================================================= */
    function renderizarCarteirasDash(carteiras) {
        const grid = document.getElementById('dashCarteirasGrid');
        const vazio = document.getElementById('dashCarteirasVazio');
        const count = document.getElementById('dashCarteirasCount');
        if (!grid) return;

        // 🔑 Filtra só as carteiras que ainda têm fila (não concluídas)
        const ativas = carteiras.filter(c => {
            const fila = (c.corretores || []).reduce((a, x) => a + (x.fila || 0), 0);
            return fila > 0;
        });

        if (count) count.textContent = ativas.length;

        if (!ativas.length) {
            grid.innerHTML = '';
            if (vazio) vazio.style.display = 'block';
            return;
        }

        if (vazio) vazio.style.display = 'none';

        grid.innerHTML = ativas.map(c => {
            const trabalhados = (c.corretores || []).reduce((a, x) => a + (x.qualificou || 0), 0);
            const total = c.total || 0;
            const pct = total > 0 ? Math.round((trabalhados / total) * 100) : 0;

            const avatares = (c.corretores || []).slice(0, 5).map(cor => `
                <div class="corretor-avatar" title="${escapeHtml(cor.nome)}">${iniciais(cor.nome)}</div>
            `).join('');

            const mais = (c.corretores || []).length > 5
                ? `<div class="dash-carteira-mais">+${c.corretores.length - 5}</div>`
                : '';

            return `
                <article class="dash-carteira-card" data-lista-id="${c.lista_id}">
                    <div class="dash-carteira-head">
                        <div class="dash-carteira-head-left">
                            <div class="dash-carteira-icon">
                                <i class="fas fa-folder-open"></i>
                            </div>
                            <div style="min-width: 0;">
                                <div class="dash-carteira-name">${escapeHtml(c.nome)}</div>
                                <div class="dash-carteira-meta">
                                    <i class="fas fa-users"></i>
                                    ${total.toLocaleString('pt-BR')} contatos
                                </div>
                            </div>
                        </div>
                        <span class="dash-carteira-badge ativa">Ativa</span>
                    </div>

                    <div class="dash-carteira-stats">
                        <div class="dash-carteira-stat">
                            <div class="num">${total.toLocaleString('pt-BR')}</div>
                            <div class="lbl">Total</div>
                        </div>
                        <div class="dash-carteira-stat">
                            <div class="num">${trabalhados.toLocaleString('pt-BR')}</div>
                            <div class="lbl">Trabalhados</div>
                        </div>
                        <div class="dash-carteira-stat text-end">
                            <div class="num" style="color:${pct === 100 ? '#16a34a' : pct >= 50 ? '#3b82f6' : '#f59e0b'};">${pct}%</div>
                            <div class="lbl">Progresso</div>
                        </div>
                    </div>

                    <div class="dash-carteira-progress">
                        <span style="width:${pct}%"></span>
                    </div>

                    <div class="dash-carteira-corretores">
                        <div class="dash-carteira-avatares">
                            ${avatares}
                            ${mais}
                        </div>
                        <span class="dash-carteira-total-corretores">${(c.corretores || []).length} corretores</span>
                    </div>
                </article>
            `;
        }).join('');

        // Clique no card → abre o modal de detalhe da carteira
        grid.querySelectorAll('.dash-carteira-card').forEach(card => {
            card.addEventListener('click', () => {
                const listaId = Number(card.dataset.listaId);
                if (typeof abrirDetalheCarteira === 'function') {
                    abrirDetalheCarteira(listaId, carteiras);
                }
            });
        });
    }

    /* =========================================================
       Modal de TAG (drill-down do donut)
       ========================================================= */
    async function abrirModalTagDash(chave, label) {
        const modalTag = document.getElementById('modalTag');
        const modalTagTitulo = document.getElementById('modalTagTitulo');
        const modalTagInfo = document.getElementById('modalTagInfo');
        const modalTagTbody = document.getElementById('modalTagTbody');
        const modalTagVazio = document.getElementById('modalTagVazio');
        const modalTagBusca = document.getElementById('modalTagBusca');
        const modalTagDe = document.getElementById('modalTagDe');
        const modalTagAte = document.getElementById('modalTagAte');

        if (!modalTag) {
            console.warn('[modal-tag] modal não encontrado');
            return;
        }

        filtroTagAtual = { chave, label, busca: '', de: '', ate: '' };
        window.leadsTagAtuais = [];

        if (modalTagTitulo) modalTagTitulo.textContent = label;
        if (modalTagInfo) modalTagInfo.textContent = 'Carregando...';
        if (modalTagTbody) modalTagTbody.innerHTML = '';
        if (modalTagVazio) modalTagVazio.style.display = 'none';
        if (modalTagBusca) modalTagBusca.value = '';
        if (modalTagDe) modalTagDe.value = '';
        if (modalTagAte) modalTagAte.value = '';

        modalTag.style.display = 'flex';

        await carregarLeadsDaTagDash();
    }

    async function carregarLeadsDaTagDash() {
        if (!filtroTagAtual || !filtroTagAtual.chave) return;

        const modalTagInfo = document.getElementById('modalTagInfo');
        const modalTagTbody = document.getElementById('modalTagTbody');
        const modalTagVazio = document.getElementById('modalTagVazio');

        if (modalTagInfo) modalTagInfo.textContent = 'Carregando...';

        try {
            const params = new URLSearchParams();
            if (filtroTagAtual.de)  params.set('de', filtroTagAtual.de);
            if (filtroTagAtual.ate) params.set('ate', filtroTagAtual.ate);

            const selCorretor = document.getElementById('filtroCorretorDonut');
            const selCarteira = document.getElementById('filtroCarteiraDonut');
            if (selCorretor && selCorretor.value) params.set('corretor_id', selCorretor.value);
            if (selCarteira && selCarteira.value) params.set('lista_id', selCarteira.value);

            const qs = params.toString();
            const url = '/api/admin/dashboard/tag/' + encodeURIComponent(filtroTagAtual.chave) + (qs ? '?' + qs : '');

            const { leads } = await ApiClient.get(url);
            window.leadsTagAtuais = leads || [];

            renderizarLeadsTagDash();

        } catch (err) {
            console.error('[modal-tag] erro:', err);
            if (modalTagInfo) modalTagInfo.textContent = 'Erro ao carregar.';
            if (modalTagTbody) modalTagTbody.innerHTML = '';
            if (modalTagVazio) modalTagVazio.style.display = 'block';
        }
    }

    function renderizarLeadsTagDash() {
        const modalTagInfo = document.getElementById('modalTagInfo');
        const modalTagTbody = document.getElementById('modalTagTbody');
        const modalTagVazio = document.getElementById('modalTagVazio');

        const busca = (filtroTagAtual?.busca || '').trim().toLowerCase();
        let lista = window.leadsTagAtuais || [];

        if (busca) {
            lista = lista.filter(l => {
                const nome = (l.nome || '').toLowerCase();
                const tel = String(l.telefone || '');
                const cor = (l.corretor_nome || '').toLowerCase();
                return nome.includes(busca) || tel.includes(busca) || cor.includes(busca);
            });
        }

        if (modalTagInfo) {
            modalTagInfo.textContent = lista.length + ' ' + (lista.length === 1 ? 'cliente' : 'clientes');
        }

        if (!lista.length) {
            if (modalTagTbody) modalTagTbody.innerHTML = '';
            if (modalTagVazio) modalTagVazio.style.display = 'block';
            return;
        }

        if (modalTagVazio) modalTagVazio.style.display = 'none';

        if (modalTagTbody) {
            modalTagTbody.innerHTML = lista.map(l => {
                let dataStr = '—';
                if (l.decidido_em) {
                    const parsed = typeof parseDataSegura === 'function' ? parseDataSegura(l.decidido_em) : new Date(l.decidido_em);
                    if (parsed && !isNaN(parsed.getTime())) {
                        dataStr = parsed.toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        });
                    }
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
    }

    /* =========================================================
       Filtros do donut — Custom Select
       ========================================================= */
    function popularFiltrosDonut() {
        const inputCorretor = document.getElementById('filtroCorretorDonut');
        const inputCarteira = document.getElementById('filtroCarteiraDonut');
        const menuCorretor  = document.getElementById('menuCorretorDonut');
        const menuCarteira  = document.getElementById('menuCarteiraDonut');
        const textCorretor  = document.getElementById('textCorretorDonut');
        const textCarteira  = document.getElementById('textCarteiraDonut');

        if (!menuCorretor || !menuCarteira) return;

        const valorCorretor = inputCorretor ? inputCorretor.value : '';
        const valorCarteira = inputCarteira ? inputCarteira.value : '';

        // Menu de corretores
        let htmlCorretor = `
            <button type="button"
                    class="dash-custom-option ${!valorCorretor ? 'selected' : ''}"
                    data-value="">
                <span class="opt-text">Todos os corretores</span>
                <i class="fas fa-check opt-check"></i>
            </button>
        `;

        if (corretoresResumoDash.length) {
            htmlCorretor += '<div class="dash-custom-divider"></div>';
            htmlCorretor += corretoresResumoDash.map(c => `
                <button type="button"
                        class="dash-custom-option ${String(c.id) === String(valorCorretor) ? 'selected' : ''}"
                        data-value="${c.id}">
                    <span class="opt-text">${escapeHtml(c.nome)}</span>
                    <i class="fas fa-check opt-check"></i>
                </button>
            `).join('');
        }

        menuCorretor.innerHTML = '<div class="dash-custom-scroll">' + htmlCorretor + '</div>';


        // Menu de carteiras
        let htmlCarteira = `
            <button type="button"
                    class="dash-custom-option ${!valorCarteira ? 'selected' : ''}"
                    data-value="">
                <span class="opt-text">Todas as carteiras</span>
                <i class="fas fa-check opt-check"></i>
            </button>
        `;

        if (carteirasDash.length) {
            htmlCarteira += '<div class="dash-custom-divider"></div>';
            htmlCarteira += carteirasDash.map(c => `
                <button type="button"
                        class="dash-custom-option ${String(c.lista_id) === String(valorCarteira) ? 'selected' : ''}"
                        data-value="${c.lista_id}">
                    <span class="opt-text">${escapeHtml(c.nome)}</span>
                    <i class="fas fa-check opt-check"></i>
                </button>
            `).join('');
        }

        menuCarteira.innerHTML = '<div class="dash-custom-scroll">' + htmlCarteira + '</div>';


        // Textos do trigger
        if (textCorretor) {
            const cor = corretoresResumoDash.find(c => String(c.id) === String(valorCorretor));
            textCorretor.textContent = cor ? cor.nome : 'Todos os corretores';
        }

        if (textCarteira) {
            const cart = carteirasDash.find(c => String(c.lista_id) === String(valorCarteira));
            textCarteira.textContent = cart ? cart.nome : 'Todas as carteiras';
        }

        // Listeners das opções de corretor
        menuCorretor.querySelectorAll('.dash-custom-option').forEach(opc => {
            opc.addEventListener('click', () => {
                if (inputCorretor) inputCorretor.value = opc.dataset.value || '';
                fecharCustomSelectsDonut();
                popularFiltrosDonut();
                recarregarDonutComFiltros();
            });
        });

        // Listeners das opções de carteira
        menuCarteira.querySelectorAll('.dash-custom-option').forEach(opc => {
            opc.addEventListener('click', () => {
                if (inputCarteira) inputCarteira.value = opc.dataset.value || '';
                fecharCustomSelectsDonut();
                popularFiltrosDonut();
                recarregarDonutComFiltros();
            });
        });
    }

    function abrirCustomSelectDonut(triggerId, menuId) {
        const trigger = document.getElementById(triggerId);
        const menu = document.getElementById(menuId);
        if (!trigger || !menu) return;

        // Fecha outros
        document.querySelectorAll('.dash-custom-menu.open').forEach(m => {
            if (m !== menu) m.classList.remove('open');
        });
        document.querySelectorAll('.dash-custom-trigger.open').forEach(t => {
            if (t !== trigger) t.classList.remove('open');
        });

        menu.classList.add('open');
        trigger.classList.add('open');
    }

    function fecharCustomSelectsDonut() {
        document.querySelectorAll('.dash-custom-menu.open').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.dash-custom-trigger.open').forEach(t => t.classList.remove('open'));
    }

    async function recarregarDonutComFiltros() {
        const inputCorretor = document.getElementById('filtroCorretorDonut');
        const inputCarteira = document.getElementById('filtroCarteiraDonut');
        const btnLimpar     = document.getElementById('btnLimparFiltrosDonut');

        const corretorId = inputCorretor ? inputCorretor.value : '';
        const listaId    = inputCarteira ? inputCarteira.value : '';

        if (btnLimpar) {
            btnLimpar.style.display = (corretorId || listaId) ? 'inline-flex' : 'none';
        }

        try {
            const params = new URLSearchParams();
            if (corretorId) params.set('corretor_id', corretorId);
            if (listaId)    params.set('lista_id', listaId);

            const qs = params.toString();
            const url = '/api/admin/dashboard/graficos' + (qs ? '?' + qs : '');

            const dados = await ApiClient.get(url);
            renderizarDonutDash(dados.donut);

        } catch (err) {
            console.error('[donut-filtros] erro:', err);
        }
    }

    /* =========================================================
       Init — puxa dados reais
       ========================================================= */
    async function initDashboardV2() {
        try {
            // 1. KPIs + progresso
            const kpis = await ApiClient.get('/api/admin/dashboard');
            renderizarKpisDash(kpis);

            // 2. Gráficos (linha + donut)
            const graficos = await ApiClient.get('/api/admin/dashboard/graficos');
            renderizarTrendDash(graficos.linha);
            renderizarDonutDash(graficos.donut);

            // 3. Corretores + carteiras
            const { corretoresResumo, carteiras } = await ApiClient.get('/api/admin/dashboard/carteiras');
            corretoresResumoDash = corretoresResumo || [];
            carteirasDash = carteiras || [];

            renderizarCorretoresDash(corretoresResumoDash, filtroStatusCorretores);
            renderizarCarteirasDash(carteirasDash);

            popularFiltrosDonut();


        } catch (err) {
            console.error('[dashboard v2] erro ao carregar:', err);
            if (typeof mostrarToast === 'function') {
                mostrarToast('Erro ao carregar dashboard.', 'error');
            }
        }
    }

    // Listeners dos chips de status (corretores)
    document.querySelectorAll('.dash-chip[data-status]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.dash-chip[data-status]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filtroStatusCorretores = chip.dataset.status;
            renderizarCorretoresDash(corretoresResumoDash, filtroStatusCorretores);
        });
    });

    // Listeners do modal de tag (busca + filtros de data)
    (function setupModalTagDash() {
        const modalTag = document.getElementById('modalTag');
        const btnFechar = document.getElementById('btnFecharModalTag');
        const btnLimpar = document.getElementById('btnLimparFiltroTag');
        const modalTagBusca = document.getElementById('modalTagBusca');
        const modalTagDe = document.getElementById('modalTagDe');
        const modalTagAte = document.getElementById('modalTagAte');

        if (btnFechar) {
            btnFechar.addEventListener('click', () => {
                if (modalTag) modalTag.style.display = 'none';
                filtroTagAtual = null;
            });
        }

        if (modalTag) {
            modalTag.addEventListener('click', (e) => {
                if (e.target === modalTag) {
                    modalTag.style.display = 'none';
                    filtroTagAtual = null;
                }
            });
        }

        if (modalTagBusca) {
            modalTagBusca.addEventListener('input', () => {
                if (filtroTagAtual) filtroTagAtual.busca = modalTagBusca.value;
                renderizarLeadsTagDash();
            });
        }

        if (modalTagDe) {
            modalTagDe.addEventListener('change', async () => {
                if (filtroTagAtual) filtroTagAtual.de = modalTagDe.value;
                await carregarLeadsDaTagDash();
            });
        }

        if (modalTagAte) {
            modalTagAte.addEventListener('change', async () => {
                if (filtroTagAtual) filtroTagAtual.ate = modalTagAte.value;
                await carregarLeadsDaTagDash();
            });
        }

        if (btnLimpar) {
            btnLimpar.addEventListener('click', async () => {
                if (filtroTagAtual) {
                    filtroTagAtual.busca = '';
                    filtroTagAtual.de = '';
                    filtroTagAtual.ate = '';
                }
                if (modalTagBusca) modalTagBusca.value = '';
                if (modalTagDe) modalTagDe.value = '';
                if (modalTagAte) modalTagAte.value = '';
                await carregarLeadsDaTagDash();
            });
        }
    })();

(function setupFiltrosDonut() {
        const triggerCorretor = document.getElementById('triggerCorretorDonut');
        const triggerCarteira = document.getElementById('triggerCarteiraDonut');
        const btnLimpar       = document.getElementById('btnLimparFiltrosDonut');

        // Abrir/fechar menu do corretor
        if (triggerCorretor) {
            triggerCorretor.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('menuCorretorDonut');
                const aberto = menu && menu.classList.contains('open');
                if (aberto) {
                    fecharCustomSelectsDonut();
                } else {
                    abrirCustomSelectDonut('triggerCorretorDonut', 'menuCorretorDonut');
                }
            });
        }

        // Abrir/fechar menu da carteira
        if (triggerCarteira) {
            triggerCarteira.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('menuCarteiraDonut');
                const aberto = menu && menu.classList.contains('open');
                if (aberto) {
                    fecharCustomSelectsDonut();
                } else {
                    abrirCustomSelectDonut('triggerCarteiraDonut', 'menuCarteiraDonut');
                }
            });
        }

        // Fecha ao clicar fora
        document.addEventListener('click', (e) => {
            const dentro =
                e.target.closest('#customCorretorDonut') ||
                e.target.closest('#customCarteiraDonut');
            if (!dentro) fecharCustomSelectsDonut();
        });

        // Fecha com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') fecharCustomSelectsDonut();
        });

        // Limpar
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => {
                const inputCorretor = document.getElementById('filtroCorretorDonut');
                const inputCarteira = document.getElementById('filtroCarteiraDonut');
                if (inputCorretor) inputCorretor.value = '';
                if (inputCarteira) inputCarteira.value = '';
                popularFiltrosDonut();
                recarregarDonutComFiltros();
            });
        }
    })();

    init();

});