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
