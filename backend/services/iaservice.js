/* =========================================================
   IA SERVICE — Extração estruturada via Gemini
   ========================================================= */

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================================================
   SCHEMA DA RESPOSTA
   ========================================================= */

const RESPOSTA_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        nome: {
            type: SchemaType.STRING,
            description: 'Nome do empreendimento. Ex: "Palácio de Estocolmo". Se não achar, vazio.'
        },
        construtora: {
            type: SchemaType.STRING,
            description: 'Nome da construtora. Ex: "MRV", "Cyrela". Se não achar, vazio.'
        },
        tipo_imovel: {
            type: SchemaType.STRING,
            description: 'Tipo do imóvel. Ex: "Apartamento", "Casa", "Studio", "Cobertura". Se não achar, vazio.'
        },
        dormitorios: {
            type: SchemaType.STRING,
            description: 'Quantidade de dormitórios. Ex: "2 dormitórios", "2 e 3 quartos". Se não achar, vazio.'
        },
        metragens: {
            type: SchemaType.STRING,
            description: 'Metragem DAS UNIDADES (não do terreno). Ex: "40,83 m² a 44,58 m²". Se não achar, vazio.'
        },
        vagas: {
            type: SchemaType.STRING,
            description: 'Quantidade de vagas POR UNIDADE (não do condomínio inteiro). Ex: "1 vaga por unidade". Se não achar, vazio.'
        },
        comodidades: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Lista de comodidades do condomínio. Ex: ["Piscina", "Playground", "Salão de festas"].'
        },
        descricao: {
            type: SchemaType.STRING,
            description: 'Breve descrição comercial (2 a 4 frases) atraente e factual sobre o empreendimento. Sem emojis, sem "perfeito para famílias".'
        },
        cidade: {
            type: SchemaType.STRING,
            description: 'Cidade onde fica. Ex: "Ribeirão Preto". Se não achar, vazio.'
        },
        estado: {
            type: SchemaType.STRING,
            description: 'UF (2 letras). Ex: "SP". Se não achar, vazio.'
        },
        bairro: {
            type: SchemaType.STRING,
            description: 'Bairro. Ex: "Reserva Real". Se não achar, vazio.'
        },
        endereco: {
            type: SchemaType.STRING,
            description: 'Endereço completo (rua e número). Se não achar, vazio.'
        }
    },
    required: [
        'nome', 'construtora', 'tipo_imovel', 'dormitorios', 'metragens',
        'vagas', 'comodidades', 'descricao', 'cidade', 'estado', 'bairro', 'endereco'
    ]
};

/* =========================================================
   PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `Você é um assistente especializado em extrair informações de PDFs de empreendimentos imobiliários brasileiros (books, memoriais descritivos, tabelas de preços).

Sua tarefa é ler o texto extraído de um PDF e devolver as informações em JSON estruturado.

REGRAS CRÍTICAS:
- METRAGEM é a metragem DAS UNIDADES (ex: "40,83 m² a 44,58 m²"), NUNCA do terreno, NUNCA da área total do condomínio.
- VAGAS é a quantidade de vagas POR UNIDADE. Se o PDF só diz o total de vagas do condomínio (ex: "212 vagas"), NÃO use isso como vagas por unidade.
- COMODIDADES são as do CONDOMÍNIO (piscina, salão de festas, playground, etc.), não do entorno.
- DESCRIÇÃO deve ser comercial e atraente, mas factual. NÃO use frases como "perfeito para famílias" ou "ideal para jovens".
- Se algum campo não estiver claro no PDF, devolva STRING VAZIA (não invente).
- Devolva APENAS o JSON, sem markdown, sem explicações.

O texto abaixo pode ter partes no meio omitidas com "[...]". Isso é esperado — a Ficha Técnica (com metragens, dormitórios e endereço) geralmente está no FINAL do texto, e o nome do empreendimento no INÍCIO. Use o que estiver disponível.

TEXTO DO PDF:
"""
{{TEXTO}}
"""`;

/* =========================================================
   CORTE INTELIGENTE DO TEXTO
   ========================================================= */

function cortarTexto(texto) {
    const TAMANHO_INICIO = 2500;
    const TAMANHO_FINAL = 8000;

    if (texto.length <= TAMANHO_INICIO + TAMANHO_FINAL) {
        return texto;
    }

    const inicio = texto.slice(0, TAMANHO_INICIO);
    const final = texto.slice(-TAMANHO_FINAL);

    return `${inicio}\n\n[...]\n\n${final}`;
}

/* =========================================================
   DESCOBERTA DINÂMICA DE MODELOS
   ---------------------------------------------------------
   Em vez de fixar modelos (que a Google aposenta toda hora),
   consulta a API e filtra os modelos disponíveis que:
   - Suportam generateContent
   - São rápidos (flash ou flash-lite)
   - NÃO são TTS, embedding, imagem ou especializados
   ========================================================= */

let cacheModelos = null;
let cacheModelosEm = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function descobrirModelos() {
    // Cache de 5 minutos pra não bater na API toda hora
    if (cacheModelos && Date.now() - cacheModelosEm < CACHE_TTL) {
        return cacheModelos;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.models) {
            throw new Error('API não retornou lista de modelos.');
        }

        // Filtra: só modelos que servem pro nosso caso
        const candidatos = data.models
            .filter(m => {
                const nome = m.name.replace('models/', '');
                const metodos = m.supportedGenerationMethods || [];

                // Precisa suportar generateContent
                if (!metodos.includes('generateContent')) return false;

                // Evita modelos especializados
                if (/tts|embedding|image|vision|audio|robotics|computer-use|research|antigravity|lyria|aqa/i.test(nome)) return false;

                // Só quer flash ou flash-lite (rápidos)
                if (!/flash/i.test(nome)) return false;

                return true;
            })
            .map(m => m.name.replace('models/', ''))
            // Ordena: flash-lite primeiro (mais rápido), depois flash, depois versões numéricas
            .sort((a, b) => {
                const scoreA = (a.includes('lite') ? 0 : 100) - (a.includes('latest') ? 10 : 0);
                const scoreB = (b.includes('lite') ? 0 : 100) - (b.includes('latest') ? 10 : 0);
                return scoreA - scoreB;
            });

        console.log(`[iaService] modelos disponíveis (${candidatos.length}):`, candidatos.slice(0, 6).join(', '));

        cacheModelos = candidatos;
        cacheModelosEm = Date.now();
        return candidatos;

    } catch (err) {
        console.error('[iaService] erro ao descobrir modelos:', err.message);

        // Fallback: usa a lista hardcoded se a descoberta falhar
        return [
            'gemini-flash-lite-latest',
            'gemini-flash-latest'
        ];
    }
}

/* =========================================================
   FUNÇÃO PRINCIPAL
   ========================================================= */

async function extrairDadosComIA(textoOriginal) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY não configurada nas variáveis de ambiente.');
    }

    if (!textoOriginal || textoOriginal.length < 50) {
        throw new Error('Texto do PDF muito curto para extração.');
    }

    const textoCortado = cortarTexto(textoOriginal);
    console.log(`[iaService] texto original: ${textoOriginal.length} chars → cortado: ${textoCortado.length} chars`);

    const inicio = Date.now();
    let ultimoErro = null;

    // 🔑 Descobre os modelos disponíveis AGORA
    const modelos = await descobrirModelos();

    if (!modelos.length) {
        throw new Error('Nenhum modelo Gemini compatível foi encontrado para sua conta.');
    }

    for (const nomeModelo of modelos.slice(0, 5)) { // Testa no máximo 5 modelos
        const esperas = [0, 1500, 4000];

        for (let tentativa = 1; tentativa <= esperas.length; tentativa++) {
            try {
                if (esperas[tentativa - 1] > 0) {
                    console.log(`[iaService] aguardando ${esperas[tentativa - 1]}ms antes da tentativa ${tentativa}...`);
                    await new Promise(r => setTimeout(r, esperas[tentativa - 1]));
                }

                console.log(`[iaService] tentando ${nomeModelo} (tentativa ${tentativa})...`);
                const t0 = Date.now();

                const model = genAI.getGenerativeModel({
                    model: nomeModelo,
                    systemInstruction: SYSTEM_PROMPT.replace('{{TEXTO}}', textoCortado),
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: RESPOSTA_SCHEMA,
                        temperature: 0.2
                    }
                });

                const result = await model.generateContent('Extraia as informações do texto acima seguindo o schema.');
                const resposta = result.response.text();
                const dados = JSON.parse(resposta);

                const tempo = ((Date.now() - t0) / 1000).toFixed(1);
                console.log(`[iaService] ✅ ${nomeModelo} respondeu em ${tempo}s (total ${((Date.now() - inicio) / 1000).toFixed(1)}s)`);
                return dados;

            } catch (err) {
                ultimoErro = err;
                const msg = (err.message || '').slice(0, 200);
                console.warn(`[iaService] erro em ${nomeModelo} (tentativa ${tentativa}): ${msg}`);

                const eh400 = msg.includes('400');
                const eh404 = msg.includes('404') || msg.includes('not found') || msg.includes('not supported');
                const ehSobrecarga = msg.includes('503') || msg.includes('429') ||
                                     msg.includes('high demand') || msg.includes('overloaded') ||
                                     msg.includes('Service Unavailable') || msg.includes('quota');

                // 400 ou 404 = modelo/propriedade inválida. Pula pro próximo imediatamente.
                if (eh400 || eh404) {
                    console.warn(`[iaService] ${nomeModelo} indisponível (${eh400 ? '400' : '404'}). Pulando.`);
                    break;
                }

                if (ehSobrecarga && tentativa < esperas.length) {
                    continue;
                }

                break;
            }
        }
    }

    throw new Error(
        'Todos os modelos Gemini falharam. Último erro: ' +
        (ultimoErro?.message || 'desconhecido').slice(0, 200)
    );
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = { extrairDadosComIA };