# Visão geral e categorias de carteiras

## Purpose
Organizar carteiras por categoria e manter explícito o escopo de atendimento do corretor.

## Requirements

### Requirement: Visão inicial geral
Minha carteira SHALL iniciar sem carteira selecionada, agregando os clientes atribuídos ao corretor. Selecionar uma carteira SHALL filtrar KPIs, agendamentos, retornos e drill-downs. Todas as carteiras SHALL restaurar a visão agregada.

#### Scenario: Abrir o dashboard
- WHEN o corretor acessa Minha carteira
- THEN vê todas as suas carteiras e clientes sem seleção automática da primeira

### Requirement: Escopo de prospecção
Iniciar prospecção SHALL respeitar a carteira escolhida. Sem carteira escolhida SHALL usar a fila global do corretor. Esgotar uma carteira específica SHALL encerrar essa fila sem migrar silenciosamente para outra.

#### Scenario: Carteira concluída
- WHEN a fila selecionada não tem clientes novos
- THEN o corretor recebe o estado de conclusão e pode escolher outra carteira explicitamente

### Requirement: Categorias editáveis
O administrador SHALL definir categoria ao criar, atualizar ou editar uma lista. Mensal e Campanhas são sugestões; categorias personalizadas até 80 caracteres são aceitas. Listas antigas SHALL receber Sem categoria, sem inferência por nome.

#### Scenario: Reclassificar lista existente
- WHEN o administrador salva uma categoria
- THEN o seletor passa a agrupar a lista nessa categoria

### Requirement: Agrupamento
Seletores de carteira do corretor e da prospecção SHALL agrupar as listas por categoria, com Mensal primeiro e as demais em ordem alfabética. Somente listas em que o corretor participa SHALL aparecer no seletor; grupos vazios SHALL ser omitidos.

#### Scenario: Participação restrita
- WHEN existem listas de campanhas atribuídas a outros corretores
- THEN elas não aparecem no seletor do corretor atual

## Verificação
Migração aditiva em backend/database/schema.sql. Não executada no banco de produção nesta tarefa. Não há CLI/Skill OpenSpec instalado para validação formal.
