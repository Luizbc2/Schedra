# Redis, API e stack de validacao

Incremento SCHED-50/51/52/53, 26/10/2026. Cache do recurso clientes e eventos de suas escritas. Implementacao nao altera o armazenamento central nem migra dados de producao.

## Configuracao

| Variavel | Padrao | Contrato |
| --- | --- | --- |
| REDIS_URL | Vazio | Sem URL: CRUD segue via banco, sem cache |
| REDIS_PREFIX | schedra:v1 | Separar ambientes e versoes de contrato |
| REDIS_TIMEOUT_MS | 150 | Deadline entre 50 e 2000 ms |
| REDIS_CACHE_TTL_SECONDS | 30 | TTL entre 1 e 300 s |
| TEST_REDIS_URL | Vazio | Testes reais so em DB Redis 10-15 |

Usar Redis privado/autenticado/TLS quando necessario; nunca publicar porta Redis para a Internet. A stack isolada nao publica Redis nem PostgreSQL. Chaves possuem hash de busca, mas valores de cache contem os DTOs autorizados: Redis e parte da fronteira de dados pessoais.

## Validacao reproduzivel

Na raiz, com Docker funcionando e Node 24:

```powershell
node scripts/verify-stack.mjs
```

Usa exclusivamente `compose.validation.yml` e projeto `schedra-rubric-qa`; porta HTTP 127.0.0.1:8090, banco/volume novos. Nao carregar a .env real. Credenciais no arquivo sao sinteticas, exclusivas de teste. O script executa build, `nginx -t`, readiness, rejeicao de acesso anonimo, cadastro/login de conta sintetica, CRUD, queda do Redis e reinicio do banco; encerra containers preservando o volume de teste.

Para manter a interface de validacao aberta:

```powershell
docker compose -p schedra-rubric-qa -f compose.validation.yml up --build -d --wait
```

Esse perfil usa HTTP e NODE_ENV development deliberadamente. Nao e manifesto pronto para producao. O docker-compose.yml anterior e os certificados do usuario permanecem separados.

## Como observar cache e eventos

Com conta sintetica autenticada, duas chamadas GET /api/clients devem produzir miss e hit nos contadores. POST/PUT/DELETE invalidam a revisao inteira. Testes verificam TTL, escopo, parametros e a corrida entre SELECT e invalidacao.

Logs `event_published` e `event_consumed` devem ter o mesmo eventId/requestId. Numero de assinantes zero indica publicacao sem consumidor presente; nao e confirmacao de entrega. Nenhum evento deve conter CPF, nome, email ou notas.

## Runbook curto

1. Conferir `/health` (processo) e `/ready` (SQL). Proteger `/metrics` com o token do ambiente, sem coloca-lo em URL, logs ou screenshots.
2. Redis fora: observar `bypass`, `publish_failed`, `invalidation_failed` e circuito; validar SQL e carga antes de reiniciar qualquer servico. Nao desligar autorizacao para compensar lentidao.
3. Redis recuperado: comandos voltam apos sondagem; assinante reconecta automaticamente. Esperar no maximo o TTL para caches antigos quando houve invalidacao perdida. Nao prometer recuperar eventos Pub/Sub perdidos.
4. Banco fora: nao aceitar escrita como concluida; restaurar conectividade e conferir readiness. Dados centrais nao sao reconstruidos do cache.
5. Deploy: revisar PR -> homologar dev -> PR main. Antes de produzir imagens, excluir .env/uploads do contexto. Usar versao imutavel e backup verificavel do banco.
6. Rollback: voltar a imagem anterior compativel com schema; se o novo problema e cache, retirar REDIS_URL no deploy e operar pelo SQL. Nao reverter migration destrutiva automaticamente e nao apagar volumes como tentativa de correcao.

## Limites conhecidos

- Falha entre commit e publish pode perder evento; Pub/Sub nao tem fila/replay. Outbox SQL permanece futura.
- Invalidacao indisponivel pode deixar dados de listagem antigos ate TTL; permissoes continuam consultadas independentemente do cache.
- Cache cobre a API de clientes, nao todo o sistema. Gravacoes diretas no banco fora dessa API nao emitem invalidacao.
- Cada processo mantem seus contadores; coletor deve agregar instancias. Sem processo persistente, consumo continuo nao e garantido.
- O Docker Desktop local apresentou erro do gerenciador de inferencia nesta data. O manifesto passou em `compose config`; o runtime foi validado no [CI Linux de referencia](https://github.com/Luizbc2/Schedra/actions/runs/40345213988). Os quatro jobs passaram, incluindo Redis real, eventos correlacionados e smoke de containers. Nao foi feito reset de fabrica local.
