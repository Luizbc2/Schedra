# Estimativa de atendimento da nova rubrica

Atualizacao: 09/11/2026. Fonte: rubrica em NOVA_ENTREGA_ARQUITETURA.md,
conferida contra o PDF fornecido. Soma dos pesos: **9 pontos**, em 12 criterios.
Esta e uma autoavaliacao conservadora de evidencias, nao nota atribuida pelo
professor nem garantia de fracionamento dos criterios.

## Resultado estimado

**Estimativa registrada em 06/11: 7,2 / 9, aproximadamente 80%.** Evolucao desde 5,7/9
no ciclo anterior, sustentada por VOs usados no service, coalescencia testada,
coletor real, carga pequena, upload pelo proxy e rollback de configuracao no CI.
Nao equivale a 80% dos arquivos, das features nem a nota garantida. A entrega
continua em PRs para revisao, sem integrar producao. Se a correcao exigir aceite
integral por linha, em vez de fracionamento, o percentual atribuido pode diferir.

Em 09/11 foi acrescentada a orientacao oral do professor: **M1, ao menos um
microsservico**. Ela nao recebeu peso arbitrario e nao aumenta automaticamente
o percentual anterior. SCHED-58/PR #45 extraem o consumidor de eventos para
processo/container/SQLite proprios. O resultado tecnico e seu CI devem ser
verificados separadamente, antes do aceite humano. ADR-007 registra a decisao.
Os numeros da tabela abaixo sao o retrato de 06/11, nao nova nota calculada.

| Criterio | Peso | Cobertura estimada | Evidencia e o que limita o credito |
| --- | ---: | ---: | --- |
| ARQ-01 C4, ADRs e cenarios | 0,5 | 0,45 | C4/Context Map revisados e coletor incluido; seis ADRs e cenarios ligados ao codigo. Revisao visual completa do Excalidraw pendente |
| ARQ-02 DDD | 1 | 0,85 | Contextos/agregado/invariantes documentados; AppointmentInterval e ServicePrice imutaveis, usados em create e testados. Adocao em update/swap e menor acoplamento ao ORM pendentes |
| ARQ-03 API e dados | 0,5 | 0,4 | OpenAPI servido/exportado e checado; CRUD pessoal/servicos e release health ampliados; contratos secundarios ainda resumidos |
| ARQ-04 Qualidade e resiliencia | 0,5 | 0,45 | Coletor/rules e pequena carga medidos; circuito/falhas testados. SLO mensal e alertas externos ainda nao demonstrados |
| ARQ-05 Entrega continua | 0,5 | 0,35 | CI e implantacao/rollback de candidata de configuracao exercitados, com persistencia; falta CD aprovado no destino produtivo |
| BE-01 Cache Redis | 1 | 0,95 | TTL, invalidacao, isolamento e corrida; rajada de 20 leituras para um SELECT com Redis real, carga pelo proxy. Coalescencia nao e distribuida entre replicas |
| BE-02 Redis Pub/Sub | 0,5 | 0,5 | Publicacao/consumo real com eventId identico; falha Redis nao reverte SQL; sem promessa de fila duravel |
| BE-03 Compose e Nginx | 1 | 0,95 | Proxy, CRUD, upload real/limites, coletor, Redis fora, reinicio SQL e rollback preservando foto. Perfil sintetico; TLS/segredos produtivos pendentes |
| BE-04 Boas praticas/observabilidade | 0,5 | 0,45 | Modulos/DTO/services, VOs, requestId, regras de metricas e artefato; cancelamentos HTTP e acoplamentos ainda podem melhorar |
| TF-01 Jira | 1 | 0,75 | Historico, criterios e PRs reais com retomada, movimento de SCHED-49 e evidencias de #44; revisao/aceite e replanejamento da sprint permanecem abertos |
| TF-02 Cynefin | 1 | 0,7 | Analise aplicada a decisoes reais deste ciclo, testes e correcoes; abordagem incremental explicita. Feedback humano final pendente |
| TF-03 Ciclo de vida | 1 | 0,4 | Planejamento/exercicio/revisao tecnica e artefato de versao demonstravel; sem release integrada ou retrospectiva aprovada pelo responsavel |
| **Total** | **9** | **7,2** | **Estimativa, nao aprovacao academica** |

## Evidencias verificadas

- [PR #44](https://github.com/Luizbc2/Schedra/pull/44), codigo 226be9d:
  [CI completo aprovado](https://github.com/Luizbc2/Schedra/actions/runs/42209605266),
  cinco jobs (backend, web, mobile, containers, tooling); **125 testes backend
  sem ignorados**. Rascunho sobre #43, sem merge ou deploy produtivo.
- [Artefato do ensaio](https://github.com/Luizbc2/Schedra/actions/runs/42209605266/artifacts/13497079325):
  passed=true; 80 leituras/concorrencia 5 com p95 **44,68 ms**, 20
  escritas/concorrencia 2 com p95 **18,06 ms**, zero erros nas duas fases.
  Upload real, rejeicao de falso PNG, limites Multer/Nginx, coletor up e duas
  series de clientes, candidata/retorno preservando cliente e bytes de avatar.
  EventId cb6f7356-9feb-4b62-843f-54fbf9808b4d publicado e consumido.
  Sao resultados de runner isolado e carga curta, nao de producao.
- A primeira execucao 42209277757 aprovou quatro jobs, mas containers falhou no
  seletor da rota de metricas. O gate foi mantido e a barra final corrigida com
  teste de regressao. Isso e um ciclo de falha/correcao real, nao aceite simulado.

- [PR #42](https://github.com/Luizbc2/Schedra/pull/42): componentes, SQLite, BLOBs e leituras offline; testes/export aprovados. Rascunho, sem merge em main.
- [PR #43](https://github.com/Luizbc2/Schedra/pull/43): Redis, eventos, API exportavel, arquitetura e stack isolada. Depende da base #42 e do alinhamento #41.
- [CI de referencia b0c9954](https://github.com/Luizbc2/Schedra/actions/runs/40345213988): backend, web, mobile e containers aprovados. Backend: **104 testes, nenhum ignorado** nessa execucao, incluindo PostgreSQL/Redis reais.
- O job containers registrou um mesmo eventId em publicacao/consumo e resultado com `proxy`, `readiness`, `protectedMetrics`, `redisOptional` e `databaseRestart` verdadeiros. Sao dados sinteticos; nenhum dado de producao foi alterado.
- [CI 8efead7](https://github.com/Luizbc2/Schedra/actions/runs/40346312755): os quatro jobs passaram novamente, agora com **106 testes backend, nenhum ignorado**, incluindo concorrencia do circuito e cache corrompido. O smoke real repetiu os resultados de proxy, eventos, cache e recuperacao. Conferir o check do HEAD no PR antes do aceite, pois atualizacoes posteriores geram novas execucoes.
- Docker local passou no parse do Compose, mas o daemon falhou no gerenciador de inferencia. A evidencia de runtime veio do runner Linux do GitHub, nao de uma execucao local inventada.

## Fechamento e limites do escopo

Para fechar a entrega: revisar os criterios/diagramas, validar o requisito M1,
conferir contratos e ensaios, integrar/homologar os PRs autorizados e registrar
revisao/aceite reais no Jira. A existencia de documentos e CI nao conclui essa
gestao. Nao houve merge ou deploy produtivo nesta rodada.

CD produtivo, aparelhos fisicos, carga prolongada, SLO observado por 30 dias e
canal externo de alertas sao importantes para liberacao real; o texto do PDF
nao exige todos esses exercicios como entregaveis literais. Ele pede pipeline
esqueleto, estrategia/runbook e plano de observabilidade com SLOs/SLIs. Nao
transformar hardening adicional em condicao artificial da nota. Os ensaios
isolados tambem nao certificam producao. Riscos de dependencias continuam em
AUDITORIA_DEPENDENCIAS.md. CRUD offline completo segue como evolucao separada.

Nao transformar a existencia destes documentos em aceite automatico. Se o professor atribuir credito apenas a criterios integralmente aceitos, a nota pode diferir desta estimativa.
