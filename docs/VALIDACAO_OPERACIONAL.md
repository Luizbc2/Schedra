# Validacao operacional da rubrica

Incremento de 06/11, ampliado em 09/11/2026 no
[PR #45](https://github.com/Luizbc2/Schedra/pull/45), dependente de #44.
Este roteiro executa dados sinteticos em containers locais/runner, nao em Vercel,
nem no banco de um usuario. O checkout original e suas alteracoes foram preservados.

## Executar e demonstrar

Requisitos: Docker Engine/Compose v2; Node 24.12 ou posterior na linha 24 para
testar tambem o microsservico (node:sqlite experimental). Na raiz:

```powershell
node --test scripts/load-probe.test.mjs
docker compose -p schedra-rubric-qa -f compose.validation.yml config --quiet
node scripts/verify-stack.mjs
```

O ultimo comando constroi e sobe a stack, faz a demonstracao e remove apenas os
containers/redes desse projeto em finally; volumes sinteticos sao preservados.
Portas 8090 (Nginx) e 9091 (Prometheus) precisam estar livres. Nao usa o .env de
desenvolvimento nem le/limpa volumes de outro projeto. Nao executar cargas em
URLs externas por substituicao manual desse script.

Para inspecionar a stack manualmente, use `docker compose -p schedra-rubric-qa -f
compose.validation.yml up --build -d --wait`, abra o site em
`http://127.0.0.1:8090` e o coletor em `http://127.0.0.1:9091`.
Credenciais do arquivo sao exclusivamente sinteticas; nao copiar para producao.
O demonstrador completo pode sobrescrever o avatar da propria conta de teste.

## Verificacoes automaticas

| Item | Aceite verificavel |
| --- | --- |
| Proxy e autenticacao | Nginx -t, health/ready, web e OpenAPI; clientes sem token = 401 |
| Upload | PNG real -> WebP servido pela API; falso PNG = 415; acima de 5 MiB = 413 do Multer; acima de 6 MiB = 413 do Nginx |
| Cache | Miss/hit nos contadores; update seguido de listagem retorna nome novo; testes Redis reais cobrem TTL e uma rajada de 20 leituras para um SELECT |
| Carga pequena | 80 GETs com 5 concorrentes; 20 PUTs com 2 concorrentes; zero respostas nao-2xx; p95 <500 ms / <1000 ms, respectivamente |
| Eventos | Publicacao no backend e consumo em events com eventId/requestId iguais; apenas um assinante, nenhum consumidor no startup da API |
| Microsservico M1 | API/metrics com token dedicado e JWT de usuario recusado; projecao, dedupe e conflito; SQLite persiste apos reinicio; API continua gravando com consumidor parado; mensagem perdida nao e apresentada como replay |
| Coletor | promtool valida config/regras; consulta a API Prometheus exige target up=1, serie de clientes e recording rule avaliada |
| Falhas | Redis parado: readiness e escrita/listagem continuam; reinicio PostgreSQL preserva cliente |
| Rollback de configuracao | Substituir imagem baseline por candidata e restaurar baseline; /health identifica cada versao; cliente e bytes da foto permanecem iguais |

O pipeline agora tem seis jobs: backend, web, mobile, events, containers e
tooling. O job events executa testes com Redis real e contrato proprio. O
rollback da API tambem verifica que o container do consumidor nao foi trocado.
As sondas do ensaio usam conexoes novas durante reload do proxy, sem retry de
comandos de escrita. Falhas continuam bloqueando o gate.

O relatorio `artifacts/stack-evidence.json` guarda horario UTC, carga, p95,
checks e `passed`. O workflow publica o artefato `rubric-stack-evidence`, inclusive
em falha parcial. Somente `passed: true` comprova o ensaio completo.

## Medicao e limites

O p95 do ensaio usa nearest rank sobre o tempo de todas as respostas; nao elimina
falhas nem tempos lentos. Inclui Nginx, HTTP, autenticacao e acesso SQL/Redis. O
relatorio registra concorrencia e duracao, mas nao representa capacidade maxima,
multiplos tenants, rede movel, teste prolongado ou SLO observado por 30 dias.
O coletor usa buckets cumulativos para consultas PromQL distintas desse p95 exato.

As regras em `infra/observability/schedra.rules.yml` usam janela de cinco minutos
para a demonstracao. A meta de 30 dias continua proposta, nao medida. Alertas sao
avaliados localmente; nao foi instalado Alertmanager nem contratado canal externo.
O volume de metricas tem retencao de um dia, apropriada ao ensaio e insuficiente
para verificar um SLO mensal.

## Implantacao e retorno

Estrategia escolhida: substituicao simples de imagem, com readiness antes do
smoke e imagem anterior preservada. Na stack, o Nginx recarrega o destino apos
troca do container. O ensaio muda um identificador de release no build; nao finge
que testou todas as diferencas de codigo de duas releases reais.

Para producao, ainda exigir: revisao e integracao dos PRs em dev, homologacao,
PR dev -> main, imagem identificada por commit/digest, aprovacao do responsavel,
backup conferido, TLS/segredos e destino de deploy definido. O CI desta entrega
nao executa CD em producao e nao cria acesso SSH/credenciais de deploy.

Se a candidata falhar, restaurar a imagem anterior, esperar readiness e repetir
login/consulta/escrita de teste. Nao apagar volumes, nao executar down -v, nao
reverter schema destrutivo automaticamente. Se a migracao nao for retrocompativel,
interromper liberacao antes da troca: este ensaio nao certifica essa compatibilidade.

## Revisao e aceite

O CI fornece verificacao tecnica, nao aceite humano. Validacao em aparelho,
revisao visual completa das pranchas Excalidraw, riscos upstream de dependencias
e aceite do professor/responsavel continuam externos ao ensaio.

## Evidencia do microsservico em 09/11

Codigo `5382056`, [CI 42617316711](https://github.com/Luizbc2/Schedra/actions/runs/42617316711):
seis jobs aprovados; **126 testes backend e oito do microsservico, sem ignorados**.
O [artefato 13672957982](https://github.com/Luizbc2/Schedra/actions/runs/42617316711/artifacts/13672957982)
foi baixado e conferido: `passed=true`, consumidor `events`, todos os dez checks
de `microservice` verdadeiros. EventId `e4398826-1516-42fb-ad36-f1b990753794`
correlacionado entre publicacao e consumo. Parada/retorno preservou projecao e
recibos sem reiniciar a API; rollback da API preservou o consumidor.

Na mesma execucao: 80 leituras/5 concorrentes, p95 **50,51 ms**; 20 escritas/2
concorrentes, p95 **20,50 ms**, zero erros. Ambiente sintetico Linux/Compose,
nao producao nem medicao prolongada. O primeiro ensaio 42616507680 falhou no
socket apos reload do Nginx; a correcao manteve todos os gates. Atualizacoes
posteriores de documentacao geram novo CI: conferir tambem o HEAD do PR #45.
