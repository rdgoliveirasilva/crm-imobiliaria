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
    ultimo_acesso TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Listas subidas pelo admin
CREATE TABLE IF NOT EXISTS listas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    total INTEGER NOT NULL,
    mensagem_whatsapp TEXT,
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
        CHECK (status IN ('novo', 'qualificado', 'descartado', 'sem_resposta')),
    resultado VARCHAR(40),
    observacao TEXT DEFAULT '',
    agendamento_data TIMESTAMP,
    agendamento_local VARCHAR(255),
    data_reenvio TIMESTAMP,
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

-- =========================================================
-- Registro de tentativas de contato por corretor
-- (usado pra saber quem já tentou contato com cada lead)
-- =========================================================

CREATE TABLE IF NOT EXISTS tentativas_corretores (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    corretor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data_tentativa TIMESTAMP DEFAULT NOW(),
    UNIQUE(lead_id, corretor_id)
);

CREATE INDEX IF NOT EXISTS idx_tentativas_lead ON tentativas_corretores(lead_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_corretor ON tentativas_corretores(corretor_id);

-- =========================================================
-- ATUALIZAÇÕES DE SCHEMA (para bancos já existentes)
-- Rodam sempre, mesmo se as tabelas já existirem
-- =========================================================

-- Garante que a constraint do status aceite 'sem_resposta'
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
    CHECK (status IN ('novo', 'qualificado', 'descartado', 'sem_resposta'));

-- Garante que a coluna data_reenvio existe
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_reenvio TIMESTAMP;

-- Garante que a tabela tentativas_corretores existe
CREATE TABLE IF NOT EXISTS tentativas_corretores (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    corretor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data_tentativa TIMESTAMP DEFAULT NOW(),
    UNIQUE(lead_id, corretor_id)
);

CREATE INDEX IF NOT EXISTS idx_tentativas_lead ON tentativas_corretores(lead_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_corretor ON tentativas_corretores(corretor_id);

-- =========================================================
-- CORRETORES POR LISTA (registro explícito de participação)
-- =========================================================

CREATE TABLE IF NOT EXISTS lista_corretores (
    id SERIAL PRIMARY KEY,
    lista_id INTEGER NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
    corretor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE(lista_id, corretor_id)
);

CREATE INDEX IF NOT EXISTS idx_lista_corretores_lista ON lista_corretores(lista_id);
CREATE INDEX IF NOT EXISTS idx_lista_corretores_corretor ON lista_corretores(corretor_id);

-- =========================================================
-- EMPREENDIMENTOS (Importados do Google Drive + IA)
-- =========================================================

CREATE TABLE IF NOT EXISTS empreendimentos (
    id SERIAL PRIMARY KEY,

    -- Identificação
    nome VARCHAR(150) NOT NULL,
    construtora VARCHAR(120),

    -- Localização
    endereco VARCHAR(200),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),

    -- Características do imóvel
    tipo_imovel VARCHAR(60),           -- Apartamento, Casa, Terreno, etc
    fase VARCHAR(40),                  -- Lançamento, Em obras, Entregue
    previsao_entrega VARCHAR(30),
    dormitorios VARCHAR(60),           -- "2 e 3 dormitórios"
    metragens VARCHAR(120),            -- "45 m² a 72 m²"
    vagas VARCHAR(60),                 -- "1 vaga"

    -- Comodidades (array de strings)
    comodidades JSONB DEFAULT '[]'::jsonb,

    -- Texto
    descricao TEXT,
    observacoes TEXT,

    -- Arquivos (Cloudinary)
    capa_url TEXT,
    capa_public_id TEXT,
    pdf_url TEXT,
    pdf_public_id TEXT,

    -- Origem
    drive_folder_id VARCHAR(120),      -- ID da pasta no Drive (pra reprocessar)

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'publicado', 'arquivado')),

    -- Metadados
    importado_em TIMESTAMP DEFAULT NOW(),
    publicado_em TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT NOW(),

    -- Pra filtros/busca
    criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_empreendimentos_status ON empreendimentos(status);
CREATE INDEX IF NOT EXISTS idx_empreendimentos_construtora ON empreendimentos(construtora);
CREATE INDEX IF NOT EXISTS idx_empreendimentos_cidade ON empreendimentos(cidade);

-- =========================================================
-- LOGS DE EMPREENDIMENTOS (histórico de ações)
-- =========================================================

CREATE TABLE IF NOT EXISTS empreendimento_logs (
    id SERIAL PRIMARY KEY,
    empreendimento_id INTEGER REFERENCES empreendimentos(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(50) NOT NULL,          -- 'importado', 'publicado', 'editado', 'arquivado', 'excluido'
    detalhes JSONB,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_logs_emp ON empreendimento_logs(empreendimento_id);