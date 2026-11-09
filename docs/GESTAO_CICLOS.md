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

## Retomada em 06/11 - consolidacao operacional

Pedido real do responsavel: elevar a cobertura para aproximadamente 80%. O
incremento [#44](https://github.com/Luizbc2/Schedra/pull/44) saiu de uma copia
limpa da branch anterior, preservando alteracoes locais de agenda/configuracao.
Dependencias #41/#42/#43 permanecem abertas; nao houve merge nem release produtiva.

Aplicacao de Cynefin no ciclo:

| Trabalho observado | Decisao de gestao | Como testar a decisao |
| --- | --- | --- |
| Limites de upload conhecidos (claro) | Automatizar o checklist por proxy, sem redesenhar upload | Arquivo real, disfarce e dois limites de tamanho |
| Stampede, TTL e revisao concorrente (complicado) | Analisar escopo/revisao; coalescencia limitada ao processo, sem lock distribuido prematuro | Rajada real Redis, falha do SELECT e invalidacao intercalada |
| Infra local indisponivel (complicado) | Executar stack descartavel no CI; nao resetar Docker/volumes do responsavel | Logs do runner, artefato e cinco jobs independentes |
| Experiencia offline em aparelho (complexo) | Manter incremento e hipotese separados do aceite; nao extrapolar teste Chrome | Validacao fisica continua pendente, sem promover historia a concluida |

Revisao tecnica realizada: o primeiro ensaio local de prefixo de metricas falhou
porque Express registrava /api/clients/ com barra final. A correcao passou a
normalizar o template e recebeu teste de regressao. O primeiro job de containers
tambem detectou esse seletor, sem remover o gate. A espera pelo coletor e pela
readiness da candidata passou a ser limitada e explicita, em vez de presumir que
o start de um processo equivale a amostra disponivel.

Melhoria decorrente: toda regra PromQL precisa de pelo menos um teste contra os
rotulos produzidos e uma consulta ao coletor real. Carga e rollback passam a gerar
um artefato JSON reprodutivel; so passed=true e evidencia integral.

Jira foi consultado na retomada; SCHED-49 saiu de tarefas pendentes para em
andamento e SCHED-54 recebeu plano/PR/CI. A sprint 0 continuava ativa com termino
previsto em 05/11; esse desvio foi registrado, sem inventar encerramento,
cerimonia ou alterar retroativamente datas. Consolidacao/replanejamento da sprint
e aceite de produto continuam com o responsavel.

Esta e revisao tecnica observada no ciclo, nao feedback aprovado de uma equipe
ou professor. As incertezas de aparelho, producao, prazo final e aceite continuam
visiveis; nao foram convertidas em eventos Scrum ficticios.

## Planejamento futuro autorizado em 06/11

Depois da consolidacao tecnica, Luiz pediu organizar as proximas sprints sem
inventar antigas. Informou apresentacao por volta de dia 23, sem certeza da data.
O calendario usa 23/11 como referencia provisoria, com Sprint 1 em 09-15/11 e
Sprint 2 em 16-22/11. Sao planos futuros, nao ciclos ja executados ou concluidos.

O processo anterior permanece descrito como incremental/Kanban. A partir desta
decisao, dois ciclos futuros recebem objetivos, selecao de trabalho, dependencias
e criterios de saida; isso nao transforma o passado em Scrum completo. Nao foram
inventados Scrum Master, equipe, estimativas, dailies ou retrospectivas.

Sprint 0 foi encerrada hoje com os estados reais dos dois itens pendentes
registrados, sem retroagir datas. SCHED-1/SCHED-2 foram transportados. O backlog
de evolucao offline continua separado. O novo SCHED-57 explicita a integracao de
dev, gate da homologacao; os PRs nao foram integrados por este planejamento.

Revisao de cada ciclo deve comparar objetivo e aceite com o resultado real,
identificar o que sera transportado e registrar uma melhoria concreta. Concluir
issues/versoes depende desse aceite, nao do fim da data planejada.
Detalhes/IDs e regras operacionais em [GESTAO_JIRA.md](GESTAO_JIRA.md).

Referencias: [Cynefin](https://thecynefin.co/about-us/about-cynefin-framework/), [Jira Schedra](https://schedra-luiz.atlassian.net/jira/software/projects/SCHED/boards/1), [PR #42](https://github.com/Luizbc2/Schedra/pull/42), [PR #43](https://github.com/Luizbc2/Schedra/pull/43).

## Execucao real em 09/11 - microsservico adicional

Luiz comunicou que o professor exige pelo menos um microsservico e autorizou
implementar. SCHED-58 foi criada com aceite e responsabilidade reais, em R06,
e movida para Em andamento. Sprint 1 foi iniciada as 12h13 UTC (09h13 de Sao
Paulo), sem retroagir inicio nem concluir Sprint 2. O prazo por volta de 23/11
permanece nao confirmado. Nao foram inventados ritos ou aprovacoes.

Decisao: extrair o consumidor de eventos ja existente, com contrato JSON v1 e
SQLite proprio, preservando a API modular. Risco complicado: conexao Redis,
dedupe transacional, reinicio e limites de Pub/Sub. Tratamento: testes unitarios,
Redis real e ensaio de parada/retorno, sem distribuir autenticacao ou agenda.
O [PR #45](https://github.com/Luizbc2/Schedra/pull/45) depende de #44; nenhuma
integracao ou alteracao de producao foi executada.

Primeiro CI aprovou cinco jobs, incluindo 126 testes backend e oito do novo
servico sem ignorados. Containers chegou a publicar/consumir entre processos,
mas falhou apos reload do Nginx por socket reutilizado encerrado. A correcao
isolou conexoes das sondas e melhorou contexto de erro, sem retry de escrita,
sem retirar validacoes e sem converter falha parcial em sucesso.

O CI seguinte, [42617316711](https://github.com/Luizbc2/Schedra/actions/runs/42617316711),
aprovou os seis jobs; artefato baixado com passed=true e dez checks do
microsservico verdadeiros. A revisao tecnica confirmou publicacao/consumo,
persistencia, token e isolamento de reinicio; isso nao e aceite docente nem
cerimonia Scrum. SCHED-58 segue para revisao, nao para Concluido.
