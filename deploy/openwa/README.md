# WhatsApp do Prospect — OpenWA

Integração administrativa em `/admin-whatsapp.html`. O navegador acessa somente o backend
Prospect, com JWT e verificação de administrador existentes. A chave OpenWA fica no servidor.
Nenhuma mensagem é enviada e nenhuma regra de qualificação ou tabela do CRM é alterada.

## Contrato e versão

Fonte: https://github.com/rmyndharis/OpenWA (MIT), versão 0.30.3, commit
`640aadf9f46bc73efea936e4aa40563cc9f45a58`. O build Docker usa esse commit, não `latest`.
Rotas verificadas no código: `/api/sessions`, `/:id/start`, `/:id/stop`,
`/:id/logout`, `/:id/qr` e DELETE `/:id`; autenticação `x-api-key`.
QR é uma data URL PNG. Criar uma sessão não a inicia automaticamente.
Não é a API oficial da Meta: utiliza uma sessão vinculada do WhatsApp Web.

## Implantação em VPS Linux

Necessário: conta de hospedagem, VPS com Docker Engine/Compose e Git, domínio/subdomínio
apontado por DNS ao VPS e portas 80/443 liberadas. Reserve memória para o build e Chromium;
o serviço está limitado a 2 GiB em execução, ajuste conforme o número de sessões.
Vercel hospeda o Prospect; o processo persistente do OpenWA roda no VPS separado.

1. No servidor, obtenha este repositório e entre em `deploy/openwa`.
2. Execute `node configure.cjs` (Node 22 recomendado). Ele cria `.env` com segredos aleatórios,
   sem sobrescrever um arquivo existente. Não versione nem compartilhe esse arquivo.
3. Preencha `OPENWA_DOMAIN` no `.env` com seu subdomínio (sem esquema ou caminho).
4. Execute `docker compose --profile https config --quiet` e depois
   `docker compose --profile https up -d --build`.
5. Confira `docker compose ps` e o estado healthy do gateway. Caddy provisiona o certificado
   após o DNS apontar ao VPS. O dashboard do OpenWA não é publicado pelo proxy.
6. Nas variáveis de ambiente do **backend Prospect/Vercel**, configure:
   - `OPENWA_BASE_URL=https://SEU_SUBDOMINIO/api`
   - `OPENWA_API_KEY`: mesmo valor gerado no `.env` do gateway.
   Faça redeploy do Prospect. Não coloque chaves no HTML, JS do frontend ou Git.
7. Entre no Prospect como admin → WhatsApp → crie uma conexão → Iniciar → aguarde
   “Aguardando QR Code” → Vincular por QR. Escaneie com o telefone autorizado e confirme
   o status “Conectada”. Teste parar/iniciar apenas essa conexão de teste.

Para desenvolvimento local: `docker compose up -d --build`; a porta 2785 fica vinculada
somente a 127.0.0.1. Use `http://127.0.0.1:2785/api` no backend local.

## Operação

- O volume `openwa-data` guarda SQLite e as credenciais das sessões. Faça backup protegido
  do volume com o serviço parado (`docker compose stop openwa`); reinicie depois do backup.
  Não use `down -v`: isso apaga conexões e banco do gateway.
- Não troque `OPENWA_KEY_PEPPER` em uma instalação existente sem seguir a migração upstream:
  a mudança invalida hashes de chaves. Alterar API_MASTER_KEY após o primeiro boot não é
  uma rotação garantida: gerencie a chave no gateway conforme documentação upstream.
- O bootstrap usa a chave master para a primeira instalação. Depois, é possível criar uma chave
  OPERATOR no gateway (acesso administrativo por túnel SSH) e usar essa chave no Prospect.
- A interface confirma parar/desvincular/excluir; não há envio em massa, webhooks, importação
  de conversas nem atribuição automática de contas a corretores nesta primeira etapa.
- HTTPS é obrigatório para gateway remoto; HTTP só é aceito em loopback para desenvolvimento.
  Não há proxy genérico: o backend oferece exclusivamente as ações acima, sem URLs fornecidas
  pelo navegador. Erros externos são sanitizados e QR/respostas recebem `Cache-Control: no-store`.
- Em timeout, atualize a lista antes de repetir uma ação: o gateway pode ter concluído a operação.

## Validação e pendências de infraestrutura

Testes isolados: `node --test backend/tests/*.test.cjs`. Não exigem banco ou WhatsApp real.
Sem build/lint/TypeScript configurados no Prospect; use `node --check` nos novos scripts.
A instalação Docker e o pareamento real dependem de VPS, DNS e acesso de hospedagem.
Não considere a integração operacional antes de concluir os passos 4–7.
