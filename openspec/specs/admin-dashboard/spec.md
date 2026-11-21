# Centro de comando administrativo

## Escopo
Refatoração exclusiva do frontend admin. APIs, autenticação, banco e regras de distribuição permanecem intactos. As páginas do corretor não recebem novos estilos.

## Visões
- Operação geral: indicadores reais, distribuição por qualificação com filtro de corretor, alertas derivados de progresso/acesso/retorno, evolução de 30 dias, presença estimada por acesso e hub resumido.
- Por carteira: cards com total, trabalhados, saldo e progresso circular. Desempenho individual somente no slide over. Abas Visão geral, Equipe, Contatos (30 por página com busca) e Atividades (agregados diários reais).
- Por corretor: indicadores globais, funil, evolução e tabela de manutenção. Slide over com estado atual, qualificações, requalificações e acesso. Cadastro, edição e atividade reutilizam os formulários e confirmações anteriores.

## Tema
Claro, Escuro e Automático compartilham a chave prospect-theme e o controlador existente. Sem preferência salva, Automático usa o horário local: claro de 06h a 18h, escuro fora desse intervalo. Uma escolha manual persiste e prevalece sobre o horário até a pessoa escolher Automático novamente. Os gráficos mudam de paleta sem nova consulta.

## Limitações explícitas dos dados
APIs não fornecem evolução ou requalificações individuais, último acesso dos inativos nem permissões granulares. Esses dados são sinalizados como indisponíveis. Não são inventadas variações percentuais entre períodos. Carteiras com clientes atribuídos não equivalem necessariamente a vínculos de distribuição. O saldo dos cards respeita os totais existentes e pode incluir sem resposta e órfãos. Exportação CSV contém o resumo atual das carteiras.

## Validação
26 testes Node aprovados, incluindo isolamento de respostas do slide over, carregamentos concorrentes, escape de conteúdo, totais dos cards e preferência persistida do admin. Verificação de sintaxe dos scripts e git diff --check. O projeto não possui scripts de build/lint nem TypeScript. Conferência visual interrompida pelo controle do navegador, que não conseguiu identificar a URL atual com segurança; nenhuma validação visual completa foi declarada.

## Refinamento de interação e leitura
Saúde da operação usa ordem e cores estáveis por qualificação, barra proporcional e botões em seta. O percentual respeita a seleção de corretor. Em espaços estreitos, apenas a faixa de qualificações rola horizontalmente; rótulos não são quebrados no meio das palavras. KPIs principais abrem carteiras, a distribuição ou os clientes da qualificação correspondente. O alerta de falta de acesso filtra a equipe e oferece retorno à lista completa.
Atualizações de fundo não consultam nem redesenham durante um slide over aberto, edição de campos ou aba oculta. O filtro de corretor persiste entre visões e descarta respostas antigas. Cards interativos possuem hover para mouse, foco por teclado e feedback de toque, respeitando movimento reduzido. 30 testes passaram; verificação visual segue pendente devido à indisponibilidade do navegador seguro nesta sessão.

## Setas, avisos e paginação
Setas da saúde possuem somente a superfície recortada e brilho discreto, sem card retangular de fundo. Avisos têm contraste âmbar nos temas claro e escuro. O gráfico seleciona por posição horizontal do dia e mostra primeiras qualificações, descartados e requalificações, inclusive zero. A equipe exibe o último acesso retornado pela API e presença estimada; o indicador de monitoramento anima suavemente e respeita movimento reduzido. O hub pagina seis carteiras por vez em memória, sem chamadas adicionais ao trocar página, mantendo filtros e busca. Total de 33 testes Node aprovados.

### Correção do seletor de tema — 17/11/2026
- Menu Claro/Escuro/Automático do admin usa top layer para escapar do recorte da sidebar, com posição limitada à viewport e reajuste em scroll/resize.
- Opções com áreas de toque de 44px, texto legível e foco visível. Preferência manual persistente e automático por horário preservados.
- Validação: 34 testes Node aprovados, sintaxe JavaScript e git diff --check sem erros. Revisão visual em navegador pendente.


### 18/11/2026 — KPIs em faixa tabular
- Topo de Operação Geral, Por Carteira e Por Corretor em faixa contínua, com divisórias,
  título/descrição à esquerda e valor à direita. Sem ícones grandes ou cards individuais.
- Mantidos os dados, temas e ações existentes; métricas dos slide overs não mudam.
- Layout com quatro colunas no desktop, duas em telas intermediárias e uma coluna
  de linhas horizontais abaixo de 600px para preservar leitura e números completos.
- Verificação: testes do admin e tema; conferência visual em navegador pendente.

### 18/11/2026 — Cabeçalho e período da saúde
- Removidos eyebrow, subtítulo com atualização, indicação de gráficos, refresh e exportação do topo.
- Controles existentes de tema/conta movidos ao cabeçalho principal; rodapé da sidebar com data/hora em faixa compacta. Conta continua acessível em todas as abas do admin.
- Saúde da operação com destaque semântico e filtro ao lado do título: Geral (padrão) ou Personalizado com início/fim e Aplicar.
- Período considera `leads.decidido_em`, a data da classificação atual, e não reconstrói estado histórico. Sem período inclui toda a base. Contatos ainda sem data de classificação não entram no período.
- Distribuição e drill-down compartilham validação e limites: início inclusivo, fim até o início do dia seguinte. As datas acompanham o clique na distribuição; KPIs, alertas e slide overs não herdam esse filtro.
- Testados intervalo inválido, dia final, cancelamento de respostas antigas e retorno a Geral. Revisão visual em navegador pendente.

### 18/11/2026 — Operação geral e notificações do gestor
- Hub de Carteiras permanece somente na visão Por Carteira. Saúde e Equipe em tempo real
  ocupam a primeira linha da Operação geral; Evolução ocupa a largura total logo abaixo.
- Atenção do gestor é um botão ao lado do tema, com modal nativo acessível e ações existentes
  para analisar carteiras, equipe e retornos. Não conta categorias com zero itens.
- Verde quando os dados carregaram sem pendências; amarelo com sinal pulsante quando há
  pendências; neutro/desabilitado enquanto carrega ou após falha de atualização.
- Modal fecha pelo botão, Escape ou clique externo e pausa atualização automática durante análise.
  Ações fecham o modal e abrem a visão filtrada correta, sem herdar busca antiga de carteira.
- Temas e mobile preservados; animação respeita prefers-reduced-motion.
- Testes cobrem disposição, três categorias, ausência de itens, falha e pausa durante análise.
  Conferência visual em navegador pendente.

### 18/11/2026 — Navegação inferior mobile
- Até 900px, navegação fixa no rodapé, com ícones/labels, safe area e rolagem horizontal para manter todas as abas acessíveis.
- Marca (logo/Prospect/SR Lançamentos) e relógio ocultos nessa faixa. Tema e conta permanecem fora da barra inferior.
- Espaço inferior no conteúdo evita sobreposição. Sidebar desktop permanece como antes.
- Conferência visual em navegador pendente; verificação de diff e regressões do admin/tema.

### 18/11/2026 — Navbar flutuante compacta
- Barra mobile em cápsula, limitada a 420px, com afastamento lateral/inferior e safe area.
- Início, Carteiras e Equipe visíveis; Mais abre diálogo com os demais destinos existentes.
- Menu reutiliza o clique original, preservando rotas e handlers. Destino secundário ativo destaca Mais.
- Desktop sem mudança. Na página WhatsApp, os dois destinos permanecem diretos, sem menu redundante.
- Testes de navegação cobrem ações originais, destaque e fechamento na mudança para desktop.
  Revisão visual no navegador pendente.

### 18/11/2026 — Sidebar desktop recolhível
- Sidebar flutuante arredondada em cores do tema, marca Logo + Prospect, sem subtítulo da imobiliária.
- Recolher/expandir mantém ícones acessíveis com title/aria-label e salva preferência local compartilhada.
- Minha Conta e Sair no rodapé; logout reaproveita ApiClient.logout. Avatar e relógio ocultos/removidos no desktop.
- Mobile mantém a navbar atual; sidebar só ativa acima de 900px no admin e 1024px no corretor.
- Rolagem restrita aos itens, preservando marca/rodapé em telas baixas. Tema permanece acessível.
- Testes cobrem persistência, armazenamento bloqueado, breakpoint, nomes acessíveis e logout.
  Conferência visual em navegador pendente.

### 18/11/2026 — Carteiras/equipe em páginas próprias e eventos de contato
- Centro de comando sem tabs internas. Destinos Carteiras e Corretores passam a hospedar os respectivos painéis, mantendo ações existentes.
- Hub ativo e hub inativo recolhido, paginação independente; busca compartilhada, + para criar e atualizar para o modo existente de importação.
- Carteira concluída (total não teste > 0 e nenhum novo) permanece visível ao corretor. Estado manual listas.inativa_manual oculta consultas e bloqueia acesso/qualificação pelo corretor; não altera responsáveis nem resultados. Reativação restaura acesso.
- Corretores: log real de cliques de ligação com paginação, três médias e manutenção paginada em 10. Testes são excluídos das métricas de contato.
- Eventos autenticados com UUID único e vínculo de propriedade; horário de recebimento no servidor. Média de contatos usa clientes únicos por corretor/dia com atividade. Duração é intervalo de uso até o primeiro clique posterior de qualificação/WhatsApp, não duração telefônica. Requalificação usa intervalos do mesmo corretor/dia entre clientes diferentes, com histórico de qualificação ordenado por lead.
- Sem amostras, médias ficam indisponíveis; não há reconstrução fictícia de ligações anteriores. Schema aditivo executado pelo inicializador normal, não manualmente durante desenvolvimento.
- Validação por testes Node e sintaxe; revisão visual e execução das consultas em PostgreSQL real pendentes.

### 21/11/2026 — Páginas independentes e conta administrativa
- Navegação principal usa links para Centro de comando, Carteiras, Corretores e Empreendimentos, sem alternância de visão via sidebar. Destinos próprios suportam abertura direta/recarregamento e histórico; templates e formulários são compartilhados pelo renderizador adminPages, antes dos arquivos estáticos.
- Carteiras mantém criar, atualizar e categorias como ações internas. Filtros acionados por alertas são transportados por parâmetro de URL.
- Minha Conta do admin tem destino próprio, tokens de tema e navegação desktop/mobile. Campos e APIs de perfil/senha preservados; corretor não recebe esse layout.
- Testes cobrem respostas das rotas, títulos, painel ativo único, IDs únicos, quatro links e redirecionamento/autorização do guard. Sem teste visual em navegador.

### 21/11/2026 — Carregamento inicial e manutenção de carteiras
- Navegação já pertence ao header no HTML; geometria recolhida/desktop aplicada antes do conteúdo. Markup legado não aparece antes da montagem, e Chart.js carrega sem bloquear a montagem do painel.
- Inicialização não consulta listas e seletor de corretores ocultos; os formulários carregam ao abrir. Categorias e participantes carregam em paralelo; atualização após salvar participantes modifica somente contagens para não sobrescrever a mensagem em edição.
- Dashboard/carteiras usa três consultas independentemente da quantidade de listas, substituindo uma consulta por lista. Gerenciamento restringe o join à carteira selecionada.
- Redistribuição mantém o algoritmo e transação existentes, gravando pares lead/corretor em lote por fase com UNNEST. Mensagem usa UPDATE RETURNING em uma consulta.
- Testes locais validam agrupamento, lote de 10000 pares e atualização de mensagem; não medem latência de produção. Revisão visual e medição no ambiente publicado pendentes.

### 21/11/2026 — Hub de empreendimentos e detalhes laterais
- Cards com capas reais, status de publicação, construtora e bairro; busca local sem acentos e filtros combinados. Indicadores globais: total, construtoras/bairros distintos não vazios e fase Entregue.
- Clique no card abre dialog nativo estilizado como slide over à direita; mobile ocupa a largura disponível. Exibe campos existentes, capa sem recorte, comodidades, observações e book. Sem galeria fictícia.
- Editar abre o formulário existente somente após ação explícita. Publicar/despublicar usa o endpoint atual e atualiza a tela após confirmação; excluir mantém confirmação existente. Importador Drive preservado em seção recolhível.
- Temas compartilhados, navegação por teclado/Escape do dialog, imagens lazy nos cards, URLs HTTP(S) e dados escapados. Testes cobrem indicadores, filtros e segurança de conteúdo; revisão visual em navegador pendente.
