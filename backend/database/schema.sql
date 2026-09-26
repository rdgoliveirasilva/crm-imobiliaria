-- =========================================================
-- SCHEMA — CRM SR Lançamentos
-- =========================================================

-- Usuários (admin + corretores na mesma tabela)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('admin', 'corretor')),
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Listas subidas pelo admin
CREATE TABLE IF NOT EXISTS listas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    total INTEGER NOT NULL,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Leads (contatos)
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lista_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    corretor_id INTEGER,
    status TEXT NOT NULL DEFAULT 'novo' CHECK(status IN ('novo', 'qualificado', 'descartado')),
    resultado TEXT,
    observacao TEXT DEFAULT '',
    distribuido_em TEXT,
    decidido_em TEXT,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    agendamento_data TEXT,
    agendamento_local TEXT,
    FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE,
    FOREIGN KEY (corretor_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Histórico de ações
CREATE TABLE IF NOT EXISTS historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    corretor_id INTEGER NOT NULL,
    acao TEXT NOT NULL,
    observacao TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (corretor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices pra performance
CREATE INDEX IF NOT EXISTS idx_leads_corretor ON leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lista ON leads(lista_id);