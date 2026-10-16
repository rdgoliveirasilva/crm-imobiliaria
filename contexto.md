# CONTEXTO DO PROJETO — CRM SR Lançamentos

> **Última atualização:** Outubro/2026
> **Último merge:** `refatoracao` → `main`
> **Status:** Em produção (Vercel + Neon)

Este arquivo é um **handoff** para qualquer LLM ou desenvolvedor que pegar este projeto no futuro. Leia até o fim antes de fazer qualquer alteração estrutural.

---

## 1. Visão geral

CRM de prospecção imobiliária da **SR Lançamentos** (Sônia e Ramalho). O sistema distribui listas de leads entre corretores, que trabalham cada lead (ligar, WhatsApp, qualificar) e alimentam estatísticas em tempo real para o admin.

**Stack:**
- **Backend:** Node.js + Express + PostgreSQL (Neon) + JWT
- **Frontend:** HTML + CSS + JS vanilla (sem framework)
- **Deploy:** Vercel (auto-deploy no push da `main`)
- **Banco:** Neon (PostgreSQL serverless)
- **IA:** Google Gemini (extração estruturada de PDFs)
- **Drive API:** Google Drive (leitura de PDFs públicos)
- **CDN de imagens:** Cloudinary

**URL de produção:**
`https://srlancamentosprospect.vercel.app/`

---

## 2. Estrutura de arquivos
crm-imobiliaria/
├── CONTEXTO.md ← este arquivo
├── README.md
├── package.json
├── vercel.json
├── backend/
│ ├── server.js
│ ├── seed.js
│ ├── config/
│ │ ├── db.js
│ │ └── cloudinary.js ← wrapper upload/deletar
│ ├── database/
│ │ └── schema.sql
│ ├── middlewares/
│ │ └── auth.js
│ ├── routes/
│ │ ├── auth.js
│ │ ├── admin.js
│ │ ├── corretor.js
│ │ └── empreendimentos.js ← [FASE 5/6] admin + corretor
│ ├── controllers/ (vazios)
│ ├── models/ (vazios)
│ └── services/
│ ├── driveService.js ← Google Drive API
│ ├── pdfService.js ← extração de texto + capa
│ └── iaservice.js ← Gemini (⚠️ NOME MINÚSCULO)
└── frontend/
├── index.html
├── admin.html
├── corretor.html
├── prospeccao.html
├── conta.html
├── empreendimentos.html ← [FASE 6] vitrine do corretor
├── css/
│ ├── style.css
│ ├── avatar.css
│ ├── login.css
│ ├── admin.css
│ ├── corretor.css
│ ├── prospeccao.css
│ ├── conta.css
│ └── empreendimentos.css ← [FASE 6]
└── js/
├── api-client.js
├── auth.js
├── auth-guard.js
├── avatar.js
├── acoes.js
├── admin.js
├── corretor.js
├── prospeccao.js
├── conta.js
└── empreendimentos.js ← [FASE 6]

text

⚠️ **Case-sensitive:** `iaservice.js` está em **minúsculo**. Se renomear, ajustar o `require` em `routes/empreendimentos.js`.

---

## 3. Decisões arquiteturais importantes

### 3.1 Separação `corretor.html` vs `prospeccao.html`

| Página | Responsabilidade | CSS | JS |
|--------|------------------|-----|-----|
| `corretor.html` | Dashboard com KPIs, listas de retorno/agendamento | `corretor.css` | `corretor.js` |
| `prospeccao.html` | Lead ativo (ligar, WhatsApp, registrar tag) | `corretor.css` + `prospeccao.css` | `prospeccao.js` |

**NÃO juntar de volta.**

### 3.2 Header compartilhado compacto

Header é **compacto (820px) e centralizado** em TODAS as páginas (dashboard, prospecção, conta, admin, empreendimentos).

- `corretor.css` define `.header-inner { max-width: 820px; justify-content: center }`
- `empreendimentos.css` adiciona `.btn-back-header` no header (mesmo padrão da prospecção)

### 3.3 `.app-main` diferente por contexto

- `corretor.css` → `.app-main { max-width: 1100px }`
- `prospeccao.css` → `body.prospeccao-page .app-main { max-width: 820px }`
- `empreendimentos.css` → `body.empreendimentos-page .app-main { max-width: 1100px }`

**Ordem dos `<link>` no HTML importa:**

```html
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/avatar.css">
<link rel="stylesheet" href="css/corretor.css">       <!-- ou conta.css -->
<link rel="stylesheet" href="css/prospeccao.css">     <!-- SÓ na prospeccao.html -->
<link rel="stylesheet" href="css/empreendimentos.css"><!-- SÓ na empreendimentos.html -->
avatar.css DEVE vir antes de corretor.css/conta.css.

3.4 Editor de tag inline
Ver seção 4.

3.5 Estatísticas e nomenclatura de KPIs
Cada KPI pega só a tag dele, sem somar. Ver seção 6.1.

3.6 Timezone — regra crítica
Backend:

server.js força process.env.TZ = 'UTC' na primeira linha

config/db.js sobrescreve os parsers do pg (OIDs 1114 e 1184) para strings cruas

Frontend:

Sempre formatar com timeZone: 'America/Sao_Paulo'

⚠️ Se ver datas deslocadas 3h, é problema de timezone. Não mexer sem entender as duas pontas.

3.7 Autenticação
JWT salvo em localStorage com chave sr_token

sr_tipo guarda o tipo (admin, corretor ou teste)

api-client.js injeta o token e faz logout automático em 401

auth-guard.js roda no <head> de todas as páginas internas

⚠️ Atenção: o auth.js salva o tipo com chave sr_tipo (não sr_usuario_tipo).

Backends:

routes/auth.js → login/me/senha (liberado)

routes/admin.js → router.use(autenticar, apenasAdmin) ⚠️ NUNCA trocar

routes/corretor.js → router.use(autenticar, apenasCorretor)

routes/empreendimentos.js → 2 routers:

routerAdmin → router.use(autenticar, apenasAdmin)

routerCorretor → router.use(autenticar, apenasCorretor)

Middleware apenasCorretor: aceita tipo === 'corretor' e tipo === 'teste'.

3.8 Dropdown do avatar
avatar.js remove qualquer .dropdown-menu existente antes de criar o novo. O item "Empreendimentos" só aparece se sr_tipo for corretor ou teste.

3.9 Importador de empreendimentos (FASE 5)
Decisão: PDF não sobe pro Cloudinary. Só a capa.

Por quê:

Vercel tem limite de 4.5MB no corpo da requisição serverless

Cloudinary free tem limite de 10MB por arquivo

Books de construtoras geralmente têm 15-30MB

Fluxo:

Admin cola link do Drive

Backend baixa o PDF em memória

Extrai texto (pdf-parse@1.1.1)

Extrai primeira página como capa (pdfjs-dist + canvas → JPEG)

Sobe só a capa pro Cloudinary

Chama Gemini com o texto pra estruturar em JSON

Salva: link do Drive (pdf_url) + URL do Cloudinary (capa_url)

PDFs escaneados: se o texto extraído for muito curto (< 100 chars), o backend detecta e devolve pdf_escaneado: true. O modal abre em branco com capa + link do Drive pré-preenchidos, e o admin preenche manualmente.

3.10 Publicação de empreendimentos (FASE 6)
Empreendimentos nascem com status = 'rascunho'

Admin publica via PATCH /api/admin/empreendimentos/:id/status com { status: 'publicado' }

Corretor só vê publicados

Admin vê todos (rascunhos + publicados)

3.11 Vitrine do corretor (FASE 6)
Página empreendimentos.html — acessível apenas por corretor/teste

Item no dropdown do avatar (só aparece pra esses 2 tipos)

Filtros: busca por nome, construtora, cidade

Modal de detalhes com capa, chips, localização, descrição, comodidades

Botão "Abrir book" → abre pdf_url (link do Drive) em nova aba

4. Sistema de qualificações (tags)
Chave (backend)	Rótulo exibido	Classe CSS	KPI	Descarte?
agendado	Agendado	success	sim (em_atendimento)	não
em_atendimento	Em atendimento	success	sim (em_atendimento)	não
vendido	Vendido	success	não (só editor)	não
mensagem_enviada	Mensagem enviada	warning	sim (mensagens_enviadas)	não
retornar_depois	Retornar depois	warning	não (só editor)	não
follow_up	Follow up	warning	sim (follow_up)	não
sem_interesse	Cliente sem interesse	danger	não	sim
telefone_invalido	Telefone inexistente	danger	não	sim
sem_resposta	Sem resposta	danger	não	sim (redistribui em 15 dias)
Tags com data obrigatória: agendado e retornar_depois.

Redistribuição automática: sem_resposta redistribui em 15 dias via reprocessarSemResposta().

5. Endpoints do backend
Auth (/api)
POST /login → { usuario, senha } → { token, usuario }

GET /me → dados do usuário

PUT /me → atualiza nome

PUT /me/senha → altera senha

Admin (/api/admin/*) — requer apenasAdmin
Corretores: CRUD + PATCH /corretores/:id/tipo

Listas: GET /listas, POST /listas, DELETE /listas/:id, POST /listas/preview-dedupe, GET /listas/:id/contatos, GET /listas/:id/corretores, PATCH /listas/:id/corretores, PATCH /listas/:id/mensagem

Leads: DELETE /leads/:id

Dashboard: GET /dashboard, GET /dashboard/graficos, GET /dashboard/tag/:tag, GET /dashboard/carteiras

Empreendimentos (FASE 5/6):

POST /empreendimentos/drive/analisar

POST /empreendimentos/drive/importar

POST /empreendimentos/upload-capa

POST /empreendimentos/upload-pdf

GET /empreendimentos, GET /empreendimentos/:id

POST /empreendimentos

PATCH /empreendimentos/:id

PATCH /empreendimentos/:id/status ← publicar/despublicar

DELETE /empreendimentos/:id

Corretor (/api/corretor/*) — requer apenasCorretor
GET /proximo-lead?lista_id=X

GET /lead/:id, GET /lead/:id/historico

POST /leads/:id/resultado

PATCH /leads/:id/qualificacao

GET /minhas-carteiras

GET /estatisticas?lista_id=X

GET /leads-por-status?status=XXX&lista_id=Y

GET /historico/carteiras, GET /historico/carteiras/:listaId

GET /agendamentos

Empreendimentos (FASE 6):

GET /empreendimentos → só publicados

GET /empreendimentos/:id

6. Bugs conhecidos e como evitar
6.1 NÃO SOMAR TAGS NOS KPIs
javascript
// ❌ ERRADO
const followUp = porTag.mensagem_enviada + porTag.retornar_depois + porTag.follow_up;

// ✅ CERTO
const followUp = porTag.follow_up || 0;
6.2 NÃO trocar apenasAdmin por apenasCorretor
6.3 NÃO usar position: absolute no .tag-editor
6.4 NÃO usar left + window.scrollX no abrirSeletorTag
6.5 NÃO esquecer pointer-events: none nos filhos do .tag-editavel
6.6 NÃO remover visibility: hidden do .dropdown-menu
6.7 Ordem dos <link> CSS importa
6.8 Falta do <link> do FontAwesome
6.9 Cache: testar com Ctrl+Shift+R
6.10 pdf-parse — fixar em 1.1.1
A versão 2.x/3.x mudou a API. Não atualizar sem adaptar o pdfService.js.

6.11 Gemini — modelos são aposentados com frequência
O iaservice.js descobre os modelos disponíveis em runtime e filtra por flash/flash-lite. Não fixar o nome do modelo.

6.12 NÃO usar thinkingConfig
O SDK @google/generative-ai atual dá 400 Bad Request. Migração pra API REST direta é a solução futura (ver seção 10.1).

6.13 Case-sensitive no Vercel
Windows é case-insensitive, Linux não. Cuidado com:

iaservice.js (minúsculo)

empreendimentos.js (minúsculo)

Ao renomear, usar: git mv antigo.js Novo.js.

6.14 Vercel — limite de 4.5MB no request
Funções serverless rejeitam corpos > 4.5MB. Por isso o PDF não passa pelo backend (ver 3.9).

6.15 Vercel — timeout de 10s (Hobby) / 60s (Pro)
O import de empreendimentos leva 50-120s por causa do Gemini. Se estiver no plano Hobby, dá timeout.

6.16 canvas no Vercel
Binário nativo. Se o build falhar, trocar por @napi-rs/canvas.

6.17 Vercel — variáveis de ambiente precisam de redeploy
Só adicionar em Settings → Environment Variables não basta. Precisa fazer Redeploy depois.

6.18 Variável sr_tipo (não sr_usuario_tipo)
O auth.js salva sr_tipo. O avatar.js lê sr_tipo. Se renomear num, renomear no outro.

7. Banco de dados (schema resumido)
Tabelas principais:

usuarios — admin + corretor + teste (campo tipo)

listas — carteiras

leads — contatos

historico — log de ações

tentativas_corretores — quem já tentou contato

lista_corretores — corretores por lista

empreendimentos — empreendimentos

Campos: nome, construtora, endereco, bairro, cidade, estado, tipo_imovel, fase, previsao_entrega, dormitorios, metragens, vagas, comodidades (jsonb), descricao, observacoes, capa_url, capa_public_id, pdf_url, pdf_public_id, drive_folder_id, status ('rascunho'/'publicado'/'arquivado'), importado_em, publicado_em, atualizado_em, criado_por

empreendimento_logs — log de ações

Timestamps: timestamp without time zone (parser customizado em db.js).

8. Fluxo de trabalho (dev)
8.1 Rodar local
powershell
cd backend
node server.js
Servidor em http://localhost:3000.

8.2 Branches
main → produção (Vercel auto-deploy)

refatoracao → trabalho em andamento

Merge na main: git merge --squash refatoracao ou merge normal.

8.3 Deploy
powershell
git add .
git commit -m "feat: descrição"
git push origin main
8.4 Variáveis de ambiente
Local: backend/.env
Vercel: Settings → Environment Variables + Redeploy após adicionar

text
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
CLOUDINARY_URL=cloudinary://...
GEMINI_API_KEY=AQ.Ab8...
GOOGLE_DRIVE_API_KEY=AIza...
PORT=3000 (só local)
⚠️ O server.js carrega .env via require('dotenv').config({ path: path.join(__dirname, '.env') }).

9. O que NÃO fazer (regras de ouro)
❌ Não juntar corretor.html e prospeccao.html

❌ Não somar tags nos KPIs

❌ Não trocar apenasAdmin por apenasCorretor

❌ Não remover !important do corretor.css

❌ Não usar position: absolute no .tag-editor

❌ Não remover visibility: hidden do .dropdown-menu

❌ Não colocar avatar.css depois de corretor.css/conta.css

❌ Não testar sem Ctrl+Shift+R

❌ Não mexer no timezone sem entender as duas pontas

❌ Não apagar arquivos "que parecem não usados"

❌ Não atualizar pdf-parse pra 2.x/3.x

❌ Não fixar modelo do Gemini em código

❌ Não usar thinkingConfig no SDK atual

❌ Não subir PDF pro Cloudinary

❌ Não esquecer o case-sensitive (iaservice.js, empreendimentos.js)

❌ Não esquecer sr_tipo (não sr_usuario_tipo)

❌ Não esquecer o Redeploy no Vercel após adicionar variáveis

10. Pendências conhecidas / próximos passos
10.1 Gemini lento (50-120s por import)
O gemini-flash-lite-latest faz thinking automático que não conseguimos desligar via SDK. Solução futura: migrar pra API REST direta do Gemini, onde thinkingConfig: { thinkingBudget: 0 } funciona. Cai pra ~5-10s.

Arquivo: backend/services/iaservice.js

10.2 Timeout do Vercel
Se estiver no plano Hobby (10s), o import de empreendimentos dá timeout. Opções:

Upgrade pro Pro (60s)

Migrar pra API REST do Gemini (10.1)

Mover processamento pro frontend

10.3 Otimização do dashboard (feita em 2026-10-16)
Antes: 7 chamadas em série no init() (~2s)

Depois: Promise.all com 3 chamadas em paralelo (renderizarSeletorCorretores + renderizarListas + initDashboardV2)

Onde: frontend/js/admin.js, função init()

10.4 PDFs escaneados (feito em 2026-10-15)
Backend detecta texto < 100 chars → devolve pdf_escaneado: true. Frontend abre modal em branco com capa + link do Drive. Admin preenche manualmente.

10.5 Botão WhatsApp no empreendimento (futuro)
Adicionar botão "Enviar pro cliente" no modal da vitrine, com mensagem pré-preenchida.

10.6 Busca full-text no empreendimento (futuro)
Hoje só busca por nome/construtora. Futuro: descrição e comodidades.

11. Histórico de mudanças relevantes
v1 (original): corretor.html fazia tudo

v2 (refatoração): separação em corretor.html + prospeccao.html

v3: corrigido middleware routes/admin.js

v4: editor de tag inline (9 qualificações)

v5: correção das estatísticas (cada KPI pega só sua tag)

v6: adicionado case 'retornar_depois' e case 'agendado' no /leads-por-status

v7: unificado avatar/dropdown no avatar.css

v8: botão voltar no conta.html + prospeccao.html

v9 (Fases 1-4): CRUD de empreendimentos + Google Drive API + extração de texto (pdf-parse@1.1.1)

v10 (Fase 5): integração Gemini (iaservice.js); descoberta dinâmica de modelos; extração de capa (pdfjs-dist + canvas); PDFs não sobem mais pro Cloudinary; detecção de PDFs escaneados

v11 (Fase 6): vitrine de empreendimentos pro corretor (empreendimentos.html + .css + .js); botão "Publicar/Despublicar" no admin; item "Empreendimentos" no dropdown do avatar (só corretor/teste); botão "Abrir book"; filtros de busca/construtora/cidade; modal de detalhes

v12 (2026-10-15): fix no modal de empreendimentos (capa com onload/onerror, toast com z-index acima do modal, botão publicar sem duplicação de ícone, atualização do badge com status real do backend)

v13 (2026-10-16): otimização do boot do dashboard (Promise.all no init()); adicionadas variáveis de ambiente no Vercel (GOOGLE_DRIVE_API_KEY, CLOUDINARY_URL, GEMINI_API_KEY)

FIM DO CONTEXTO. Se você é uma LLM lendo isso, seja cuidadoso com as decisões já tomadas. O sistema está em produção e tem usuários ativos.