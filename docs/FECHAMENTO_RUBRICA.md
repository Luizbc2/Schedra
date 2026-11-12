# Fechamento da entrega do Schedra

Para o estado posterior ao merge e ao hotfix, veja [versao candidata de apresentacao](VERSAO_APRESENTACAO.md). As instrucoes abaixo preservam a validacao tecnica da base.

Candidata de 12/11/2026: [PR #46 para dev](https://github.com/Luizbc2/Schedra/pull/46).
Reune os commits de #41 a #45 na mesma ancestralidade. Nao reaplicar os cinco
PRs por cherry-pick ou squash. A candidata foi preparada para revisao; a
promocao autorizada depois continua condicionada aos gates de dev e ao
ambiente real. Conferir o estado do PR e os deploys antes de declarar release.

## Matriz de demonstracao

Esta tabela aponta o que demonstrar na candidata. Conferir os
[checks do HEAD](https://github.com/Luizbc2/Schedra/pull/46/checks) e o
artefato `rubric-stack-evidence` da mesma execucao; nao usar um check de outro
commit como aceite. Os 12 criterios somam 9 pontos. M1 e a orientacao docente
adicional, sem peso atribuido por este documento.

| Criterio | Entregavel | Evidencia a conferir |
| --- | --- | --- |
| ARQ-01 | [C4, ADRs e cenarios](architecture/README.md) | Contexto distingue pessoas/sistema; Containers inclui API, Redis, consumidor e bancos distintos; [cenarios mensuraveis](architecture/QUALITY.md). |
| ARQ-02 | [Context Map e DDD](architecture/DDD.md) | Bounded contexts ligados aos modulos; Agendamento, Intervalo, Preco, slots e invariantes descritos e testados. |
| ARQ-03 | [OpenAPI](api/openapi.json) e [ADR de dados](architecture/ADRS.md) | Arquivo identico ao servido; autenticacao, profissionais, jornadas, admin e multipart; `docs:openapi:check` no CI. |
| ARQ-04 | [SLOs, resiliencia e observabilidade](architecture/QUALITY.md) | Timeout, reconexao, breaker, fallback, logs e metricas. SLO mensal e meta, nao resultado da carga curta. |
| ARQ-05 | [Pipeline](../.github/workflows/quality.yml) e runbook abaixo | Cinco gates antes do deploy isolado; tags por SHA; troca e retorno da imagem com cliente/avatar preservados. |
| BE-01 | [Cache Redis](REDIS_OPERACAO.md) | Miss/hit, TTL, invalidacao apos escrita e teste de corrida/isolamento com Redis real. |
| BE-02 | [Pub/Sub](REDIS_OPERACAO.md) | Mesmo eventId no produtor e consumidor; envelope sem payload pessoal; perda sem replay. |
| BE-03 | [Compose de validacao](../compose.validation.yml) e [Nginx](../infra/nginx/validation.conf) | Redes privadas, volumes e readiness; login, CRUD e upload pelo proxy; recuperacao de Redis/banco. |
| BE-04 | [Fluxo e responsabilidades](architecture/README.md) | Modulos, DTOs, controllers, services e repositories; requestId e erro 403 padronizado ao negar admin. |
| TF-01 | [Quadro Jira](https://schedra-luiz.atlassian.net/jira/software/projects/SCHED/boards/1) | Mostrar sprint ativa, trabalho real em SCHED-57/58, historias, estados e evidencias vinculadas. |
| TF-02 | [Cynefin e abordagem](GESTAO_CICLOS.md) | Justificar incremental: trabalho complicado por integracao/contratos; experimentacao separada para uso e offline. |
| TF-03 | [Ciclos e versao](GESTAO_CICLOS.md) | Backlog priorizado, aceites e revisao tecnica. Vincular o SHA candidato e a decisao real de revisao; nao inventar aceite/retrospectiva. |
| M1 | [Microsservico de eventos](../Microservico-Eventos/README.md) | Processo, imagem e SQLite proprios; para/reinicia sem bloquear CRUD; dedupe e persistencia verificados. |

## Pranchas

- [Excalidraw editavel](diagrams/Schedra-arquitetura-atual.excalidraw)
- [C4 Contexto](diagrams/atual-01.png)
- [C4 Containers](diagrams/atual-02.png)
- [Mapa DDD](diagrams/atual-03.png)

O arquivo de [evolucao futura](diagrams/Schedra-revisado.excalidraw) e uma
proposta separada. As novas pranchas nao apresentam PWA, notificacoes ou
sincronizacao offline completa como funcionalidades entregues.
Regenerar com `python docs/build-diagrams.py --current` (Pillow e Arial).

## Deploy de validacao e retorno

1. **Identificar a candidata.** Conferir branch, SHA e PR. A aprovacao para
   integrar em dev ou liberar outra infraestrutura e uma decisao separada.
2. **Build e testes.** No workflow Quality, backend, web, mobile, events e
   tooling precisam passar antes de `containers`. A API tambem verifica o
   arquivo OpenAPI exportado.
3. **Deploy isolado.** `containers` sobe exclusivamente o Compose do runner
   com dados sinteticos e portas loopback. O script grava o SHA efetivamente
   testado, valida Nginx, readiness, contratos, cache, eventos e metricas.
4. **Retorno.** O ensaio substitui apenas a API por uma candidata de
   configuracao, restaura a imagem baseline e confere o cliente, os bytes do
   avatar e o mesmo container de eventos. O artefato registra as duas tags
   por SHA. Nao e teste de reversao de migration ou de duas releases reais.
5. **Aceite.** Exigir `passed: true` no artefato, seis jobs verdes, SHA
   conferido e revisao humana registrada. A candidata pode ser demonstrada
   antes do merge; a validacao pos-merge em dev continua pendente.

Para reproduzir em checkout isolado, com Docker/Compose e Node 24:

```powershell
node scripts/verify-stack.mjs
```

O ensaio encerra apenas os containers `schedra-rubric-qa` e preserva os
volumes de teste. Nao aponta para URL ou banco real.

## Runbook curto

| Sintoma | Diagnostico | Acao segura |
| --- | --- | --- |
| API fora ou readiness 503 | Verificar `/health`, `/ready`, release e logs correlacionados | Parar a promocao; verificar banco/rede. Reverter somente para imagem e schema compativeis. |
| Redis indisponivel | CRUD continua no SQL; conferir logs do breaker e `/ready` do consumidor | Recuperar Redis e confirmar miss/hit e assinatura. Nao limpar cache de outros ambientes nem prometer replay. |
| Consumidor fora | API pronta, `/ops/events/ready` indisponivel | Preservar SQLite, verificar Redis/volume, restabelecer o processo e provar consumo de novo evento. |
| Nova imagem falhou | Confirmar SHA, `/health`, erro e efeitos de migration | Restaurar imagem anterior aprovada, recarregar proxy e repetir smoke. Se schema incompativel, interromper e acionar o responsavel pelo banco. |

Uma liberacao real exige aprovacao, TLS, segredos exclusivos, imagem por
digest, backup de banco e midia com restauracao verificada e destino
definido. O workflow atual nao guarda credenciais de deploy real e nao altera
producao. [Roteiro operacional](VALIDACAO_OPERACIONAL.md).

## Mudancas e pendencias da candidata

- API modular, consumidor Redis independente e SQLite proprio; componentes
  mobile, persistencia local e melhorias de operacao ja inclusos na cadeia.
- Contratos de profissionais/administracao e verificacoes de jornada e acesso
  negado acrescidos ao ensaio; pipeline de validacao explicito.
- Diagramas atuais separados da proposta, com margem de 8 px entre texto e
  conectores e paginas com tamanho uniforme.
- **Gates de liberacao:** revisao, CI do commit de dev apos merge e verificacao
  do ambiente real antes da promocao. Vercel publica web e API, nao o
  consumidor continuo. Para liberar tambem os eventos, confirmar Redis e
  runtime do microsservico com volume persistente. Versao candidata nao e
  release de producao nem garantia de nota. Aceite docente permanece separado.
