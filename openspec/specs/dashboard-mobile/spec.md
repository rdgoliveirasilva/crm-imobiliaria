# Dashboard mobile do corretor

## Purpose
Aplicar a identidade Dark Premium Tech à visão inicial do corretor sem mudar regras de negócio, APIs ou a apresentação desktop.

## Requirements

### Requirement: Escopo visual
O tema SHALL ser restrito à página do corretor até 600px. O desktop SHALL manter os estilos existentes. A navegação fixa SHALL respeitar safe areas e reservar espaço no conteúdo. Animações SHALL respeitar prefers-reduced-motion.

### Requirement: Indicadores reais
Mensagens Enviadas SHALL usar estatisticas.mensagens_enviadas, nunca trabalhados. Agendados SHALL usar estatisticas.porTag.agendado. Os indicadores e drill-downs SHALL manter o filtro de carteira existente. Gráfico histórico e variação percentual SHALL ser omitidos enquanto não houver séries históricas disponíveis.

#### Scenario: Troca de carteira
- WHEN o corretor seleciona uma carteira
- THEN os indicadores e a prospecção respeitam esse escopo
- AND respostas antigas não substituem os valores da seleção mais recente

### Requirement: Navegação real
Início, Prospecção e Empreendimentos SHALL usar as rotas existentes. Esteira e Vendas SHALL ser explicitamente indisponíveis até existirem páginas implementadas, sem destinos inventados. Clientes trabalhados e retornos SHALL continuar acessíveis por ações secundárias.

## Verificação
Testes Node cobrem contagem distinta de mensagens, agendados e respostas fora de ordem, além dos testes existentes de carteiras. Não há scripts de lint/build ou TypeScript no projeto. A prévia visual pelo navegador da sessão não pôde ser acessada por timeout na conexão local; a validação visual em dispositivo permanece pendente.
