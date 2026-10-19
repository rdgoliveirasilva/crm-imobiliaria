/* =========================================================
   EMPREENDIMENTOS — Vitrine do Corretor
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    let todosEmpreendimentos = [];
    let empreendimentoAtual = null;
    let filtroVerTodos = false;

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const headerUserName      = $('headerUserName');
    const empTotalCount       = $('empTotalCount');
    const empBusca            = $('empBusca');
    
    // Custom Selects (Inputs hidden)
    const empFiltroConstrutora = $('empFiltroConstrutora');
    const empFiltroCidade     = $('empFiltroCidade');
    const empFiltroBairro     = $('empFiltroBairro');
    
    // Inputs com máscara
    const empFiltroEntrega    = $('empFiltroEntrega');
    const empFiltroRenda      = $('empFiltroRenda');
    
    const empLimparFiltros    = $('empLimparFiltros');
    const empGridVitrine      = $('empGridVitrine');
    const empLoading          = $('empLoading');
    const empVazio            = $('empVazio');
    const empVazioMensagem    = $('empVazioMensagem');

    // Modal
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
       UTILS E TOAST
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
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // Limpa os números de uma string (Ex: "R$ 3.000,00" -> 3000)
    function extrairValorNumerico(strRenda) {
        if (!strRenda) return null;
        const numeros = String(strRenda).replace(/\D/g, '');
        if (!numeros) return null;
        return Number(numeros);
    }

    if (headerUserName) {
        const nome = localStorage.getItem('sr_usuario') || 'Corretor';
        headerUserName.textContent = nome.split(' ')[0];
    }

    /* =========================================================
       MÁSCARAS DE DIGITAÇÃO
       ========================================================= */
       
    if (empFiltroRenda) {
        empFiltroRenda.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); 
            if (value) {
                // Divide por 100 para formatar centavos (Ex: 300000 -> 3.000,00)
                value = (Number(value) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            e.target.value = value;
            aplicarFiltros();
        });
    }

    if (empFiltroEntrega) {
        empFiltroEntrega.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 6) value = value.slice(0, 6);
            if (value.length > 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            e.target.value = value;
            aplicarFiltros();
        });
    }

    /* =========================================================
       CARREGAR DADOS
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
       POPULAR CUSTOM SELECTS
       ========================================================= */

    function popularFiltrosDinamicos() {
        const construtoras = [...new Set(todosEmpreendimentos.map(e => (e.construtora || '').trim()).filter(Boolean))].sort();
        const cidades = [...new Set(todosEmpreendimentos.map(e => (e.cidade || '').trim()).filter(Boolean))].sort();
        const bairros = [...new Set(todosEmpreendimentos.map(e => (e.bairro || '').trim()).filter(Boolean))].sort();

        function preencherSelect(idMenu, input, dados, labelTodos) {
            const menu = $(idMenu);
            let html = `<button type="button" class="emp-custom-option ${!input.value ? 'selected' : ''}" data-value=""><span class="opt-text">${labelTodos}</span><i class="fas fa-check opt-check"></i></button>`;
            if (dados.length) {
                html += '<div class="emp-custom-divider"></div>';
                html += dados.map(d => `<button type="button" class="emp-custom-option ${input.value === d ? 'selected' : ''}" data-value="${escapeHtml(d)}"><span class="opt-text">${escapeHtml(d)}</span><i class="fas fa-check opt-check"></i></button>`).join('');
            }
            menu.innerHTML = '<div class="emp-custom-scroll">' + html + '</div>';
            
            menu.querySelectorAll('.emp-custom-option').forEach(opc => {
                opc.addEventListener('click', () => {
                    input.value = opc.dataset.value;
                    fecharCustomSelects();
                    atualizarTriggers();
                    aplicarFiltros();
                });
            });
        }

        preencherSelect('menuFiltroConstrutora', empFiltroConstrutora, construtoras, 'Todas as construtoras');
        preencherSelect('menuFiltroCidade', empFiltroCidade, cidades, 'Todas as cidades');
        preencherSelect('menuFiltroBairro', empFiltroBairro, bairros, 'Todos os bairros');
        
        atualizarTriggers();
    }

    function atualizarTriggers() {
        $('textFiltroConstrutora').textContent = empFiltroConstrutora.value || 'Todas as construtoras';
        $('textFiltroCidade').textContent = empFiltroCidade.value || 'Todas as cidades';
        $('textFiltroBairro').textContent = empFiltroBairro.value || 'Todos os bairros';
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

        empGridVitrine.querySelectorAll('.emp-grupo-ver-todos').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                filtroVerTodos = true;
                if (empFiltroConstrutora) {
                    empFiltroConstrutora.value = btn.dataset.construtora;
                    atualizarTriggers();
                    aplicarFiltros();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    /* =========================================================
       FILTROS (TEXTOS E LÓGICA)
       ========================================================= */

    function aplicarFiltros() {
        const busca = (empBusca?.value || '').trim().toLowerCase();
        const construtora = empFiltroConstrutora?.value || '';
        const cidade = empFiltroCidade?.value || '';
        const bairro = empFiltroBairro?.value || '';
        
        const entregaDigitada = (empFiltroEntrega?.value || '').trim(); // Ex: "05/2028"
        const rendaDigitada = extrairValorNumerico(empFiltroRenda?.value); // Ex: 400000

        // 🔑 FUNÇÃO PARA TRANSFORMAR "MM/AAAA" EM UM NÚMERO COMPARÁVEL
        // Ex: "05/2028" vira 202805
        function transformarDataEmNumero(str) {
            if (!str) return null;
            const partes = str.split('/');
            if (partes.length !== 2) return null;
            const mes = parseInt(partes[0], 10);
            const ano = parseInt(partes[1], 10);
            if (isNaN(mes) || isNaN(ano)) return null;
            return (ano * 100) + mes; 
        }

        // 🔑 FUNÇÃO PARA EXTRAIR A DATA DO EMPREENDIMENTO DO BANCO
        // Como o admin pode digitar "05/2028", "Mai/2028", "Maio de 2028", etc.
        // Nós vamos varrer a string procurando 4 dígitos (ano) e 2 dígitos (mês).
        function extrairDataDoBanco(str) {
            if (!str) return null;
            
            // 1. Procura padrão numérico: 05/2028, 05-2028, 05.2028
            let match = str.match(/(\d{1,2})[\/\-\.](\d{4})/);
            if (match) {
                const mes = parseInt(match[1], 10);
                const ano = parseInt(match[2], 10);
                return (ano * 100) + mes;
            }

            // 2. Procura padrão textual: Mai/2028, Maio 2028, etc.
            const mesesTexto = {
                'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
                'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
            };
            const lower = str.toLowerCase();
            for (const [nome, num] of Object.entries(mesesTexto)) {
                if (lower.includes(nome)) {
                    const anoMatch = lower.match(/(\d{4})/);
                    if (anoMatch) {
                        return (parseInt(anoMatch[1], 10) * 100) + num;
                    }
                }
            }
            return null;
        }

        const entregaNum = transformarDataEmNumero(entregaDigitada);

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
        
        // 🔑 Filtro de Entrega (Tudo que for MENOR OU IGUAL à data digitada)
        if (entregaNum) {
            filtrados = filtrados.filter(e => {
                const dataBancoNum = extrairDataDoBanco(e.previsao_entrega);
                // Se a data do banco existir e for menor/igual à data digitada, aprova
                return dataBancoNum !== null && dataBancoNum <= entregaNum;
            });
        }
        
        // 🔑 Filtro de Renda (Tudo que for MENOR OU IGUAL ao valor digitado)
        if (rendaDigitada !== null) {
            filtrados = filtrados.filter(e => {
                const rendaEmp = extrairValorNumerico(e.renda_presumida);
                return rendaEmp !== null && rendaEmp <= rendaDigitada;
            });
        }

        const temFiltro = busca || construtora || cidade || bairro || entregaDigitada || rendaDigitada !== null;
        if (empLimparFiltros) empLimparFiltros.style.display = temFiltro ? 'inline-flex' : 'none';

        renderizarEmpreendimentos(filtrados);
    }

    if (empBusca) empBusca.addEventListener('input', aplicarFiltros);

    if (empLimparFiltros) {
        empLimparFiltros.addEventListener('click', () => {
            empBusca.value = '';
            empFiltroConstrutora.value = '';
            empFiltroCidade.value = '';
            empFiltroBairro.value = '';
            empFiltroEntrega.value = '';
            empFiltroRenda.value = '';
            filtroVerTodos = false;
            atualizarTriggers();
            aplicarFiltros();
        });
    }

    /* =========================================================
       CONTROLE DOS CUSTOM SELECTS (ABRIR/FECHAR)
       ========================================================= */

    function fecharCustomSelects() {
        document.querySelectorAll('.emp-custom-menu').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.emp-custom-trigger').forEach(t => t.classList.remove('open'));
    }

    const triggers = [
        { id: 'triggerFiltroConstrutora', menu: 'menuFiltroConstrutora' },
        { id: 'triggerFiltroCidade', menu: 'menuFiltroCidade' },
        { id: 'triggerFiltroBairro', menu: 'menuFiltroBairro' }
    ];

    triggers.forEach(t => {
        const btn = $(t.id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = $(t.menu);
                const isOpen = menu.classList.contains('open');
                fecharCustomSelects();
                if (!isOpen) {
                    menu.classList.add('open');
                    btn.classList.add('open');
                }
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.emp-custom-select')) {
            fecharCustomSelects();
        }
    });

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
        if (e.key === 'Escape' && modalEmpCorretor?.style.display === 'flex') fecharDetalhesEmp();
    });

    carregarEmpreendimentos();
});