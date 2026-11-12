# Dashboard mobile do corretor

## Purpose
Aplicar a identidade Dark Premium Tech à visão inicial do corretor, preservando regras de qualificação e a apresentação desktop.

## Requirements

### Requirement: Escopo visual
O tema SHALL ser restrito à página do corretor até 600px. O desktop SHALL manter os estilos existentes. A navegação fixa SHALL respeitar safe areas e reservar espaço no conteúdo. Animações SHALL respeitar prefers-reduced-motion.

### Requirement: Indicadores reais
Mensagens Enviadas SHALL usar estatisticas.mensagens_enviadas, nunca trabalhados. Agendados SHALL usar estatisticas.porTag.agendado. Os indicadores e drill-downs SHALL manter o filtro de carteira existente. Após o card maior de mensagens, os mini-cards SHALL seguir a ordem Clientes Trabalhados, Em Atendimento, Follow Up, Na Fila, Agendados e Retornar Depois. Não SHALL haver botões duplicados de trabalhados/retornos.

### Requirement: Tema e contraste
Ao lado do avatar mobile, o seletor SHALL oferecer Claro, Escuro e Automático. Automático SHALL ser o padrão, usando hora local do dispositivo: claro das 06:00 às 17:59 e escuro das 18:00 às 05:59. A preferência manual SHALL persistir em localStorage, sem ser substituída pela mudança de horário. Ao voltar à aba ou cruzar o horário de transição, o modo automático SHALL atualizar a interface. Falha de armazenamento não SHALL impedir a escolha durante a sessão.

Modais de clientes, histórico, requalificação e agendamento/retorno, busca, paginação, menu do usuário e gráficos SHALL compartilhar tokens de contraste para os dois temas. O histórico individual mobile SHALL usar o modal temático, com observações escapadas, em vez do alerta nativo. Alterar tema SHALL redesenhar os gráficos com os dados já carregados, sem nova consulta. O desktop SHALL manter sua apresentação.

### Requirement: Evolução individual
No mobile, o tempo médio SHALL ser substituído por um gráfico de 30 dias com primeira qualificação, descartados e requalificações, conforme as classificações do admin. GET /api/corretor/evolucao SHALL usar exclusivamente o usuário autenticado, sua base atual e a carteira selecionada. A ordenação dos eventos SHALL ocorrer antes de filtrar o autor e o período para não transformar requalificações em primeiras qualificações. Datas SHALL seguir o calendário do relatório admin existente (CURRENT_DATE e criado_em::date).

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
