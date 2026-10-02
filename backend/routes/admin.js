/* =========================================================
   ROTAS DO ADMINISTRADOR
   ========================================================= */

const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = express.Router();

router.use(autenticar, apenasAdmin);

/* =========================================================
   HELPERS
   ========================================================= */

function naoTeste(alias = 'l') {
    return ` AND (${alias}.corretor_id IS NULL OR ${alias}.corretor_id NOT IN (
        SELECT id FROM usuarios WHERE tipo = 'teste'
    ))`;
}

function embaralhar(arr) {
    const copia = [...arr];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function normalizarTelefone(tel) {
    let n = String(tel || '').replace(/\D/g, '');
    if (!n) return '';

    if (n.startsWith('55') && n.length >= 12) n = n.substring(2);
    if (n.startsWith('0') && n.length >= 11) n = n.substring(1);
    if (n.length > 11) n = n.slice(-11);

    return n;
}

async function filtrarDuplicados(client, contatos) {
    if (!contatos.length) return { novos: [], descartados: [] };

    const contatosComNorm = contatos.map(c => ({
        ...c,
        _norm: normalizarTelefone(c.telefone)
    }));

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
            const { _norm, ...original } = c;
            novos.push(original);
            normExistentes.add(_norm);
        }
    }

    return { novos, descartados };
}

async function inserirLeadsEmMassa(client, listaId, contatos, idsValidos) {
    const CHUNK_SIZE = 500;
    const distribuicao = {};
    idsValidos.forEach(id => distribuicao[id] = 0);

    if (!contatos.length) return distribuicao;

    const embaralhados = embaralhar(contatos);

    const pares = [];
    let idx = 0;
    for (const contato of embaralhados) {
        const corretorId = idsValidos[idx % idsValidos.length];
        pares.push({ contato, corretorId });
        distribuicao[corretorId]++;
        idx++;
    }

    for (let i = 0; i < pares.length; i += CHUNK_SIZE) {
        const chunk = pares.slice(i, i + CHUNK_SIZE);

        const values = [];
        const params = [];
        let p = 1;

        for (const { contato, corretorId } of chunk) {
    values.push(`($${p++}, $${p++}, $${p++}, $${p++}, 'novo', NOW() AT TIME ZONE 'America/Sao_Paulo')`);
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

router.get('/corretores', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.nome, u.usuario, u.tipo, u.criado_em,
                   (SELECT COUNT(*) FROM leads WHERE corretor_id = u.id) AS total_leads
            FROM usuarios u
            WHERE u.tipo IN ('corretor', 'teste')
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

router.delete('/corretores/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const exist = await pool.query(
            `SELECT id FROM usuarios WHERE id = $1 AND tipo IN ('corretor', 'teste')`,
            [id]
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

router.patch('/corretores/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nome, usuario, senha } = req.body || {};

        if (!nome || !usuario) {
            return res.status(400).json({ erro: 'Informe nome e usuário.' });
        }

        const usuarioLimpo = usuario.toLowerCase().trim();

        if (!/^[a-z0-9._-]{3,}$/.test(usuarioLimpo)) {
            return res.status(400).json({ erro: 'Usuário inválido. Use 3+ caracteres (letras, números, . _ -).' });
        }

        const corretorCheck = await pool.query(
            `SELECT id FROM usuarios WHERE id = $1 AND tipo IN ('corretor', 'teste')`,
            [id]
        );

        if (!corretorCheck.rows.length) {
            return res.status(404).json({ erro: 'Corretor não encontrado.' });
        }

        const existeOutro = await pool.query(
            'SELECT id FROM usuarios WHERE usuario = $1 AND id != $2',
            [usuarioLimpo, id]
        );

        if (existeOutro.rows.length) {
            return res.status(409).json({ erro: 'Este usuário já está em uso por outro cadastro.' });
        }

        if (senha && senha.trim().length >= 4) {
            const hash = bcrypt.hashSync(senha.trim(), 10);
            await pool.query(`
                UPDATE usuarios
                SET nome = $1, usuario = $2, senha_hash = $3
                WHERE id = $4
            `, [nome.trim(), usuarioLimpo, hash, id]);
        } else if (senha && senha.trim().length > 0 && senha.trim().length < 4) {
            return res.status(400).json({ erro: 'A senha precisa ter no mínimo 4 caracteres.' });
        } else {
            await pool.query(`
                UPDATE usuarios
                SET nome = $1, usuario = $2
                WHERE id = $3
            `, [nome.trim(), usuarioLimpo, id]);
        }

        const atualizado = await pool.query(
            'SELECT id, nome, usuario, criado_em FROM usuarios WHERE id = $1',
            [id]
        );

        res.json({ corretor: atualizado.rows[0] });

    } catch (err) {
        console.error('[admin/corretores PATCH] erro:', err);
        res.status(500).json({ erro: 'Erro ao atualizar corretor.' });
    }
});

/* =========================================================
   ALTERNAR TIPO (corretor ↔ teste)
   ========================================================= */

router.patch('/corretores/:id/tipo', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { tipo } = req.body || {};

        if (!['corretor', 'teste'].includes(tipo)) {
            return res.status(400).json({ erro: 'Tipo inválido. Use "corretor" ou "teste".' });
        }

        const atual = await pool.query(
            `SELECT id, tipo FROM usuarios WHERE id = $1 AND tipo IN ('corretor', 'teste')`,
            [id]
        );

        if (!atual.rows.length) {
            return res.status(404).json({ erro: 'Corretor não encontrado.' });
        }

        if (atual.rows[0].tipo === tipo) {
            return res.json({ ok: true, tipo, mensagem: 'Nada a fazer.' });
        }

        await pool.query(
            `UPDATE usuarios SET tipo = $1 WHERE id = $2`,
            [tipo, id]
        );

        res.json({ ok: true, tipo });

    } catch (err) {
        console.error('[admin/corretores/tipo] erro:', err);
        res.status(500).json({ erro: 'Erro ao alterar tipo do corretor.' });
    }
});

/* =========================================================
   LISTAS
   ========================================================= */

router.get('/listas', async (req, res) => {
    try {
        const listasResult = await pool.query('SELECT * FROM listas ORDER BY criado_em DESC');

        const comStats = [];
        for (const lista of listasResult.rows) {
            const stats = await pool.query(`
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status IN ('qualificado', 'descartado')) AS qualificados,
                    COUNT(*) FILTER (WHERE status = 'descartado')  AS descartados,
                    COUNT(*) FILTER (WHERE status = 'sem_resposta') AS sem_resposta,
                    COUNT(*) FILTER (WHERE status = 'novo')        AS aguardando,
                    COUNT(*) FILTER (WHERE status != 'novo')       AS trabalhados
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
                sem_resposta: Number(s.sem_resposta),
                aguardando: Number(s.aguardando),
                trabalhados: Number(s.trabalhados),
                corretores: corretores.rows
            });
        }

        res.json({ listas: comStats });

    } catch (err) {
        console.error('[admin/listas] erro:', err);
        res.status(500).json({ erro: 'Erro ao listar listas.' });
    }
});

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

        const { novos: contatosNovos, descartados } = await filtrarDuplicados(client, contatos);

        if (!contatosNovos.length) {
            return res.status(400).json({
                erro: 'Todos os contatos já existem no sistema.',
                descartados: descartados.length
            });
        }

        // =====================================================
        // CASO 1 — ATUALIZAR LISTA EXISTENTE
        // Agora RESPEITA os corretores marcados na roleta.
        // =====================================================
        if (listaIdExistente) {
            const listaId = Number(listaIdExistente);

            const listaCheck = await client.query('SELECT * FROM listas WHERE id = $1', [listaId]);
            if (!listaCheck.rows.length) {
                return res.status(404).json({ erro: 'Lista não encontrada.' });
            }

            // 🔑 Valida os corretores que vieram do frontend
            if (!Array.isArray(corretoresIds) || !corretoresIds.length) {
                return res.status(400).json({
                    erro: 'Selecione pelo menos 1 corretor para receber os contatos novos.'
                });
            }

            const placeholders = corretoresIds.map((_, i) => `$${i + 1}`).join(',');
            const corretoresValidos = await client.query(
                `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo IN ('corretor', 'teste')`,
                corretoresIds
            );

            if (corretoresValidos.rows.length !== corretoresIds.length) {
                return res.status(400).json({ erro: 'Um ou mais corretores não existem.' });
            }

            const idsValidos = corretoresValidos.rows.map(c => c.id);

            await client.query('BEGIN');

            // 1) Sincroniza lista_corretores com o que foi marcado
            //    (adiciona novos + remove os que não estão mais marcados)
            const atuaisResult = await client.query(
                'SELECT corretor_id FROM lista_corretores WHERE lista_id = $1',
                [listaId]
            );
            const idsAntigos = atuaisResult.rows.map(r => r.corretor_id);

            const idsAdicionados = idsValidos.filter(id => !idsAntigos.includes(id));
            const idsRemovidos  = idsAntigos.filter(id => !idsValidos.includes(id));

            for (const id of idsAdicionados) {
                await client.query(
                    'INSERT INTO lista_corretores (lista_id, corretor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [listaId, id]
                );
            }

            for (const id of idsRemovidos) {
                await client.query(
                    'DELETE FROM lista_corretores WHERE lista_id = $1 AND corretor_id = $2',
                    [listaId, id]
                );
            }

            // 2) Insere os contatos novos distribuindo entre os corretores MARCADOS
            const distribuicao = await inserirLeadsEmMassa(client, listaId, contatosNovos, idsValidos);

            // 3) Recalcula o total da lista com base no banco (evita dessincronia)
            await client.query(`
                UPDATE listas
                SET total = (SELECT COUNT(*) FROM leads WHERE lista_id = $1)
                WHERE id = $1
            `, [listaId]);

            await client.query('COMMIT');

            return res.status(201).json({
                ok: true,
                listaId,
                atualizada: true,
                adicionados: contatosNovos.length,
                descartados: descartados.length,
                corretoresAdicionados: idsAdicionados.length,
                corretoresRemovidos: idsRemovidos.length,
                distribuicao
            });
        }

        // =====================================================
        // CASO 2 — CRIAR LISTA NOVA
        // =====================================================
        if (!Array.isArray(corretoresIds) || !corretoresIds.length) {
            return res.status(400).json({ erro: 'Selecione pelo menos 1 corretor.' });
        }

        const placeholders = corretoresIds.map((_, i) => `$${i + 1}`).join(',');
        const corretoresValidos = await client.query(
            `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo IN ('corretor', 'teste')`,
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
            duplicados: descartados.slice(0, 10)
        });

    } catch (err) {
        console.error('[admin/listas preview-dedupe] erro:', err);
        res.status(500).json({ erro: 'Erro ao verificar duplicados.' });
    }
});

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
   DASHBOARD — KPIs
   ========================================================= */

router.get('/dashboard', async (req, res) => {
    try {
        const totais = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM listas) AS total_listas,
                (SELECT COUNT(*) FROM leads l WHERE 1=1 ${naoTeste('l')}) AS total_contatos,
                (SELECT COUNT(*) FROM leads l WHERE l.status IN ('qualificado', 'descartado') ${naoTeste('l')}) AS qualificados,
                (SELECT COUNT(*) FROM leads l WHERE l.status = 'descartado' ${naoTeste('l')})  AS descartados,
                (SELECT COUNT(*) FROM leads l WHERE l.status = 'novo' ${naoTeste('l')})        AS aguardando
        `);

        const t = totais.rows[0];

        const porCorretor = await pool.query(`
            SELECT
                u.id, u.nome, u.usuario,
                COUNT(l.id) AS total,
                COUNT(l.id) FILTER (WHERE l.status IN ('qualificado', 'descartado')) AS qualificados,
                COUNT(l.id) FILTER (WHERE l.status = 'descartado')  AS descartados,
                COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS aguardando
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo = 'corretor'
            GROUP BY u.id
            ORDER BY u.nome ASC
        `);

        const porTag = await pool.query(`
            SELECT l.resultado, COUNT(*) AS count
            FROM leads l
            WHERE l.resultado IS NOT NULL ${naoTeste('l')}
            GROUP BY l.resultado
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
   DASHBOARD — GRÁFICOS
   ========================================================= */

router.get('/dashboard/graficos', async (req, res) => {
    try {
        const linhaResult = await pool.query(`
            WITH dias AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '29 days',
                    CURRENT_DATE,
                    INTERVAL '1 day'
                )::date AS dia
            )
            SELECT
                d.dia,
                COALESCE(COUNT(h.id) FILTER (
                    WHERE h.acao IN ('agendado', 'em_atendimento', 'mensagem_enviada',
                                     'retornar_depois', 'follow_up', 'vendido')
                ), 0) AS qualificados,
                COALESCE(COUNT(h.id) FILTER (
                    WHERE h.acao IN ('sem_interesse', 'telefone_invalido', 'sem_resposta')
                ), 0) AS descartados
            FROM dias d
            LEFT JOIN historico h
                ON h.criado_em::date = d.dia
                AND (h.corretor_id IS NULL OR h.corretor_id NOT IN (
                    SELECT id FROM usuarios WHERE tipo = 'teste'
                ))
            GROUP BY d.dia
            ORDER BY d.dia ASC
        `);

        const linhaLabels = linhaResult.rows.map(r => {
            const d = new Date(r.dia);
            const dia = String(d.getUTCDate()).padStart(2, '0');
            const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
            return `${dia}/${mes}`;
        });
        const linhaQualificados = linhaResult.rows.map(r => Number(r.qualificados));
        const linhaDescartados  = linhaResult.rows.map(r => Number(r.descartados));

        const donutResult = await pool.query(`
            SELECT l.resultado, COUNT(*) AS count
            FROM leads l
            WHERE l.resultado IS NOT NULL ${naoTeste('l')}
            GROUP BY l.resultado
            ORDER BY count DESC
        `);

        const mapaTags = {
            agendado:          'Agendado',
            em_atendimento:    'Em atendimento',
            vendido:           'Vendido',
            mensagem_enviada:  'Mensagem enviada',
            retornar_depois:   'Retornar depois',
            follow_up:         'Follow up',
            sem_interesse:     'Sem interesse',
            telefone_invalido: 'Telefone inválido',
            sem_resposta:      'Sem resposta'
        };

        const donutLabels = donutResult.rows.map(r => mapaTags[r.resultado] || r.resultado);
        const donutValores = donutResult.rows.map(r => Number(r.count));
        const donutChaves  = donutResult.rows.map(r => r.resultado);

        const colunasResult = await pool.query(`
            SELECT
                u.id,
                u.nome,
                COUNT(l.id) FILTER (
                    WHERE l.resultado IN ('agendado', 'em_atendimento', 'mensagem_enviada',
                                          'retornar_depois', 'vendido')
                ) AS ativos,
                COUNT(l.id) FILTER (WHERE l.resultado = 'follow_up') AS follow_up,
                COUNT(l.id) FILTER (WHERE l.status = 'novo') AS fila,
                COUNT(l.id) FILTER (
                    WHERE l.resultado IN ('sem_interesse', 'telefone_invalido', 'sem_resposta')
                ) AS perdidos
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo = 'corretor'
            GROUP BY u.id
        `);

        const colunasArr = colunasResult.rows.map(c => ({
            nome:      c.nome,
            ativos:    Number(c.ativos),
            follow_up: Number(c.follow_up),
            fila:      Number(c.fila),
            perdidos:  Number(c.perdidos),
            total:     Number(c.ativos) + Number(c.follow_up) + Number(c.fila) + Number(c.perdidos)
        }));

        colunasArr.sort((a, b) => b.total - a.total);

        const top10 = colunasArr.slice(0, 10);
        const resto = colunasArr.slice(10);

        let outros = null;
        if (resto.length) {
            outros = {
                nome: 'Outros',
                ativos:    resto.reduce((s, c) => s + c.ativos, 0),
                follow_up: resto.reduce((s, c) => s + c.follow_up, 0),
                fila:      resto.reduce((s, c) => s + c.fila, 0),
                perdidos:  resto.reduce((s, c) => s + c.perdidos, 0)
            };
        }

        const colunasFinal = outros ? [...top10, outros] : top10;

        const colunasLabels   = colunasFinal.map(c => c.nome);
        const colunasAtivos   = colunasFinal.map(c => c.ativos);
        const colunasFollowUp = colunasFinal.map(c => c.follow_up);
        const colunasFila     = colunasFinal.map(c => c.fila);
        const colunasPerdidos = colunasFinal.map(c => c.perdidos);

        const velResult = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE l.status IN ('qualificado', 'descartado')) AS trabalhados,
                COUNT(*) FILTER (WHERE l.status = 'qualificado') AS qualificados
            FROM leads l
            WHERE 1=1 ${naoTeste('l')}
        `);

        const trabalhados = Number(velResult.rows[0].trabalhados) || 0;
        const qualificados = Number(velResult.rows[0].qualificados) || 0;
        const taxaConversao = trabalhados > 0
            ? Number(((qualificados / trabalhados) * 100).toFixed(1))
            : 0;

        res.json({
            linha: {
                labels: linhaLabels,
                qualificados: linhaQualificados,
                descartados: linhaDescartados
            },
            donut: {
                labels: donutLabels,
                valores: donutValores,
                chaves: donutChaves
            },
            colunas: {
                labels: colunasLabels,
                ativos: colunasAtivos,
                follow_up: colunasFollowUp,
                fila: colunasFila,
                perdidos: colunasPerdidos
            },
            velocimetro: {
                valor: taxaConversao,
                trabalhados,
                qualificados
            }
        });

    } catch (err) {
        console.error('[admin/dashboard/graficos] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar gráficos.' });
    }
});

/* =========================================================
   DASHBOARD — DRILL-DOWN POR TAG
   ========================================================= */

router.get('/dashboard/tag/:tag', async (req, res) => {
    try {
        const tag = String(req.params.tag || '').trim();
        const { de, ate } = req.query;

        if (!tag) {
            return res.status(400).json({ erro: 'Tag não informada.' });
        }

        const params = [tag];
        let sql = `
            SELECT
                l.id,
                l.nome,
                l.telefone,
                l.resultado,
                l.observacao,
                l.decidido_em,
                l.agendamento_data,
                l.agendamento_local,
                u.nome AS corretor_nome,
                u.usuario AS corretor_usuario
            FROM leads l
            LEFT JOIN usuarios u ON u.id = l.corretor_id
            WHERE l.resultado = $1
              AND (l.corretor_id IS NULL OR l.corretor_id NOT IN (
                  SELECT id FROM usuarios WHERE tipo = 'teste'
              ))
        `;

        if (de) {
            params.push(de);
            sql += ` AND l.decidido_em >= $${params.length}::date`;
        }

        if (ate) {
            params.push(ate);
            sql += ` AND l.decidido_em < ($${params.length}::date + INTERVAL '1 day')`;
        }

        sql += ` ORDER BY l.decidido_em DESC NULLS LAST`;

        const result = await pool.query(sql, params);

        res.json({
            tag,
            total: result.rows.length,
            leads: result.rows
        });

    } catch (err) {
        console.error('[admin/dashboard/tag] erro:', err);
        res.status(500).json({ erro: 'Erro ao carregar leads da tag.' });
    }
});

/* =========================================================
   DASHBOARD — CARTEIRAS E CORRETORES
   ========================================================= */

router.get('/dashboard/carteiras', async (req, res) => {
    try {
        const corretoresResult = await pool.query(`
            SELECT
                u.id,
                u.nome,
                u.usuario,
                u.tipo,
                u.ultimo_acesso,
                COUNT(l.id) FILTER (WHERE l.status IN ('qualificado', 'descartado')) AS total_qualificados,
                COUNT(l.id) FILTER (WHERE l.status = 'descartado')  AS total_descartados,
                COUNT(l.id) FILTER (WHERE l.status = 'novo')        AS total_fila,
                COUNT(l.id) AS total_carteira
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo IN ('corretor', 'teste')
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
                tipo: c.tipo,
                status,
                ultimo_acesso: c.ultimo_acesso,
                total_qualificados: Number(c.total_qualificados),
                total_descartados: Number(c.total_descartados),
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
                    COUNT(l.id) FILTER (WHERE l.status IN ('qualificado', 'descartado')) AS qualificou,
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
   GERENCIAR CORRETORES DA LISTA
   ========================================================= */

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
                u.tipo,
                EXISTS (
                    SELECT 1 FROM lista_corretores 
                    WHERE lista_id = $1 AND corretor_id = u.id
                ) AS participa,
                COUNT(l.id) FILTER (WHERE l.lista_id = $1 AND l.status = 'novo')        AS pendentes_na_lista,
                COUNT(l.id) FILTER (WHERE l.lista_id = $1 AND l.status IN ('qualificado', 'descartado')) AS qualificados_na_lista,
                COUNT(l.id) FILTER (WHERE l.lista_id = $1) AS total_na_lista
            FROM usuarios u
            LEFT JOIN leads l ON l.corretor_id = u.id
            WHERE u.tipo IN ('corretor', 'teste')
            GROUP BY u.id
            ORDER BY u.nome ASC
        `, [listaId]);

        const corretores = todos.rows.map(c => ({
            id: c.id,
            nome: c.nome,
            usuario: c.usuario,
            tipo: c.tipo,
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
            `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo IN ('corretor', 'teste')`,
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