# Atividade de corretores

## Purpose
Permitir ao administrador suspender acesso e participação em listas sem apagar clientes ou histórico.

## Requirements

### Requirement: Bloqueio de acesso
O sistema SHALL recusar login e requisições autenticadas de usuários inativos, inclusive com JWT previamente emitido. Falha ao consultar atividade SHALL impedir o acesso.

#### Scenario: Sessão existente
- WHEN um corretor com token válido é inativado
- THEN sua próxima requisição autenticada é recusada com 401

### Requirement: Redistribuição atômica
Ao inativar, o sistema SHALL remover todos os vínculos de lista e distribuir os clientes entre os demais corretores ativos participantes de cada lista, em rodízio por ID. Sem destinatário, SHALL definir corretor_id como nulo. Dados, qualificação e histórico dos clientes transferidos SHALL ser preservados.

#### Scenario: Clientes preservados
- WHEN o cliente tem resultado sem_interesse ou sem_resposta, ou status sem_resposta
- THEN permanece com o corretor inativado e seu reenvio automático é cancelado

#### Scenario: Ausência de participantes
- WHEN nenhum outro corretor ativo participa da lista
- THEN os clientes transferíveis ficam órfãos na própria lista

#### Scenario: Falha parcial
- WHEN alguma atualização falha
- THEN toda a alteração de atividade e distribuição é revertida

### Requirement: Reativação sem recuperação
Reativar SHALL liberar o acesso sem restaurar vínculos de lista ou propriedade dos clientes redistribuídos. Os clientes preservados continuam com seu proprietário.

#### Scenario: Reativar
- WHEN o administrador reativa o corretor
- THEN sua inclusão em listas depende de nova ação explícita do administrador

### Requirement: Elegibilidade
Seletores e endpoints de distribuição SHALL aceitar somente corretores ativos. Distribuição, reenvio automático e alteração de atividade SHALL ser serializados para evitar atribuição concorrente a inativos.

#### Scenario: Seleção obsoleta
- WHEN uma tela antiga tenta distribuir para um corretor inativado
- THEN o servidor rejeita e não efetiva a distribuição

## Validation status
Contrato registrado a partir do pedido do usuário. OpenSpec CLI/Skills não estão instalados; não houve validação via CLI. Verificações executáveis em backend/tests/corretorAtividade.test.cjs usam banco simulado e não substituem teste transacional PostgreSQL.
