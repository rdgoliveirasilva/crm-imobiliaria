/* =========================================================
   CLOUDINARY — Configuração do SDK
   ========================================================= */

const cloudinary = require('cloudinary').v2;

if (!process.env.CLOUDINARY_URL) {
    console.error('[CLOUDINARY] ❌ CLOUDINARY_URL não encontrada no .env');
    console.error('[CLOUDINARY] Adicione: CLOUDINARY_URL=cloudinary://key:secret@cloud_name');
} else {
    console.log('[CLOUDINARY] ✅ Configurado');
}

cloudinary.config({
    secure: true
});

const PASTA_EMPREENDIMENTOS = 'sr-lancamentos/empreendimentos';

function uploadBuffer(buffer, folder = PASTA_EMPREENDIMENTOS, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
                ...options
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
}

async function deletarArquivo(publicId, resourceType = 'image') {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error('[CLOUDINARY] erro ao deletar:', publicId, err.message);
    }
}

module.exports = {
    cloudinary,
    uploadBuffer,
    deletarArquivo,
    PASTA_EMPREENDIMENTOS
};