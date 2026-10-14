/* =========================================================
   ROTAS DE EMPREENDIMENTOS — Admin + Corretor
   ========================================================= */

const express = require('express');
const multer = require('multer');
const { pool } = require('../config/db');
const { uploadBuffer, deletarArquivo } = require('../config/cloudinary');
const { autenticar, apenasAdmin, apenasCorretor } = require('../middlewares/auth');

/* =========================================================
   IMPORTS DOS SERVICES
   ========================================================= */

const {
    extrairTextoPdf,
    extrairComodidades,
    extrairMetragens,
    extrairDormitorios,
    extrairVagas,
    extrairPrimeiraImagem
} = require('../services/pdfService');

const { extrairDadosComIA } = require('../services/iaservice');

const {
    extrairFolderId,
    extrairFileId,
    listarArquivosDaPasta,
    filtrarPdfs,
    classificarArquivo,
    buscarArquivo,
    baixarArquivo
} = require('../services/driveService');

/* =========================================================
   CONFIGURAÇÃO DO MULTER (upload em memória)
   ========================================================= */

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

/* =========================================================
   ROUTER DO ADMIN
   ========================================================= */

const routerAdmin = express.Router();
routerAdmin.use(autenticar, apenasAdmin);

/* =========================================================
   UPLOADS — Capa e PDF
   ⚠️ PRECISAM vir ANTES das rotas /:id
   ========================================================= */

// POST /api/admin/empreendimentos/upload-capa
routerAdmin.post('/upload-capa', upload.single('capa'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
        }

        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ erro: 'O arquivo deve ser uma imagem (JPG, PNG).' });
        }

        const resultado = await uploadBuffer(
            req.file.buffer,
            'sr-lancamentos/empreendimentos/capas',
            { resource_type: 'image' }
        );

        res.json({
            url: resultado.secure_url,
            public_id: resultado.public_id
        });

    } catch (err) {
        console.error('[upload-capa] erro:', err);
        res.status(500).json({ erro: 'Erro ao fazer upload da capa.' });
    }
});

// POST /api/admin/empreendimentos/upload-pdf
routerAdmin.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
        }

        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ erro: 'O arquivo deve ser um PDF.' });
        }

        const resultado = await uploadBuffer(
            req.file.buffer,
            'sr-lancamentos/empreendimentos/pdfs',
            { resource_type: 'raw' }
        );

        res.json({
            url: resultado.secure_url,
            public_id: resultado.public_id
        });

    } catch (err) {
        console.error('[upload-pdf] erro:', err);
        res.status(500).json({ erro: 'Erro ao fazer upload do PDF.' });
    }
});

/* =========================================================
   GOOGLE DRIVE — Análise (lista PDFs sem baixar)
   ========================================================= */

// POST /api/admin/empreendimentos/drive/analisar
routerAdmin.post('/drive/analisar', async (req, res) => {
    try {
        const { driveUrl } = req.body || {};

        if (!driveUrl) {
            return res.status(400).json({ erro: 'Informe o link do Drive.' });
        }

        // 1. Tenta como PASTA
        const folderId = extrairFolderId(driveUrl);

        if (folderId) {
            let arquivos;
            try {
                arquivos = await listarArquivosDaPasta(folderId);
            } catch (err) {
                console.error('[drive/analisar] erro na API (folder):', err.message);

                if (err.message.includes('not found') || err.code === 404) {
                    return res.status(404).json({
                        erro: 'Pasta não encontrada. Verifique se o link está correto.'
                    });
                }

                if (err.message.includes('permission') || err.code === 403) {
                    return res.status(403).json({
                        erro: 'Sem permissão para acessar essa pasta. Ela precisa estar como "Qualquer pessoa com o link pode ver".'
                    });
                }

                throw err;
            }

            const pdfs = filtrarPdfs(arquivos);

            const pdfsComInfo = pdfs.map(pdf => ({
                id: pdf.id,
                nome: pdf.name,
                tamanho: pdf.size ? Number(pdf.size) : null,
                modificado: pdf.modifiedTime,
                tipo: classificarArquivo(pdf.name)
            }));

            return res.json({
                tipo: 'pasta',
                folderId,
                totalArquivos: arquivos.length,
                totalPdfs: pdfs.length,
                pdfs: pdfsComInfo,
                outros: arquivos.length - pdfs.length
            });
        }

        // 2. Tenta como ARQUIVO
        const fileId = extrairFileId(driveUrl);

        if (fileId) {
            let arquivo;
            try {
                arquivo = await buscarArquivo(fileId);
            } catch (err) {
                console.error('[drive/analisar] erro na API (file):', err.message);

                if (err.message.includes('not found') || err.code === 404) {
                    return res.status(404).json({
                        erro: 'Arquivo não encontrado. Verifique se o link está correto.'
                    });
                }

                if (err.message.includes('permission') || err.code === 403) {
                    return res.status(403).json({
                        erro: 'Sem permissão para acessar esse arquivo. Ele precisa estar como "Qualquer pessoa com o link pode ver".'
                    });
                }

                throw err;
            }

            if (arquivo.mimeType !== 'application/pdf') {
                return res.status(400).json({
                    erro: 'Esse link não é um arquivo PDF. Envie o link de uma pasta ou de um PDF.'
                });
            }

            const pdfsComInfo = [{
                id: arquivo.id,
                nome: arquivo.name,
                tamanho: arquivo.size ? Number(arquivo.size) : null,
                modificado: arquivo.modifiedTime,
                tipo: classificarArquivo(arquivo.name)
            }];

            return res.json({
                tipo: 'arquivo',
                fileId,
                totalArquivos: 1,
                totalPdfs: 1,
                pdfs: pdfsComInfo,
                outros: 0
            });
        }

        return res.status(400).json({
            erro: 'Link inválido. Use um link de pasta ou de arquivo do Google Drive.'
        });

    } catch (err) {
        console.error('[drive/analisar] erro:', err);
        res.status(500).json({ erro: 'Erro ao analisar o link do Drive.' });
    }
});

/* =========================================================
   GOOGLE DRIVE — Importar (baixa + extrai texto + IA + capa)
   ========================================================= */

// POST /api/admin/empreendimentos/drive/importar
// Recebe: { pdfs: [{ id, nome, tipo }] }
// Não sobe mais o PDF pro Cloudinary — guarda só o link do Drive + capa
routerAdmin.post('/drive/importar', async (req, res) => {
    try {
        const { pdfs } = req.body || {};

        if (!Array.isArray(pdfs) || !pdfs.length) {
            return res.status(400).json({ erro: 'Nenhum PDF selecionado para importar.' });
        }

        if (pdfs.length > 5) {
            return res.status(400).json({ erro: 'Máximo de 5 PDFs por importação.' });
        }

        const resultados = [];

        for (const pdf of pdfs) {
            const resultado = {
                id: pdf.id,
                nome: pdf.nome,
                tipo: pdf.tipo,
                sucesso: false,
                erro: null,
                drive_url: null,           // 👈 NOVO — link do Drive
                capa_url: null,
                capa_public_id: null,
                texto: '',
                num_paginas: 0,
                dados_ia: null
            };

            try {
                // 1. Baixa do Drive (só pra extrair texto + capa em memória)
                console.log(`[drive/importar] baixando ${pdf.nome}...`);
                const buffer = await baixarArquivo(pdf.id);

                if (!buffer || !buffer.length) {
                    throw new Error('PDF vazio ou não encontrado.');
                }

                // 2. Monta o link público do Drive (o "backup" agora é o próprio Drive)
                resultado.drive_url = `https://drive.google.com/file/d/${pdf.id}/view`;

                // 3. Extrai TEXTO (pdf-parse 1.x)
                console.log(`[drive/importar] extraindo texto de ${pdf.nome}...`);
                const { texto, numPaginas, erro: erroPdf } = await extrairTextoPdf(buffer);

                if (erroPdf) throw new Error(`Erro ao extrair texto: ${erroPdf}`);

                resultado.texto = texto;
                resultado.num_paginas = numPaginas;

                // 4. Extrai CAPA (primeira página do PDF) e sobe pro Cloudinary
                //    Capa é pequena (~200KB), sempre passa no limite de 10MB
                console.log(`[drive/importar] extraindo capa de ${pdf.nome}...`);
                const capaBuffer = await extrairPrimeiraImagem(buffer);

                if (capaBuffer) {
                    const uploadCapa = await uploadBuffer(
                        capaBuffer,
                        'sr-lancamentos/empreendimentos/capas-importadas',
                        { resource_type: 'image', public_id: `capa_${Date.now()}_${pdf.id}` }
                    );
                    resultado.capa_url = uploadCapa.secure_url;
                    resultado.capa_public_id = uploadCapa.public_id;
                }

                // 5. Chama a IA (Gemini) pra estruturar
                console.log(`[drive/importar] extraindo dados com IA (${pdf.nome})...`);
                resultado.dados_ia = await extrairDadosComIA(texto);

                resultado.sucesso = true;
                console.log(`[drive/importar] ✅ ${pdf.nome} processado`);

            } catch (err) {
                console.error(`[drive/importar] erro no PDF ${pdf.nome}:`, err.message);
                resultado.erro = err.message;
                resultado.sucesso = false;
            }

            resultados.push(resultado);
        }

        const sucessoCount = resultados.filter(r => r.sucesso).length;
        const erroCount = resultados.filter(r => !r.sucesso).length;

        res.json({
            ok: true,
            total: resultados.length,
            sucesso: sucessoCount,
            erros: erroCount,
            resultados
        });

    } catch (err) {
        console.error('[drive/importar] erro geral:', err);
        res.status(500).json({ erro: 'Erro ao importar PDFs.' });
    }
});

/* =========================================================
   CRUD — LISTAR / BUSCAR / CRIAR / EDITAR / EXCLUIR
   ========================================================= */

// GET /api/admin/empreendimentos
routerAdmin.get('/', async (req, res) => {
    try {
        const { status, construtora, cidade, busca } = req.query;
        const params = [];
        let where = 'WHERE 1=1';

        if (status) {
            params.push(status);
            where += ` AND status = $${params.length}`;
        }
        if (construtora) {
            params.push(`%${construtora}%`);
            where += ` AND construtora ILIKE $${params.length}`;
        }
        if (cidade) {
            params.push(`%${cidade}%`);
            where += ` AND cidade ILIKE $${params.length}`;
        }
        if (busca) {
            params.push(`%${busca}%`);
            where += ` AND (nome ILIKE $${params.length} OR descricao ILIKE $${params.length})`;
        }

        const result = await pool.query(`
            SELECT * FROM empreendimentos
            ${where}
            ORDER BY atualizado_em DESC
        `, params);

        res.json({ empreendimentos: result.rows });

    } catch (err) {
        console.error('[admin/empreendimentos GET] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar empreendimentos.' });
    }
});

// GET /api/admin/empreendimentos/:id
routerAdmin.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await pool.query(
            'SELECT * FROM empreendimentos WHERE id = $1',
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ erro: 'Empreendimento não encontrado.' });
        }

        res.json({ empreendimento: result.rows[0] });

    } catch (err) {
        console.error('[admin/empreendimentos/:id] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar empreendimento.' });
    }
});

// POST /api/admin/empreendimentos — criar
routerAdmin.post('/', async (req, res) => {
    try {
        const {
            nome, construtora, endereco, bairro, cidade, estado,
            tipo_imovel, fase, previsao_entrega, dormitorios, metragens, vagas,
            comodidades, descricao, observacoes,
            capa_url, capa_public_id, pdf_url, pdf_public_id
        } = req.body || {};

        if (!nome) {
            return res.status(400).json({ erro: 'Informe o nome do empreendimento.' });
        }

        const result = await pool.query(`
            INSERT INTO empreendimentos
                (nome, construtora, endereco, bairro, cidade, estado,
                 tipo_imovel, fase, previsao_entrega, dormitorios, metragens, vagas,
                 comodidades, descricao, observacoes,
                 capa_url, capa_public_id, pdf_url, pdf_public_id,
                 criado_por)
            VALUES
                ($1, $2, $3, $4, $5, $6,
                 $7, $8, $9, $10, $11, $12,
                 $13::jsonb, $14, $15,
                 $16, $17, $18, $19,
                 $20)
            RETURNING *
        `, [
            nome.trim(),
            construtora || null,
            endereco || null,
            bairro || null,
            cidade || null,
            estado || null,
            tipo_imovel || null,
            fase || null,
            previsao_entrega || null,
            dormitorios || null,
            metragens || null,
            vagas || null,
            JSON.stringify(comodidades || []),
            descricao || null,
            observacoes || null,
            capa_url || null,
            capa_public_id || null,
            pdf_url || null,
            pdf_public_id || null,
            req.usuario.id
        ]);

        await pool.query(`
            INSERT INTO empreendimento_logs (empreendimento_id, admin_id, acao, detalhes)
            VALUES ($1, $2, 'criado', $3::jsonb)
        `, [result.rows[0].id, req.usuario.id, JSON.stringify({ origem: 'manual' })]);

        res.status(201).json({ empreendimento: result.rows[0] });

    } catch (err) {
        console.error('[admin/empreendimentos POST] erro:', err);
        res.status(500).json({ erro: 'Erro ao criar empreendimento.' });
    }
});

// PATCH /api/admin/empreendimentos/:id
routerAdmin.patch('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const campos = req.body || {};

        const permitidos = [
            'nome', 'construtora', 'endereco', 'bairro', 'cidade', 'estado',
            'tipo_imovel', 'fase', 'previsao_entrega', 'dormitorios', 'metragens',
            'vagas', 'comodidades', 'descricao', 'observacoes',
            'capa_url', 'capa_public_id', 'pdf_url', 'pdf_public_id'
        ];

        const sets = [];
        const params = [];

        for (const [key, value] of Object.entries(campos)) {
            if (!permitidos.includes(key)) continue;

            params.push(key === 'comodidades' ? JSON.stringify(value || []) : value);
            const cast = key === 'comodidades' ? '::jsonb' : '';
            sets.push(`${key} = $${params.length}${cast}`);
        }

        if (!sets.length) {
            return res.status(400).json({ erro: 'Nenhum campo válido para atualizar.' });
        }

        sets.push(`atualizado_em = NOW()`);
        params.push(id);

        const result = await pool.query(`
            UPDATE empreendimentos
            SET ${sets.join(', ')}
            WHERE id = $${params.length}
            RETURNING *
        `, params);

        if (!result.rows.length) {
            return res.status(404).json({ erro: 'Empreendimento não encontrado.' });
        }

        await pool.query(`
            INSERT INTO empreendimento_logs (empreendimento_id, admin_id, acao, detalhes)
            VALUES ($1, $2, 'editado', $3::jsonb)
        `, [id, req.usuario.id, JSON.stringify({ campos: Object.keys(campos) })]);

        res.json({ empreendimento: result.rows[0] });

    } catch (err) {
        console.error('[admin/empreendimentos PATCH] erro:', err);
        res.status(500).json({ erro: 'Erro ao atualizar empreendimento.' });
    }
});

// PATCH /api/admin/empreendimentos/:id/status
routerAdmin.patch('/:id/status', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        if (!['rascunho', 'publicado', 'arquivado'].includes(status)) {
            return res.status(400).json({ erro: 'Status inválido.' });
        }

        const publicado_em = status === 'publicado' ? 'NOW()' : 'publicado_em';

        const result = await pool.query(`
            UPDATE empreendimentos
            SET status = $1,
                publicado_em = ${publicado_em},
                atualizado_em = NOW()
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        if (!result.rows.length) {
            return res.status(404).json({ erro: 'Empreendimento não encontrado.' });
        }

        await pool.query(`
            INSERT INTO empreendimento_logs (empreendimento_id, admin_id, acao, detalhes)
            VALUES ($1, $2, $3, $4::jsonb)
        `, [id, req.usuario.id, status, JSON.stringify({ novo_status: status })]);

        res.json({ empreendimento: result.rows[0] });

    } catch (err) {
        console.error('[admin/empreendimentos/status] erro:', err);
        res.status(500).json({ erro: 'Erro ao alterar status.' });
    }
});

// DELETE /api/admin/empreendimentos/:id
routerAdmin.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const check = await pool.query(
            'SELECT capa_public_id, pdf_public_id FROM empreendimentos WHERE id = $1',
            [id]
        );

        if (!check.rows.length) {
            return res.status(404).json({ erro: 'Empreendimento não encontrado.' });
        }

        const { capa_public_id, pdf_public_id } = check.rows[0];

        await pool.query('DELETE FROM empreendimentos WHERE id = $1', [id]);

        if (capa_public_id) deletarArquivo(capa_public_id, 'image');
        if (pdf_public_id) deletarArquivo(pdf_public_id, 'raw');

        res.json({ ok: true });

    } catch (err) {
        console.error('[admin/empreendimentos DELETE] erro:', err);
        res.status(500).json({ erro: 'Erro ao excluir empreendimento.' });
    }
});

/* =========================================================
   ROUTER DO CORRETOR
   ========================================================= */

const routerCorretor = express.Router();
routerCorretor.use(autenticar, apenasCorretor);

// GET /api/corretor/empreendimentos — só publicados
routerCorretor.get('/', async (req, res) => {
    try {
        const { construtora, cidade, busca } = req.query;
        const params = [];
        let where = `WHERE status = 'publicado'`;

        if (construtora) {
            params.push(`%${construtora}%`);
            where += ` AND construtora ILIKE $${params.length}`;
        }
        if (cidade) {
            params.push(`%${cidade}%`);
            where += ` AND cidade ILIKE $${params.length}`;
        }
        if (busca) {
            params.push(`%${busca}%`);
            where += ` AND nome ILIKE $${params.length}`;
        }

        const result = await pool.query(`
            SELECT
                id, nome, construtora, endereco, bairro, cidade, estado,
                tipo_imovel, fase, previsao_entrega, dormitorios, metragens, vagas,
                comodidades, descricao,
                capa_url, pdf_url,
                publicado_em
            FROM empreendimentos
            ${where}
            ORDER BY publicado_em DESC NULLS LAST
        `, params);

        res.json({ empreendimentos: result.rows });

    } catch (err) {
        console.error('[corretor/empreendimentos GET] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar empreendimentos.' });
    }
});

// GET /api/corretor/empreendimentos/:id
routerCorretor.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await pool.query(`
            SELECT
                id, nome, construtora, endereco, bairro, cidade, estado,
                tipo_imovel, fase, previsao_entrega, dormitorios, metragens, vagas,
                comodidades, descricao,
                capa_url, pdf_url,
                publicado_em
            FROM empreendimentos
            WHERE id = $1 AND status = 'publicado'
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ erro: 'Empreendimento não encontrado.' });
        }

        res.json({ empreendimento: result.rows[0] });

    } catch (err) {
        console.error('[corretor/empreendimentos/:id] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar empreendimento.' });
    }
});

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = { routerAdmin, routerCorretor };