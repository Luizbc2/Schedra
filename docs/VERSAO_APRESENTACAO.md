# Versao candidata de apresentacao

Registro de 12/11/2026 para [SCHED-44](https://schedra-luiz.atlassian.net/browse/SCHED-44) e [SCHED-12](https://schedra-luiz.atlassian.net/browse/SCHED-12). Esta candidata nao e tag publicada, release aprovada nem aceite docente.

## Base e ambientes

| Ambiente | Referencia | Escopo |
| --- | --- | --- |
| Base integrada | [PR #46](https://github.com/Luizbc2/Schedra/pull/46), `1616f44` em dev | Microsservico, Redis, Compose, arquitetura, API e SQLite mobile |
| Web/API publicadas | [PR #47](https://github.com/Luizbc2/Schedra/pull/47), `fd8a836`; [hotfix #48](https://github.com/Luizbc2/Schedra/pull/48), `ab6f336` | Vercel. API restaurada em [SCHED-59](https://schedra-luiz.atlassian.net/browse/SCHED-59). Nao hospeda o consumidor continuo de eventos |
| Candidata de apresentacao | Branch `release/schedra-apresentacao`, baseada em `ab6f336` | Validacao antes de integrar em dev; nao altera main nem a API publicada |

## Mudancas da candidata

- Aplicativo atualizado para Expo SDK 58, agenda empresarial por dia e seletores pesquisaveis com paginacao.
- Teste HTTP de agendamento cobre data invalida, referencias inexistentes, duracao e preservacao de historico ao arquivar o cliente.
- [Fluxos atuais](architecture/FLOWS.md), DER [central](diagrams/schedra-database.dbml) e [local](diagrams/schedra-local.dbml), com [propostas futuras](DIAGRAMS.md) separadas.
- Pranchas propostas 07 e 08 revisadas para distinguir banco/API, resultado autorizado, conflito e falha. [Comparar com a versao anterior](https://github.com/Luizbc2/Schedra/blob/ab6f3367cf9d550650764cef28cf2ff8f3d19c0b/docs/diagrams/07.png).

## Evidencias e limites

- [CI da base em main](https://github.com/Luizbc2/Schedra/actions/runs/43216448465) e [ensaio isolado de Compose/rollback](https://github.com/Luizbc2/Schedra/actions/runs/43212029836/artifacts/13940564974). Sao verificacoes da base, nao checks desta candidata.
- [Homologacao no aparelho](HOMOLOGACAO_APRESENTACAO.md): login, agenda e persistencia da foto ao reabrir confirmados no iPhone; demais combinacoes de formato e interrupcao devem ser verificadas separadamente.
- [Matriz e runbook](FECHAMENTO_RUBRICA.md): usar o CI do commit da candidata antes de integrar e manter separado qualquer aceite ou deploy de producao.
- CRUD de negocio offline completo, conflitos entre dispositivos e restauracao do banco de producao nao foram homologados nesta rodada.
