/* =========================================================
   EMPREENDIMENTOS — Vitrine do Corretor
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    /* =========================================================
       ESTADO
       ========================================================= */

    let todosEmpreendimentos = [];
    let empreendimentoAtual = null;

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const headerUserName      = $('headerUserName');
    const empTotalCount       = $('empTotalCount');
    const empBusca            = $('empBusca');
    const empFiltroConstrutora = $('empFiltroConstrutora');
    const empFiltroCidade     = $('empFiltroCidade');
    const empLimparFiltros    = $('empLimparFiltros');
    const empGridVitrine      = $('empGridVitrine');
    const empLoading          = $('empLoading');
    const empVazio            = $('empVazio');
    const empVazioMensagem    = $('empVazioMensagem');

    // Modal de detalhes
    const modalEmpCorretor    = $('modalEmpCorretor');
    const empDetalheNome      = $('empDetalheNome');
    const empDetalheConstrutora = $('empDetalheConstrutora');
    const empDetalheCapa      = $('empDetalheCapa');
    const empDetalheCapaWrap  = $('empDetalheCapaWrap');
    const empDetalheCapaVazia = $('empDetalheCapaVazia');
    const empDetalheChips     = $('empDetalheChips');
    const empDetalheLocalSeccao = $('empDetalheLocalSeccao');
    const empDetalheLocal     = $('empDetalheLocal');
    const empDetalheDescricaoSeccao = $('empDetalheDescricaoSeccao');
    const empDetalheDescricao = $('empDetalheDescricao');
    const empDetalheComodidadesSeccao = $('empDetalheComodidadesSeccao');
    const empDetalheComodidades = $('empDetalheComodidades');
    const btnAbrirBook        = $('btnAbrirBook');
    const btnFecharDetalheEmp = $('btnFecharDetalheEmp');
    const btnFecharDetalheEmpFooter = $('btnFecharDetalheEmpFooter');
    const toast               = $('toast');

    /* =========================================================
       TOAST
       ========================================================= */

    let toastTimer = null;
    function mostrarToast(msg, tipo = 'info') {
        if (!toast) return;
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

    /* =========================================================
       HEADER
       ========================================================= */

    if (headerUserName) {
        const nome = localStorage.getItem('sr_usuario') || 'Corretor';
        headerUserName.textContent = nome.split(' ')[0];
    }

    /* =========================================================
       CARREGAR EMPREENDIMENTOS
       ========================================================= */

    async function carregarEmpreendimentos() {
        try {
            empLoading.style.display = 'block';
            empVazio.style.display = 'none';

            const { empreendimentos } = await ApiClient.get('/api/corretor/empreendimentos');

            todosEmpreendimentos = empreendimentos || [];

            empLoading.style.display = 'none';

            if (!todosEmpreendimentos.length) {
                empGridVitrine.innerHTML = '';
                empVazio.style.display = 'block';
                empVazioMensagem.textContent = 'Aguarde novos lançamentos serem publicados.';
                empTotalCount.textContent = '0';
                return;
            }

            popularFiltrosDinamicos();
            renderizarEmpreendimentos(todosEmpreendimentos);

        } catch (err) {
            console.error('[empreendimentos] erro:', err);
            empLoading.style.display = 'none';
            empVazio.style.display = 'block';
            empVazioMensagem.textContent = 'Erro ao carregar empreendimentos. Tente novamente.';
            mostrarToast('Erro ao carregar empreendimentos.', 'error');
        }
    }

    /* =========================================================
       POPULAR FILTROS (construtoras e cidades únicas)
       ========================================================= */

    function popularFiltrosDinamicos() {
        // Construtoras únicas
        const construtoras = [...new Set(
            todosEmpreendimentos
                .map(e => (e.construtora || '').trim())
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        empFiltroConstrutora.innerHTML = '<option value="">Todas as construtoras</option>' +
            construtoras.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

        // Cidades únicas
        const cidades = [...new Set(
            todosEmpreendimentos
                .map(e => (e.cidade || '').trim())
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        empFiltroCidade.innerHTML = '<option value="">Todas as cidades</option>' +
            cidades.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    /* =========================================================
       RENDERIZAR GRID
       ========================================================= */

    function renderizarEmpreendimentos(lista) {
        empTotalCount.textContent = lista.length;

        if (!lista.length) {
            empGridVitrine.innerHTML = '';
            empVazio.style.display = 'block';
            empVazioMensagem.textContent = 'Nenhum empreendimento corresponde aos filtros.';
            return;
        }

        empVazio.style.display = 'none';

        empGridVitrine.innerHTML = lista.map(e => {
            const quartos = e.dormitorios
                ? `<span class="emp-vitrine-chip"><i class="fas fa-bed"></i> ${escapeHtml(e.dormitorios)}</span>`
                : '';
            const metragem = e.metragens
                ? `<span class="emp-vitrine-chip"><i class="fas fa-ruler-combined"></i> ${escapeHtml(e.metragens)}</span>`
                : '';
            const vagas = e.vagas
                ? `<span class="emp-vitrine-chip"><i class="fas fa-car"></i> ${escapeHtml(e.vagas)}</span>`
                : '';

            return `
                <article class="emp-vitrine-card" data-id="${e.id}">
                    <div class="emp-vitrine-cover">
                        ${e.capa_url
                            ? `<img src="${e.capa_url}" alt="${escapeHtml(e.nome)}" loading="lazy">`
                            : `<i class="fas fa-building placeholder-icon"></i>`
                        }
                    </div>
                    <div class="emp-vitrine-body">
                        <h3 class="emp-vitrine-nome">${escapeHtml(e.nome)}</h3>

                        ${e.construtora ? `
                            <div class="emp-vitrine-info">
                                <i class="fas fa-industry"></i>
                                ${escapeHtml(e.construtora)}
                            </div>
                        ` : ''}

                        ${(e.cidade || e.estado) ? `
                            <div class="emp-vitrine-info">
                                <i class="fas fa-map-marker-alt"></i>
                                ${escapeHtml([e.cidade, e.estado].filter(Boolean).join('/'))}
                            </div>
                        ` : ''}

                        ${(quartos || metragem || vagas) ? `
                            <div class="emp-vitrine-chips">
                                ${quartos}
                                ${metragem}
                                ${vagas}
                            </div>
                        ` : ''}

                        ${e.descricao ? `
                            <p class="emp-vitrine-desc">${escapeHtml(e.descricao)}</p>
                        ` : ''}

                        <span class="emp-vitrine-book">
                            <i class="fas fa-file-pdf"></i>
                            Ver detalhes
                        </span>
                    </div>
                </article>
            `;
        }).join('');

        // Listeners dos cards
        empGridVitrine.querySelectorAll('.emp-vitrine-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = Number(card.dataset.id);
                const emp = todosEmpreendimentos.find(e => e.id === id);
                if (emp) abrirDetalhesEmp(emp);
            });
        });
    }

    /* =========================================================
       FILTROS
       ========================================================= */

    function aplicarFiltros() {
        const busca = (empBusca?.value || '').trim().toLowerCase();
        const construtora = empFiltroConstrutora?.value || '';
        const cidade = empFiltroCidade?.value || '';

        let filtrados = todosEmpreendimentos;

        if (busca) {
            filtrados = filtrados.filter(e =>
                (e.nome || '').toLowerCase().includes(busca) ||
                (e.construtora || '').toLowerCase().includes(busca)
            );
        }

        if (construtora) {
            filtrados = filtrados.filter(e => (e.construtora || '') === construtora);
        }

        if (cidade) {
            filtrados = filtrados.filter(e => (e.cidade || '') === cidade);
        }

        // Mostra botão limpar se algum filtro estiver ativo
        const temFiltro = busca || construtora || cidade;
        if (empLimparFiltros) {
            empLimparFiltros.style.display = temFiltro ? 'inline-flex' : 'none';
        }

        renderizarEmpreendimentos(filtrados);
    }

    if (empBusca) empBusca.addEventListener('input', aplicarFiltros);
    if (empFiltroConstrutora) empFiltroConstrutora.addEventListener('change', aplicarFiltros);
    if (empFiltroCidade) empFiltroCidade.addEventListener('change', aplicarFiltros);

    if (empLimparFiltros) {
        empLimparFiltros.addEventListener('click', () => {
            empBusca.value = '';
            empFiltroConstrutora.value = '';
            empFiltroCidade.value = '';
            aplicarFiltros();
        });
    }

    /* =========================================================
       MODAL DE DETALHES
       ========================================================= */

    function abrirDetalhesEmp(emp) {
        empreendimentoAtual = emp;

        // Header
        empDetalheNome.textContent = emp.nome || '—';
        empDetalheConstrutora.innerHTML = emp.construtora
            ? `<i class="fas fa-industry"></i> ${escapeHtml(emp.construtora)}`
            : '';

        // Capa
        if (emp.capa_url) {
            empDetalheCapa.src = emp.capa_url;
            empDetalheCapa.style.display = 'block';
            empDetalheCapaVazia.style.display = 'none';
        } else {
            empDetalheCapa.style.display = 'none';
            empDetalheCapaVazia.style.display = 'flex';
        }

        // Chips de destaque
        const chips = [];
        if (emp.tipo_imovel) chips.push({ icone: 'fa-home', txt: emp.tipo_imovel });
        if (emp.dormitorios) chips.push({ icone: 'fa-bed', txt: emp.dormitorios });
        if (emp.metragens) chips.push({ icone: 'fa-ruler-combined', txt: emp.metragens });
        if (emp.vagas) chips.push({ icone: 'fa-car', txt: emp.vagas });
        if (emp.fase) chips.push({ icone: 'fa-hard-hat', txt: emp.fase });

        empDetalheChips.innerHTML = chips.map(c => `
            <span class="emp-detalhe-chip">
                <i class="fas ${c.icone}"></i>
                ${escapeHtml(c.txt)}
            </span>
        `).join('');

        // Localização
        const localPartes = [emp.endereco, emp.bairro, emp.cidade, emp.estado].filter(Boolean);
        if (localPartes.length) {
            empDetalheLocalSeccao.style.display = 'block';
            empDetalheLocal.textContent = localPartes.join(' · ');
        } else {
            empDetalheLocalSeccao.style.display = 'none';
        }

        // Descrição
        if (emp.descricao) {
            empDetalheDescricaoSeccao.style.display = 'block';
            empDetalheDescricao.textContent = emp.descricao;
        } else {
            empDetalheDescricaoSeccao.style.display = 'none';
        }

        // Comodidades
        const comodidades = Array.isArray(emp.comodidades) ? emp.comodidades : [];
        if (comodidades.length) {
            empDetalheComodidadesSeccao.style.display = 'block';
            empDetalheComodidades.innerHTML = comodidades.map(c => `
                <span class="emp-detalhe-comodidade">
                    <i class="fas fa-check"></i>
                    ${escapeHtml(c)}
                </span>
            `).join('');
        } else {
            empDetalheComodidadesSeccao.style.display = 'none';
        }

        // Botão "Abrir book"
        if (emp.pdf_url) {
            btnAbrirBook.href = emp.pdf_url;
            btnAbrirBook.removeAttribute('disabled');
        } else {
            btnAbrirBook.href = '#';
            btnAbrirBook.setAttribute('disabled', 'true');
        }

        // Abre o modal
        modalEmpCorretor.style.display = 'flex';
    }

    function fecharDetalhesEmp() {
        modalEmpCorretor.style.display = 'none';
        empreendimentoAtual = null;
    }

    if (btnFecharDetalheEmp) btnFecharDetalheEmp.addEventListener('click', fecharDetalhesEmp);
    if (btnFecharDetalheEmpFooter) btnFecharDetalheEmpFooter.addEventListener('click', fecharDetalhesEmp);

    if (modalEmpCorretor) {
        modalEmpCorretor.addEventListener('click', (e) => {
            if (e.target === modalEmpCorretor) fecharDetalhesEmp();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalEmpCorretor?.style.display === 'flex') {
            fecharDetalhesEmp();
        }
    });

    /* =========================================================
       INIT
       ========================================================= */

    carregarEmpreendimentos();

    console.log('[empreendimentos] Página pronta.');
});