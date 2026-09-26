/* =========================================================
   ADMIN.JS — Painel do Administrador (integrado com API)
   Depende de: api-client.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    let listaSelecionadaAtual = null;
    let todosContatosDaLista = [];
    let confirmCallback = null;
    let toastTimer = null;

    /* =========================================================
       ELEMENTOS — HEADER
       ========================================================= */
    const headerUserName = $('headerUserName');
    const btnLogout      = $('btnLogout');

    /* =========================================================
       ELEMENTOS — NAVEGAÇÃO
       ========================================================= */
    const navTabs   = document.querySelectorAll('.nav-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    /* =========================================================
       ELEMENTOS — DASHBOARD
       ========================================================= */
    const kpiListas            = $('kpiListas');
    const kpiTotal             = $('kpiTotal');
    const kpiQualificados      = $('kpiQualificados');
    const kpiAguardando        = $('kpiAguardando');
    const corretoresCarteira   = $('corretoresCarteira');
    const qualificacaoList     = $('qualificacaoList');
    const badgeTotalCorretores = $('badgeTotalCorretores');

    /* =========================================================
       ELEMENTOS — SUBIR LISTA
       ========================================================= */
    const modoBtns            = document.querySelectorAll('.modo-btn');
    const blocoArquivo        = $('blocoArquivo');
    const blocoTexto          = $('blocoTexto');
    const nomeListaInput      = $('nomeLista');
    const textoListaInput     = $('textoLista');
    const nomeListaError      = $('nomeListaError');
    const textoListaError     = $('textoListaError');
    const corretoresError     = $('corretoresError');
    const previewContatos     = $('previewContatos');
    const previewCount        = $('previewCount');
    const previewList         = $('previewList');
    const corretoresSelector  = $('corretoresSelector');
    const btnSubirLista       = $('btnSubirLista');
    const infoRoleta          = $('infoRoleta');

    const fileDrop            = $('fileDrop');
    const arquivoCsv          = $('arquivoCsv');
    const fileDropContent     = $('fileDropContent');
    const fileInfo            = $('fileInfo');
    const fileInfoNome        = $('fileInfoNome');
    const fileInfoTamanho     = $('fileInfoTamanho');
    const btnRemoverArquivo   = $('btnRemoverArquivo');
    const arquivoCsvError     = $('arquivoCsvError');

    /* =========================================================
       ELEMENTOS — LISTAS
       ========================================================= */
    const listasGrid       = $('listasGrid');
    const listasVazio      = $('listasVazio');
    const badgeTotalListas = $('badgeTotalListas');

    /* =========================================================
       ELEMENTOS — CORRETORES
       ========================================================= */
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

    /* =========================================================
       ELEMENTOS — MODAL LISTA
       ========================================================= */
    const modalLista          = $('modalLista');
    const modalListaNome      = $('modalListaNome');
    const modalListaInfo      = $('modalListaInfo');
    const btnFecharModalLista = $('btnFecharModalLista');
    const modalSearchContato  = $('modalSearchContato');
    const contatosTableBody   = $('contatosTableBody');
    const contatosVazio       = $('contatosVazio');
    const btnDeletarLista     = $('btnDeletarLista');

    /* =========================================================
       ELEMENTOS — MODAL CONFIRMAÇÃO
       ========================================================= */
    const modalConfirm     = $('modalConfirm');
    const confirmTitle     = $('confirmTitle');
    const confirmMessage   = $('confirmMessage');
    const btnFecharConfirm = $('btnFecharConfirm');
    const btnConfirmNao    = $('btnConfirmNao');
    const btnConfirmSim    = $('btnConfirmSim');

    /* =========================================================
       ELEMENTOS — TOAST
       ========================================================= */
    const toast = $('toast');

    /* =========================================================
       ESTADO
       ========================================================= */
    let modoAtual = 'arquivo';
    let contatosDoArquivo = [];

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
            .split(' ')
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

    function formatarTamanho(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

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

            renderizarCarteira(stats.porCorretor || []);
            renderizarSegmentacao(stats.porTag || {}, stats.totalContatos);

            if (badgeTotalCorretores) {
                badgeTotalCorretores.textContent = (stats.porCorretor || []).length;
            }

            adicionarSparklines();

        } catch (err) {
            console.error('[dashboard] erro:', err);
            mostrarToast('Erro ao carregar dashboard.', 'error');
        }
    }

    function renderizarCarteira(porCorretor) {
        if (!porCorretor.length) {
            corretoresCarteira.innerHTML = `
                <div class="empty-state small">
                    <i class="fas fa-users"></i>
                    <p>Nenhum corretor cadastrado ainda.</p>
                </div>
            `;
            return;
        }

        corretoresCarteira.innerHTML = porCorretor.map(c => {
            const pct = c.total > 0 ? Math.round((c.qualificados / c.total) * 100) : 0;
            return `
                <div class="corretor-carteira-item">
                    <div class="corretor-avatar">${iniciais(c.nome)}</div>
                    <div class="corretor-info">
                        <strong>${escapeHtml(c.nome)}</strong>
                        <small>@${escapeHtml(c.usuario)}</small>
                        <div class="corretor-progress">
                            <div class="corretor-progress-fill" style="width: ${pct}%"></div>
                        </div>
                    </div>
                    <div class="corretor-stats">
                        <div class="corretor-stat total">
                            <strong>${c.total}</strong>
                            <small>total</small>
                        </div>
                        <div class="corretor-stat qualif">
                            <strong>${c.qualificados || 0}</strong>
                            <small>qualif</small>
                        </div>
                        <div class="corretor-stat novos">
                            <strong>${c.aguardando || 0}</strong>
                            <small>fila</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderizarSegmentacao(porTag, totalGeral) {
        const tags = [
            { key: 'agendado',          label: 'Agendado',              cor: 'success' },
            { key: 'em_atendimento',    label: 'Em atendimento',        cor: 'success' },
            { key: 'retornar_depois',   label: 'Retornar depois',       cor: 'warning' },
            { key: 'sem_interesse',     label: 'Cliente sem interesse', cor: 'warning' },
            { key: 'mensagem_enviada',  label: 'Mensagem enviada',      cor: 'warning' },
            { key: 'sem_sucesso',       label: 'Contato sem sucesso',   cor: 'danger'  },
            { key: 'telefone_invalido', label: 'Telefone inexistente',  cor: 'danger'  },
            { key: 'nao_perturbe',      label: 'Não perturbe',          cor: 'danger'  }
        ];

        qualificacaoList.innerHTML = tags.map(t => {
            const count = porTag[t.key] || 0;
            const pct = totalGeral > 0 ? Math.round((count / totalGeral) * 100) : 0;
            const ringValue = Math.min(pct, 100);

            return `
                <div class="qualificacao-item">
                    <div class="qualificacao-ring ${t.cor}">
                        <svg viewBox="0 0 36 36">
                            <circle class="ring-bg" cx="18" cy="18" r="15"></circle>
                            <circle class="ring-fill" cx="18" cy="18" r="15"
                                    style="stroke-dasharray: ${ringValue} 100;"></circle>
                        </svg>
                        <span class="ring-label">${pct}%</span>
                    </div>
                    <div class="qualificacao-label">
                        <span>${t.label}</span>
                    </div>
                    <span class="qualificacao-count">${count}</span>
                </div>
            `;
        }).join('');
    }

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
       SUBIR LISTA — modo arquivo/texto
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

    /* Parse */
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

    /* Ler CSV */
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
                throw new Error('Nenhum contato válido encontrado. Confira as colunas nome, telefone.');
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
            return;
        }

        const marcados = Array.from(corretoresSelector.querySelectorAll('input:checked'))
            .map(i => Number(i.value));
        if (!marcados.length) {
            corretoresError.textContent = 'Selecione pelo menos 1 corretor.';
            corretoresError.classList.add('visible');
            return;
        }

        btnSubirLista.disabled = true;
        btnSubirLista.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Distribuindo...';

        try {
            const res = await ApiClient.post('/api/admin/listas', {
                nome,
                contatos,
                corretoresIds: marcados
            });

            mostrarToast(`✅ ${res.total} contatos distribuídos com sucesso!`, 'success');

            nomeListaInput.value = '';
            textoListaInput.value = '';
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

            renderizarContatosModal(todosContatosDaLista);

            modalSearchContato.value = '';
            modalLista.style.display = 'flex';

        } catch (err) {
            console.error('[modal-lista] erro:', err);
            mostrarToast('Erro ao abrir lista.', 'error');
        }
    }

    function renderizarContatosModal(contatos) {
        if (!contatos.length) {
            contatosTableBody.innerHTML = '';
            contatosVazio.style.display = 'block';
            return;
        }

        contatosVazio.style.display = 'none';

        contatosTableBody.innerHTML = contatos.map(c => {
            const statusClass = c.status || 'novo';
            const nomeCorretor = c.corretor_nome || '—';

            return `
                <tr>
                    <td class="col-name">${escapeHtml(c.nome)}</td>
                    <td class="col-phone">${escapeHtml(formatarTelefone(c.telefone))}</td>
                    <td>${escapeHtml(nomeCorretor)}</td>
                    <td>
                        <span class="tag-status ${statusClass}">
                            ${statusClass === 'novo' ? 'Novo' :
                              statusClass === 'qualificado' ? 'Qualificado' : 'Descartado'}
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

        contatosTableBody.querySelectorAll('.btn-row-delete').forEach(btn => {
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
                            renderizarContatosModal(todosContatosDaLista);
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
            const termo = modalSearchContato.value.trim().toLowerCase();
            if (!termo) {
                renderizarContatosModal(todosContatosDaLista);
                return;
            }

            const filtrados = todosContatosDaLista.filter(c =>
                c.nome.toLowerCase().includes(termo) ||
                String(c.telefone).includes(termo)
            );
            renderizarContatosModal(filtrados);
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
       HEADER — LOGOUT
       ========================================================= */
    if (headerUserName) {
        const nome = localStorage.getItem('sr_usuario') || 'Administrador';
        headerUserName.textContent = nome.split(' ')[0];
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            ApiClient.logout();
        });
    }

    /* Fechar modais com ESC */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modalLista.style.display = 'none';
            modalConfirm.style.display = 'none';
        }
    });

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

        console.log('[admin] Sistema pronto.');
    }

    init();

});