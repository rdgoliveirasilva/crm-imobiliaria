/* =========================================================
   EMPREENDIMENTOS — Vitrine do Corretor
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    let todosEmpreendimentos = [];
    let empreendimentoAtual = null;
    let filtroVerTodos = false; // 🔑 NOVO: Controla se o usuário clicou em "Ver Todos"

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const headerUserName      = $('headerUserName');
    const empTotalCount       = $('empTotalCount');
    const empBusca            = $('empBusca');
    const empFiltroConstrutora = $('empFiltroConstrutora');
    const empFiltroCidade     = $('empFiltroCidade');
    const empFiltroBairro     = $('empFiltroBairro');
    const empFiltroEntrega    = $('empFiltroEntrega');
    const empFiltroRenda      = $('empFiltroRenda');
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
       TOAST E UTILS
       ========================================================= */

    let toastTimer = null;
    function mostrarToast(msg, tipo = 'info') {
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast show ${tipo}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.className = 'toast', 2800);
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

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
       POPULAR FILTROS
       ========================================================= */

    function popularFiltrosDinamicos() {
        const construtoras = [...new Set(todosEmpreendimentos.map(e => (e.construtora || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        empFiltroConstrutora.innerHTML = '<option value="">Todas as construtoras</option>' + construtoras.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

        const cidades = [...new Set(todosEmpreendimentos.map(e => (e.cidade || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        empFiltroCidade.innerHTML = '<option value="">Todas as cidades</option>' + cidades.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

        if (empFiltroBairro) {
            const bairros = [...new Set(todosEmpreendimentos.map(e => (e.bairro || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
            empFiltroBairro.innerHTML = '<option value="">Todos os bairros</option>' + bairros.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
        }

        if (empFiltroEntrega) {
            const entregas = [...new Set(todosEmpreendimentos.map(e => (e.previsao_entrega || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
            empFiltroEntrega.innerHTML = '<option value="">Qualquer entrega</option>' + entregas.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');
        }

        if (empFiltroRenda) {
            const rendas = [...new Set(todosEmpreendimentos.map(e => (e.renda_presumida || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
            empFiltroRenda.innerHTML = '<option value="">Qualquer renda</option>' + rendas.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
        }
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

        const grupos = {};
        lista.forEach(emp => {
            const construtora = (emp.construtora || 'Outros').trim();
            if (!grupos[construtora]) grupos[construtora] = [];
            grupos[construtora].push(emp);
        });

        const construtorasOrdenadas = Object.keys(grupos).sort();

        empGridVitrine.innerHTML = construtorasOrdenadas.map(construtora => {
            const emps = grupos[construtora];
            
            // 🔑 A MÁGICA AQUI: Se clicou em "Ver Todos", mostra tudo. Senão, limita a 4.
            const deveLimitar = !filtroVerTodos && emps.length > 4;
            const empsExibidos = deveLimitar ? emps.slice(0, 4) : emps;

            const cards = empsExibidos.map(e => {
                const quartos = e.dormitorios ? `<span class="emp-vitrine-chip"><i class="fas fa-bed"></i> ${escapeHtml(e.dormitorios)}</span>` : '';
                const metragem = e.metragens ? `<span class="emp-vitrine-chip"><i class="fas fa-ruler-combined"></i> ${escapeHtml(e.metragens)}</span>` : '';
                const vagas = e.vagas ? `<span class="emp-vitrine-chip"><i class="fas fa-car"></i> ${escapeHtml(e.vagas)}</span>` : '';
                
                let textoRenda = e.renda_presumida || '';
                if (textoRenda && !textoRenda.toLowerCase().includes('renda')) textoRenda = 'Renda a partir de ' + textoRenda;
                const rendaTag = textoRenda ? `<div class="emp-card-renda-tag">${escapeHtml(textoRenda)}</div>` : '';

                return `
                    <article class="emp-vitrine-card" data-id="${e.id}">
                        <div class="emp-vitrine-cover">
                            ${rendaTag}
                            ${e.capa_url ? `<img src="${e.capa_url}" alt="${escapeHtml(e.nome)}" loading="lazy">` : `<i class="fas fa-building placeholder-icon"></i>`}
                        </div>
                        <div class="emp-vitrine-body">
                            <h3 class="emp-vitrine-nome">${escapeHtml(e.nome)}</h3>
                            ${(e.cidade || e.estado || e.bairro) ? `<div class="emp-vitrine-info"><i class="fas fa-map-marker-alt"></i> ${escapeHtml([e.bairro, e.cidade, e.estado].filter(Boolean).join(' · '))}</div>` : ''}
                            ${(quartos || metragem || vagas) ? `<div class="emp-vitrine-chips">${quartos}${metragem}${vagas}</div>` : ''}
                            ${e.descricao ? `<p class="emp-vitrine-desc">${escapeHtml(e.descricao)}</p>` : ''}
                            <span class="emp-vitrine-book">Ver empreendimento <i class="fas fa-arrow-right"></i></span>
                        </div>
                    </article>
                `;
            }).join('');

            return `
                <section class="emp-grupo">
                    <header class="emp-grupo-head">
                        <h3 class="emp-grupo-titulo">
                            ${escapeHtml(construtora)}
                            <span class="emp-grupo-count">${emps.length} empreendimentos</span>
                        </h3>
                        ${deveLimitar ? `<button class="emp-grupo-ver-todos" data-construtora="${escapeHtml(construtora)}" type="button">Ver todos <i class="fas fa-arrow-right"></i></button>` : ''}
                    </header>
                    <div class="emp-grid-vitrine">
                        ${cards}
                    </div>
                </section>
            `;
        }).join('');

        empGridVitrine.querySelectorAll('.emp-vitrine-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = Number(card.dataset.id);
                const emp = todosEmpreendimentos.find(e => e.id === id);
                if (emp) abrirDetalhesEmp(emp);
            });
        });

        // Listener do "Ver todos"
        empGridVitrine.querySelectorAll('.emp-grupo-ver-todos').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                filtroVerTodos = true; // 🔑 Libera o limite de 4
                
                if (empFiltroConstrutora) {
                    empFiltroConstrutora.value = btn.dataset.construtora;
                    aplicarFiltros();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    /* =========================================================
       FILTROS
       ========================================================= */

    function aplicarFiltros() {
        // Se o usuário mexer manualmente nos filtros, a gente reseta a flag "Ver Todos" 
        // para que a próxima busca volte a mostrar o limite de 4 (opcional, mas recomendado)
        // filtroVerTodos = false; 

        const busca = (empBusca?.value || '').trim().toLowerCase();
        const construtora = empFiltroConstrutora?.value || '';
        const cidade = empFiltroCidade?.value || '';
        const bairro = empFiltroBairro?.value || '';
        const entrega = empFiltroEntrega?.value || '';
        const renda = empFiltroRenda?.value || '';

        let filtrados = todosEmpreendimentos;

        if (busca) {
            filtrados = filtrados.filter(e =>
                (e.nome || '').toLowerCase().includes(busca) ||
                (e.construtora || '').toLowerCase().includes(busca) ||
                (e.bairro || '').toLowerCase().includes(busca) ||
                (e.cidade || '').toLowerCase().includes(busca)
            );
        }
        if (construtora) filtrados = filtrados.filter(e => (e.construtora || '') === construtora);
        if (cidade) filtrados = filtrados.filter(e => (e.cidade || '') === cidade);
        if (bairro) filtrados = filtrados.filter(e => (e.bairro || '') === bairro);
        if (entrega) filtrados = filtrados.filter(e => (e.previsao_entrega || '') === entrega);
        if (renda) filtrados = filtrados.filter(e => (e.renda_presumida || '') === renda);

        const temFiltro = busca || construtora || cidade || bairro || entrega || renda;
        if (empLimparFiltros) empLimparFiltros.style.display = temFiltro ? 'inline-flex' : 'none';

        renderizarEmpreendimentos(filtrados);
    }

    if (empBusca) empBusca.addEventListener('input', aplicarFiltros);
    if (empFiltroConstrutora) empFiltroConstrutora.addEventListener('change', aplicarFiltros);
    if (empFiltroCidade) empFiltroCidade.addEventListener('change', aplicarFiltros);
    if (empFiltroBairro) empFiltroBairro.addEventListener('change', aplicarFiltros);
    if (empFiltroEntrega) empFiltroEntrega.addEventListener('change', aplicarFiltros);
    if (empFiltroRenda) empFiltroRenda.addEventListener('change', aplicarFiltros);

    if (empLimparFiltros) {
        empLimparFiltros.addEventListener('click', () => {
            empBusca.value = '';
            empFiltroConstrutora.value = '';
            empFiltroCidade.value = '';
            if (empFiltroBairro) empFiltroBairro.value = '';
            if (empFiltroEntrega) empFiltroEntrega.value = '';
            if (empFiltroRenda) empFiltroRenda.value = '';
            filtroVerTodos = false; // 🔑 Restaura o limite de 4
            aplicarFiltros();
        });
    }

    /* =========================================================
       MODAL DE DETALHES
       ========================================================= */

    function abrirDetalhesEmp(emp) {
        empreendimentoAtual = emp;
        empDetalheNome.textContent = emp.nome || '—';
        empDetalheConstrutora.innerHTML = emp.construtora ? `<i class="fas fa-industry"></i> ${escapeHtml(emp.construtora)}` : '';

        if (emp.capa_url) {
            empDetalheCapa.src = emp.capa_url;
            empDetalheCapa.style.display = 'block';
            empDetalheCapaVazia.style.display = 'none';
        } else {
            empDetalheCapa.style.display = 'none';
            empDetalheCapaVazia.style.display = 'flex';
        }

        const chips = [];
        if (emp.tipo_imovel) chips.push({ icone: 'fa-home', txt: emp.tipo_imovel });
        if (emp.dormitorios) chips.push({ icone: 'fa-bed', txt: emp.dormitorios });
        if (emp.metragens) chips.push({ icone: 'fa-ruler-combined', txt: emp.metragens });
        if (emp.vagas) chips.push({ icone: 'fa-car', txt: emp.vagas });
        if (emp.fase) chips.push({ icone: 'fa-hard-hat', txt: emp.fase });
        if (emp.previsao_entrega) chips.push({ icone: 'fa-calendar-check', txt: emp.previsao_entrega }); 
        if (emp.renda_presumida) chips.push({ icone: 'fa-money-bill-wave', txt: emp.renda_presumida });  

        empDetalheChips.innerHTML = chips.map(c => `<span class="emp-detalhe-chip"><i class="fas ${c.icone}"></i> ${escapeHtml(c.txt)}</span>`).join('');

        const localPartes = [emp.endereco, emp.bairro, emp.cidade, emp.estado].filter(Boolean);
        if (localPartes.length) {
            empDetalheLocalSeccao.style.display = 'block';
            empDetalheLocal.textContent = localPartes.join(' · ');
        } else {
            empDetalheLocalSeccao.style.display = 'none';
        }

        if (emp.descricao) {
            empDetalheDescricaoSeccao.style.display = 'block';
            empDetalheDescricao.textContent = emp.descricao;
        } else {
            empDetalheDescricaoSeccao.style.display = 'none';
        }

        const comodidades = Array.isArray(emp.comodidades) ? emp.comodidades : [];
        if (comodidades.length) {
            empDetalheComodidadesSeccao.style.display = 'block';
            empDetalheComodidades.innerHTML = comodidades.map(c => `<span class="emp-detalhe-comodidade"><i class="fas fa-check"></i> ${escapeHtml(c)}</span>`).join('');
        } else {
            empDetalheComodidadesSeccao.style.display = 'none';
        }

        if (emp.pdf_url) {
            btnAbrirBook.href = emp.pdf_url;
            btnAbrirBook.removeAttribute('disabled');
        } else {
            btnAbrirBook.href = '#';
            btnAbrirBook.setAttribute('disabled', 'true');
        }

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

    carregarEmpreendimentos();
    console.log('[empreendimentos] Página pronta.');
});