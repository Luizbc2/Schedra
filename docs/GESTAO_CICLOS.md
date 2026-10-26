# Contexto e ciclos reais da evolucao

Registro em 26/10/2026. Complementa o backlog Jira e nao substitui os criterios de aceite.

## Cynefin aplicado

| Tipo de trabalho | Exemplo real | Abordagem e evidencia |
| --- | --- | --- |
| Claro | Gerar o JSON do mesmo OpenAPI servido | Padronizar script e comparar no CI; resultado deterministico |
| Complicado | Cache distribuido com invalidacao durante SELECT | Analisar contratos/concorrencia, implementar revisao e Lua, testar corrida e Redis real |
| Complexo | Offline, fotos, reconexao e experiencia em aparelhos | Incrementar, experimentar e observar; API simulada/SQLite ajudam, mas feedback de aparelho real ainda e necessario |
| Caotico | Indisponibilidade critica sem causa conhecida | Nao foi declarado como estado atual do projeto. Se ocorrer: conter, restaurar operacao segura e diagnosticar; nao usar como justificativa para mudar arquitetura sem evidencia |
| Indefinido | Prazo final, equipe e aceite docente nao informados | Explicitar a incerteza e pedir confirmacao antes de prometer capacidade/data |

Conclusao: a evolucao tem partes complicadas e complexas; uma abordagem agil incremental permite testar hipoteses de sincronizacao sem reescrever o sistema. Partes claras usam procedimentos repetiveis. Nao se classifica todo CRUD como complexo nem se usa Cynefin como classificacao fixa de toda a empresa.

## Processo adotado

Backlog priorizado por risco/dependencia, limite de trabalho em progresso e incrementos verificaveis. Esta execucao e desenvolvimento assistido; nao ha evidencia de uma equipe completa nem de todas as cerimonias Scrum. Portanto o processo e uma adaptacao agil/Kanban, nao uma alegacao de Scrum integral.

Luiz e o responsavel pelo projeto e titular das issues ja atribuidas no Jira. Codex auxilia implementacao e verificacao automatizada. Aceite de produto/apresentacao e revisao humana permanecem com o responsavel; nao foram registrados como ocorridos. Participantes adicionais, prazo final e capacidade precisam ser confirmados, sem criar membros ou reunioes ficticias.

## Ciclos com evidencias

| Ciclo | Planejamento | Execucao e verificacao | Revisao e estado |
| --- | --- | --- | --- |
| Preparacao (22/10) | Matriz, 8 incrementos, historias e criterios | Criacao do projeto SCHED e 56 issues com dependencias/versoes | Backlog criado; isso nao concluiu as features |
| Controles e dados locais (22-26/10) | R02/R03 antes de sincronizacao completa | Button/FormField/feedback, SQLite e BLOB; 51 testes mobile e exports; foto offline/reinicio/reconexao em Chrome isolado | PR #42 em rascunho; SCHED-20 a 24 em analise; aparelho/aceite pendentes |
| Redis e arquitetura (26/10) | Priorizar criterios explicitos da nova rubrica para atingir a faixa de 60% | Cache, eventos, C4/DDD/ADRs/OpenAPI/qualidade; Redis/PostgreSQL reais no CI e stack Nginx isolada | PR #43 em rascunho; checks de referencia aprovados, sem release de producao |

## Problemas observados e melhoria do processo

1. CI inicial de #42 aprovou testes, mas bloqueou dependencias. Foram atualizados pacotes/Vitest e documentados riscos restantes; nao se removeu o bloqueio de seguranca.
2. Docker local falhou ao iniciar o gerenciador de inferencia. Nao se resetou o ambiente nem se apagaram volumes. A validacao de runtime foi deslocada para CI Linux com servicos isolados.
3. O primeiro smoke de #43 detectou que update de cliente exige email/telefone nao vazios. O fixture foi corrigido e o contrato explicita essa diferenca. A melhoria futura e alinhar create/update de forma deliberada e testada, nao alterar regra silenciosamente para passar teste.
4. A revisao do circuito encontrou risco de resposta antiga fechar circuito aberto por falhas concorrentes. Foi adicionado controle de geracao e teste intercalado.

Este registro e uma analise tecnica do ciclo, nao uma retrospectiva aprovada por equipe. Proximo passo de gestao: revisar os PRs/aceites, homologar dev e registrar feedback e decisao reais. So entao concluir issues e preparar PR de release para main.

Referencias: [Cynefin](https://thecynefin.co/about-us/about-cynefin-framework/), [Jira Schedra](https://schedra-luiz.atlassian.net/jira/software/projects/SCHED/boards/1), [PR #42](https://github.com/Luizbc2/Schedra/pull/42), [PR #43](https://github.com/Luizbc2/Schedra/pull/43).
