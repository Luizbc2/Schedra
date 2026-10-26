# Gestão da nova entrega no Jira

Atualizado em 22/10/2026. Site criado e conexão autorizada pelo proprietário. Esta página registra configuração e planejamento; não atesta implementação das funcionalidades.

## Acesso

- [Backlog do Schedra](https://schedra-luiz.atlassian.net/jira/software/projects/SCHED/boards/1/backlog)
- [Quadro do Schedra](https://schedra-luiz.atlassian.net/jira/software/projects/SCHED/boards/1)
- Projeto: **Schedra**, chave **SCHED**, board **1**.
- Plano confirmado no painel da Atlassian: **Jira Free**. O cadastro iniciou uma avaliação Standard automaticamente; ela foi alterada para Free, sem cadastrar método de pagamento.
- Responsável atual: Luiz Otavio Mello de Campos. Não foram inventados membros de equipe nem enviados convites.
- Tipos habilitados: Epic, História, Tarefa, Erro e Subtask.
- Colunas: To Do, In Progress, In Review e Done. Os estados correspondentes são Tarefas pendentes, Em andamento, Em análise e Concluído.
- Todas as versões R01-R08 estão **não lançadas**.

## Organização

A [nova matriz](NOVA_ENTREGA_ARQUITETURA.md) define a ordem vigente de oito incrementos. Os IDs SC-01 a SC-35 do plano anterior foram preservados, mas agrupados na nova sequência; a numeração antiga de sete PRs não é mais a ordem de execução.

| Incremento | Epic | Entrega |
| --- | --- | --- |
| R01 / PR01 | [SCHED-5](https://schedra-luiz.atlassian.net/browse/SCHED-5) | Planejamento, rubrica e gestão |
| R02 / PR02 | [SCHED-6](https://schedra-luiz.atlassian.net/browse/SCHED-6) | Componentes compartilhados e formulários |
| R03 / PR03 | [SCHED-7](https://schedra-luiz.atlassian.net/browse/SCHED-7) | SQLite e fotos persistentes |
| R04 / PR04 | [SCHED-8](https://schedra-luiz.atlassian.net/browse/SCHED-8) | CRUD offline, sincronização e uploads |
| R05 / PR05 | [SCHED-9](https://schedra-luiz.atlassian.net/browse/SCHED-9) | Cache Redis e eventos Pub/Sub |
| R06 / PR06 | [SCHED-10](https://schedra-luiz.atlassian.net/browse/SCHED-10) | Operação, resiliência, APIs e entrega contínua |
| R07 / PR07 | [SCHED-11](https://schedra-luiz.atlassian.net/browse/SCHED-11) | Arquitetura, DDD e diagramas completos |
| R08 / PR08 | [SCHED-12](https://schedra-luiz.atlassian.net/browse/SCHED-12) | Homologação, evidências e release |

O backlog contém histórias, aceites, prioridades, responsável, versão e dependências. Os vínculos de bloqueio registram as principais dependências entre incrementos e entre SQLite, mídia, idempotência, sincronização e operação. Campos de prioridade são preliminares; pontos de história não foram preenchidos como se houvesse estimativa da equipe.

## Rastreabilidade da rubrica

| Critério | Tickets |
| --- | --- |
| ARQ-01: C4, ADRs e cenários | SCHED-45, SCHED-35, SCHED-39 |
| ARQ-02: DDD, contextos e agregado | SCHED-46 |
| ARQ-03: OpenAPI e banco | SCHED-47 |
| ARQ-04: SLO/SLI e resiliência | SCHED-48, SCHED-53 |
| ARQ-05: CI/CD e recuperação | SCHED-49 |
| BE-01: cache Redis | SCHED-50 |
| BE-02: Pub/Sub | SCHED-51 |
| BE-03: Compose e Nginx | SCHED-52 |
| BE-04: estrutura e observabilidade | SCHED-53 |
| TF-01: gestão real no Jira | SCHED-2, SCHED-4 |
| TF-02: Cynefin e abordagem | SCHED-3 |
| TF-03: ciclo, histórias e versões | SCHED-54, SCHED-14, SCHED-44 |

## Catálogo de tickets

| ID local | Jira | Incremento | Escopo |
| --- | --- | --- | --- |
| SC-01 | [SCHED-1](https://schedra-luiz.atlassian.net/browse/SCHED-1) | R01 | Relacionar cada critério à entrega e à evidência |
| SC-02 | [SCHED-2](https://schedra-luiz.atlassian.net/browse/SCHED-2) | R01 | Acompanhar trabalho no Jira |
| SC-03 | [SCHED-3](https://schedra-luiz.atlassian.net/browse/SCHED-3) | R01 | Justificar a abordagem de gestão |
| SC-04 | [SCHED-13](https://schedra-luiz.atlassian.net/browse/SCHED-13) | R01 | Contratos claros de arquitetura e persistência |
| SC-05 | [SCHED-14](https://schedra-luiz.atlassian.net/browse/SCHED-14) | R01 | Evoluções ligadas às minhas necessidades |
| SC-06 | [SCHED-15](https://schedra-luiz.atlassian.net/browse/SCHED-15) | R02 | Ações consistentes em todas as telas |
| SC-07 | [SCHED-16](https://schedra-luiz.atlassian.net/browse/SCHED-16) | R02 | Preencher formulários com feedback previsível |
| SC-08 | [SCHED-17](https://schedra-luiz.atlassian.net/browse/SCHED-17) | R02 | Entender carregamento, vazio e falha |
| SC-09 | [SCHED-18](https://schedra-luiz.atlassian.net/browse/SCHED-18) | R02 | Telas legíveis e responsabilidades separadas |
| SC-10 | [SCHED-19](https://schedra-luiz.atlassian.net/browse/SCHED-19) | R02 | Consistência com a base existente |
| SC-11 | [SCHED-20](https://schedra-luiz.atlassian.net/browse/SCHED-20) | R03 | Dados persistentes após reiniciar o aplicativo |
| SC-12 | [SCHED-21](https://schedra-luiz.atlassian.net/browse/SCHED-21) | R03 | Meus dados separados dos de outras contas |
| SC-13 | [SCHED-22](https://schedra-luiz.atlassian.net/browse/SCHED-22) | R03 | Manter perfil, tema e modo localmente |
| SC-14 | [SCHED-23](https://schedra-luiz.atlassian.net/browse/SCHED-23) | R03 | Consultar cadastros e agenda salvos |
| SC-15 | [SCHED-24](https://schedra-luiz.atlassian.net/browse/SCHED-24) | R03 | Minhas fotos armazenadas no aparelho |
| SC-16 | [SCHED-25](https://schedra-luiz.atlassian.net/browse/SCHED-25) | R04 | Criar, editar e excluir clientes sem conexão |
| SC-17 | [SCHED-26](https://schedra-luiz.atlassian.net/browse/SCHED-26) | R04 | Registrar compromissos pessoais offline |
| SC-18 | [SCHED-27](https://schedra-luiz.atlassian.net/browse/SCHED-27) | R04 | Preparar alterações da agenda empresarial offline |
| SC-19 | [SCHED-28](https://schedra-luiz.atlassian.net/browse/SCHED-28) | R04 | Trocar a foto offline |
| SC-20 | [SCHED-29](https://schedra-luiz.atlassian.net/browse/SCHED-29) | R04 | Ver o que ainda não foi enviado |
| SC-21 | [SCHED-30](https://schedra-luiz.atlassian.net/browse/SCHED-30) | R04 | Que uma alteração seja aplicada uma única vez |
| SC-22 | [SCHED-31](https://schedra-luiz.atlassian.net/browse/SCHED-31) | R04 | Resolver divergências entre dispositivos |
| SC-23 | [SCHED-32](https://schedra-luiz.atlassian.net/browse/SCHED-32) | R04 | Retomar sincronização após falhas |
| SC-24 | [SCHED-33](https://schedra-luiz.atlassian.net/browse/SCHED-33) | R04 | Minha foto confirmada no servidor |
| SC-25 | [SCHED-34](https://schedra-luiz.atlassian.net/browse/SCHED-34) | R04 | Uploads em disco com persistência e validação |
| SC-26 | [SCHED-35](https://schedra-luiz.atlassian.net/browse/SCHED-35) | R07 | Entender arquitetura e execução |
| SC-27 | [SCHED-36](https://schedra-luiz.atlassian.net/browse/SCHED-36) | R07 | Modelos de dados completos e coerentes |
| SC-28 | [SCHED-37](https://schedra-luiz.atlassian.net/browse/SCHED-37) | R07 | Entender objetivos e regras |
| SC-29 | [SCHED-38](https://schedra-luiz.atlassian.net/browse/SCHED-38) | R07 | Entender as mensagens e falhas |
| SC-30 | [SCHED-39](https://schedra-luiz.atlassian.net/browse/SCHED-39) | R07 | Diagramas legíveis e rastreáveis |
| SC-31 | [SCHED-40](https://schedra-luiz.atlassian.net/browse/SCHED-40) | R08 | Que as regras sobrevivam à migração |
| SC-32 | [SCHED-41](https://schedra-luiz.atlassian.net/browse/SCHED-41) | R08 | Proteção de conta e organização |
| SC-33 | [SCHED-42](https://schedra-luiz.atlassian.net/browse/SCHED-42) | R08 | Continuidade após interrupções |
| SC-34 | [SCHED-43](https://schedra-luiz.atlassian.net/browse/SCHED-43) | R08 | Compatibilidade e usabilidade |
| SC-35 | [SCHED-44](https://schedra-luiz.atlassian.net/browse/SCHED-44) | R08 | Rastrear o que foi entregue |
| ARQ-01 | [SCHED-45](https://schedra-luiz.atlassian.net/browse/SCHED-45) | R07 | C4, ADRs e cenários de qualidade |
| ARQ-02 | [SCHED-46](https://schedra-luiz.atlassian.net/browse/SCHED-46) | R07 | Context Map, bounded contexts e agregado de Agenda |
| ARQ-03 | [SCHED-47](https://schedra-luiz.atlassian.net/browse/SCHED-47) | R06 | OpenAPI exportável e ADR dos bancos |
| ARQ-04 | [SCHED-48](https://schedra-luiz.atlassian.net/browse/SCHED-48) | R06 | SLOs, SLIs, timeouts, retries e circuit breaker |
| ARQ-05 | [SCHED-49](https://schedra-luiz.atlassian.net/browse/SCHED-49) | R06 | Pipeline build/test/deploy, rollback e runbook |
| BE-01 | [SCHED-50](https://schedra-luiz.atlassian.net/browse/SCHED-50) | R05 | Cache-aside Redis isolado com TTL e invalidação |
| BE-02 | [SCHED-51](https://schedra-luiz.atlassian.net/browse/SCHED-51) | R05 | Publicar e consumir eventos via Redis Pub/Sub |
| BE-03 | [SCHED-52](https://schedra-luiz.atlassian.net/browse/SCHED-52) | R06 | Compose com Redis e Nginx reverso validado |
| BE-04 | [SCHED-53](https://schedra-luiz.atlassian.net/browse/SCHED-53) | R06 | DTOs, erros e observabilidade estruturada |
| TF-03 | [SCHED-54](https://schedra-luiz.atlassian.net/browse/SCHED-54) | R01 | Planejar e registrar ciclos reais de entrega |
| BUG-01 | [SCHED-55](https://schedra-luiz.atlassian.net/browse/SCHED-55) | R07 | Corrigir diagramas com sobreposição, conteúdo pobre e fluxos incorretos |
| BUG-02 | [SCHED-56](https://schedra-luiz.atlassian.net/browse/SCHED-56) | R04 | Revalidar falha de avatar no Expo e garantir persistência |
| Configuração | [SCHED-4](https://schedra-luiz.atlassian.net/browse/SCHED-4) | R01 | Site, conexão autorizada e plano Free |

## Uso do quadro

1. Selecionar uma história respeitando dependências e capacidade real.
2. Conferir aceite, contratos, migrações, risco e evidência antes de iniciar.
3. Mover para Em andamento somente ao começar o trabalho.
4. Usar branch de dev com a chave Jira no nome/commit/PR; PR de feature para dev.
5. Vincular PR, resultados de testes e demonstração. Não anexar tokens, senhas, CPFs ou fotos reais de usuários.
6. Mover para Em análise quando o incremento estiver verificável; registrar quem revisou.
7. Concluir após o aceite. Homologar dev antes do PR dev para main e da versão lançada.
8. Registrar problemas como Erro, ligados à história afetada. Revisão e retrospectiva devem descrever eventos reais.

## Datas e transparência

O onboarding criou automaticamente uma sprint ativa, **SCRUM Sprint 0**, com janela de 22/10 a 05/11/2026. Ela contém as tarefas de preparação da matriz e gestão. Essa janela é provisória, não é uma data de entrega informada pelo professor. A sprint futura **SCRUM Sprint 1** permanece sem datas até planejamento de capacidade. A tentativa de personalizar o nome pela interface não persistiu após recarregar; o nome padrão não interfere nos tickets e versões.

As tarefas de exemplo SCHED-1, SCHED-2 e SCHED-3 foram reaproveitadas para o planejamento; SCHED-4 foi reaproveitada para a configuração efetivamente realizada. As datas de vencimento de exemplo foram removidas. Histórico anterior à adaptação é do onboarding automático, não evidência de trabalho executado.

Não foram inventados PRs, entrevistas, reuniões, cerimônias, aprovações ou resultados de testes. A configuração do Jira é verificável; atendimento integral de TF-01/TF-03 ainda depende do uso contínuo na execução, revisão e entrega.

## Pendências para execução

### Incremento local R03 em 26/10/2026

SQLite, adaptador web, escopos, migracao de sessao, consultas locais e fotos BLOB com fila de envio foram implementados. Evidencias, caminhos e limites estao em [SQLITE_LOCAL.md](SQLITE_LOCAL.md); o DER local foi derivado do SQL real. Ainda faltam CRUD de negocio offline, PR e verificacao em aparelhos.

A consulta inicial aos tickets SCHED-20 a SCHED-24 funcionou. As chamadas seguintes para atualizacao e releitura pelo conector excederam o tempo de espera; o estado remoto dessas tarefas precisa ser reconciliado. Este registro local nao afirma que o Jira foi atualizado nem que os aceites foram concluidos.

### Incremento local R02 em 22/10/2026

- SCHED-15, SCHED-16 e SCHED-17 em andamento: `Button`, `IconButton`, `FormField`, `FeedbackState` e erro inline em `Aplicativo-Schedra/src/shared/components/ui`.
- Adoção em autenticação, agenda, clientes, serviços, profissionais, perfil e administração; editor de clientes passou a reutilizar o modal rolável do catálogo.
- Validação local: TypeScript sem erros, 16 testes de regras e 14 testes de interface. `npm test` agora executa as duas suítes, inclusive no job mobile já existente do CI.
- Exportação Expo de iOS, Android e web concluída. A primeira tentativa de Hermes foi bloqueada pelo sandbox ao gravar temporários; a execução autorizada terminou com sucesso.
- Conferência no Chrome isolado, com API simulada: larguras 320/390/1280, tema claro/escuro, digitação sem perder foco, cadastro de cliente e telas de catálogo, segurança e administração. Não houve requisições para alterar dados reais.
- Ainda sem validação desta alteração no iPhone/Android físico, sem PR, commit ou deploy desta batelada. R02 não está concluída: SC-09 (separação de responsabilidades) e SC-10 (auditoria web) ainda precisam de execução. SQLite e sincronização não foram implementados neste incremento.

- Confirmar prazo acadêmico e participantes reais.
- Implementar e testar as histórias; o cadastro do backlog não conclui componentes, SQLite, Redis ou diagramas.
- Consolidar ADRs, modelos, decisões e documentos com o código entregue.
- Vincular PRs e evidências reais, revisar e liberar cada incremento.

