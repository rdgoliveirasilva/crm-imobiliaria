# Dashboard mobile do corretor

## Purpose
Aplicar a identidade Dark Premium Tech à visão inicial do corretor, preservando regras de qualificação e a apresentação desktop.

## Requirements

### Requirement: Escopo visual
O dashboard do corretor SHALL compartilhar o tema em todas as larguras. Acima de 1024px SHALL usar menu lateral, mensagens e ilustração na primeira linha, seis indicadores e gráfico ao lado dos acessos comerciais. As demais páginas SHALL preservar seu desktop existente. A navegação fixa SHALL respeitar safe areas e reservar espaço no conteúdo. Animações SHALL respeitar prefers-reduced-motion.

### Requirement: Indicadores reais
Mensagens Enviadas SHALL usar estatisticas.mensagens_enviadas, nunca trabalhados. Agendados SHALL usar estatisticas.porTag.agendado. Os indicadores e drill-downs SHALL manter o filtro de carteira existente. Após o card maior de mensagens, os mini-cards SHALL seguir a ordem Clientes Trabalhados, Em Atendimento, Follow Up, Na Fila, Agendados e Retornar Depois. Não SHALL haver botões duplicados de trabalhados/retornos.

### Requirement: Tema e contraste
Ao lado do avatar mobile, o seletor SHALL oferecer Claro, Escuro e Automático. Automático SHALL ser o padrão, usando hora local do dispositivo: claro das 06:00 às 17:59 e escuro das 18:00 às 05:59. A preferência manual SHALL persistir em localStorage, sem ser substituída pela mudança de horário. Ao voltar à aba ou cruzar o horário de transição, o modo automático SHALL atualizar a interface. Falha de armazenamento não SHALL impedir a escolha durante a sessão.

Modais de clientes, histórico, requalificação e agendamento/retorno, busca, paginação, menu do usuário e gráficos SHALL compartilhar tokens de contraste para os dois temas. O histórico individual mobile SHALL usar o modal temático, com observações escapadas, em vez do alerta nativo. Alterar tema SHALL redesenhar os gráficos com os dados já carregados, sem nova consulta. O dashboard desktop SHALL compartilhar os mesmos tokens, gráficos e histórico temático.

Prospecção e Empreendimentos SHALL reutilizar a mesma preferência persistida, controle de tema, paleta de modais e navegação mobile. Filtros, seleção de carteira, qualificação e acesso ao book SHALL preservar suas funções existentes. Na prospecção, o item ativo da navegação SHALL manter a carteira em andamento. Um focusout sem destino (toque no Safari) não SHALL ocultar as opções antes do click que escolhe o tema.

Minha Conta SHALL compartilhar o tema e seletor existentes, preservando os formulários de perfil e senha e seu comportamento desktop. A ilustração do dashboard SHALL ocupar espaço no fluxo do cabeçalho, sem corte quando a largura cresce. O conteúdo da Prospecção SHALL reservar espaço inferior suficiente para que o botão de histórico fique acima da navegação fixa no fim da rolagem. Conferido em prévia local 464×951; Minha Conta também conferida em 320px nos temas claro/escuro, sem envio de formulários.

### Requirement: Evolução individual
No dashboard responsivo, o tempo médio SHALL ser substituído por um gráfico de 30 dias com primeira qualificação, descartados e requalificações, conforme as classificações do admin. GET /api/corretor/evolucao SHALL usar exclusivamente o usuário autenticado, sua base atual e a carteira selecionada. A ordenação dos eventos SHALL ocorrer antes de filtrar o autor e o período para não transformar requalificações em primeiras qualificações. Datas SHALL seguir o calendário do relatório admin existente (CURRENT_DATE e criado_em::date).

### Requirement: Comparação de mensagens
A curva sombreada SHALL representar os últimos sete dias de contatos distintos com ação mensagem_enviada no histórico, mesmo que tenham mudado de tag depois. Vários registros do mesmo contato no mesmo dia SHALL contar uma vez. A comparação SHALL mostrar hoje até agora versus ontem completo, com diferença absoluta e percentual. Se ontem for zero, o percentual SHALL ser indisponível. O total principal SHALL continuar representando a classificação atual, distinguindo-se da atividade diária pelo texto do card.

#### Scenario: Troca de carteira
- WHEN o corretor seleciona uma carteira
- THEN os indicadores e a prospecção respeitam esse escopo
- AND respostas antigas não substituem os valores da seleção mais recente

### Requirement: Navegação real
Início, Prospecção e Empreendimentos SHALL usar as rotas existentes. Esteira e Vendas SHALL ser explicitamente indisponíveis até existirem páginas implementadas, sem destinos inventados. Clientes trabalhados e retornos SHALL abrir seus detalhes pelos respectivos cards.

## Verificação
Testes Node cobrem contagem distinta de mensagens, agendados, comparação percentual, parâmetros da rota autenticada, respostas fora de ordem, horário automático, preferência persistida, armazenamento indisponível e contraste das paletas. Não há scripts de lint/build ou TypeScript no projeto. Prévia local isolada conferida no navegador em larguras de 320, 375 e 430px, incluindo busca, paginação, seleção de tema e agendamento claro/escuro; dados de exemplo existem somente na prévia de teste. Não houve teste em aparelho físico.

### Requirement: Tablet
Entre 601 e 1024px, o dashboard SHALL usar três colunas nos indicadores, conteúdo limitado a 820px, gráfico mais alto e navegação inferior centralizada. Tema, gráficos e histórico SHALL usar o mesmo limite de 1024px. Prospecção, Empreendimentos e Minha Conta SHALL compartilhar essa adaptação sem alterar regras de negócio.

### Requirement: Desktop do corretor
Acima de 1024px SHALL manter filtros, dados reais e ações existentes, com navegação lateral. Entre 1025 e 1350px os seis indicadores SHALL se distribuir em três colunas; em telas maiores, seis colunas. Claro, Escuro e Automático SHALL funcionar junto ao avatar também no desktop. Esteira e Vendas SHALL continuar sinalizadas como Em breve. Abaixo de 1025px SHALL preservar o layout mobile/tablet e sua navegação inferior.

### Ajuste de zoom desktop — 2026-11-16
A coluna lateral SHALL alinhar seu conteúdo ao início e impedir encolhimento da marca. Em alturas até 760px SHALL reduzir espaçamentos. A rolagem vertical SHALL continuar disponível com barra oculta, mantendo acesso ao conteúdo em telas menores. Revisão visual não executada nesta alteração: acesso ao navegador de teste indisponível.

### 18/11/2026 — Navbar flutuante e Centro de comando
- CSS compartilhado de navegação compacta em cápsula para carteira, prospecção e empreendimentos até 1024px.
- Prospecção destacada em azul sem mudar handlers, destino ou seleção de carteira. Links e itens em breve mantidos.
- Logo/Prospect/SR Lançamentos ocultos no cabeçalho mobile; conta, tema e botões de voltar das páginas internas preservados.
- Título mobile do dashboard: Centro de comando. Saudação e nome dinâmicos continuam no desktop.
- Navbar respeita safe area e espaço inferior do conteúdo. 12 testes de carteira, dashboard e tema aprovados;
  conferência visual em navegador pendente.

### 18/11/2026 — Sidebar desktop recolhível
- Sidebar flutuante arredondada em cores do tema, marca Logo + Prospect, sem subtítulo da imobiliária.
- Recolher/expandir mantém ícones acessíveis com title/aria-label e salva preferência local compartilhada.
- Minha Conta e Sair no rodapé; logout reaproveita ApiClient.logout. Avatar e relógio ocultos/removidos no desktop.
- Mobile mantém a navbar atual; sidebar só ativa acima de 900px no admin e 1024px no corretor.
- Rolagem restrita aos itens, preservando marca/rodapé em telas baixas. Tema permanece acessível.
- Testes cobrem persistência, armazenamento bloqueado, breakpoint, nomes acessíveis e logout.
  Conferência visual em navegador pendente.

### 23/11/2026 — Dashboard e vitrine do corretor
- Tema movido no HTML para junto do seletor de carteiras, com controle e persistência existentes. Seis indicadores secundários passam a faixas tabulares responsivas; IDs/ações dos drill-downs preservados.
- Ilustração do edifício é link acessível para empreendimentos, com rotação no hover e respeito a reduced-motion. Prospecção removida apenas da sidebar desktop; CTA superior e navegação mobile mantidos.
- Vitrine usa sidebar compartilhada, temas desktop/mobile, indicadores reais, grid de capas e paginação local de oito após os filtros. Filtros de construtora/cidade/bairro/entrega/renda preservados.
- Detalhes em dialog lateral nativo, com Escape/foco e book; nenhuma ação administrativa nem chamada a endpoints admin. Consulta continua exclusivamente /api/corretor/empreendimentos (somente publicados).
- Testes de marcação, paginação e ausência de operações administrativas; sintaxe validada. Revisão visual em navegador pendente.

### 24/11/2026 — Layout e navegação das páginas internas
- Corrigida a herança dos cards horizontais antigos da vitrine: display em bloco, capa com largura total/aspecto fixo e conteúdo vertical. Área principal limitada e deslocada pela largura real da sidebar, incluindo estado recolhido.
- broker-shell.js compartilha sidebar desktop e toolbar/tema em Prospecção, Minha Conta e Empreendimentos; conta administrativa exclui scripts/estilos do shell ao renderizar seu template.
- Seletor de tema usa popover posicionado no viewport também no corretor, evitando recorte pela sidebar. Prospecção mantém tema junto ao seletor.
- Seis KPIs permanecem lado a lado acima de 1024px, com texto/valor/descrição dentro de cada célula; mobile preserva adaptação.
- Verificação por testes e sintaxe; revisão visual no navegador pendente.
