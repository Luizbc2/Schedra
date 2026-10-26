# Estimativa de atendimento da nova rubrica

Atualizacao: 26/10/2026. Fonte: recorte da rubrica em NOVA_ENTREGA_ARQUITETURA.md. Soma dos pesos: **9 pontos**. Esta e uma autoavaliacao conservadora de evidencias, nao nota atribuida pelo professor nem garantia de fracionamento dos criterios.

## Resultado estimado

**5,7 / 9 = aproximadamente 63% de cobertura ponderada.** A faixa util para comunicar o progresso e 60-65%, condicionada a revisao dos PRs e demonstracao. Nao equivale a 63% dos arquivos, nem a 63% das features do aplicativo. Os pontos parciais abaixo sao uma estimativa de maturidade, nao uma regra de correcao do professor.

| Criterio | Peso | Cobertura estimada | Evidencia e o que limita o credito |
| --- | ---: | ---: | --- |
| ARQ-01 C4, ADRs e cenarios | 0,5 | 0,4 | architecture/README.md, ADRS.md e QUALITY.md ligados ao codigo; revisao de diagramas ainda pendente |
| ARQ-02 DDD | 1 | 0,6 | Context Map, subdominios, agregado, entidades, valores e invariantes em DDD.md; VOs ainda representados por campos, nao classes imutaveis |
| ARQ-03 API e dados | 0,5 | 0,4 | OpenAPI exportado do contrato servido e checado no CI; ADR dos bancos; alguns contratos secundarios ainda resumidos |
| ARQ-04 Qualidade e resiliencia | 0,5 | 0,3 | SLO/SLI propostos, histograma, deadline, breaker e falhas testadas; sem medicao representativa de carga/30 dias ou coletor implantado |
| ARQ-05 Entrega continua | 0,5 | 0,2 | CI compila/testa/exporta e executa stack; runbook/rollback; falta CD de producao com aprovacao e ensaio de rollback |
| BE-01 Cache Redis | 1 | 0,8 | Clientes com TTL, isolamento, invalidacao, corrida e Redis real; falta homologacao e avaliar carga/stampede |
| BE-02 Redis Pub/Sub | 0,5 | 0,4 | Publicacao/consumo real com eventId coincidente e logs; revisao operacional pendente; nao e fila duravel |
| BE-03 Compose e Nginx | 1 | 0,7 | Job containers aprovado: build, proxy, login/CRUD, metricas, Redis fora e banco reiniciado; perfil de validacao, nao producao TLS/segredos; falta upload via proxy |
| BE-04 Boas praticas/observabilidade | 0,5 | 0,4 | DTO/services/repositories, erros, requestId, histogramas e contadores; acoplamentos e cancelamentos HTTP ainda podem melhorar |
| TF-01 Jira | 1 | 0,6 | Site, 56 issues, criterios, dependencias, versoes, estados e PRs reais; precisa continuar na revisao e liberacao |
| TF-02 Cynefin | 1 | 0,6 | Analise aplicada e escolha agil justificadas em GESTAO_CICLOS.md; falta confrontar com feedback de equipe/professor |
| TF-03 Ciclo de vida | 1 | 0,3 | Backlog priorizado, historias/aceite e ciclos com falha/correcao/CI registrados; sem aceite final, release ou retrospectiva validada pelo responsavel |
| **Total** | **9** | **5,7** | **Estimativa, nao aprovacao academica** |

## Evidencias verificadas

- [PR #42](https://github.com/Luizbc2/Schedra/pull/42): componentes, SQLite, BLOBs e leituras offline; testes/export aprovados. Rascunho, sem merge em main.
- [PR #43](https://github.com/Luizbc2/Schedra/pull/43): Redis, eventos, API exportavel, arquitetura e stack isolada. Depende da base #42 e do alinhamento #41.
- [CI de referencia b0c9954](https://github.com/Luizbc2/Schedra/actions/runs/40345213988): backend, web, mobile e containers aprovados. Backend: **104 testes, nenhum ignorado** nessa execucao, incluindo PostgreSQL/Redis reais.
- O job containers registrou um mesmo eventId em publicacao/consumo e resultado com `proxy`, `readiness`, `protectedMetrics`, `redisOptional` e `databaseRestart` verdadeiros. Sao dados sinteticos; nenhum dado de producao foi alterado.
- Testes adicionais de concorrencia do circuito e cache corrompido foram acrescentados depois dessa referencia; conferir o check do HEAD no PR antes de aceitar o ultimo commit.
- Docker local passou no parse do Compose, mas o daemon falhou no gerenciador de inferencia. A evidencia de runtime veio do runner Linux do GitHub, nao de uma execucao local inventada.

## O que ainda impede 100%

CD controlado, rollback ensaiado, aparelhos fisicos, carga/SLIs medidos, coletor de metricas, revisao final de documentos/diagramas, aceite no Jira e release. Os riscos de dependencias em AUDITORIA_DEPENDENCIAS.md continuam abertos. CRUD offline de negocio/idempotencia/conflitos e revisao completa do Excalidraw tambem continuam pendentes no projeto, sem serem confundidos com cache Redis ou Pub/Sub.

Nao transformar a existencia destes documentos em aceite automatico. Se o professor atribuir credito apenas a criterios integralmente aceitos, a nota pode diferir desta estimativa.
