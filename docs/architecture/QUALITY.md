# Qualidade, resiliencia e observabilidade

Metas propostas em 26/10/2026. Nao sao numeros de disponibilidade ou desempenho ja atingidos em producao.

## SLOs e SLIs

| Objetivo | SLI e janela | Meta proposta |
| --- | --- | --- |
| Disponibilidade de negocio | Respostas nao-5xx / respostas nas rotas de negocio, 30 dias moveis | >=99,5% |
| Latencia de leitura | p95 do histograma de GETs de negocio, 5 minutos e relatorio por ambiente/carga | <500 ms |
| Latencia de escrita | p95 de POST/PUT/PATCH/DELETE de negocio, excluindo upload | <1 s |
| Degradacao controlada | Testes de CRUD com Redis desligado e contadores bypass/falha | Sem transformar falha Redis em 5xx de CRUD |

Disponibilidade por respostas nao mede requests que nem chegam a API; complementar com probe sintetico externo antes de declarar o SLO de ponta a ponta. Upload tem carga distinta e ainda precisa de meta propria. Histograma implementado tem buckets de 10 ms a 10 s e +Inf; p95 nao pode ser obtido apenas de soma/media.

```promql
histogram_quantile(0.95,
  sum by (le) (rate(schedra_http_request_duration_seconds_bucket{method="GET",route=~"/api/(clients|appointments|personal-events).*"}[5m]))
)
```

Validar o rotulo de rota no ambiente antes de adotar a consulta. Rotas usam templates Express; caminhos desconhecidos viram `_unmatched`, sem multiplicar series por termos ou IDs enviados pelo usuario. IDs de correlacao nao sao labels de metricas.

## Cenarios mensuraveis

| Estimulo / ambiente | Resposta esperada | Medida e verificacao |
| --- | --- | --- |
| Redis sem responder durante GET de clientes | Interromper espera e consultar SQL | Deadline padrao 150 ms por operacao de infraestrutura; teste com comando pendurado |
| Tres falhas Redis consecutivas | Abrir circuito; evitar novas chamadas por 5 s; uma sondagem na recuperacao | Teste deterministico de abertura, cooldown e fechamento; logs `redis_circuit` |
| Update durante SELECT para preencher cache | Nao publicar resultado antigo na revisao nova | Teste intercalado + Lua compare/set |
| Alterar cliente em uma organizacao | Invalidar todas as paginas/buscas desse escopo, sem afetar outra conta | Teste de namespaces e parametros |
| Perda do assinante | Reconectar sem bloquear CRUD; reconhecer possivel perda de evento | Conexao separada, backoff 500 ms a 5 s, sem prometer replay |
| Banco indisponivel | Readiness retorna 503; nao usar cache como autorizacao | `/ready`, teste de stack e runbook |
| Reiniciar celular sem rede | Recuperar dados/foto salvos sem misturar contas | 51 testes mobile e cenario de Chrome descrito em SQLITE_LOCAL.md |

## Politica de falhas

Comandos de cache/publicacao nao sao repetidos automaticamente: timeout aborta e destroi a conexao, evitando fila ilimitada e operacoes antigas acumuladas. A proxima requisicao apos cooldown pode sondar uma nova conexao. Assinante e diferente: reconecta em background com backoff limitado a 5 s. SQL continua sujeito aos seus timeouts/erros; o circuito Redis nao envolve todo o banco.

Cada leitura cache envolve no maximo uma consulta de cache e uma tentativa de preenchimento; cada escrita confirmada tenta invalidacao e publish. Cada tentativa tem deadline proprio. A latencia total inclui esses passos mais SQL e nao deve ser confundida com o deadline isolado.

Logs de eventos tem `type`, `eventId`, `eventType`, `requestId` e numero de assinantes; nao levam dados do cliente nem a URL Redis/credenciais. `/metrics` exige token se configurado e producao exige token forte. A API conserva envelope de erro com requestId. Metricas de infraestrutura usam apenas categorias/resultados fixos.

## Evidencia e lacunas

Testes novos em `src/__tests__/redis/cache-events.spec.ts` e `src/__tests__/integration/redis.integration.spec.ts`. A integracao real usa DB Redis 10-15, prefixo UUID e nunca FLUSHDB. CI adiciona Redis e PostgreSQL reais. A stack isolada testa Nginx, health/readiness, autorizacao, CRUD com Redis desligado e reinicio do banco.

Ainda nao ha historico de 30 dias, coletor Prometheus/Grafana implantado, teste de carga representativo ou aceite formal dos riscos de dependencias. O controle de requisicoes ativas usa finish; cancelamentos abruptos e instrumentacao distribuida devem ser ampliados antes de considerar observabilidade completa.
