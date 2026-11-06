# Documentação do Schedra

O planejamento da próxima entrega foi revisado em 22/10/2026. Começar pela nova matriz de Arquitetura/Back-end/Tech Forge e pela gestão no Jira. O plano de reestruturação preserva as correções anteriores; as propostas e evidências históricas serão atualizadas junto das implementações.

| Documento | Finalidade |
| --- | --- |
| [Nova entrega de arquitetura e backend](NOVA_ENTREGA_ARQUITETURA.md) | Rubrica recebida por imagem: C4, DDD, ADRs, Redis, Pub/Sub, Docker/Nginx, qualidade e Jira |
| [Avaliacao atual](AVALIACAO_NOVA_ENTREGA.md) | Estimativa ponderada, evidencias verificadas e pendencias, sem prometer nota |
| [Contexto e ciclos reais](GESTAO_CICLOS.md) | Cynefin aplicado, escolha agil e registro honesto dos ciclos executados |
| [Gestão no Jira](GESTAO_JIRA.md) | Site real, quadro SCHED, oito incrementos, histórias, critérios e vínculos; não confundir backlog com implementação |
| [Arquitetura atual](architecture/README.md) | C4 Contexto/Containers, fluxos, limites e rastreabilidade com o codigo |
| [Contextos e DDD](architecture/DDD.md) | Context Map, entidades, valores, agregado de Agenda e invariantes |
| [ADRs](architecture/ADRS.md) | Monolito modular, bancos, cache versionado e semantica dos eventos |
| [Qualidade e resiliencia](architecture/QUALITY.md) | SLO/SLI, cenarios mensuraveis, histograma e tratamento de falhas |
| [Redis e operacao](REDIS_OPERACAO.md) | Configuracao, evidencias reproduziveis e runbook de recuperacao |
| [OpenAPI exportavel](api/openapi.json) | Gerado do contrato servido pela API; verificado no CI |
| [Persistencia local implementada](SQLITE_LOCAL.md) | SQLite, fotos BLOB, consultas offline, sessao, adaptador web e limites atuais |
| [DER local SQLite](diagrams/schedra-local.dbml) | Onze tabelas locais e suas chaves; separado do banco central |
| [Plano de reestruturação](PLANO_REESTRUTURACAO.md) | Componentização, SQLite, fotos locais, sincronização, revisão dos diagramas e 35 histórias em sete PRs |
| [Rubrica de outubro](RUBRICA_OUTUBRO_2026.md) | Matriz atual de critérios, lacunas e evidências; inclui Jira, Cynefin e gestão de versões |
| [Proposta principal](PROPOSTA.md) | Documento acadêmico consolidado das implementações futuras |
| [Rastreabilidade anterior](RUBRICA_MOBILE_2026.md) | Matriz da entrega anterior; não comprova atendimento à rubrica de outubro |
| [Proposta de evolução](PRODUCT_EVOLUTION.md) | Lacunas, personas, solução futura e backlog |
| [Requisitos futuros](REQUIREMENTS.md) | Requisitos e critérios de aceite das próximas implementações |
| [Diagramas propostos](DIAGRAMS.md) | Arquitetura, dados e fluxos da evolução planejada |
| [DER completo em DBML](diagrams/schedra-database.dbml) | Schema atual importável no [dbdiagram](https://dbdiagram.io/d/Schedra-DER-completo-6aabd504b73118d200aba4ce) |
| [Validação mobile](MOBILE_VALIDATION.md) | Compatibilidade, segurança e roteiro de apresentação |
| [Arquitetura de produto](SCHEDRA_PRODUCT_ARCHITECTURE.md) | Identidade, modelo de dados e preparação técnica |
| [Operação e recuperação](OPERATIONS.md) | Deploy, métricas, backup, restauração e release |
| [Revisão de segurança](SECURITY_REVIEW.md) | Controles implementados e riscos de dependências |
| [Rubrica anterior](RUBRICA_2026.md) | Evidências de DevOps, redes e testes da entrega anterior |

## Como interpretar esta documentação

Os documentos acadêmicos de evolução descrevem o que ainda falta no sistema e como será implementado. A existência de requisito, diagrama ou backlog comprova o planejamento, não a conclusão da funcionalidade.

Os documentos operacionais e de segurança continuam descrevendo o sistema existente porque servem como referência técnica da linha de base.

## Ordem sugerida para apresentação

1. Usar `PROPOSTA.md` como narrativa principal.
2. Apresentar brevemente a linha de base atual.
3. Explicar as quatro lacunas e as duas frentes de evolução.
4. Mostrar requisitos, metas e indicadores futuros.
5. Apresentar o DER e os seis diagramas dos novos fluxos.
6. Explicar o plano de entregas, as dependências e os limites.
7. Encerrar diferenciando claramente itens planejados, em desenvolvimento e concluídos.
