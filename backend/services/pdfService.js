/* =========================================================
   PDF SERVICE — Extração de texto
   ========================================================= */

const pdfParse = require('pdf-parse');

/**
 * Extrai o texto de um Buffer de PDF
 * @param {Buffer} buffer - conteúdo do PDF
 * @returns {Promise<{ texto, numPaginas, info, erro? }>}
 */
async function extrairTextoPdf(buffer) {
    try {
        const data = await pdfParse(buffer);

        // Limpa o texto extraído
        let texto = data.text || '';

        texto = texto
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .trim();

        return {
            texto,
            numPaginas: data.numpages || 0,
            info: {
                title:   data.info?.Title   || null,
                author:  data.info?.Author  || null,
                creator: data.info?.Creator || null
            }
        };

    } catch (err) {
        console.error('[pdfService] erro ao extrair texto:', err.message);
        return {
            texto: '',
            numPaginas: 0,
            info: {},
            erro: err.message
        };
    }
}

/**
 * Extrai possíveis comodidades do texto do PDF
 * Faz uma busca por palavras-chave conhecidas
 */
function extrairComodidades(texto) {
    if (!texto) return [];

    const lower = texto.toLowerCase();

    // Dicionário de comodidades comuns em empreendimentos
    const DICIONARIO = [
        { chave: 'piscina',            label: 'Piscina' },
        { chave: 'academia',           label: 'Academia' },
        { chave: 'salão de festas',    label: 'Salão de festas' },
        { chave: 'salao de festas',    label: 'Salão de festas' },
        { chave: 'churrasqueira',      label: 'Churrasqueira' },
        { chave: 'playground',         label: 'Playground' },
        { chave: 'quadra',             label: 'Quadra' },
        { chave: 'sauna',              label: 'Sauna' },
        { chave: 'jardim',             label: 'Jardim' },
        { chave: 'espaço gourmet',     label: 'Espaço gourmet' },
        { chave: 'espaco gourmet',     label: 'Espaço gourmet' },
        { chave: 'coworking',          label: 'Coworking' },
        { chave: 'pet place',          label: 'Pet place' },
        { chave: 'brinquedoteca',      label: 'Brinquedoteca' },
        { chave: 'cinema',             label: 'Cinema' },
        { chave: 'spa',                label: 'Spa' },
        { chave: 'hidromassagem',      label: 'Hidromassagem' },
        { chave: 'pista de caminhada', label: 'Pista de caminhada' },
        { chave: 'quadra de tênis',    label: 'Quadra de tênis' },
        { chave: 'quadra de tenis',    label: 'Quadra de tênis' },
        { chave: 'quadra poliesportiva', label: 'Quadra poliesportiva' },
        { chave: 'salão de jogos',     label: 'Salão de jogos' },
        { chave: 'salao de jogos',     label: 'Salão de jogos' },
        { chave: 'espaço zen',         label: 'Espaço zen' },
        { chave: 'espaco zen',         label: 'Espaço zen' },
        { chave: 'solarium',           label: 'Solarium' },
        { chave: 'porteiro',           label: 'Portaria 24h' },
        { chave: 'portaria 24h',       label: 'Portaria 24h' },
        { chave: 'portaria 24 horas',  label: 'Portaria 24h' },
        { chave: 'segurança 24h',      label: 'Segurança 24h' },
        { chave: 'seguranca 24h',      label: 'Segurança 24h' },
        { chave: 'elevador',           label: 'Elevador' },
        { chave: 'gerador',            label: 'Gerador' },
        { chave: 'bicicletário',       label: 'Bicicletário' },
        { chave: 'bicicletario',       label: 'Bicicletário' },
        { chave: 'delivery',           label: 'Delivery box' },
        { chave: 'rooftop',            label: 'Rooftop' },
        { chave: 'lounge',             label: 'Lounge' }
    ];

    const encontradas = new Set();

    for (const item of DICIONARIO) {
        if (lower.includes(item.chave)) {
            encontradas.add(item.label);
        }
    }

    return Array.from(encontradas).sort();
}

/**
 * Extrai possíveis metragens do texto (padrão "XX m²" ou "XX m2")
 */
function extrairMetragens(texto) {
    if (!texto) return [];

    const metragens = new Set();

    // Padrão: "45 m²", "45m²", "45 m2", "45,5 m²"
    const regex = /(\d{1,3}(?:[.,]\d{1,2})?)\s*m[²2]/gi;

    let match;
    while ((match = regex.exec(texto)) !== null) {
        const valor = match[1].replace('.', ',');
        metragens.add(valor);
    }

    return Array.from(metragens).sort((a, b) => parseFloat(a) - parseFloat(b));
}

/**
 * Extrai quantidade de dormitórios do texto
 */
function extrairDormitorios(texto) {
    if (!texto) return null;

    const lower = texto.toLowerCase();

    // Padrões comuns: "2 dormitórios", "2 e 3 dormitórios", "2 quartos"
    const padroes = [
        /(\d+\s*e\s*\d+)\s*(dormit[óo]rios|quartos|su[íi]tes)/i,
        /(\d+)\s*(dormit[óo]rios|quartos|su[íi]tes)/i
    ];

    for (const padrao of padroes) {
        const match = lower.match(padrao);
        if (match) {
            const num = match[1];
            const tipo = match[2].toLowerCase().includes('suite') || match[2].toLowerCase().includes('suíte')
                ? 'suítes'
                : match[2].toLowerCase().includes('quarto')
                    ? 'quartos'
                    : 'dormitórios';

            return `${num} ${tipo}`;
        }
    }

    return null;
}

/**
 * Extrai quantidade de vagas do texto
 */
function extrairVagas(texto) {
    if (!texto) return null;

    const lower = texto.toLowerCase();

    const padroes = [
        /(\d+\s*e\s*\d+)\s*vagas?/i,
        /(\d+)\s*vagas?/i
    ];

    for (const padrao of padroes) {
        const match = lower.match(padrao);
        if (match) {
            return `${match[1]} vaga${match[1] === '1' ? '' : 's'}`;
        }
    }

    return null;
}

/* =========================================================
   EXTRAÇÃO DA PRIMEIRA IMAGEM (CAPA)
   ========================================================= */

const { createCanvas } = require('canvas');

/**
 * Renderiza a primeira página do PDF como PNG buffer.
 * @param {Buffer} buffer - conteúdo do PDF
 * @returns {Promise<Buffer|null>} - buffer PNG ou null se falhar
 */
async function extrairPrimeiraImagem(buffer) {
    try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const { createCanvas } = require('canvas');

        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(buffer),
            useSystemFonts: true,
            disableFontFace: true
        });

        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Escala 2.0 (bom equilíbrio entre nitidez e tamanho)
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d');

        // 🔑 Pinta fundo branco antes (evita transparência)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        // 🔑 API do pdfjs-dist v4: passa { canvasContext, viewport, canvas }
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
            canvas: canvas              // 👈 ESSA LINHA RESOLVE O ERRO
        };

        await page.render(renderContext).promise;

        // Exporta como JPEG (mais leve e sempre tem fundo)
        return canvas.toBuffer('image/jpeg', { quality: 0.85 });

    } catch (err) {
        console.error('[pdfService] erro ao extrair capa:', err.message);
        return null;
    }
}

module.exports = {
    extrairTextoPdf,
    extrairComodidades,
    extrairMetragens,
    extrairDormitorios,
    extrairVagas,
    extrairPrimeiraImagem
};