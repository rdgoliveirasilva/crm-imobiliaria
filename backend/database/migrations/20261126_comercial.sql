ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS corretor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS lista_id INTEGER REFERENCES listas(id) ON DELETE SET NULL;
UPDATE negociacoes n SET corretor_id=l.corretor_id,lista_id=l.lista_id FROM leads l WHERE n.lead_id=l.id AND n.lista_id IS NULL;
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS status_comercial TEXT NOT NULL DEFAULT 'ativo' CHECK(status_comercial IN ('ativo','condicionado','reprovado','desistiu'));
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS credito_status TEXT NOT NULL DEFAULT 'nao_enviado' CHECK(credito_status IN ('nao_enviado','pendente','aprovado','condicionado','reprovado'));
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS analista_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS empreendimento_id INTEGER REFERENCES empreendimentos(id) ON DELETE SET NULL;
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '';
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '{}';
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS etapa_desde TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE negociacao_eventos ADD COLUMN IF NOT EXISTS acao TEXT NOT NULL DEFAULT 'movimentacao';
ALTER TABLE negociacao_eventos ADD COLUMN IF NOT EXISTS detalhes JSONB NOT NULL DEFAULT '{}';
-- Percentuais legados são preservados, mas não representam recebimentos monetários.
DO $$ DECLARE c RECORD; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='negociacoes'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%etapa%' AND pg_get_constraintdef(oid) LIKE '%comissao_recebida%'
 LOOP EXECUTE format('ALTER TABLE negociacoes DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS vendas_comerciais (
 id SERIAL PRIMARY KEY, negociacao_id INTEGER NOT NULL UNIQUE REFERENCES negociacoes(id) ON DELETE RESTRICT,
 empreendimento_id INTEGER NOT NULL REFERENCES empreendimentos(id) ON DELETE RESTRICT,
 unidade VARCHAR(120) NOT NULL, valor_venda NUMERIC(14,2) NOT NULL CHECK(valor_venda>0),
 comissao_prevista NUMERIC(14,2) NOT NULL CHECK(comissao_prevista>=0), assinatura_construtora DATE NOT NULL,
 assinatura_caixa DATE, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(comissao_prevista<=valor_venda), CHECK(assinatura_caixa IS NULL OR assinatura_caixa>=assinatura_construtora)
);
CREATE TABLE IF NOT EXISTS recebimentos_comerciais (
 id SERIAL PRIMARY KEY, negociacao_id INTEGER NOT NULL REFERENCES negociacoes(id) ON DELETE RESTRICT,
 chave UUID NOT NULL UNIQUE, tipo TEXT NOT NULL CHECK(tipo IN ('antecipacao','final','saldo')),
 valor NUMERIC(14,2) NOT NULL CHECK(valor>0), data_recebimento DATE NOT NULL,
 status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','confirmado','rejeitado')),
 solicitado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
 confirmado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, confirmado_em TIMESTAMPTZ,
 observacao TEXT NOT NULL DEFAULT '', criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recebimentos_negociacao ON recebimentos_comerciais(negociacao_id,status);
CREATE TABLE IF NOT EXISTS documentos_comerciais (
 id SERIAL PRIMARY KEY, negociacao_id INTEGER NOT NULL REFERENCES negociacoes(id) ON DELETE CASCADE,
 categoria TEXT NOT NULL CHECK(categoria IN ('identidade','endereco','renda','estado_civil','outro')),
 nome VARCHAR(160) NOT NULL, mime TEXT NOT NULL CHECK(mime IN ('application/pdf','image/jpeg','image/png')),
 tamanho INTEGER NOT NULL CHECK(tamanho>0 AND tamanho<=3145728), hash TEXT NOT NULL,
 conteudo BYTEA NOT NULL, criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(negociacao_id,categoria,hash)
);
CREATE TABLE IF NOT EXISTS notificacoes_comerciais (
 id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 negociacao_id INTEGER NOT NULL REFERENCES negociacoes(id) ON DELETE CASCADE,
 mensagem TEXT NOT NULL, lida_em TIMESTAMPTZ, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes_comerciais(usuario_id,lida_em);
CREATE INDEX IF NOT EXISTS idx_negociacoes_corretor ON negociacoes(corretor_id,etapa);
