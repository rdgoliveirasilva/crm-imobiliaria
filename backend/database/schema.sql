-- =========================================================
-- SCHEMA — CRM SR Lançamentos (PostgreSQL)
-- =========================================================

-- Usuários (admin + corretores na mesma tabela)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    usuario VARCHAR(60) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('admin', 'corretor')),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Listas subidas pelo admin
CREATE TABLE IF NOT EXISTS listas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    total INTEGER NOT NULL,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Leads (contatos)
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    lista_id INTEGER NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    corretor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'novo'
        CHECK (status IN ('novo', 'qualificado', 'descartado')),
    resultado VARCHAR(40),
    observacao TEXT DEFAULT '',
    agendamento_data TIMESTAMP,
    agendamento_local VARCHAR(255),
    distribuido_em TIMESTAMP,
    decidido_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Histórico de ações
CREATE TABLE IF NOT EXISTS historico (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    corretor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    acao VARCHAR(40) NOT NULL,
    observacao TEXT DEFAULT '',
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_leads_corretor ON leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lista ON leads(lista_id);