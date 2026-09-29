/* =========================================================
   ADMIN.JS — Painel Admin (com polling e carteiras)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    let listaSelecionadaAtual = null;
    let todosContatosDaLista = [];
    let confirmCallback = null;
    let toastTimer = null;
    let pollingTimer = null;

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

    // Modal confirmação
    const modalConfirm     = $('modalConfirm');
    const confirmTitle     = $('confirmTitle');
    const confirmMessage   = $('confirmMessage');
    const btnFecharConfirm = $('btnFecharConfirm');
    const btnConfirmNao    = $('btnConfirmNao');
    const btnConfirmSim    = $('btnConfirmSim');

    // Mensagem WhatsApp
    const mensagemWhatsappInput = $('mensagemWhatsapp');

    // Toast
    const toast = $('toast');

    /* =========================================================
       ESTADO
       ========================================================= */
    let modoAtual = 'arquivo';
    let contatosDoArquivo = [];
    let enviandoLista = false;

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
            if (alvo === 'upload')     renderizarSeletorCorretores();
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

        corretoresCarteira.innerHTML = corretores.map(c => {
            const statusLabel = {
                online:  'Online agora',
                ausente: 'Ausente',
                offline: c.ultimo_acesso
                    ? `Último acesso: ${formatarUltimoAcesso(c.ultimo_acesso)}`
                    : 'Nunca acessou'
            }[c.status];

            return `
                <div class="corretor-carteira-item">
                    <div class="corretor-avatar">
                        ${iniciais(c.nome)}
                        <span class="corretor-avatar-status ${c.status}"></span>
                    </div>
                    <div class="corretor-info">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>@${escapeHtml(c.usuario)}</small>
                        <span class="corretor-status-text ${c.status}">
                            <i class="fas fa-circle"></i>
                            ${escapeHtml(statusLabel)}
                        </span>
                    </div>
                    <div class="corretor-stats">
                        <div class="corretor-stat total">
                            <strong>${c.total_carteira}</strong>
                            <small>total</small>
                        </div>
                        <div class="corretor-stat qualif">
                            <strong>${c.total_qualificados}</strong>
                            <small>qualif</small>
                        </div>
                        <div class="corretor-stat novos">
                            <strong>${c.total_fila}</strong>
                            <small>fila</small>
                        </div>
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

        carteirasGrid.innerHTML = carteiras.map(c => {
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
            <div class="carteira-detalhe-lista">
                ${carteira.corretores.map(cor => `
                    <div class="carteira-detalhe-item">
                        <div class="corretor-avatar">${iniciais(cor.nome)}</div>
                        <div class="carteira-detalhe-info">
                            <strong>${escapeHtml(cor.nome)}</strong>
                            <small>@${escapeHtml(cor.usuario)}</small>
                        </div>
                        <div class="carteira-detalhe-stats">
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
        `;

        modalLista.style.display = 'flex';
    }

    /* =========================================================
       POLLING (atualiza dashboard a cada 60s)
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
       SPARKLINES (KPIs)
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
       SUBIR LISTA — Modo arquivo/texto
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

            const marcadosAntes = new Set(
                Array.from(corretoresSelector.querySelectorAll('input:checked'))
                    .map(i => i.value)
            );

            corretoresSelector.innerHTML = corretores.map(c => `
                <label class="corretor-check">
                    <input type="checkbox" value="${c.id}"
                        ${marcadosAntes.size === 0 || marcadosAntes.has(String(c.id)) ? 'checked' : ''}>
                    <span class="check-box"><i class="fas fa-check"></i></span>
                    <span class="corretor-check-info">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>@${escapeHtml(c.usuario)}</small>
                    </span>
                </label>
            `).join('');

            corretoresSelector.querySelectorAll('input[type="checkbox"]')
                .forEach(chk => chk.addEventListener('change', atualizarPreviewRoleta));

            atualizarPreviewRoleta();

        } catch (err) {
            console.error('[seletor] erro:', err);
        }
    }

    async function atualizarPreviewRoleta() {
        const contatos = obterContatosAtuais();
        const marcados = Array.from(corretoresSelector.querySelectorAll('input:checked'))
            .map(i => Number(i.value));

        if (!contatos.length || !marcados.length) {
            infoRoleta.innerHTML = `
                <div class="info-empty">
                    <i class="fas fa-chart-pie"></i>
                    <p>Envie os contatos e selecione os corretores para ver como será a distribuição.</p>
                </div>
            `;
            return;
        }

        try {
            const { corretores } = await ApiClient.get('/api/admin/corretores');
            const selecionados = corretores.filter(c => marcados.includes(c.id));

            const distribuicao = {};
            selecionados.forEach(c => distribuicao[c.id] = 0);
            for (let i = 0; i < contatos.length; i++) {
                const c = selecionados[i % selecionados.length];
                distribuicao[c.id]++;
            }

            infoRoleta.innerHTML = `
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
                    <strong>${contatos.length}</strong> contatos serão distribuídos entre
                    <strong>${selecionados.length}</strong> ${selecionados.length === 1 ? 'corretor' : 'corretores'},
                    de forma equilibrada e aleatória.
                </div>
            `;

        } catch (err) {
            console.error('[roleta] erro:', err);
        }
    }

    async function handleSubirLista() {
        if (enviandoLista) return;
        enviandoLista = true;

        [nomeListaError, textoListaError, corretoresError, arquivoCsvError].forEach(e => {
            e.textContent = '';
            e.classList.remove('visible');
        });
        nomeListaInput.classList.remove('error');
        textoListaInput.classList.remove('error');

        const nome = nomeListaInput.value.trim();
        if (!nome) {
            nomeListaError.textContent = 'Informe um nome pra lista.';
            nomeListaError.classList.add('visible');
            nomeListaInput.classList.add('error');
            enviandoLista = false;
            return;
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
        btnSubirLista.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Distribuindo...';

        try {
            const mensagemWhatsapp = mensagemWhatsappInput ? mensagemWhatsappInput.value.trim() : '';

            const res = await ApiClient.post('/api/admin/listas', {
                nome,
                contatos,
                corretoresIds: marcados,
                mensagemWhatsapp: mensagemWhatsapp || null
            });

            mostrarToast(`✅ ${res.total} contatos distribuídos com sucesso!`, 'success');

            nomeListaInput.value = '';
            textoListaInput.value = '';
            if (mensagemWhatsappInput) mensagemWhatsappInput.value = '';
            limparArquivo();
            previewContatos.style.display = 'none';
            infoRoleta.innerHTML = `
                <div class="info-empty">
                    <i class="fas fa-chart-pie"></i>
                    <p>Envie os contatos e selecione os corretores para ver como será a distribuição.</p>
                </div>
            `;

            setTimeout(() => {
                document.querySelector('.nav-tab[data-tab="listas"]').click();
            }, 500);

        } catch (err) {
            mostrarToast(err.message || 'Erro ao distribuir.', 'error');
        } finally {
            btnSubirLista.disabled = false;
            btnSubirLista.innerHTML = '<i class="fas fa-check"></i> Subir e distribuir';
            enviandoLista = false;
        }
    }

    if (textoListaInput) textoListaInput.addEventListener('input', atualizarPreview);
    if (btnSubirLista)    btnSubirLista.addEventListener('click', handleSubirLista);

    /* =========================================================
       LISTAS (aba padrão — tabela de contatos)
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
       MODAL LISTA — modo "tabela de contatos"
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

        // Esconde modal da lista, abre o de gerenciar
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

            // 🔄 Recarrega o modal (sem fechar)
            await carregarGerenciarLista();

            // Atualiza listagens em background
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
                return `
                    <div class="corretor-item">
                        <div class="corretor-avatar">${iniciais(c.nome)}</div>
                        <div class="corretor-info">
                            <strong>${escapeHtml(c.nome)}</strong>
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

            corretoresList.querySelectorAll('.btn-corretor-delete').forEach(btn => {
                btn.addEventListener('click', () => {
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
       HEADER — NOME DO USUÁRIO
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

        // Botão de gerenciar corretores
        if (btnGerenciarCorretores) btnGerenciarCorretores.addEventListener('click', abrirGerenciarCorretores);
        if (btnFecharGerenciar)     btnFecharGerenciar.addEventListener('click', fecharGerenciar);
        if (btnCancelarGerenciar)   btnCancelarGerenciar.addEventListener('click', fecharGerenciar);
        if (btnSalvarGerenciar)     btnSalvarGerenciar.addEventListener('click', salvarGerenciarCorretores);
        if (modalGerenciar) {
            modalGerenciar.addEventListener('click', (e) => {
                if (e.target === modalGerenciar) fecharGerenciar();
            });
        }

        // Botões de variáveis de mensagem WhatsApp
        document.querySelectorAll('.variavel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!mensagemWhatsappInput) return;

                const variavel = btn.dataset.var;
                const textarea = mensagemWhatsappInput;

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
                if (modalLista)      modalLista.style.display = 'none';
                if (modalConfirm)    modalConfirm.style.display = 'none';
                if (modalGerenciar)  modalGerenciar.style.display = 'none';
            }
        });

        // Inicia o polling do dashboard
        iniciarPolling();

        console.log('[admin] Sistema pronto (com polling de 60s).');
    }

    init();

});