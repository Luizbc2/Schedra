# Nova entrega: Arquitetura, Back-end Avançado e Tech Forge

Planejamento iniciado em 22/10/2026. Fonte: imagem `codex-clipboard-27ae965e-4946-454e-8660-66d86f08b157.png` fornecida pelo usuário. Os checks da imagem não são evidência de implementação. Esta rubrica é diferente de `RUBRICA_OUTUBRO_2026.md`; ambas permanecem identificadas, e as correções já pedidas integram a evolução do mesmo Schedra.

## Escopo e sequência

Base existente: mobile Expo, web React, API Express modular, Sequelize, banco remoto, autenticação/sessões, RBAC, auditoria, Docker e CI. Preservar contratos e alterações locais anteriores. Não reescrever o sistema para demonstrar padrões.

Primeiro estabilizar componentes e armazenamento local do [plano de reestruturação](PLANO_REESTRUTURACAO.md). A nova entrega adiciona arquitetura explícita, Redis, eventos e operação verificável. Planejamento, contratos e diagramas começam antes do código e são atualizados durante cada implementação.

## Matriz completa da imagem

| ID | Critério e peso | Entregáveis concretos | Validação/aceite |
| --- | --- | --- | --- |
| ARQ-01 | Documentação arquitetural, 0,5 | C4 Contexto e Containers; ADRs; cenários de qualidade | C4 distingue pessoa, sistema e container; ADRs têm contexto, decisão, alternativas e consequências; cenários têm estímulo, resposta e medida |
| ARQ-02 | Estilos arquiteturais e DDD, 1 | Context Map, domínios/subdomínios, bounded contexts; Entities/VO/Aggregates de Agenda | Limites e dependências ligados a módulos reais; Agenda possui raiz e invariantes explícitas; reservas futuras identificadas |
| ARQ-03 | Integração, APIs e dados, 0,5 | OpenAPI exportável e ADR dos bancos | Arquivo gerado da definição servida; contratos principais, autenticação, erros e multipart; distinguir SQLite mobile, banco central e Redis |
| ARQ-04 | Qualidade, resiliência e observabilidade, 0,5 | SLO/SLI, timeout, retry limitado, circuit breaker e métricas/logs | Metas mensuráveis; cache indisponível não derruba CRUD; falhas e recuperação testadas; métricas sustentam p95 e disponibilidade |
| ARQ-05 | Entrega contínua, 0,5 | Pipeline build/test/deploy; estratégia de implantação/rollback; runbook | CI verificável; deploy condicionado ao ambiente; imagens versionadas e recuperação documentada; segredos não versionados |
| BE-01 | Cache Redis cache-aside, 1 | Consultas frequentes, TTL configurável, invalidação em alterações | Duas leituras demonstram miss/hit; update invalida todas as páginas/buscas daquele escopo; teste de corrida e isolamento |
| BE-02 | Mensageria Redis Pub/Sub, 0,5 | Publicação após escrita, consumidor e logs correlacionados | Um evento real mostra eventId em publicação/consumo; payload sem dados pessoais; erro Redis não reverte escrita confirmada |
| BE-03 | Docker Compose e Nginx, 1 | API, banco, Redis, web e proxy; redes, volumes, healthchecks | Compose valida; Nginx -t; fluxo via proxy, upload, readiness, reinício e preservação de dados |
| BE-04 | Boas práticas e observabilidade, 0,5 | Módulos/DTO/services/controllers, erros e logs claros | Testes, types, IDs de correlação, logs sem credenciais; responsabilidades de cache/transporte fora das telas |
| TF-01 | Gestão via Jira, 1 | Projeto Schedra, backlog, stories/tasks/bugs, responsáveis e histórico | Uso real do quadro, vínculos de PR, evidências e versões; importação não equivale a execução |
| TF-02 | Cynefin e abordagem, 1 | Análise do contexto e justificativa ágil | Incerteza de offline e experiência justifica incrementos; distinguir tarefas claras/complicadas de comportamento emergente |
| TF-03 | Ciclo de vida, 1 | Backlog priorizado, User Stories, aceite e versões; eventos do processo utilizado | Para ágil: planejar, executar, revisar e registrar evolução; não inventar cerimônias passadas. PM Canvas apenas se abordagem preditiva for escolhida |

Os pesos da imagem somam 3 por disciplina. Não foram inferidos outros critérios fora do recorte. Atendimento depende de evidência, não apenas de arquivo criado.

## Decisões e contratos antes de implementar

### Componentes e persistência

- Button e campos comuns precisam ser adotados nas telas, com loading/disabled/erros/acessibilidade e testes de comportamento.
- SQLite nativo: migrations, consultas parametrizadas, escopo de conta/organização, fotos BLOB e preferências; SecureStore para tokens.
- Gravação offline e fila na mesma transação. IDs de operação estáveis e versões conhecidas. A API confirma regras de disponibilidade; UI distingue pendente de confirmado.
- Perda de rede, reinício do app, logout, troca de organização, exclusão e dependências entre registros entram no aceite.
- Dados centrais permanecem no banco da API. A definição de produção deve ser verificada antes de migrar; não converter o banco remoto para SQLite.

### Cache e eventos

- Primeiro recurso: listagem de clientes (página, limite, busca), preservando autorização existente. A chave inclui organização ou usuário, revisão do recurso e hash dos parâmetros normalizados. Não registrar termo de busca ou dados pessoais em logs/chaves.
- TTL inicial de 30 segundos, configurável. Sem cache para autenticação, permissões, decisões de disponibilidade ou comandos.
- Invalidação após create/update/delete confirmado; namespace versionado impede que leitura iniciada antes de uma escrita republique valor antigo na revisão atual.
- Timeout curto, sem fila ilimitada de comandos Redis; breaker abre após falhas e consulta volta ao banco. Documentar janela residual limitada pelo TTL se uma invalidação falhar durante indisponibilidade.
- Pub/Sub usa conexão de assinatura separada. Evento tem eventId, versão, tipo, escopo, entityId, occurredAt e requestId, sem conteúdo do cliente.
- Consumidor valida envelope e registra consumo. Pub/Sub tem entrega at-most-once, não oferece replay nem armazenamento de fila. Persistência offline não depende dele; durabilidade futura requer outbox no banco/consumidor idempotente.
- Desligamento deve fechar conexões e impedir timers/processos órfãos. Configuração sem Redis permite testes existentes e operação degradada explícita.

### Qualidade e operação

- SLO inicial de disponibilidade: 99,5% das requisições de negócio sem 5xx por janela móvel de 30 dias; metas propostas, não medições já obtidas.
- Latência: p95 de consultas comuns abaixo de 500 ms e de escritas abaixo de 1 s na carga de demonstração; documentar ambiente/carga e excluir upload dessas metas.
- Histograma com buckets, contadores de cache/eventos/erros, requestId e nomes de rota com cardinalidade limitada. Não expor tokens no /metrics.
- Redis fora: CRUD segue via banco, log/contador de degradação. Banco fora: readiness 503, erro padronizado; cache não pode servir de autorização.
- Nginx encaminha API, assets e web; limites de upload compatíveis com 5 MB mais overhead; timeouts definidos; /metrics protegido. Perfil local HTTP separado de TLS de produção.
- Versões imutáveis, migração expand/contract, backup verificado e rollback da aplicação. Não reverter migração destrutiva automaticamente.

## Entregas por PR e dependências

| Ordem | Conteúdo | Dependência | Evidência de saída |
| --- | --- | --- | --- |
| 1 | Matriz, backlog Jira, decisões e contrato dos componentes/persistência | Baseline atual | Critérios cobertos e lacunas visíveis |
| 2 | Componentes mobile e adoção nas telas | 1 | Typecheck, comportamento e inspeção visual |
| 3 | SQLite, BLOBs, preferências e isolamento | 1, 2 | Reabrir app preserva dados/foto; troca de conta não mistura |
| 4 | CRUD offline e sincronização segura | 3 | Reinício, replay e conflito sem perda ou duplicidade |
| 5 | Redis cache-aside e Pub/Sub | 1; independente da UI | Testes unitários e integração com Redis real; logs de publicação/consumo |
| 6 | Docker/Nginx, qualidade, OpenAPI e CI/CD | 5 | Build, stack, proxy, falhas/recuperação e arquivo OpenAPI |
| 7 | C4, DDD, ADRs, DERs e revisão de todos os diagramas | Rascunhos em 1; consolidação em 4–6 | Diagramas legíveis, consistentes com código e estados propostos |
| 8 | Validação final e release | 2–7 | Matriz atualizada, testes/aparelhos, Jira e versão demonstrável |

Branches: feature a partir de dev, PR para dev, homologação e PR de release dev→main. Há alterações locais anteriores na main; preservar e verificar a divergência antes de transportar para branches. Este plano não autoriza descartar trabalho anterior.

## Definition of Ready / Done

Pronto para execução: história com ator/necessidade, regra, limite, dependências e aceite; contrato de API/dados conhecido; mudança de schema tem estratégia de atualização e retorno.

Concluído: código integrado, testes adequados, evidência ligada à história, documentos coerentes, revisão e homologação. Evidência parcial fica explicitamente parcial. Falhas observadas viram bugs vinculados, não notas escondidas.

## Riscos, resolução e pendências externas

| Tema | Tratamento e condição de fechamento |
| --- | --- |
| Jira | Site e projeto SCHED criados, conexão autorizada e plano Free confirmado. Ver [gestão e tickets reais](GESTAO_JIRA.md); execução e evidências ainda precisam acompanhar cada história |
| Prazo e equipe | Ainda não informados; ordenar por dependência e prioridade, sem inventar datas ou atribuir contas de terceiros |
| Ambiente de produção | Revalidar Vercel/containers; disco efêmero não é destino durável de upload; Redis requer serviço acessível e credencial apropriada |
| SQLite no Expo Web | Adaptador web separado/validado; não introduzir import nativo que quebre build web |
| Dados pessoais locais | Escopo obrigatório, cleanup no logout e política de pendências; tokens fora do SQLite |
| Redis desconectado | Fallback e TTL limitam impacto; medir fallback e perda de eventos; não prometer processamento garantido |
| Concorrência | Namespace de cache, controle de versão e idempotência; testes com operações intercaladas |
| Avaliação | A matriz é um plano; professor avalia evidências. Não declarar 100% sem executar os aceites |

## Registro de execução

Atualizacao em 26/10/2026: R02 tem controles compartilhados adotados e testes locais. R03 implementa SQLite, perfil/preferencias, consultas locais e fotos BLOB com fila de envio; consultar [persistencia e evidencias](SQLITE_LOCAL.md). CRUD de negocio offline, revisao em aparelhos e PRs continuam pendentes. Os checks abaixo representam a entrega integral, nao apenas a existencia da base.

- [x] Interpretar todos os critérios visíveis e mapear entregáveis.
- [x] Inspecionar baseline e preservar alterações existentes.
- [x] Criar projeto Jira e vincular histórias, critérios, versões e dependências. Isso não conclui a gestão contínua exigida pela rubrica.
- [ ] Componentes adotados nas telas e validação.
- [ ] SQLite/fotos e CRUD offline validados.
- [ ] Redis e Pub/Sub implementados/testados.
- [ ] Compose, Nginx, observabilidade e pipeline validados.
- [ ] Arquitetura, dados e diagramas completos e conferidos.
- [ ] Release e evidências finais.

Referências: [Redis Pub/Sub](https://redis.io/docs/latest/develop/pubsub/), [C4](https://c4model.com/diagrams/system-context), [Expo SQLite SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). Usar essas referências com o código instalado e registrar limitações efetivas.
