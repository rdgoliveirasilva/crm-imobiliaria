/* =========================================================
   ROTAS DO ADMINISTRADOR
   ========================================================= */

const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = express.Router();

// Todas as rotas aqui exigem login de admin
router.use(autenticar, apenasAdmin);

/* =========================================================
   HELPERS
   ========================================================= */

function embaralhar(arr) {
    const copia = [...arr];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/**
 * Normaliza telefone para comparação (dedupe).
 * Remove tudo que não é dígito e pega os últimos 10 ou 11 dígitos
 * (ignora DDI +55, +, 0 inicial, etc).
 */
function normalizarTelefone(tel) {
    let n = String(tel || '').replace(/\D/g, '');
    if (!n) return '';

    // Remove prefixo 55 (DDI Brasil) se tiver
    if (n.startsWith('55') && n.length >= 12) {
        n = n.substring(2);
    }

    // Remove 0 inicial se tiver
    if (n.startsWith('0') && n.length >= 11) {
        n = n.substring(1);
    }

    // Pega os últimos 10-11 dígitos (DDD + número)
    if (n.length > 11) {
        n = n.slice(-11);
    }

    return n;
}

/**
 * Filtra contatos que já existem no banco.
 * Compara usando normalização (ignora formato).
 * Retorna { novos, descartados }.
 */
async function filtrarDuplicados(client, contatos) {
    if (!contatos.length) return { novos: [], descartados: [] };

    // Normaliza os telefones dos novos
    const contatosComNorm = contatos.map(c => ({
        ...c,
        _norm: normalizarTelefone(c.telefone)
    }));

    // Pega todos os telefones do banco (só dígitos, últimos 11)
    // Procuramos por correspondência nos últimos 10-11 dígitos
    const todosLeads = await client.query(`SELECT telefone FROM leads`);

    const normExistentes = new Set(
        todosLeads.rows.map(r => normalizarTelefone(r.telefone))
    );

    const novos = [];
    const descartados = [];

    for (const c of contatosComNorm) {
        if (normExistentes.has(c._norm)) {
            descartados.push({ nome: c.nome, telefone: c.telefone });
        } else {
            // Remove o campo _norm antes de devolver
            const { _norm, ...original } = c;
            novos.push(original);

            // Adiciona à lista de existentes pra evitar duplicata dentro do próprio upload
            normExistentes.add(_norm);
        }
    }

    return { novos, descartados };
}

/**
 * Insere leads em massa (bulk insert) em chunks.
 */
async function inserirLeadsEmMassa(client, listaId, contatos, idsValidos) {
    const CHUNK_SIZE = 500;
    const distribuicao = {};
    idsValidos.forEach(id => distribuicao[id] = 0);

    if (!contatos.length) return distribuicao;

    // Embaralha os contatos
    const embaralhados = embaralhar(contatos);

    // Monta os pares (contato, corretorId) em rodadas
    const pares = [];
    let idx = 0;
    for (const contato of embaralhados) {
        const corretorId = idsValidos[idx % idsValidos.length];
        pares.push({ contato, corretorId });
        distribuicao[corretorId]++;
        idx++;
    }

    // Processa em chunks
    for (let i = 0; i < pares.length; i += CHUNK_SIZE) {
        const chunk = pares.slice(i, i + CHUNK_SIZE);

        const values = [];
        const params = [];
        let p = 1;

        for (const { contato, corretorId } of chunk) {
            values.push(`($${p++}, $${p++}, $${p++}, $${p++}, 'novo', NOW())`);
            params.push(listaId, contato.nome, contato.telefone, corretorId);
        }

        await client.query(`
            INSERT INTO leads (lista_id, nome, telefone, corretor_id, status, distribuido_em)
            VALUES ${values.join(', ')}
        `, params);
    }

    return distribuicao;
}

/* =========================================================
   CORRETORES
   ========================================================= */

// GET /api/admin/corretores
router.get('/corretores', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.nome, u.usuario, u.criado_em,
                   (SELECT COUNT(*) FROM leads WHERE corretor_id = u.id) AS total_leads
            FROM usuarios u
            WHERE u.tipo = 'corretor'
            ORDER BY u.nome ASC
        `);

        const corretores = result.rows.map(c => ({
            ...c,
            total_leads: Number(c.total_leads)
        }));

        res.json({ corretores });

    } catch (err) {
        console.error('[admin/corretores] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar corretores.' });
    }
});

// POST /api/admin/corretores
router.post('/corretores', async (req, res) => {
    try {
        const { nome, usuario, senha } = req.body || {};

        if (!nome || !usuario || !senha) {
            return res.status(400).json({ erro: 'Informe nome, usuário e senha.' });
        }

        const usuarioLimpo = usuario.toLowerCase().trim();

        if (!/^[a-z0-9._-]{3,}$/.test(usuarioLimpo)) {
            return res.status(400).json({ erro: 'Usuário inválido. Use 3+ caracteres (letras, números, . _ -).' });
        }

        if (senha.length < 4) {
            return res.status(400).json({ erro: 'Senha muito curta (mínimo 4 caracteres).' });
        }

        const existe = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuarioLimpo]);
        if (existe.rows.length) {
            return res.status(409).json({ erro: 'Este usuário já está cadastrado.' });
        }

        const hash = bcrypt.hashSync(senha, 10);

        const result = await pool.query(`
            INSERT INTO usuarios (nome, usuario, senha_hash, tipo)
            VALUES ($1, $2, $3, 'corretor')
            RETURNING id, nome, usuario, criado_em
        `, [nome.trim(), usuarioLimpo, hash]);

        res.status(201).json({ corretor: result.rows[0] });

    } catch (err) {
        console.error('[admin/corretores POST] erro:', err);
        res.status(500).json({ erro: 'Erro ao cadastrar corretor.' });
    }
});

// DELETE /api/admin/corretores/:id
router.delete('/corretores/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const exist = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1 AND tipo = $2',
            [id, 'corretor']
        );

        if (!exist.rows.length) {
            return res.status(404).json({ erro: 'Corretor não encontrado.' });
        }

        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ ok: true });

    } catch (err) {
        console.error('[admin/corretores DELETE] erro:', err);
        res.status(500).json({ erro: 'Erro ao excluir corretor.' });
    }
});

/* =========================================================
   LISTAS
   ========================================================= */

// GET /api/admin/listas
router.get('/listas', async (req, res) => {
    try {
        const listasResult = await pool.query('SELECT * FROM listas ORDER BY criado_em DESC');

        const comStats = [];
        for (const lista of listasResult.rows) {
            const stats = await pool.query(`
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'qualificado') AS qualificados,
                    COUNT(*) FILTER (WHERE status = 'descartado')  AS descartados,
                    COUNT(*) FILTER (WHERE status = 'novo')        AS aguardando
                FROM leads
                WHERE lista_id = $1
            `, [lista.id]);

            const corretores = await pool.query(`
                SELECT DISTINCT u.id, u.nome, u.usuario
                FROM usuarios u
                INNER JOIN leads l ON l.corretor_id = u.id
                WHERE l.lista_id = $1
                ORDER BY u.nome ASC
            `, [lista.id]);

            const s = stats.rows[0];

            comStats.push({
                ...lista,
                total: Number(s.total),
                qualificados: Number(s.qualificados),
                descartados: Number(s.descartados),
                aguardando: Number(s.aguardando),
                corretores: corretores.rows
            });
        }

        res.json({ listas: comStats });

    } catch (err) {
        console.error('[admin/listas] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar listas.' });
    }
});

// POST /api/admin/listas — subir e distribuir (com bulk insert + dedupe)
router.post('/listas', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            nome,
            contatos,
            corretoresIds,
            mensagemWhatsapp,
            listaIdExistente
        } = req.body || {};

        if (!nome || !Array.isArray(contatos) || !contatos.length) {
            return res.status(400).json({ erro: 'Informe o nome da lista e pelo menos 1 contato.' });
        }

        // ============================================================
        // DEDUPE — Remove contatos que já existem no banco
        // ============================================================
        const { novos: contatosNovos, descartados } = await filtrarDuplicados(client, contatos);

        if (!contatosNovos.length) {
            return res.status(400).json({
                erro: 'Todos os contatos já existem no sistema.',
                descartados: descartados.length
            });
        }

        // ============================================================
        // CASO 1 — ATUALIZAR LISTA EXISTENTE
        // ============================================================
        if (listaIdExistente) {
            const listaId = Number(listaIdExistente);

            const listaCheck = await client.query('SELECT * FROM listas WHERE id = $1', [listaId]);
            if (!listaCheck.rows.length) {
                return res.status(404).json({ erro: 'Lista não encontrada.' });
            }

            // 🔑 FONTE DE VERDADE: tabela lista_corretores
            const corretoresResult = await client.query(
                'SELECT corretor_id FROM lista_corretores WHERE lista_id = $1',
                [listaId]
            );

            let idsValidos;

            if (corretoresResult.rows.length) {
                // Usa quem está em lista_corretores
                idsValidos = corretoresResult.rows.map(r => r.corretor_id);
            } else {
                // Fallback: procura quem tem leads na lista (bancos antigos)
                const fallback = await client.query(`
                    SELECT DISTINCT corretor_id
                    FROM leads
                    WHERE lista_id = $1 AND corretor_id IS NOT NULL
                `, [listaId]);

                if (!fallback.rows.length) {
                    return res.status(400).json({
                        erro: 'Essa lista ainda não tem corretores. Adicione ao menos um antes de atualizar.'
                    });
                }
                idsValidos = fallback.rows.map(r => r.corretor_id);
            }

            await client.query('BEGIN');

            const distribuicao = await inserirLeadsEmMassa(client, listaId, contatosNovos, idsValidos);

            await client.query(`
                UPDATE listas
                SET total = total + $1
                WHERE id = $2
            `, [contatosNovos.length, listaId]);

            await client.query('COMMIT');

            return res.status(201).json({
                ok: true,
                listaId,
                atualizada: true,
                adicionados: contatosNovos.length,
                descartados: descartados.length,
                distribuicao
            });
        }

        // ============================================================
        // CASO 2 — CRIAR LISTA NOVA
        // ============================================================
        if (!Array.isArray(corretoresIds) || !corretoresIds.length) {
            return res.status(400).json({ erro: 'Selecione pelo menos 1 corretor.' });
        }

        const placeholders = corretoresIds.map((_, i) => `$${i + 1}`).join(',');
        const corretoresValidos = await client.query(
            `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo = 'corretor'`,
            corretoresIds
        );

        if (corretoresValidos.rows.length !== corretoresIds.length) {
            return res.status(400).json({ erro: 'Um ou mais corretores não existem.' });
        }

        const idsValidos = corretoresValidos.rows.map(c => c.id);

        await client.query('BEGIN');

        const listaResult = await client.query(
            'INSERT INTO listas (nome, total, mensagem_whatsapp) VALUES ($1, $2, $3) RETURNING id',
            [nome.trim(), contatosNovos.length, mensagemWhatsapp || null]
        );
        const listaId = listaResult.rows[0].id;

        // Registra quem participa dessa lista
        for (const corretorId of idsValidos) {
            await client.query(
                'INSERT INTO lista_corretores (lista_id, corretor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [listaId, corretorId]
            );
        }

        const distribuicao = await inserirLeadsEmMassa(client, listaId, contatosNovos, idsValidos);

        await client.query('COMMIT');

        res.status(201).json({
            ok: true,
            listaId,
            atualizada: false,
            total: contatosNovos.length,
            descartados: descartados.length,
            distribuicao
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[admin/listas POST] erro:', err);
        res.status(500).json({ erro: 'Erro ao subir lista.' });
    } finally {
        client.release();
    }
});

// GET /api/admin/listas/:id/contatos
router.get('/listas/:id/contatos', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const result = await pool.query(`
            SELECT l.*, u.nome AS corretor_nome
            FROM leads l
            LEFT JOIN usuarios u ON u.id = l.corretor_id
            WHERE l.lista_id = $1
            ORDER BY l.id ASC
        `, [id]);

        res.json({ contatos: result.rows });

    } catch (err) {
        console.error('[admin/listas contatos] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar contatos.' });
    }
});

// DELETE /api/admin/listas/:id
router.delete('/listas/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await pool.query('DELETE FROM listas WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[admin/listas DELETE] erro:', err);
        res.status(500).json({ erro: 'Erro ao excluir lista.' });
    }
});

// DELETE /api/admin/leads/:id
router.delete('/leads/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await pool.query('DELETE FROM leads WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[admin/leads DELETE] erro:', err);
        res.status(500).json({ erro: 'Erro ao excluir lead.' });
    }
});

/* =========================================================
   DASHBOARD
   ========================================================= */

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const totais = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM listas) AS total_listas,
                (SELECT COUNT(*) FROM leads) AS total_contatos,
                (SELECT COUNT(*) FROM leads WHERE status = 'qualificado') AS qualificados,
                (SELECT COUNT(*) FROM leads WHERE status = 'descartado')  AS descartados,
                (SELECT COUNT(*) FROM leads WHERE status = 'novo')        AS aguardando
        `);

        const t = totais.rows[0];

        const porCorretor = await pool.query(`
            SELECT
                u.id, u.nome, u.usuario,
                COUNT(l.id) AS total,
                COUNT(l.id) FILTER (WHERE l.status = 'qualificado') AS qualificados,
                COUNT(l.id) FILTER (WHERE l.status = 'descartado')  AS descartados,
                COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS aguardando
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo = 'corretor'
            GROUP BY u.id
            ORDER BY u.nome ASC
        `);

        const porTag = await pool.query(`
            SELECT resultado, COUNT(*) AS count
            FROM leads
            WHERE resultado IS NOT NULL
            GROUP BY resultado
        `);

        const porTagObj = {};
        porTag.rows.forEach(r => porTagObj[r.resultado] = Number(r.count));

        res.json({
            totalListas: Number(t.total_listas),
            totalContatos: Number(t.total_contatos),
            qualificados: Number(t.qualificados),
            descartados: Number(t.descartados),
            aguardando: Number(t.aguardando),
            porCorretor: porCorretor.rows.map(c => ({
                ...c,
                total: Number(c.total),
                qualificados: Number(c.qualificados),
                descartados: Number(c.descartados),
                aguardando: Number(c.aguardando)
            })),
            porTag: porTagObj
        });

    } catch (err) {
        console.error('[admin/dashboard] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar dashboard.' });
    }
});

/* =========================================================
   DASHBOARD — CARTEIRAS E CORRETORES
   ========================================================= */

// GET /api/admin/dashboard/carteiras
router.get('/dashboard/carteiras', async (req, res) => {
    try {
        const corretoresResult = await pool.query(`
            SELECT
                u.id,
                u.nome,
                u.usuario,
                u.ultimo_acesso,
                COUNT(l.id) FILTER (WHERE l.status = 'qualificado') AS total_qualificados,
                COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS total_fila,
                COUNT(l.id) AS total_carteira
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo = 'corretor'
            GROUP BY u.id
            ORDER BY u.nome ASC
        `);

        const agora = Date.now();

        const corretoresResumo = corretoresResult.rows.map(c => {
            let status = 'offline';

            if (c.ultimo_acesso) {
                const diffMin = Math.floor((agora - new Date(c.ultimo_acesso).getTime()) / 60000);

                if (diffMin <= 14) status = 'online';
                else if (diffMin <= 19) status = 'ausente';
                else status = 'offline';
            }

            return {
                id: c.id,
                nome: c.nome,
                usuario: c.usuario,
                status,
                ultimo_acesso: c.ultimo_acesso,
                total_qualificados: Number(c.total_qualificados),
                total_fila: Number(c.total_fila),
                total_carteira: Number(c.total_carteira)
            };
        });

        const listasResult = await pool.query(`
            SELECT id, nome, total, criado_em
            FROM listas
            ORDER BY criado_em DESC
        `);

        const carteiras = [];

        for (const lista of listasResult.rows) {
            const porCorretorResult = await pool.query(`
                SELECT
                    u.id,
                    u.nome,
                    u.usuario,
                    COUNT(l.id) AS recebeu,
                    COUNT(l.id) FILTER (WHERE l.status = 'qualificado') AS qualificou,
                    COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS fila,
                    COUNT(l.id) FILTER (WHERE l.status = 'descartado')  AS descartou
                FROM usuarios u
                INNER JOIN leads l ON l.corretor_id = u.id
                WHERE l.lista_id = $1
                GROUP BY u.id
                ORDER BY u.nome ASC
            `, [lista.id]);

            carteiras.push({
                lista_id: lista.id,
                nome: lista.nome,
                total: lista.total,
                criado_em: lista.criado_em,
                corretores: porCorretorResult.rows.map(c => ({
                    id: c.id,
                    nome: c.nome,
                    usuario: c.usuario,
                    recebeu: Number(c.recebeu),
                    qualificou: Number(c.qualificou),
                    fila: Number(c.fila),
                    descartou: Number(c.descartou)
                }))
            });
        }

        res.json({ corretoresResumo, carteiras });

    } catch (err) {
        console.error('[admin/dashboard/carteiras] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar carteiras.' });
    }
});

/* =========================================================
   GERENCIAR CORRETORES DA LISTA (rebalanceamento)
   ========================================================= */

// GET /api/admin/listas/:id/corretores
router.get('/listas/:id/corretores', async (req, res) => {
    try {
        const listaId = Number(req.params.id);

        const lista = await pool.query('SELECT id, nome, mensagem_whatsapp FROM listas WHERE id = $1', [listaId]);
        if (!lista.rows.length) {
            return res.status(404).json({ erro: 'Lista não encontrada.' });
        }

        const todos = await pool.query(`
            SELECT
                u.id,
                u.nome,
                u.usuario,
                EXISTS (
                    SELECT 1 FROM lista_corretores 
                    WHERE lista_id = $1 AND corretor_id = u.id
                ) AS participa,
                COUNT(l.id) FILTER (WHERE l.lista_id = $1 AND l.status = 'novo')        AS pendentes_na_lista,
                COUNT(l.id) FILTER (WHERE l.lista_id = $1 AND l.status = 'qualificado') AS qualificados_na_lista,
                COUNT(l.id) FILTER (WHERE l.lista_id = $1) AS total_na_lista
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo = 'corretor'
            GROUP BY u.id
            ORDER BY u.nome ASC
        `, [listaId]);

        const corretores = todos.rows.map(c => ({
            id: c.id,
            nome: c.nome,
            usuario: c.usuario,
            participa: c.participa,
            pendentes_na_lista: Number(c.pendentes_na_lista),
            qualificados_na_lista: Number(c.qualificados_na_lista),
            total_na_lista: Number(c.total_na_lista)
        }));

        res.json({
            lista: lista.rows[0],
            corretores
        });

    } catch (err) {
        console.error('[admin/listas/corretores GET] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar corretores da lista.' });
    }
});

// PATCH /api/admin/listas/:id/corretores
router.patch('/listas/:id/corretores', async (req, res) => {
    const client = await pool.connect();
    try {
        const listaId = Number(req.params.id);
        const { corretoresIds } = req.body || {};

        if (!Array.isArray(corretoresIds) || !corretoresIds.length) {
            return res.status(400).json({ erro: 'Selecione pelo menos 1 corretor.' });
        }

        const listaCheck = await client.query('SELECT id, nome FROM listas WHERE id = $1', [listaId]);
        if (!listaCheck.rows.length) {
            return res.status(404).json({ erro: 'Lista não encontrada.' });
        }

        const placeholders = corretoresIds.map((_, i) => `$${i + 1}`).join(',');
        const corretoresValidos = await client.query(
            `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo = 'corretor'`,
            corretoresIds
        );

        if (corretoresValidos.rows.length !== corretoresIds.length) {
            return res.status(400).json({ erro: 'Um ou mais corretores não existem.' });
        }

        const idsNovos = corretoresValidos.rows.map(c => c.id);

        const atuaisResult = await client.query(
            'SELECT corretor_id FROM lista_corretores WHERE lista_id = $1',
            [listaId]
        );
        const idsAntigos = atuaisResult.rows.map(r => r.corretor_id);

        const idsAdicionados = idsNovos.filter(id => !idsAntigos.includes(id));
        const idsRemovidos  = idsAntigos.filter(id => !idsNovos.includes(id));

        await client.query('BEGIN');

        // 1. Atualiza lista_corretores
        for (const id of idsRemovidos) {
            await client.query(
                'DELETE FROM lista_corretores WHERE lista_id = $1 AND corretor_id = $2',
                [listaId, id]
            );
        }
        for (const id of idsAdicionados) {
            await client.query(
                'INSERT INTO lista_corretores (lista_id, corretor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [listaId, id]
            );
        }

        // 2. Atribui leads órfãos
        let redistribuidos = 0;

        const orfaosResult = await client.query(`
            SELECT id FROM leads
            WHERE lista_id = $1 AND corretor_id IS NULL
            ORDER BY id ASC
        `, [listaId]);

        const orfaos = orfaosResult.rows;

        if (orfaos.length && idsNovos.length) {
            let idx = 0;
            for (const orfao of orfaos) {
                const novoCorretor = idsNovos[idx % idsNovos.length];
                await client.query('UPDATE leads SET corretor_id = $1 WHERE id = $2', [novoCorretor, orfao.id]);
                idx++;
                redistribuidos++;
            }
        }

        // 3. Rebalanceamento dos pendentes
        const pendentesResult = await client.query(
            `SELECT id, corretor_id FROM leads WHERE lista_id = $1 AND status = 'novo' AND corretor_id IS NOT NULL ORDER BY id ASC`,
            [listaId]
        );
        const pendentes = pendentesResult.rows;

        if (pendentes.length) {
            if (idsAdicionados.length) {
                const pendentesPorCorretor = {};
                pendentes.forEach(p => {
                    if (idsNovos.includes(p.corretor_id)) {
                        pendentesPorCorretor[p.corretor_id] = pendentesPorCorretor[p.corretor_id] || [];
                        pendentesPorCorretor[p.corretor_id].push(p.id);
                    }
                });

                const candidatos = [...Object.keys(pendentesPorCorretor).map(Number), ...idsAdicionados];
                const paraRedistribuir = [];
                for (const corretorId of Object.keys(pendentesPorCorretor)) {
                    paraRedistribuir.push(...pendentesPorCorretor[corretorId]);
                }

                if (paraRedistribuir.length && candidatos.length) {
                    let idx = 0;
                    for (const leadId of paraRedistribuir) {
                        const novoCorretor = candidatos[idx % candidatos.length];
                        await client.query('UPDATE leads SET corretor_id = $1 WHERE id = $2', [novoCorretor, leadId]);
                        idx++;
                        redistribuidos++;
                    }
                }
            }

            if (idsRemovidos.length && idsNovos.length) {
                const pendentesAgora = await client.query(
                    `SELECT id, corretor_id FROM leads WHERE lista_id = $1 AND status = 'novo' ORDER BY id ASC`,
                    [listaId]
                );

                const pendentesDosRemovidos = pendentesAgora.rows.filter(p => idsRemovidos.includes(p.corretor_id));

                if (pendentesDosRemovidos.length) {
                    let idx = 0;
                    for (const p of pendentesDosRemovidos) {
                        const novoCorretor = idsNovos[idx % idsNovos.length];
                        await client.query('UPDATE leads SET corretor_id = $1 WHERE id = $2', [novoCorretor, p.id]);
                        idx++;
                        redistribuidos++;
                    }
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            ok: true,
            adicionados: idsAdicionados.length,
            removidos: idsRemovidos.length,
            redistribuidos
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[admin/listas/corretores PATCH] erro:', err);
        res.status(500).json({ erro: 'Erro ao gerenciar corretores da lista.' });
    } finally {
        client.release();
    }
});

/* =========================================================
   PREVIEW DE DEDUPE — verifica quais telefones já existem
   ========================================================= */

// POST /api/admin/listas/preview-dedupe
// Body: { contatos: [{nome, telefone}, ...] }
// Retorna: { novos: X, descartados: Y, duplicados: [...] }
router.post('/listas/preview-dedupe', async (req, res) => {
    try {
        const { contatos } = req.body || {};

        if (!Array.isArray(contatos) || !contatos.length) {
            return res.json({ novos: 0, descartados: 0, duplicados: [] });
        }

        const { novos, descartados } = await filtrarDuplicados(pool, contatos);

        res.json({
            novos: novos.length,
            descartados: descartados.length,
            duplicados: descartados.slice(0, 10) // primeiros 10 pra preview
        });

    } catch (err) {
        console.error('[admin/listas preview-dedupe] erro:', err);
        res.status(500).json({ erro: 'Erro ao verificar duplicados.' });
    }
});

/* =========================================================
   ALTERAR MENSAGEM DO WHATSAPP DA LISTA
   ========================================================= */

// PATCH /api/admin/listas/:id/mensagem
// Body: { mensagemWhatsapp: "texto..." }
router.patch('/listas/:id/mensagem', async (req, res) => {
    try {
        const listaId = Number(req.params.id);
        const { mensagemWhatsapp } = req.body || {};

        const lista = await pool.query('SELECT id FROM listas WHERE id = $1', [listaId]);
        if (!lista.rows.length) {
            return res.status(404).json({ erro: 'Lista não encontrada.' });
        }

        await pool.query(
            'UPDATE listas SET mensagem_whatsapp = $1 WHERE id = $2',
            [mensagemWhatsapp || null, listaId]
        );

        res.json({ ok: true });

    } catch (err) {
        console.error('[admin/listas/mensagem PATCH] erro:', err);
        res.status(500).json({ erro: 'Erro ao salvar mensagem.' });
    }
});

module.exports = router;