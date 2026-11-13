# Prospecção: disponibilidade e avanço entre clientes

## Requisitos
- A redistribuição de sem resposta SHALL concluir COMMIT ou ROLLBACK e liberar a conexão antes de responder a próxima-lead. Não SHALL executar transações em segundo plano após a resposta em ambiente serverless.
- A manutenção SHALL limitar cada lote a dez clientes, evitar espera pelo bloqueio de usuários e configurar limites locais de execução, espera e transação ociosa. As regras existentes de redistribuição e proteção dos inativos SHALL permanecer.
- A prospecção SHALL solicitar somente os contadores atuais via estatisticas?resumo=1, preservando filtro de carteira e usuário autenticado. Consultas completas de outros consumidores SHALL continuar disponíveis.
- Após confirmação da qualificação, o cliente anterior SHALL ser removido da tela antes da próxima busca, sem aguardar estatísticas nem atrasos artificiais. Falha na próxima busca SHALL liberar o estado de processamento para nova tentativa.
- Respostas antigas de estatísticas SHALL ser ignoradas após troca de carteira ou nova consulta.

## Diagnóstico e validação — 2026-11-13
Foi observada uma transação idle in transaction da redistribuição, segurando o bloqueio de usuarios e impedindo dez requisições de atualizar ultimo_acesso. A chamada de manutenção não era aguardada antes da resposta serverless. A sessão bloqueadora foi encerrada de forma restrita ao PID, estado e consulta identificados; suas alterações não confirmadas foram revertidas. A inspeção seguinte confirmou ausência de bloqueios e transações ociosas abertas.

Testes automatizados verificam finalização antes da resposta, rollback quando o bloqueio está ocupado, contadores filtrados sem cruzamento do histórico e avanço após qualificação. Não foram alterados clientes reais para testar qualificação. A suíte completa passou com 22 testes, além das verificações de sintaxe JavaScript.
