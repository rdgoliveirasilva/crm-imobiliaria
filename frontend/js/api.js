/* =========================================================
   API.JS — Camada de dados (mock via localStorage)
   Quando o back-end existir, troque o corpo dos métodos por
   chamadas fetch('/api/...') — o resto do front não muda.
   ========================================================= */

const API = (() => {

    const KEY_LEADS      = 'sr_leads_mock';
    const KEY_LIBERADA   = 'sr_carteira_liberada';
    const KEY_HISTORICO  = 'sr_historico_mock';

    /* ---------- DADOS DE TESTE ---------- */
    const LEADS_MOCK = [
        { id: 1, nome: 'Ingrid Alves Maciel',    telefone: '+5516981006715', interesse: 'Apartamento 2 quartos', origem: 'Lista Outubro' },
        { id: 2, nome: 'Carlos Eduardo Lima',    telefone: '(21) 99876-5432', interesse: 'Casa com quintal',      origem: 'Lista Outubro' },
        { id: 3, nome: 'Mariana Ferreira',       telefone: '(31) 98888-7777', interesse: 'Cobertura',             origem: 'Lista Outubro' },
        { id: 4, nome: 'Paulo Henrique Mendes',  telefone: '(41) 97777-6666', interesse: 'Terreno 300m²',         origem: 'Lista Outubro' },
        { id: 5, nome: 'Juliana Castro',         telefone: '(51) 96666-5555', interesse: 'Studio mobiliado',      origem: 'Lista Outubro' },
        { id: 6, nome: 'Rafael Nogueira',        telefone: '(61) 95555-4444', interesse: 'Sala comercial',        origem: 'Lista Outubro' },
        { id: 7, nome: 'Fernanda Alves',         telefone: '(71) 94444-3333', interesse: 'Apartamento na planta', origem: 'Lista Outubro' },
        { id: 8, nome: 'Bruno Tanaka',           telefone: '(81) 93333-2222', interesse: 'Casa em condomínio',    origem: 'Lista Outubro' }
    ];

    /* ---------- HELPERS INTERNOS ---------- */
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function carregarLeads() {
        const raw = localStorage.getItem(KEY_LEADS);
        if (!raw) {
            const inicial = LEADS_MOCK.map(l => ({
                ...l,
                status: 'novo',          // novo | qualificado | descartado
                resultado: null,         // tag escolhida pelo corretor
                observacao: '',          // texto livre
                decididoEm: null         // timestamp
            }));
            localStorage.setItem(KEY_LEADS, JSON.stringify(inicial));
            return inicial;
        }
        return JSON.parse(raw);
    }

    function salvarLeads(leads) {
        localStorage.setItem(KEY_LEADS, JSON.stringify(leads));
    }

    function carregarHistorico() {
        return JSON.parse(localStorage.getItem(KEY_HISTORICO) || '[]');
    }

    function salvarHistorico(h) {
        localStorage.setItem(KEY_HISTORICO, JSON.stringify(h));
    }

    /* ---------- API PÚBLICA ---------- */
    return {

        /**
         * O admin liberou a carteira desse corretor?
         * No back-end real seria: GET /api/corretor/me/status
         */
        async carteiraLiberada() {
            await delay(120);
            // Por padrão, começa como FALSE (aguardando o gerente)
            const valor = localStorage.getItem(KEY_LIBERADA);
            if (valor === null) {
                localStorage.setItem(KEY_LIBERADA, 'false');
                return false;
            }
            return valor === 'true';
        },

        /**
         * Simula o admin liberando a carteira (usado só pra testar).
         * Depois, o admin fará isso via painel real.
         */
        async liberarCarteira(liberar = true) {
            localStorage.setItem(KEY_LIBERADA, liberar ? 'true' : 'false');
            return liberar;
        },

        /**
         * Retorna o próximo lead "novo" na fila.
         * No back-end: GET /api/corretor/me/proximo-lead
         */
        async proximoLead() {
            await delay(250);
            const leads = carregarLeads();
            const proximo = leads.find(l => l.status === 'novo');
            return proximo || null;
        },

        /**
         * Registra uma decisão do corretor sobre o lead.
         * decisao: string (ex: "agendado", "sem_interesse")
         * observacao: texto opcional
         * No back-end: POST /api/leads/:id/resultado
         */
        async registrarResultado(leadId, decisao, observacao = '') {
            await delay(200);
            const leads = carregarLeads();
            const idx = leads.findIndex(l => l.id === leadId);
            if (idx === -1) throw new Error('Lead não encontrado.');

            const lead = leads[idx];

            // Tags que "qualificam" (avanço) vs "descartam" (sai da fila)
            const TAGS_QUALIFICAM = ['agendado', 'em_atendimento', 'retornar_depois', 'mensagem_enviada'];
            const status = TAGS_QUALIFICAM.includes(decisao) ? 'qualificado' : 'descartado';

            leads[idx] = {
                ...lead,
                status,
                resultado: decisao,
                observacao,
                decididoEm: new Date().toISOString()
            };
            salvarLeads(leads);

            // Histórico
            const hist = carregarHistorico();
            hist.push({
                leadId,
                decisao,
                observacao,
                quando: new Date().toISOString()
            });
            salvarHistorico(hist);

            return leads[idx];
        },

        /**
         * Estatísticas da carteira.
         * No back-end: GET /api/corretor/me/estatisticas
         */
        async estatisticas() {
            await delay(120);
            const leads = carregarLeads();
            const total       = leads.length;
            const trabalhados = leads.filter(l => l.status !== 'novo').length;
            const restantes   = leads.filter(l => l.status === 'novo').length;
            const qualificados = leads.filter(l => l.status === 'qualificado').length;
            const descartados  = leads.filter(l => l.status === 'descartado').length;

            // Contagem por tag
            const porTag = {};
            leads.forEach(l => {
                if (l.resultado) porTag[l.resultado] = (porTag[l.resultado] || 0) + 1;
            });

            return { total, trabalhados, restantes, qualificados, descartados, porTag };
        },


        async historicoQualificados() {
            await delay(150);
            const leads = carregarLeads();
            return leads
                .filter(l => l.status === 'qualificado' && l.decididoEm)
                .sort((a, b) => new Date(b.decididoEm) - new Date(a.decididoEm));
        },

        /* =========================================================
           MÉTODOS DO ADMIN (novos)
           ========================================================= */

        /**
         * Lista todos os corretores cadastrados.
         */
        async listarCorretores() {
            await delay(100);
            return JSON.parse(localStorage.getItem('sr_corretores') || '[]');
        },

        /**
         * Cadastra um novo corretor.
         */
        async cadastrarCorretor(corretor) {
            await delay(150);
            const lista = JSON.parse(localStorage.getItem('sr_corretores') || '[]');

            // Verifica usuário duplicado
            const existe = lista.some(c => c.usuario.toLowerCase() === corretor.usuario.toLowerCase());
            if (existe) throw new Error('Este usuário já está cadastrado.');

            const novo = {
                id: Date.now(),
                nome: corretor.nome.trim(),
                usuario: corretor.usuario.trim().toLowerCase(),
                senha: corretor.senha,
                criadoEm: new Date().toISOString()
            };
            lista.push(novo);
            localStorage.setItem('sr_corretores', JSON.stringify(lista));
            return novo;
        },

        /**
         * Remove um corretor.
         */
        async removerCorretor(id) {
            await delay(120);
            const lista = JSON.parse(localStorage.getItem('sr_corretores') || '[]');
            const filtrada = lista.filter(c => c.id !== id);
            localStorage.setItem('sr_corretores', JSON.stringify(filtrada));
            return true;
        },

        /**
         * Lista todas as listas subidas.
         */
        async listarListas() {
            await delay(100);
            return JSON.parse(localStorage.getItem('sr_listas') || '[]');
        },

        /**
         * Salva uma nova lista e distribui os contatos entre os corretores.
         */
        async salvarLista(nomeLista, contatos, corretoresIds) {
            await delay(300);

            const listas = JSON.parse(localStorage.getItem('sr_listas') || '[]');
            const corretores = JSON.parse(localStorage.getItem('sr_corretores') || '[]');

            // Filtra só os corretores selecionados
            const selecionados = corretores.filter(c => corretoresIds.includes(c.id));
            if (selecionados.length === 0) throw new Error('Selecione pelo menos um corretor.');

            // Embaralha os contatos (Fisher-Yates)
            const embaralhados = [...contatos];
            for (let i = embaralhados.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
            }

            const listaId = Date.now();
            const agora = new Date().toISOString();

            // Distribuição em rodadas (round-robin)
            const distribuicao = {};
            selecionados.forEach(c => distribuicao[c.id] = 0);

            let idx = 0;
            const contatosFinais = [];

            for (let i = 0; i < embaralhados.length; i++) {
                const corretor = selecionados[idx % selecionados.length];
                distribuicao[corretor.id]++;

                contatosFinais.push({
                    ...embaralhados[i],
                    id: `${listaId}-${i + 1}`,
                    listaId,
                    listaNome: nomeLista,
                    corretorId: corretor.id,
                    status: 'novo',
                    resultado: null,
                    observacao: '',
                    decididoEm: null,
                    criadoEm: agora
                });

                idx++;
            }

            // Salva a lista
            listas.push({
                id: listaId,
                nome: nomeLista,
                total: contatos.length,
                corretoresIds: selecionados.map(c => c.id),
                criadoEm: agora
            });
            localStorage.setItem('sr_listas', JSON.stringify(listas));

            // Adiciona aos leads existentes (mesclando com o que já tem)
            const leadsExistentes = JSON.parse(localStorage.getItem('sr_leads_mock') || '[]');
            const todosLeads = [...leadsExistentes, ...contatosFinais];
            localStorage.setItem('sr_leads_mock', JSON.stringify(todosLeads));

            return {
                listaId,
                total: contatos.length,
                distribuicao
            };
        },

        /**
         * Remove uma lista inteira (e todos os seus contatos).
         */
        async removerLista(listaId) {
            await delay(150);

            const listas = JSON.parse(localStorage.getItem('sr_listas') || '[]');
            const listasFiltradas = listas.filter(l => l.id !== listaId);
            localStorage.setItem('sr_listas', JSON.stringify(listasFiltradas));

            const leads = JSON.parse(localStorage.getItem('sr_leads_mock') || '[]');
            const leadsFiltrados = leads.filter(l => l.listaId !== listaId);
            localStorage.setItem('sr_leads_mock', JSON.stringify(leadsFiltrados));

            return true;
        },

        /**
         * Remove um contato específico.
         */
        async removerContato(contatoId) {
            await delay(100);
            const leads = JSON.parse(localStorage.getItem('sr_leads_mock') || '[]');
            const filtrados = leads.filter(l => String(l.id) !== String(contatoId));
            localStorage.setItem('sr_leads_mock', JSON.stringify(filtrados));
            return true;
        },

        /**
         * Contatos de uma lista específica (pra modal de detalhes).
         */
        async contatosDaLista(listaId) {
            await delay(120);
            const leads = JSON.parse(localStorage.getItem('sr_leads_mock') || '[]');
            return leads.filter(l => l.listaId === listaId);
        },

        /**
         * Estatísticas gerais pra dashboard.
         */
        async estatisticasAdmin() {
            await delay(150);

            const listas = JSON.parse(localStorage.getItem('sr_listas') || '[]');
            const corretores = JSON.parse(localStorage.getItem('sr_corretores') || '[]');
            const leads = JSON.parse(localStorage.getItem('sr_leads_mock') || '[]');

            const total = leads.length;
            const qualificados = leads.filter(l => l.status === 'qualificado').length;
            const descartados = leads.filter(l => l.status === 'descartado').length;
            const aguardando = leads.filter(l => l.status === 'novo').length;

            // Por corretor
            const porCorretor = corretores.map(c => {
                const doCorretor = leads.filter(l => l.corretorId === c.id);
                return {
                    id: c.id,
                    nome: c.nome,
                    usuario: c.usuario,
                    total: doCorretor.length,
                    qualificados: doCorretor.filter(l => l.status === 'qualificado').length,
                    aguardando: doCorretor.filter(l => l.status === 'novo').length,
                    descartados: doCorretor.filter(l => l.status === 'descartado').length
                };
            });

            // Por tag
            const porTag = {};
            leads.forEach(l => {
                if (l.resultado) porTag[l.resultado] = (porTag[l.resultado] || 0) + 1;
            });

            return {
                totalListas: listas.length,
                totalContatos: total,
                qualificados,
                descartados,
                aguardando,
                porCorretor,
                porTag
            };
        },

        /**
         * Reset completo do mock (útil em testes).
         */
        resetarTudo() {
            localStorage.removeItem(KEY_LEADS);
            localStorage.removeItem(KEY_LIBERADA);
            localStorage.removeItem(KEY_HISTORICO);
        }
    };

})();