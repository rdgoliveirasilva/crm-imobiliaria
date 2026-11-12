/* Gráficos exclusivos do mobile; usa a mesma versão do Chart.js do admin. */
(() => {
    const mobile = window.matchMedia('(max-width: 600px)');
    let carteira = null, request = 0, iniciado = false, biblioteca;
    let trend, spark;
    const $ = id => document.getElementById(id);

    function carregarBiblioteca() {
        if (window.Chart) return Promise.resolve();
        if (!biblioteca) biblioteca = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
            script.onload = resolve;
            script.onerror = () => { script.remove(); biblioteca = null; reject(new Error('Chart.js indisponível')); };
            document.head.appendChild(script);
        });
        return biblioteca;
    }

    function limpar() {
        trend?.destroy(); spark?.destroy(); trend = spark = null;
    }

    function renderizar(dados) {
        const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canvas = $('mobileTrendChart');
        const ctx = canvas.getContext('2d');
        const series = [
            ['Primeira qualificação', dados.qualificados, '#13dfa1'],
            ['Descartados', dados.descartados, '#fb7185'],
            ['Requalificações', dados.requalificados, '#a78bfa']
        ];
        trend = new Chart(ctx, {
            type: 'line',
            data: { labels: dados.labels, datasets: series.map(([label, data, color]) => {
                const gradiente = ctx.createLinearGradient(0, 0, 0, 220);
                gradiente.addColorStop(0, color + '38'); gradiente.addColorStop(1, color + '00');
                return { label, data, borderColor: color, backgroundColor: gradiente,
                    fill: true, tension: .35, borderWidth: 2, pointRadius: 0, pointHitRadius: 12 };
            }) },
            options: { responsive: true, maintainAspectRatio: false, animation: reduzMovimento ? false : { duration: 250 },
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#061126' } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a9c8', maxRotation: 0, maxTicksLimit: 5, font: { size: 10 } } },
                    y: { beginAtZero: true, ticks: { color: '#94a9c8', precision: 0, font: { size: 10 } }, grid: { color: '#94a9c818' } }
                }
            }
        });
        const sparkCtx = $('mensagensSparkline').getContext('2d');
        const sombra = sparkCtx.createLinearGradient(0, 0, 0, 100);
        sombra.addColorStop(0, '#7138f580'); sombra.addColorStop(1, '#1479ff00');
        spark = new Chart(sparkCtx, {
            type: 'line',
            data: { labels: dados.labels.slice(-7), datasets: [{ data: dados.mensagens.slice(-7),
                borderColor: '#20b8ff', backgroundColor: sombra, fill: true, tension: .35, borderWidth: 2, pointRadius: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false, events: [],
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false, beginAtZero: true } } }
        });
    }

    async function carregar(listaId) {
        carteira = listaId; iniciado = true;
        const atual = ++request;
        limpar();
        if (!mobile.matches) return;
        const comparacao = $('mensagensComparacao');
        const resumo = $('mobileTrendResumo');
        comparacao.textContent = 'Carregando evolução diária…';
        comparacao.dataset.direcao = 'neutro';
        resumo.textContent = 'Carregando histórico…';
        try {
            const dados = await ApiClient.get('/api/corretor/evolucao' + (listaId ? `?lista_id=${encodeURIComponent(listaId)}` : ''));
            if (atual !== request) return;
            const { hoje, ontem, diferenca, percentual } = dados.comparacao;
            const numero = n => n.toLocaleString('pt-BR');
            const variacao = diferenca > 0 ? `${numero(diferenca)} a mais` : diferenca < 0 ? `${numero(-diferenca)} a menos` : 'mesma quantidade';
            const pct = percentual === null ? 'sem base percentual ontem' : `${percentual > 0 ? '+' : ''}${numero(percentual)}%`;
            comparacao.textContent = `${numero(hoje)} hoje · ${numero(ontem)} ontem · ${variacao} (${pct})`;
            comparacao.dataset.direcao = diferenca > 0 ? 'alta' : diferenca < 0 ? 'queda' : 'neutro';
            const total = valores => valores.reduce((soma, valor) => soma + valor, 0);
            resumo.textContent = `${listaId ? 'Carteira selecionada' : 'Todas as carteiras'}: ${numero(total(dados.qualificados))} primeiras qualificações, ${numero(total(dados.descartados))} descartados e ${numero(total(dados.requalificados))} requalificações no período.`;
            $('mensagensSparkline').setAttribute('aria-label', 'Mensagens registradas: ' + dados.labels.slice(-7).map((dia, i) => `${dia}: ${dados.mensagens.slice(-7)[i]}`).join('; '));
            try {
                await carregarBiblioteca();
                if (atual === request && mobile.matches) renderizar(dados);
            } catch {
                if (atual === request) resumo.textContent += ' Gráfico indisponível no momento.';
            }
        } catch {
            if (atual !== request) return;
            comparacao.textContent = 'Comparação diária indisponível.';
            resumo.textContent = 'Não foi possível carregar o histórico. Selecione a carteira novamente para tentar.';
        }
    }

    mobile.addEventListener('change', () => { if (iniciado) carregar(carteira); });
    window.CorretorGraficos = { carregar };
})();
