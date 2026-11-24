/* =========================================================
   EMPREENDIMENTOS — Vitrine do Corretor
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);

    let todosEmpreendimentos = [];
    let empreendimentoAtual = null;
    let filtroVerTodos = false;
    let paginaAtual = 1, listaFiltrada = [], focoAnterior;

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
        const nome = AuthSession.getItem('sr_usuario') || 'Corretor';
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
            renderizarIndicadores();
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

    function renderizarEmpreendimentos(lista, pagina = 1) {
        listaFiltrada = lista;
        const paginas = Math.max(1, Math.ceil(lista.length / 8));
        paginaAtual = Math.max(1, Math.min(pagina, paginas));
        const inicio = (paginaAtual - 1) * 8;
        empTotalCount.textContent = lista.length;
        empVazio.style.display = lista.length ? 'none' : 'block';
        empVazioMensagem.textContent = 'Nenhum empreendimento corresponde aos filtros.';
        empGridVitrine.innerHTML = lista.slice(inicio, inicio + 8).map(e=>PropertyHub.card({...e,status:"publicado"})).join('');
        $('brokerPropertyPagination').innerHTML = `<span>${lista.length ? inicio + 1 : 0}–${Math.min(inicio + 8, lista.length)} de ${lista.length} empreendimentos</span><div><button type="button" data-page="${paginaAtual-1}" ${paginaAtual===1?'disabled':''} aria-label="Página anterior">‹</button><strong>${paginaAtual} / ${paginas}</strong><button type="button" data-page="${paginaAtual+1}" ${paginaAtual===paginas?'disabled':''} aria-label="Próxima página">›</button></div>`;
        empGridVitrine.querySelectorAll('.eh-card').forEach(card => card.addEventListener('click', () => {
            const emp = todosEmpreendimentos.find(e => e.id === Number(card.dataset.property));
            if (emp) abrirDetalhesEmp(emp);
        }));
        empGridVitrine.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
    }
    $('brokerPropertyPagination').addEventListener('click', event => {
        const button = event.target.closest('[data-page]');
        if (!button || button.disabled) return;
        renderizarEmpreendimentos(listaFiltrada, Number(button.dataset.page));
        $('brokerPropertyPagination').querySelector('button:not(:disabled)')?.focus();
    });
    function renderizarIndicadores() {
        const distintos = key => new Set(todosEmpreendimentos.map(e=>e[key]?.trim()).filter(Boolean)).size;
        const dados = [['Empreendimentos total',todosEmpreendimentos.length,'Disponíveis na plataforma'],['Construtoras total',distintos('construtora'),'Vinculadas aos empreendimentos'],['Bairros total',distintos('bairro'),'Com empreendimentos'],['Prontos',todosEmpreendimentos.filter(e=>e.fase==='Entregue').length,'Fase: Entregue']];
        $('brokerPropertyMetrics').innerHTML=dados.map(([label,total,descricao])=>`<article><div><b>${label}</b><small>${descricao}</small></div><strong>${total.toLocaleString('pt-BR')}</strong></article>`).join('');
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
        modalEmpCorretor.innerHTML = PropertyHub.details({...emp,status:"publicado"});
        modalEmpCorretor.querySelector('[data-action=close]').addEventListener('click', fecharDetalhesEmp);
        const image=modalEmpCorretor.querySelector('img');
        if(image) image.onerror=()=>{image.replaceWith(Object.assign(document.createElement('p'),{className:'eh-image-error',textContent:'Imagem indisponível'}));};
        focoAnterior = document.activeElement;
        modalEmpCorretor.showModal();
        document.body.classList.add('broker-details-open');
    }

    function fecharDetalhesEmp() {
        modalEmpCorretor.close();
        empreendimentoAtual = null;
    }

    if (modalEmpCorretor) {
        modalEmpCorretor.addEventListener('click', (e) => {
            if (e.target === modalEmpCorretor) { const r=modalEmpCorretor.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) fecharDetalhesEmp(); }
        });
    }
    modalEmpCorretor.addEventListener('close',()=>{document.body.classList.remove('broker-details-open');empreendimentoAtual=null;focoAnterior?.focus();});

    carregarEmpreendimentos();
});
