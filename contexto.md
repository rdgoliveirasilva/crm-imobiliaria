# CONTEXTO DO PROJETO — CRM SR Lançamentos

> **Última atualização:** Outubro/2026
> **Último merge:** branch `refatoracao` → `main`
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
│ │ └── empreendimentos.js ← [FASE 5] admin + corretor
│ ├── controllers/
│ ├── models/
│ └── services/
│ ├── driveService.js ← [FASE 3] listar/baixar PDFs do Drive
│ ├── pdfService.js ← [FASE 4/5] extrair texto + capa
│ └── iaService.js ← [FASE 5] Gemini estruturado
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

---

## 3. Decisões arquiteturais importantes

### 3.1 Separação `corretor.html` vs `prospeccao.html`

**Antes:** uma única página (`corretor.html`) fazia TUDO — dashboard com KPIs, listas de retorno, lead ativo, histórico, agendamentos.

**Agora:** foram separados em 2 páginas com responsabilidades claras:

| Página | Responsabilidade | CSS | JS |
|--------|------------------|-----|-----|
| `corretor.html` | Dashboard com KPIs, listas de retorno/agendamento, botão "Iniciar prospecção" | `corretor.css` | `corretor.js` |
| `prospeccao.html` | Lead ativo (ligar, WhatsApp, registrar tag) | `corretor.css` + `prospeccao.css` | `prospeccao.js` |

**Fluxo:** `corretor.html` → clica "Iniciar prospecção" → `prospeccao.html?lista=X` → trabalha leads → botão `←` volta pro dashboard.

**Por quê:** cada tela tem escopo único, mais leve pra carregar, mais fácil de manter. **NÃO juntar de volta.**

### 3.2 Header compartilhado compacto

**Decisão:** o header é **compacto (820px) e centralizado** em TODAS as páginas (dashboard, prospecção, conta, admin, empreendimentos).

- `corretor.css` define `.header-inner { max-width: 820px; justify-content: center }`
- `prospeccao.css` **não sobrescreve** o header (só adiciona o botão voltar)
- `empreendimentos.css` adiciona o mesmo `.btn-back-header` dentro do header

**Não mudar** esse comportamento. Foi uma decisão explícita do cliente.

### 3.3 `.app-main` diferente por contexto

- `corretor.css` → `.app-main { max-width: 1100px }`
- `prospeccao.css` → `body.prospeccao-page .app-main { max-width: 820px }`
- `empreendimentos.css` → `body.empreendimentos-page .app-main { max-width: 1100px }`

**Ordem dos `<link>` no HTML importa:**

```html
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/avatar.css">
<link rel="stylesheet" href="css/corretor.css">      <!-- ou conta.css -->
<link rel="stylesheet" href="css/prospeccao.css">    <!-- SÓ na prospeccao.html -->
<link rel="stylesheet" href="css/empreendimentos.css"><!-- SÓ na empreendimentos.html -->
avatar.css DEVE vir antes de corretor.css/conta.css.

3.4 Editor de tag inline
Ver seção 4.

3.5 Estatísticas e nomenclatura de KPIs
Cada KPI pega só a tag dele, sem somar. Ver seção 6.1.

3.6 Timezone — regra crítica
Backend:

server.js força process.env.TZ = 'UTC' na primeira linha

config/db.js sobrescreve os parsers do pg (OIDs 1114 e 1184) para retornar strings cruas

Frontend:

Sempre formatar com timeZone: 'America/Sao_Paulo' explícito

Helper parseDataAgendamento normaliza as datas do agendamento

⚠️ Se ver datas deslocadas 3h, é problema de timezone. Não mexer sem entender as duas pontas.

3.7 Autenticação
JWT salvo em localStorage com chave sr_token

sr_tipo guarda o tipo do usuário (admin, corretor ou teste)

api-client.js injeta o token e faz logout automático em 401

auth-guard.js roda no <head> de todas as páginas internas e redireciona se não tem token ou se o tipo não bate com a página

Backends:

routes/auth.js → login/me/senha (liberado)

routes/admin.js → router.use(autenticar, apenasAdmin) ⚠️ NUNCA trocar

routes/corretor.js → router.use(autenticar, apenasCorretor)

routes/empreendimentos.js → tem 2 routers:

routerAdmin → router.use(autenticar, apenasAdmin) (rotas de import/CRUD)

routerCorretor → router.use(autenticar, apenasCorretor) (leitura de publicados)

Middleware apenasCorretor: aceita tipo === 'corretor' e tipo === 'teste'. Se mexer, garanta que ambos continuam passando.

3.8 Dropdown do avatar — blindado
avatar.js remove qualquer .dropdown-menu existente antes de criar o novo. O item "Empreendimentos" só aparece se sr_tipo for corretor ou teste.

⚠️ Importante: o auth.js salva o tipo com a chave sr_tipo (não sr_usuario_tipo). Se renomear, atualiza o avatar.js também.

3.9 Importador de empreendimentos (FASES 5 e 6)
Decisão importante: NÃO subimos mais o PDF pro Cloudinary.

Por quê:

Vercel tem limite de 4.5MB no corpo da requisição de funções serverless

Cloudinary free tem limite de 10MB por arquivo

Books de construtoras (MRV, Cyrela, ADN) geralmente têm 15-30MB

O que fazemos:

Admin cola link de pasta ou PDF do Drive

Backend baixa o PDF em memória (não persiste)

Extrai texto (pdf-parse@1.1.1)

Extrai primeira página como capa (pdfjs-dist + canvas → JPEG)

Sobe só a capa pro Cloudinary (é pequena, ~200KB)

Chama Gemini com o texto pra estruturar em JSON

Salva no banco: link do Drive (pdf_url) + URL do Cloudinary (capa_url)

Resultado: PDFs de qualquer tamanho funcionam. O corretor abre o book via link do Drive (nova aba).

Consequência: se o dono do arquivo apagar/fechar a permissão do Drive, o link quebra. Aceitável — foi decisão explícita.

3.10 Publicação de empreendimentos
Empreendimentos nascem com status = 'rascunho' (default do banco)

Admin publica via PATCH /api/admin/empreendimentos/:id/status com { status: 'publicado' }

Corretor só vê os publicados (a rota /api/corretor/empreendimentos filtra)

Admin vê todos (rascunhos + publicados) na própria visão

3.11 Vitrine do corretor
Página nova: empreendimentos.html

Acessível apenas por corretor ou teste (via auth-guard.js)

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
Tags com data obrigatória: agendado e retornar_depois → modal abre pra pedir data/hora/local.

Redistribuição automática: leads com status = 'sem_resposta' são redistribuídos em 15 dias pelo lazy-check no backend (reprocessarSemResposta()).

5. Endpoints do backend
Auth (/api)
POST /login → { usuario, senha } → { token, usuario }

GET /me → dados do usuário logado

PUT /me → atualiza nome

PUT /me/senha → altera senha

Admin (/api/admin/*) — requer apenasAdmin
Corretores: GET /corretores, POST /corretores, PATCH /corretores/:id, DELETE /corretores/:id, PATCH /corretores/:id/tipo

Listas: GET /listas, POST /listas, DELETE /listas/:id

Listas (detalhe): POST /listas/preview-dedupe, GET /listas/:id/contatos, GET /listas/:id/corretores, PATCH /listas/:id/corretores, PATCH /listas/:id/mensagem

Leads: DELETE /leads/:id

Dashboard: GET /dashboard, GET /dashboard/graficos, GET /dashboard/tag/:tag, GET /dashboard/carteiras

Empreendimentos (FASE 5):

POST /empreendimentos/drive/analisar → lista PDFs da pasta/arquivo do Drive

POST /empreendimentos/drive/importar → baixa, extrai texto, extrai capa, chama IA

POST /empreendimentos/upload-capa → upload direto (cadastro manual)

POST /empreendimentos/upload-pdf → upload direto (cadastro manual)

GET /empreendimentos, GET /empreendimentos/:id

POST /empreendimentos (criar)

PATCH /empreendimentos/:id (editar)

PATCH /empreendimentos/:id/status (publicar/rascunhar/arquivar)

DELETE /empreendimentos/:id

Corretor (/api/corretor/*) — requer apenasCorretor (aceita corretor e teste)
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

GET /empreendimentos/:id → detalhe de um publicado

6. Bugs conhecidos e como evitar
6.1 NÃO SOMAR TAGS NOS KPIs
javascript
// ❌ ERRADO
const followUp = porTag.mensagem_enviada + porTag.retornar_depois + porTag.follow_up;

// ✅ CERTO
const followUp = porTag.follow_up || 0;
6.2 NÃO trocar apenasAdmin por apenasCorretor em routes/admin.js
Já aconteceu. Resultado: 403 em todas as rotas do admin.

6.3 NÃO usar position: absolute no .tag-editor
Quebra por causa do scroll. Usar position: fixed.

6.4 NÃO usar left + window.scrollX no abrirSeletorTag
Com position: fixed, o top/left é relativo à viewport. Usar só left e top.

6.5 NÃO esquecer pointer-events: none nos filhos do .tag-editavel
6.6 NÃO remover visibility: hidden do .dropdown-menu
6.7 Ordem dos <link> CSS importa
style.css → avatar.css → corretor.css/conta.css → prospeccao.css/empreendimentos.css

6.8 Falta do <link> do FontAwesome
Sintoma: ícones não aparecem (ex: seta ← do botão voltar).

6.9 Cache do navegador / Vercel
Sempre testar com Ctrl+Shift+R.

6.10 pdf-parse — fixar em 1.1.1
A versão 2.x/3.x mudou a API ({ pdf }, PDFParse como classe). A 1.x usa require('pdf-parse') retornando uma função direta. Não atualizar sem adaptar o pdfService.js.

6.11 Gemini — modelos são aposentados com frequência
O iaService.js descobre os modelos disponíveis em runtime via GET /v1beta/models?key=... e filtra por flash/flash-lite. Não fixar o nome do modelo em código.

⚠️ NÃO usar thinkingConfig: { thinkingBudget: 0 } — o SDK @google/generative-ai atual dá 400 Bad Request. A correção pra isso só vem com a migração pra API REST direta (ver seção 11).

6.12 Case-sensitive no Vercel
Windows funciona com case-insensitive, Linux não. Arquivos com S maiúsculo (iaService.js) e C maiúsculo (CONTEXTO.md) precisam estar com o nome exato no git.

Se renomear arquivo só mudando o case, usar: git mv antigo.js Novo.js.

6.13 Vercel — limite de 4.5MB no request
Funções serverless do Vercel rejeitam corpos de requisição > 4.5MB. Por isso o PDF não passa pelo backend. Ver seção 3.9.

6.14 Vercel — timeout de 10s (Hobby) / 60s (Pro)
O import de empreendimentos leva 50-120s por causa do Gemini (thinking automático). Se estiver no plano Hobby, vai dar timeout.

Confirme o plano do Vercel antes de depender dessa feature em produção.

6.15 canvas no Vercel
O pacote canvas tem binário nativo. Se o build do Vercel falhar por causa dele, trocar por @napi-rs/canvas (binário pré-compilado).

7. Banco de dados (schema resumido)
Tabelas principais:

usuarios — admin + corretor + teste (campo tipo)

listas — carteiras (nome, total, mensagem_whatsapp)

leads — contatos

historico — log de todas as ações

tentativas_corretores — quem já tentou contato

lista_corretores — quais corretores participam de cada lista

empreendimentos — [FASE 1] empreendimentos cadastrados

Campos: nome, construtora, endereco, bairro, cidade, estado, tipo_imovel, fase, previsao_entrega, dormitorios, metragens, vagas, comodidades (jsonb), descricao, observacoes, capa_url, capa_public_id, pdf_url, pdf_public_id, status ('rascunho'/'publicado'/'arquivado'), criado_por, criado_em, atualizado_em, publicado_em

empreendimento_logs — log de ações nos empreendimentos

Colunas de timestamp: timestamp without time zone (por isso o parser customizado em db.js).

8. Fluxo de trabalho (dev)
8.1 Rodar local
powershell
cd backend
node server.js
Servidor sobe em http://localhost:3000.

8.2 Branches
main → produção (Vercel faz deploy automático)

refatoracao → trabalho em andamento

Merge na main: usar git merge --squash refatoracao (histórico limpo).

8.3 Deploy
powershell
git add .
git commit -m "feat: descrição clara"
git push origin main
Vercel detecta, faz build e deploy em ~1-2 min.

8.4 Variáveis de ambiente
Vercel + local .env (dentro de backend/):

text
DATABASE_URL=postgresql://... (Neon)
JWT_SECRET=chave_secreta
JWT_EXPIRES_IN=7d
CLOUDINARY_URL=cloudinary://key:secret@cloud_name
GEMINI_API_KEY=AQ.Ab8...
PORT=3000 (só local)
⚠️ O server.js carrega o .env via require('dotenv').config({ path: path.join(__dirname, '.env') }) — o .env está em backend/, não na raiz.

9. O que NÃO fazer (regras de ouro)
❌ Não juntar corretor.html e prospeccao.html de volta

❌ Não somar tags nos KPIs

❌ Não trocar apenasAdmin por apenasCorretor em routes/admin.js

❌ Não remover os !important do bloco final do corretor.css

❌ Não usar position: absolute no .tag-editor

❌ Não remover visibility: hidden do .dropdown-menu

❌ Não colocar avatar.css depois de corretor.css/conta.css

❌ Não testar sem Ctrl+Shift+R

❌ Não mexer no timezone sem entender as duas pontas

❌ Não apagar arquivos .js/.css "que parecem não usados" sem confirmar

❌ Não atualizar pdf-parse pra 2.x/3.x sem adaptar o pdfService.js

❌ Não fixar modelo do Gemini em código (usar a descoberta em runtime)

❌ Não usar thinkingConfig no SDK atual (dá 400)

❌ Não subir PDF pro Cloudinary (estoura Vercel 4.5MB + Cloudinary 10MB)

❌ Não esquecer o case-sensitive dos nomes (iaService.js, CONTEXTO.md)

❌ Não esquecer que auth.js salva o tipo em sr_tipo (não sr_usuario_tipo)

10. Contato / próximos passos
Dono do projeto: Rodrigo (cliente)
Status atual: em produção, funcionando

Pendências conhecidas:

10.1 Gemini lento (50-120s por import)
O gemini-flash-lite-latest faz thinking automático que a gente não consegue desligar via SDK. Solução futura: migrar pra API REST direta do Gemini (via fetch), onde o thinkingConfig: { thinkingBudget: 0 } funciona e derruba pra ~5-10s.

Arquivo a alterar: backend/services/iaService.js

10.2 Timeout do Vercel
Se estiver no plano Hobby (10s), o import de empreendimentos vai dar timeout. Opções:

Upgrade pro Pro (60s)

Migrar pra API REST do Gemini (10.1) — reduz tempo pra ~10-15s total

Mover processamento pro frontend

10.3 Botão WhatsApp no empreendimento
Ideia futura: dentro do modal do empreendimento na vitrine do corretor, adicionar um botão "Enviar pro cliente" que abre o WhatsApp com mensagem pré-preenchida.

10.4 Busca por texto no empreendimento
Hoje só busca por nome/construtora. Futuro: busca full-text na descrição e comodidades.

10.5 Corretor não pode publicar
Hoje só admin publica. Futuro: liberar permissão pra corretores específicos, se o cliente pedir.

11. Histórico de mudanças relevantes
v1 (original): corretor.html fazia tudo — dashboard + prospecção + histórico + agendamentos

v2 (refatoração): separação em corretor.html + prospeccao.html

v3: corrigido middleware routes/admin.js (estava apenasCorretor, mudou pra apenasAdmin)

v4: editor de tag inline (9 qualificações) em ambas as telas

v5: correção das estatísticas — cada KPI pega só sua tag

v6: adicionado case 'retornar_depois' e case 'agendado' no /leads-por-status

v7: unificado avatar/dropdown no avatar.css

v8: botão voltar no conta.html + prospeccao.html

v9 (Fases 1-4): CRUD de empreendimentos + Google Drive API + extração de texto (pdf-parse 1.x)

v10 (Fase 5): integração Gemini (iaService.js) — extração estruturada em JSON; descoberta dinâmica de modelos; extração de capa (pdfjs-dist + canvas); PDFs não sobem mais pro Cloudinary — guardamos só o link do Drive + capa; fixado pdf-parse@1.1.1

v11 (Fase 6): vitrine de empreendimentos pro corretor (empreendimentos.html + .css + .js); botão "Publicar/Despublicar" no admin; item "Empreendimentos" no dropdown do avatar (só corretor/teste); botão "Abrir book" (link do Drive em nova aba); filtros de busca/construtora/cidade; modal de detalhes com capa, chips, localização, descrição e comodidades

FIM DO CONTEXTO. Se você é uma LLM lendo isso, seja cuidadoso com as decisões já tomadas. O sistema está em produção e tem usuários ativos.