# CONTEXTO DO PROJETO — CRM SR Lançamentos

> **Última atualização:** 06/11/2026
> **Revisão de código usada nesta atualização:** `fedd84b` (`main`)
> **Status:** Em produção (Vercel + Neon)

Nome canônico no repositório: `contexto.md` (não há `context.md`).

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

```text
crm-imobiliaria/
├── contexto.md ← este arquivo
├── README.md
├── package.json
├── vercel.json
├── scripts/generate-pwa-icons.cjs ← gera ícones a partir da imagem exclusiva do PWA
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
├── manifest.webmanifest
├── assets/icons/ ← fonte e PNGs gerados do PWA
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
├── auth-session.js ← armazenamento de sessão compartilhado
├── auth-guard.js
├── avatar.js
├── acoes.js
├── admin.js
├── corretor.js
├── prospeccao.js
├── conta.js
└── empreendimentos.js ← [FASE 6]

```

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
```

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

### 3.7 Autenticação e “Lembrar de mim”

- `frontend/js/auth-session.js` centraliza as chaves `sr_token`, `sr_usuario`, `sr_usuario_login`, `sr_usuario_id` e `sr_tipo`.
- Com “Lembrar de mim”: usa `localStorage`. Sem marcar: usa `sessionStorage`, com duração vinculada à sessão da aba (a restauração depende do navegador).
- `AuthSession.save()` limpa a sessão anterior nos dois armazenamentos. `AuthSession.clear()` remove apenas as chaves de autenticação e o marcador do guard.
- A tela de login consulta `GET /api/me` quando há token; uma sessão válida redireciona conforme o tipo. Um retorno 401 limpa a sessão; uma falha de rede não a apaga automaticamente.
- O backend continua emitindo JWT com `JWT_EXPIRES_IN` ou `7d` por padrão. “Lembrar de mim” não renova nem estende o JWT.
- `api-client.js` usa `AuthSession`, envia Bearer token e encerra a sessão em 401.
- `auth-session.js` deve carregar antes de `auth-guard.js` e dos demais consumidores. Não voltar a ler o token diretamente de `localStorage`.
- `auth-guard.js` faz a proteção de navegação; a autorização efetiva é do backend.
- `POST /api/login` é público. `/api/me` e alteração de senha exigem autenticação.
- `routes/admin.js`: `router.use(autenticar, apenasAdmin)`.
- `routes/corretor.js`: `router.use(autenticar, apenasCorretor)`; corretor e teste são aceitos.
- Empreendimentos mantêm routers separados para admin e corretor.

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

Layout: blocos horizontais agrupados por construtora. Cada construtora tem um cabeçalho e, se tiver mais de 4 empreendimentos, mostra apenas os 4 primeiros e um botão "Ver todos". Ao clicar, a lista se expande para todos os empreendimentos daquela construtora.

Filtros Avançados:

Custom Selects (estilo dark do admin) para Construtora, Cidade e Bairro.

Máscara de moeda no filtro de Renda (R$ 3.000,00). O filtro retorna tudo que for menor ou igual ao valor digitado.

Máscara de data MM/AAAA no filtro de Entrega. O filtro lê o texto e retorna tudo que for anterior ou igual à data digitada (ex: buscar 05/2028 retorna empreendimentos de 04/2028).

Modal de detalhes: capa, chips, localização, descrição, comodidades

Botão "Abrir book": abre pdf_url (link do Drive) em nova aba

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

GET /leads-por-status?status=XXX&lista_id=Y&pagina=1&busca=texto (paginação detalhada na seção 12)

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

Campos: nome, construtora, endereco, bairro, cidade, estado, tipo_imovel, fase, previsao_entrega, dormitorios, metragens, vagas, comodidades (jsonb), descricao, observacoes, renda_presumida, capa_url, capa_public_id, pdf_url, pdf_public_id, drive_folder_id, status ('rascunho'/'publicado'/'arquivado'), importado_em, publicado_em, atualizado_em, criado_por

empreendimento_logs — log de ações

Timestamps: timestamp without time zone (parser customizado em db.js).

8. Fluxo de trabalho (dev)
8.1 Rodar local
powershell
cd backend
node server.js
Servidor em http://localhost:3000.

### 8.2 Git e publicação

A branch usada nas alterações recentes é `main`; `refatoracao` é uma referência histórica, não uma instrução para trocar de branch.

Implementar uma tarefa não autoriza criar/trocar branch, pull, commit, push, PR, merge, tag ou deploy. Exigir autorização explícita para essas ações. Comandos Git somente de leitura podem ser usados para investigação.

Antes de um commit autorizado, conferir identidade local/global e autores recentes. Não inventar identidade, alterar configuração global ou acrescentar autoria de IA. Depois, verificar Author e Committer com `git show -s --format=fuller HEAD`.

O projeto usa Vercel; o histórico relata publicação automática por push em `main`, mas a configuração atual do painel e o resultado de cada deploy precisam de confirmação externa. Push concluído não comprova deploy concluído.

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

v14 (2026-10-19): adição do campo renda_presumida (Backend + Admin + Vitrine). Novo layout de vitrine: agrupamento visual por construtora com limite de 4 e botão "Ver todos". Filtros da vitrine agora usam Custom Selects (dark mode) para Construtora, Cidade e Bairro. Filtros de Renda e Entrega passaram a ser inputs com máscara. Filtro de Renda puxa tudo que for <= ao valor digitado. Filtro de Entrega lê MM/AAAA e puxa tudo que for <= à data digitada.

## 12. Mudanças implementadas em novembro/2026

### 12.1 Dashboard administrativo

- “Visão geral” mostra clientes com qualificação / total da base, excluindo clientes atualmente atribuídos a usuários do tipo `teste`.
- O seletor de carteira da visão geral também filtra a distribuição por qualificação. Esta mantém apenas o filtro por corretor; limpar esse filtro preserva a carteira.
- O total trabalhado não soma novamente os descartados. Restantes usa limite mínimo de zero.
- O gráfico de 30 dias classifica a primeira ação de qualificação registrada por lead, ordenada por `criado_em` e `id`; separa primeiro resultado positivo, primeiro descarte e eventos posteriores de requalificação. A ordem é calculada antes do recorte diário, considerando o histórico disponível.
- A pizza conta a qualificação atual dos leads e inclui `sem_qualificacao` quando `resultado` é nulo. O drill-down aceita essa categoria.
- Carteiras ativas contam os leads atuais, excluindo corretores teste, em vez de depender apenas do total salvo na importação.
- Números consultados em 03/11/2026 eram um retrato daquele momento, não valores fixos: base 2.071, com qualificação 1.690; Lista Outubro 1.424, com qualificação 1.247 e sem qualificação 177. Reconsultar para responder totais atuais.

### 12.2 Paginação e mobile

- Admin: `GET /api/admin/listas/:id/contatos?pagina=1&busca=texto` retorna `contatos`, `total`, `pagina`, `paginas`.
- Corretor: `GET /api/corretor/leads-por-status?status=...&lista_id=...&pagina=1&busca=texto` retorna `status`, `leads`, `total`, `pagina`, `paginas`.
- Ao informar `pagina`, os dois endpoints limitam a resposta a 30 clientes. A página deve ser um inteiro positivo; páginas além do limite são ajustadas à última. Uma busca vazia retorna a base do filtro. Sem `pagina`, permanece o comportamento legado sem paginação.
- A busca por nome/telefone ocorre no banco sobre toda a seleção, não só sobre os 30 itens visíveis. O frontend aguarda 250 ms após digitação e ignora respostas obsoletas.
- O modal do admin abre antes da busca, sem recarregar todas as listas; após excluir um cliente, recarrega a página atual.
- Categorias do corretor: trabalhados, em atendimento, follow up, na fila e mensagens enviadas compartilham o modal paginado. Retornos/agendamentos que usam o mesmo modal também recebem paginação.
- Até 600 px, os contatos do admin aparecem em cartões. Paginação fica acessível no rodapé; botões têm área mínima de 44 px. Corretor usa os mesmos ícones, cores e espaçamentos de navegação.
- CSS de paginação ainda é mantido separadamente em `admin.css` e `corretor.css`; alterações visuais devem conferir os dois.

### 12.3 Menus e requalificação do corretor

- `posicionarMenu()` limita os menus ao viewport visível. Não somar `scrollX`/`scrollY` a coordenadas de elementos com `position: fixed`.
- Menus de carteira e qualificação fecham ao redimensionar ou rolar fora deles. A lista de opções tem rolagem interna.
- “Retornar depois” e “Agendado” abrem o formulário de data, hora e local também na requalificação, inclusive ao selecionar a mesma tag atual.
- O PATCH de qualificação requer `agendamento_data` para essas duas tags. O frontend envia `AAAA-MM-DD HH:mm:00-03:00`; o backend usa sua rotina de tratamento de timezone.
- O formulário foi incorporado à página do corretor a partir da estrutura da prospecção; os handlers ainda são separados. Não pressupor um componente compartilhado.

### 12.4 Ícones e manifesto do PWA

- `frontend/manifest.webmanifest`: nome `Prospect SR Lançamentos`, nome curto `Prospect`, `id` e escopo `/`, início `/index.html`, `display: standalone`, tema `#002c61`.
- Fonte exclusiva dos ícones: `frontend/assets/icons/prospect-source.png`, imagem enviada pelo usuário em 06/11/2026. Não substituir a logo do site em `frontend/assets/img/logo.png`.
- Ícones gerados: `prospect-192.png`, `prospect-512.png`, `prospect-maskable-512.png` e `apple-touch-icon.png` (180 × 180).
- O adaptativo usa escala 0,70 e fundo `#00244d` para preservar o desenho nos recortes do sistema. Os demais usam a imagem completa.
- Regerar da raiz com `node scripts/generate-pwa-icons.cjs`; requer a dependência `canvas` instalada em `backend/node_modules`.
- Os PNGs e a fonte estão versionados. Todas as seis páginas HTML referenciam manifesto e ícone Apple. URLs dos ícones usam `?v=2`; atualizar a versão ao trocar a arte.
- Não há service worker nem implementação de modo offline nesta entrega. Não confundir personalização de instalação com suporte offline.

### 12.5 Histórico recente por commit

| Commit | Mudança |
|---|---|
| `9d319e9` | Contagens e gráfico de qualificações do dashboard |
| `e8e63d4` | Filtro compartilhado de carteira e seletor estilizado |
| `04cbb0c` | Paginação das listas do admin |
| `79fe992` | Paginação do corretor e adaptação mobile dos modais |
| `10b9f83` | Aparência da paginação do corretor igual à do admin |
| `ce8cc67` | Menus e formulário de agendamento na requalificação |
| `9aaacd8` | “Lembrar de mim” e restauração de sessão |
| `5957409` | Manifesto e ícones iniciais do PWA |
| `fedd84b` | Imagem exclusiva enviada pelo usuário para o PWA |

## 13. Verificação e limitações conhecidas

- Nas entregas recentes foram executadas verificações de sintaxe JavaScript, `git diff --check` e verificações pontuais com Node.
- Paginação: verificações com banco simulado para limites, busca parametrizada, base vazia e filtros. Não equivalem a testes de integração com PostgreSQL.
- Sessão: verificações com armazenamento simulado para persistência, troca de opção e logout; não houve teste completo de login em navegador.
- Menus: cálculos de posição verificados em tamanhos de desktop/mobile; não houve validação visual automatizada em navegador.
- PWA: dimensões e referências validadas; ícones inspecionados visualmente. A entrega inicial também verificou HTTP e MIME com Express local. Instalação real em Android/iOS/desktop não foi testada.
- Não há scripts `test`, `lint` ou `build` definidos nos package.json atuais. As verificações pontuais anteriores não constituem uma suíte de regressão versionada.
- Iniciar `backend/server.js` chama `inicializarSchema()` e pode aplicar o schema no banco configurado. Não tratar a inicialização como uma verificação somente de leitura.
- Afirmações antigas deste documento sobre limites comerciais de Vercel/Cloudinary, modelos Gemini, latências e soluções propostas são contexto histórico. Confirmar documentação oficial atual antes de depender delas; não foram revalidadas nesta atualização.

## 14. Orientações de trabalho adotadas

O usuário forneceu o documento “AI ENGINEERING REPOSITORY BOOTSTRAP V6.1” e pediu conformidade nas próximas tarefas.

- Investigar código, configuração, histórico e instruções existentes antes de modificar; separar fatos verificados, inferências e desconhecidos.
- Descobrir Skills aprovadas no repositório, consultar especificações/design pertinentes e documentação oficial atual quando houver dependência de comportamento externo.
- O documento aponta OpenSpec como destino para contratos comportamentais relevantes. Ainda não há OpenSpec, AGENTS.md, CLAUDE.md, DESIGN.md ou estrutura `.ai` versionados neste repositório; o bootstrap foi lido, não executado. Não alegar instalação ou validação desses mecanismos.
- Fazer a menor alteração completa, preservar trabalho alheio e evitar refatorações ou dependências sem relação com a tarefa.
- Identificar falhas reais antes de escolher testes. Não usar quantidade de testes ou cobertura como prova de qualidade.
- Relatar o que foi e não foi validado; conferir mobile e desktop quando a mudança envolver interface.
- Git e publicação seguem a autorização explícita descrita na seção 8.2. Não adicionar atribuição promocional ou autoria de IA.
- Manter conhecimento durável neste arquivo sem copiar integralmente o bootstrap nem criar documentação duplicada.

FIM DO CONTEXTO. Conferir o código atual antes de alterar comportamentos: este documento é um mapa do projeto, não substitui evidência do runtime.


## Admin — centro de comando (17/11/2026)
Frontend reorganizado em Operação geral, Por carteira e Por corretor: frontend/js/admin-command.js e frontend/css/admin-command.css. admin.js mantém os formulários e ações existentes por uma ponte de integração; markup legado do dashboard fica oculto para conservar os elementos dos drill-downs. admin.html carrega o mesmo controlador e tokens Claro/Escuro/Automático do corretor; preferência manual persistida em prospect-theme. Nenhuma API ou regra de banco alterada. Detalhes e limitações em openspec/specs/admin-dashboard/spec.md. 26 testes passaram; revisão visual ainda pendente por indisponibilidade segura do navegador.


## 17/11/2026 — Integração administrativa WhatsApp / OpenWA

- Nova página `frontend/admin-whatsapp.html`, acessível no menu do admin, usando temas existentes.
- Backend `/api/admin/whatsapp` protegido por `autenticar` e `apenasAdmin`; adaptador OpenWA com
  timeout, erros sanitizados, ações restritas, chave somente em ambiente do servidor e respostas no-store.
- Gerencia sessões (criar/iniciar/parar/desvincular/excluir), QR e paginação; não envia mensagens nem muda qualificação.
- OpenWA 0.30.3 fixado no commit 640aadf9f46bc73efea936e4aa40563cc9f45a58; implantação separada em
  `deploy/openwa`, com Docker, volume persistente, Caddy/HTTPS e gerador de segredos que não sobrescreve `.env`.
- Usuário ainda não tem servidor/conta de hospedagem e pediu alternativa gratuita. Nenhum servidor foi
  contratado/criado, nenhuma credencial de produção configurada, nenhum número pareado. Oracle Always Free
  pode ser avaliada após cadastro do usuário; operação local requer computador ligado.
- Docker não está disponível neste ambiente. Build da imagem, revisão visual e pareamento real pendentes.
- Validação concluída: 40 testes Node aprovados, sintaxe JavaScript, IDs/arquivos do HTML e git diff --check. Nenhum teste usou banco ou gateway de produção.

## 18/11/2026 — Páginas de carteiras/equipe e atividade de contato
- Removidas tabs internas do centro de comando. Carteiras e Corretores exibem as respectivas visões na navegação existente. Cadastro/edição e manutenção preservam os handlers originais.
- Carteiras têm hubs ativos e inativos (recolhido), busca, paginação, criação e atualização. Conclusão é calculada com total > 0 e nenhum lead novo, excluindo teste. Concluídas continuam visíveis aos corretores; inativação manual oculta carteira, contatos e estatísticas do corretor sem redistribuir nem apagar dados. Reativar restaura visibilidade.
- Schema adiciona listas.inativa_manual e eventos_contato, aplicado pelo inicializador existente. Não foi executado manualmente no banco de produção.
- POST /api/corretor/eventos-contato valida proprietário, carteira visível, tipo e UUID idempotente. Captura cliques em Ligar, WhatsApp e qualificação sem bloquear a ação. Falhas de coleta não fabricam eventos nem impedem prospecção.
- GET /api/admin/equipe/atividade: log paginado e cliques por corretor nos últimos 30 dias, média de clientes únicos acionados por corretor/dia com atividade, média entre requalificações de clientes diferentes pelo mesmo corretor no mesmo dia e intervalo entre Ligar e primeira qualificação/WhatsApp posterior. Não confirma chamada atendida nem grava áudio. Chamadas sem encerramento não entram na média; métricas sem amostra mostram travessão.
- Coleta de cliques começa após publicação; histórico de requalificações usa registros existentes. Manutenção da equipe pagina 10 corretores.
- Preferências Claro/Escuro/Automático permanecem compartilhadas. Não há build/lint/TypeScript configurados; testes Node, sintaxe e diff são as verificações disponíveis. Revisão visual e integração com PostgreSQL real permanecem pendentes.

## 21/11/2026 — Navegação administrativa por páginas
- Sidebar com quatro links: Centro de comando, Carteiras, Corretores e Empreendimentos. Cadastro/atualização de carteiras e categorias permanecem disponíveis dentro de Carteiras; WhatsApp continua acessível pelo endereço existente, sem item na sidebar.
- Novas rotas HTML: /admin-carteiras.html, /admin-corretores.html, /admin-empreendimentos.html e /admin-conta.html. backend/services/adminPages.js renderiza os templates existentes com destino inicial fixo; navegação usa links reais e histórico do navegador, sem alternar visões no clique da sidebar. Formulários compartilhados mantidos para evitar duplicação de regras e IDs.
- Minha Conta administrativa reutiliza conta.js, /api/me e alteração de senha, com sidebar/cápsula mobile e tema compartilhados. conta.html encaminha administradores à nova página; corretor mantém experiência existente. Guard cobre todos os destinos admin-*; autorização de APIs continua no backend.
- Rotas renderizadas verificadas com testes de destinos, painel ativo, IDs únicos e guard, sem conectar ao banco. Revisão visual em navegador pendente.

## 21/11/2026 — Hub visual de empreendimentos e otimizações do admin
- frontend/js/admin-properties.js e css/admin-properties.css implementam hub de capas, filtros bairro/construtora, busca e indicadores reais; fase Entregue define Prontos.
- Detalhes abrem em painel lateral nativo dialog. Editar reutiliza formulário existente; publicar/despublicar e excluir preservam endpoints/regras. Drive permanece recolhível no hub. Dados cadastrados não foram migrados nem alterados.
- Incluídas correções de carregamento anteriores: sidebar montada no HTML, aplicação antecipada de geometria, legado oculto no primeiro paint, Chart.js assíncrono, formulários carregados sob demanda, consultas de carteiras agregadas e atualizações de responsáveis em lotes transacionais.
- Validação local por sintaxe e testes; sem medição de desempenho em produção nem revisão visual em navegador.

## 21/11/2026 — Adicionar empreendimentos e paginação
Botão Adicionar agora abre escolha entre Manual e Importar. Google Drive usa modal próprio, reaproveitando os controles originais; não há mais área de importação sob o hub. Hub limita a oito cards por página, com filtros aplicados antes do recorte. Confirmação/revisão da importação liberam o top layer para os modais existentes.

## 23/11/2026 — Refinamento do corretor
Dashboard: tema junto ao seletor, indicadores secundários tabulares, edifício com link à vitrine/hover e sidebar sem Prospecção. Vitrine do corretor: temas desktop/mobile, sidebar compartilhada, cards e indicadores com dados publicados, paginação de oito e detalhes laterais somente leitura. Filtros existentes preservados. Estilos em frontend/css/broker-refresh.css; APIs/regras de negócio sem mudança. Correções anteriores do log com cinco registros e montagem do admin já estavam no commit 24e6e13 ao iniciar esta tarefa.

## 24/11/2026 — Shell do corretor e correção da vitrine
Navegação/tema compartilhados nas páginas internas por frontend/js/broker-shell.js. Conta admin remove esses assets na renderização para não duplicar sidebar. Vitrine passa a sobrescrever explicitamente regras legadas horizontais e largura de capa; conteúdo limitado e alinhado à sidebar. KPIs desktop em seis colunas. Tema usa top layer também para corretor. Sem alteração de APIs ou regras de negócio.

## 24/11/2026 — Geometria da prospecção desktop
Shell agrupa título, progresso, carteira/tema e main em broker-prospect-workspace, movendo os elementos existentes sem recriar IDs ou eventos. Acima de 1024px, conteúdo centralizado com limite de 1040px dentro da área livre da sidebar, qualificações em duas colunas. Mobile mantém display:contents no agrupador. Removido botão voltar legado do cabeçalho interno (display:flex anulava hidden e comprimia a marca); navegação Início permanece. Validação: sintaxe JS, diff e 78 testes aprovados, incluindo preservação dos nós/eventos no agrupamento. Revisão visual em navegador pendente.

## 24/11/2026 — Hub consultivo alinhado ao admin
Empreendimentos do corretor usa cabeçalho semântico, busca/bairro/construtora compactos e filtros de cidade/entrega/renda em Mais filtros. Indicadores recebem descrições; cards seguem escala e breakpoints do admin. Mantidos IDs, eventos, paginação de oito, APIs públicas existentes e detalhes consultivos, sem controles administrativos. Sintaxe e 78 testes aprovados; revisão visual no navegador pendente.

## 24/11/2026 — Componentes compartilhados de empreendimentos e indicadores
frontend/js/property-hub.js renderiza os mesmos cards e campos do slide over para admin/corretor. O parâmetro administrativo acrescenta editar/publicar/despublicar/excluir; corretor mantém apenas leitura e book, usando dados do endpoint publicado existente. admin-properties.css atende ambas as visões e shared-surfaces.css elimina sobreposições de botões genéricos e unifica degradê dos KPIs. Filtros adicionais com fonte de 12px. desktop-sidebar.js move o controle de tema existente para antes do avatar no mobile e restaura posição desktop sem recriar eventos/preferências. Testes cobrem paridade de detalhes, exclusividade das ações, escape de conteúdo, paginação e posição responsiva do tema. Validação visual no navegador ainda pendente.

## 24/11/2026 — Histórico de prospecção integrado
Prospecção divide a área desktop entre ficha e histórico; mobile usa details inicialmente recolhido. Busca e paginação de 30 registros reutilizam /api/corretor/leads-por-status com carteira e corretor autenticado, descartando respostas obsoletas. Clique no cliente usa /api/corretor/lead/:id e preenche a ficha existente para novo contato; Voltar à fila retoma próximo lead sem registrar resultado. Requalificação/agenda continuam pelo fluxo existente de resultado, que verifica titularidade e registra histórico. Levar para esteira é placeholder desativado. Tema fica no cabeçalho junto ao título. 82 testes aprovados; revisão visual em navegador pendente.

## 24/11/2026 — Alinhamento da ficha e histórico desktop
Resultados da prospecção voltam a uma coluna no desktop. Histórico acompanha a altura da ficha por alinhamento de grid e contenção de tamanho; lista possui rolagem interna e paginação permanece no rodapé. Mobile preservado. 82 testes existentes aprovados; aparência em navegador não verificada nesta alteração.

## 24/11/2026 — Correção de compressão dos cards do histórico
Colunas desktop com larguras iguais; lead-card sem margem inferior para alinhar a base com o histórico. Histórico usa grid-auto-rows:max-content e cards sem encolhimento, evitando que os 30 registros sejam comprimidos na altura da lista rolável. Ações em áreas separadas, botão Requalificar explícito e data identificada como Qualificado em. 83 testes aprovados, incluindo conteúdo da ficha; revisão visual em navegador pendente.

## 25/11/2026 — Esteira comercial integrada
- Páginas esteira.html e admin-esteira.html usam js/esteira.js e css/esteira.css, com os temas e sidebars existentes. Links habilitados no desktop/mobile e acesso comercial do dashboard. Admin tem busca, carteira e corretor; corretor vê apenas sua titularidade atual, verificada também em cada endpoint.
- API /api/esteira: listagem filtrada, inclusão idempotente por lead, movimentação transacional com versão otimista e eventos de auditoria. Botões Levar para esteira habilitados na ficha e no histórico de prospecção. Incluir não qualifica automaticamente o lead.
- Seis etapas sequenciais: Documentação → Aprovação de Crédito → Validação Fluxo → Contrato assinado Construtora → Aguardando Caixa → Contrato assinado Caixa. Arraste abre confirmação; formulário funciona por teclado/mobile. Avanço de uma etapa por vez, sem retorno; versão obsoleta retorna 409.
- Contrato construtora marca resultado vendido e registra histórico no corretor proprietário (sem duplicar se já vendido). Recebimento de 50% é opcional, confirmado manualmente; Caixa registra 100% acumulado e finaliza. Controle em percentuais, sem inventar valores monetários ou calcular comissão em reais.
- Schema idempotente cria negociacoes e negociacao_eventos na inicialização normal do deploy. Nenhum comando de banco de produção executado nesta sessão. APIs e regras anteriores preservadas fora da integração explícita de venda.
- Validação: sintaxe JS, diff e 92 testes aprovados, incluindo isolamento de corretor, idempotência, conflitos de versão, rollback, venda/comissão acumulada e páginas. Ainda pendentes conferência visual no navegador e integração com PostgreSQL real após implantação.

## 26/11/2026 — Tema da prospecção e badges
Superfícies de espera, ficha, seletor de carteiras, resultados e observação usam tokens de tema em todos os breakpoints, corrigindo fundos brancos no desktop dark. Badges editáveis sobrescrevem regras legadas !important de nowrap/fit-content, permitem quebra e mantêm ícone de edição sem legenda Requalificar (tooltip preservado). 92 testes aprovados; validação visual no navegador pendente.

## 26/11/2026 — Fluxo comercial completo e financeiro confirmado
- Esteira ampliada nas visões admin/corretor com checklist, documentos privados (PDF/JPEG/PNG, até 3 MB, BYTEA autenticado), análise de crédito atribuída a administrador, observações, exceções sem novas colunas, filtros e auditoria. Corretor mantém titularidade registrada na negociação, independente de futuras redistribuições do lead.
- Vendas e comissões disponíveis em vendas.html/admin-vendas.html. Contrato da construtora registra venda e VGV uma única vez; contrato Caixa finaliza a venda sem apagar saldo pendente. Recebimentos/antecipações só entram no recebido após confirmação administrativa. Chaves idempotentes, transações, controle de versão e validação monetária em centavos.
- Inclusão pela prospecção mantém qualificação original. Empreendimentos vinculados usam registros existentes; corretor não pode vincular novo empreendimento não publicado. Dashboard recebe resumo comercial real e notificações internas; sem WhatsApp/email externo.
- Migration backend/database/migrations/20261126_comercial.sql aplicada ao banco configurado nesta sessão. Runner transacional backend/scripts/migrate.cjs controla versões e roda também na inicialização. Percentuais legados preservados como histórico, não convertidos em dinheiro: contratos anteriores precisam ter valores reais preenchidos para alimentar o financeiro.
- Validação: 91 testes automatizados aprovados, sintaxe JS e diff; integração PostgreSQL em schema temporário com rollback cobrindo documentos, titularidade, crédito, venda, antecipação, finalização, saldo e idempotência. Projeto não possui comandos lint/build. Prévia local inacessível no navegador disponível; revisão visual desktop/mobile permanece pendente.
