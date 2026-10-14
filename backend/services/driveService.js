/* =========================================================
   DRIVE SERVICE — Google Drive API
   Lista arquivos de pastas públicas via API Key
   ========================================================= */

const { google } = require('googleapis');

/**
 * Extrai o ID da pasta do Google Drive de uma URL completa
 * Aceita:
 *   https://drive.google.com/drive/folders/1ABC...XYZ
 *   https://drive.google.com/drive/u/0/folders/1ABC...XYZ
 *   https://drive.google.com/open?id=1ABC...XYZ
 *   ou só o ID: 1ABC...XYZ
 */
function extrairFolderId(url) {
    if (!url) return null;

    const str = String(url).trim();

    // Se já é um ID puro (sem barras nem pontos)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) {
        return str;
    }

    // Padrão /folders/ID
    let match = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Padrão ?id=ID ou &id=ID
    match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    return null;
}

/**
 * Lista arquivos de uma pasta pública do Drive
 * @param {string} folderId - ID da pasta
 * @returns {Promise<Array>} - Lista de arquivos
 */
async function listarArquivosDaPasta(folderId) {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_DRIVE_API_KEY não configurada no .env');
    }

    const drive = google.drive({ version: 'v3', auth: apiKey });

    // Lista tudo que está diretamente na pasta
    const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink, webContentLink)',
        pageSize: 100,
        orderBy: 'name',
        key: apiKey
    });

    return response.data.files || [];
}

/**
 * Filtra apenas PDFs de uma lista de arquivos
 */
function filtrarPdfs(arquivos) {
    return arquivos.filter(a => a.mimeType === 'application/pdf');
}

/**
 * Classifica um arquivo pelo nome (book, tabela, plantas, etc)
 */
function classificarArquivo(nome) {
    const lower = String(nome).toLowerCase();

    if (lower.includes('book') || lower.includes('apresenta')) return 'book';
    if (lower.includes('tabela') || lower.includes('preç') || lower.includes('valor')) return 'tabela';
    if (lower.includes('planta')) return 'planta';
    if (lower.includes('memorial')) return 'memorial';
    if (lower.includes('perspectiva') || lower.includes('imagem') || lower.includes('render')) return 'imagem';
    if (lower.includes('contrato')) return 'contrato';
    if (lower.includes('regulamento')) return 'regulamento';

    return 'outro';
}

/**
 * Extrai o ID de um ARQUIVO do Google Drive de uma URL completa
 * Aceita:
 *   https://drive.google.com/file/d/1ABC...XYZ/view
 *   https://drive.google.com/file/d/1ABC...XYZ/view?usp=sharing
 *   https://drive.google.com/open?id=1ABC...XYZ
 */
function extrairFileId(url) {
    if (!url) return null;

    const str = String(url).trim();

    // Padrão /file/d/ID
    let match = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Padrão ?id=ID ou &id=ID (mas só se NÃO for /folders/)
    if (!str.includes('/folders/')) {
        match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
    }

    return null;
}

/**
 * Busca metadados de UM arquivo específico do Drive
 */
async function buscarArquivo(fileId) {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_DRIVE_API_KEY não configurada no .env');
    }

    const drive = google.drive({ version: 'v3', auth: apiKey });

    const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, iconLink, webViewLink, webContentLink',
        key: apiKey
    });

    return response.data;
}

/**
 * Baixa o conteúdo de um arquivo do Drive como Buffer
 * @param {string} fileId - ID do arquivo no Drive
 * @returns {Promise<Buffer>} - Buffer com o conteúdo
 */
async function baixarArquivo(fileId) {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_DRIVE_API_KEY não configurada no .env');
    }

    const drive = google.drive({ version: 'v3', auth: apiKey });

    // responseType: 'stream' - retorna stream
    const response = await drive.files.get(
        {
            fileId,
            alt: 'media',
            key: apiKey
        },
        { responseType: 'stream' }
    );

    // Converte stream em Buffer
    return new Promise((resolve, reject) => {
        const chunks = [];
        response.data.on('data', chunk => chunks.push(chunk));
        response.data.on('end', () => resolve(Buffer.concat(chunks)));
        response.data.on('error', reject);
    });
}

module.exports = {
    extrairFolderId,
    extrairFileId,
    listarArquivosDaPasta,
    filtrarPdfs,
    classificarArquivo,
    buscarArquivo,
    baixarArquivo
};