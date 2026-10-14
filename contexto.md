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
│ ├── server.js ← Express app, registra rotas
│ ├── seed.js ← cria admin + dados iniciais
│ ├── config/
│ │ └── db.js ← Pool do Postgres + parser customizado de timestamp
│ ├── database/
│ │ └── schema.sql ← schema completo, roda no boot
│ ├── middlewares/
│ │ └── auth.js ← autenticar, apenasAdmin, apenasCorretor
│ ├── routes/
│ │ ├── auth.js ← POST /login, GET /me, PUT /me, PUT /me/senha
│ │ ├── admin.js ← rotas do painel admin (~750 linhas)
│ │ └── corretor.js ← rotas do corretor (~600 linhas)
│ ├── controllers/ ← (vazios, lógica está nas routes)
│ ├── models/ ← (vazios, uso direto do pool)
│ └── services/ ← (vazios)
└── frontend/
├── index.html ← tela de login
├── admin.html ← painel admin (dashboard, upload, listas, corretores)
├── corretor.html ← DASHBOARD do corretor (KPIs, listas)
├── prospeccao.html ← TELA DE PROSPECÇÃO (lead ativo)
├── conta.html ← perfil do usuário (nome + senha)
├── css/
│ ├── style.css ← variáveis globais (cores, tipografia)
│ ├── avatar.css ← botão avatar + dropdown (compartilhado)
│ ├── login.css
│ ├── admin.css
│ ├── corretor.css ← COMPARTILHADO dashboard + prospecção
│ ├── prospeccao.css ← SÓ prospecção (sobrescreve corretor.css)
│ └── conta.css
└── js/
├── api-client.js ← wrapper fetch + JWT + logout automático
├── auth.js ← lógica do login
├── auth-guard.js ← protege páginas internas (rodar no <head>)
├── avatar.js ← monta dropdown do avatar (blindado)
├── acoes.js ← helper de ligar + WhatsApp + formatação
├── admin.js ← lógica do painel admin (~3500 linhas)
├── corretor.js ← lógica do DASHBOARD (~700 linhas)
├── prospeccao.js ← lógica da PROSPECÇÃO (~800 linhas)
└── conta.js ← lógica do perfil

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

**Decisão:** o header é **compacto (820px) e centralizado** em TODAS as páginas (dashboard, prospecção, conta, admin).

- `corretor.css` define `.header-inner { max-width: 820px; justify-content: center }`
- `prospeccao.css` **não sobrescreve** o header (só adiciona o botão voltar)

**Não mudar** esse comportamento. Foi uma decisão explícita do cliente — quer o padrão compacto em todas as telas.

### 3.3 `.app-main` diferente por contexto

- `corretor.css` → `.app-main { max-width: 1100px }` (dashboard precisa de largura pra KPIs)
- `prospeccao.css` → `body.prospeccao-page .app-main { max-width: 820px }` (prospecção é mais estreita, igual ao original)

**Ordem dos `<link>` no HTML importa:**

```html
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/avatar.css">
<link rel="stylesheet" href="css/corretor.css">      <!-- ou conta.css -->
<link rel="stylesheet" href="css/prospeccao.css">    <!-- SÓ na prospeccao.html -->
avatar.css DEVE vir antes de corretor.css/conta.css.

3.4 Editor de tag inline
Tanto prospeccao.js quanto corretor.js têm um editor de tag inline que permite o corretor alterar a qualificação de um lead clicando na tag colorida.

Regras:

Result-list (botões do lead ativo em prospeccao.html) → 6 tags:
agendado, em_atendimento, mensagem_enviada, retornar_depois, sem_interesse, telefone_invalido

Editor inline (ao clicar na tag do histórico ou do modal KPI) → 9 tags:
todas as 6 + vendido, follow_up, sem_resposta

Funciona com:

Delegação de evento (não perde clique ao re-renderizar)

pointer-events: none nos filhos do botão (o clique sempre cai no <button>)

CSS forçando display: inline-flex no .tag-editavel (evita display: block vindo de reset)

CSS do editor: .tag-editor, .tag-editor-header, .tag-editor-close, .tag-editor-list, .tag-opcao. Definidos em corretor.css com !important no final do arquivo (bloco "GARANTIA FINAL" + "TAG EDITOR").

JS: abrirSeletorTag(btn) cria o popup em document.body com position: fixed. Não usar position: absolute — quebra por causa do scroll.

3.5 Estatísticas e nomenclatura de KPIs
Backend (/api/admin/dashboard e /api/corretor/estatisticas):

KPI	Regra no banco
trabalhados	status != 'novo'
qualificados	trabalhados (mesmo número — "se propôs a trabalhar pelo menos 1x")
em_atendimento	resultado IN ('em_atendimento', 'agendado')
follow_up	resultado = 'follow_up' (SÓ este, não somar mensagem_enviada)
mensagens_enviadas	resultado = 'mensagem_enviada' (SÓ este)
na_fila	status = 'novo'
retornar_depois	resultado = 'retornar_depois'
⚠️ NÃO SOMAR TAGS. Cada KPI pega sua tag direto, sem misturar. Já erramos feio com isso no passado (follow_up somava mensagem_enviada + retornar_depois + follow_up e dava número errado).

Regra do "lead trabalhado": quando o corretor requalifica (muda de mensagem_enviada para follow_up, por ex), o lead NÃO desaparece do total de trabalhados. Ele só muda de tag. O histórico registra as duas ações.

3.6 Timezone — regra crítica
Backend:

server.js força process.env.TZ = 'UTC' na primeira linha

config/db.js sobrescreve os parsers do pg (OIDs 1114 e 1184) para retornar strings cruas em vez de Date object

Motivo: o Postgres interpretava timestamp without time zone como UTC e deslocava 3h na exibição

Frontend:

Sempre formatar com timeZone: 'America/Sao_Paulo' explícito

Helper parseDataAgendamento no JS normaliza as datas do agendamento

limparTimezone no backend remove o -03:00 antes de salvar (coluna é timestamp without time zone)

⚠️ Se ver datas deslocadas 3h, é problema de timezone. Não mexer sem entender as duas pontas.

3.7 Autenticação
JWT salvo em localStorage com chave sr_token

api-client.js injeta o token em toda requisição e faz logout automático em 401

auth-guard.js roda no <head> de todas as páginas internas e redireciona se não tem token

Backends:

routes/auth.js → login/me/senha (liberado)

routes/admin.js → router.use(autenticar, apenasAdmin) ⚠️ NUNCA trocar por apenasCorretor

routes/corretor.js → router.use(autenticar, apenasCorretor)

3.8 Dropdown do avatar — blindado
avatar.js remove qualquer .dropdown-menu existente antes de criar o novo. Isso evita duplicação visual quando a página é re-renderizada.

O CSS .dropdown-menu tem visibility: hidden por padrão e só mostra com .open. Não remover o visibility: hidden — ele é o que esconde o dropdown quando a página carrega.

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
GET /corretores · POST /corretores · PATCH /corretores/:id · DELETE /corretores/:id

PATCH /corretores/:id/tipo → alterna entre corretor e teste

GET /listas · POST /listas · DELETE /listas/:id

POST /listas/preview-dedupe → simula distribuição

GET /listas/:id/contatos · GET /listas/:id/corretores · PATCH /listas/:id/corretores · PATCH /listas/:id/mensagem

DELETE /leads/:id

GET /dashboard · GET /dashboard/graficos · GET /dashboard/tag/:tag · GET /dashboard/carteiras

Corretor (/api/corretor/*) — requer apenasCorretor
GET /proximo-lead?lista_id=X

GET /lead/:id · GET /lead/:id/historico

POST /leads/:id/resultado → registra tag + observação + data (se aplicável)

PATCH /leads/:id/qualificacao → altera tag (editor inline)

GET /minhas-carteiras

GET /estatisticas?lista_id=X

GET /leads-por-status?status=XXX&lista_id=Y → alimenta modais dos KPIs

GET /historico/carteiras · GET /historico/carteiras/:listaId

GET /agendamentos

6. Bugs conhecidos e como evitar
6.1 NÃO SOMAR TAGS NOS KPIs
Cada KPI pega só a tag dele. Ex:

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
Sem isso, o clique no <span> ou <i> não sobe pro <button> em alguns casos.

6.6 NÃO remover visibility: hidden do .dropdown-menu
Sem isso, o dropdown aparece aberto ao carregar a página.

6.7 Ordem dos <link> CSS importa
style.css → avatar.css → corretor.css/conta.css → prospeccao.css (só na prospecção).

6.8 Falta do <link> do FontAwesome
Sintoma: ícones não aparecem (ex: seta ← do botão voltar). Sempre conferir o <link> no <head>.

6.9 Cache do navegador / Vercel
Sempre testar com Ctrl+Shift+R. No Vercel, aguardar o deploy ficar Ready.

7. Banco de dados (schema resumido)
Tabelas principais:

usuarios — admin + corretor + teste (campo tipo)

listas — carteiras (nome, total, mensagem_whatsapp)

leads — contatos (nome, telefone, corretor_id, status, resultado, agendamento_data, observacao, data_reenvio, decidido_em)

historico — log de todas as ações (lead_id, corretor_id, acao, observacao, criado_em)

tentativas_corretores — quem já tentou contato com cada lead (usado pra redistribuir sem_resposta)

lista_corretores — quais corretores participam de cada lista

Colunas de timestamp: timestamp without time zone (por isso o parser customizado em db.js).

8. Fluxo de trabalho (dev)
8.1 Rodar local
powershell
# Na raiz do projeto
cd backend
node server.js
Servidor sobe em http://localhost:3000.

8.2 Branches
main → produção (Vercel faz deploy automático)

refatoracao → trabalho em andamento

Merge na main: usar git merge --squash refatoracao (histórico limpo)

8.3 Deploy
powershell
git add .
git commit -m "feat: descrição clara"
git push origin main
Vercel detecta, faz build e deploy em ~1-2 min.

8.4 Variáveis de ambiente (Vercel + local .env)
text
DATABASE_URL=postgresql://... (Neon)
JWT_SECRET=chave_secreta
JWT_EXPIRES_IN=7d
PORT=3000 (só local)
9. O que NÃO fazer (regras de ouro)
❌ Não juntar corretor.html e prospeccao.html de volta — foi decisão explícita separar.

❌ Não somar tags nos KPIs — cada um pega sua própria tag.

❌ Não mudar o middleware de routes/admin.js — deve ser apenasAdmin.

❌ Não remover os !important do bloco final do corretor.css — são gambiarra necessária por causa de reset global.

❌ Não usar position: absolute no .tag-editor — quebra com scroll.

❌ Não remover visibility: hidden do .dropdown-menu — quebra o dropdown.

❌ Não colocar avatar.css depois de corretor.css/conta.css — a ordem importa.

❌ Não testar sem Ctrl+Shift+R — cache engana.

❌ Não mexer no timezone sem entender as duas pontas (backend e frontend).

❌ Não apagar arquivos .js/.css "que parecem não usados" sem confirmar com o cliente — o sistema tem muitas dependências cruzadas.

10. Contato / próximos passos
Dono do projeto: Rodrigo (cliente)
Status atual: em produção, funcionando
Pendências conhecidas:

Nenhuma crítica no momento

Se for continuar o desenvolvimento:

Ler este arquivo inteiro

Rodar localmente (node backend/server.js)

Testar o fluxo completo (admin → corretor → prospecção)

Fazer mudanças na branch refatoracao (ou criar uma nova)

Testar tudo localmente ANTES de commitar

Fazer git merge --squash na main e push

Se algo quebrar:

Consultar a seção "Bugs conhecidos" (item 6)

Verificar o console do navegador (F12)

Verificar os logs do servidor no terminal do Node

Se for problema de deploy, checar o painel do Vercel

11. Histórico de mudanças relevantes
v1 (original): corretor.html fazia tudo — dashboard + prospecção + histórico + agendamentos

v2 (refatoração): separação em corretor.html + prospeccao.html

v3: corrigido middleware routes/admin.js (estava apenasCorretor, mudou pra apenasAdmin)

v4: editor de tag inline (9 qualificações) em ambas as telas

v5: correção das estatísticas — cada KPI pega só sua tag

v6: adicionado case 'retornar_depois' e case 'agendado' no /leads-por-status

v7: unificado avatar/dropdown no avatar.css (removido duplicação em conta.css e corretor.css)

v8: botão voltar no conta.html + prospeccao.html

FIM DO CONTEXTO. Se você é uma LLM lendo isso, seja cuidadoso com as decisões já tomadas. Pergunte antes de refatorar. O sistema está em produção e tem usuários ativos.

Última edição: Outubro/2026
Autor do handoff: assistente anterior (Claude)

text

---

## 📋 Como usar

1. **Cria o arquivo `CONTEXTO.md`** na **raiz do projeto** (mesma pasta do `README.md`)
2. **Cola o conteúdo acima**
3. **Salva** e **commita:**

```powershell
git add CONTEXTO.md
git commit -m "docs: adiciona CONTEXTO.md para handoff entre LLMs"
git push origin main