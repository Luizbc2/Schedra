# Schedra Event Activity

Microsservico de atividade operacional, extraido em 09/11/2026 para atender a
orientacao docente de pelo menos um servico independente (SCHED-58). A API de
agenda permanece modular; este processo nao importa codigo, modelos ou
credenciais SQL dela.

## Responsabilidade e contrato

Recebe `client.created/updated/deleted` via Redis Pub/Sub e mantem totais
persistentes por tipo de evento. O operador consulta a projecao em `/activity`.
Contrato publico em `../contracts/client-event.v1.schema.json`; eventos v1
de ate 4096 bytes, UTC canonico, UUID, escopo, entityId e requestId, sem campos
livres. Campos extras sao recusados; payload bruto e nomes/CPF/email nao sao
gravados nem registrados. O consumidor interno foi removido do startup da API.

SQLite pertence exclusivamente a este servico: recibos (eventId, hash, tipo,
recebimento) e contagens agregadas. Recebimento e projecao sao gravados na mesma
transacao, com WAL e synchronous=FULL. Repeticao de um ID com mesmo conteudo e
duplicata; conteudo diferente e conflito. Ambos nao incrementam a projecao.
Recibos expiram depois de 30 dias, configuravel em 1-365 dias; totais permanecem.
Depois da retencao, um replay manual pode voltar a contar. O hash canonico inclui
escopo/entityId para detectar conflito sem guardar seu conteudo na tabela.

**Nao e auditoria transacional nem fila duravel.** Mensagens publicadas durante
queda, erro de armazenamento ou entre commit/publish podem se perder. Retomada
reassina o canal, mas nao recupera mensagens antigas. Registro local nao implica
exactly-once de ponta a ponta, notificacoes ou sincronizacao offline.

## Executar independentemente

Node 24.12 ou posterior da linha 24 (node:sqlite ainda experimental nesse runtime).
Configurar variaveis do processo conforme `.env.example`. O servico nao carrega
o .env do backend nem faz fallback para seu token/SQL.

```powershell
npm ci
npm run lint -- --max-warnings 0
npm run typecheck
npm test
npm start
```

Sem TEST_REDIS_URL, o teste Redis e explicitamente ignorado; no CI essa variavel
aponta para DB 14 isolado. A suite de integracao usa canal UUID, sem FLUSHDB.
Para rodar todos os testes, configurar Redis acessivel em DB 10-15.

Na raiz, com a configuracao local do projeto e EVENTS_METRICS_TOKEN dedicado:

```powershell
docker compose -f docker-compose.yml -f compose.events.yml up --build -d
```

O overlay e local: nao publica Redis e expoe operacao apenas em 127.0.0.1:3334.
Nao o reutilizar em producao sem TLS/segredos/restricao de rede e revisao.
Para a demonstracao isolada que nao le o .env real:

```powershell
node scripts/verify-stack.mjs
```

## Interface operacional

| Rota | Acesso | Resultado |
| --- | --- | --- |
| GET /health | Rede autorizada | Processo vivo, servico e release; nao confundir com readiness |
| GET /ready | Rede autorizada | 200 apenas com assinatura Redis e SQLite disponiveis; senao 503 |
| GET /activity | Bearer EVENTS_METRICS_TOKEN | Totais cumulativos por tipo recebido |
| GET /metrics | Mesmo token dedicado | Resultados processed/duplicate/conflict/invalid/failed e estado da assinatura |
| GET /openapi.json | Rede autorizada | Contrato da propria API operacional |

JWT de usuario ou METRICS_TOKEN da API nao autorizam esses dados. Todos os
metodos de escrita HTTP sao recusados. Na stack de validacao, o prefixo e
`/ops/events/` no Nginx. O Prometheus consulta este servico diretamente, com
credencial sintetica distinta da API, apenas nesse perfil.

## Deploy, falhas e limites

- Build independente: `docker build -t schedra-events:SEU_SHA Microservico-Eventos`.
  Dockerfile multi-stage, runtime nao-root, healthcheck e volume `/data`.
- Nao precisa reiniciar/reimplantar a API para trocar o consumidor. Sem ele,
  CRUD segue no SQL e publicacoes podem registrar zero assinantes.
- Redis indisponivel: readiness 503, reconexao/backoff ate 5s; API segue seu
  fallback. Liveness continua 200 para nao confundir desconexao com crash.
- Falha de SQLite: consumo nao e registrado como sucesso; contador/log failed
  e readiness degradados. Como Pub/Sub nao reentrega, reconciliacao/outbox
  duravel e evolucao futura, nao comportamento implementado.
- Uma replica com um volume SQLite neste perfil. Nao compartilhar o mesmo
  arquivo entre hosts, nao afirmar HA ou usar como autorizacao/agenda.
- Para rollback, parar o processo, preservar volume e usar imagem compativel
  com user_version=1. Versao de schema desconhecida impede startup.
- SIGTERM/SIGINT interrompem assinatura e fecham HTTP/SQLite; nenhum timer de
  polling de negocio ou comando de hardware e executado.
- Logs e erros nunca incluem URL Redis, token ou payload bruto. Em producao,
  usar Redis privado com autenticacao/TLS e credenciais de canal com privilegio
  minimo; as credenciais de validacao nao sao reutilizaveis.

Fontes: [Redis Pub/Sub](https://redis.io/docs/latest/develop/pubsub/),
[node-redis](https://redis.io/docs/latest/develop/clients/nodejs/connect/),
[Node SQLite 24](https://nodejs.org/download/release/v24.16.0/docs/api/sqlite.html).
