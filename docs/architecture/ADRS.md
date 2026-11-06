# Registros de decisoes arquiteturais

Data: 26/10/2026. Estado: adotadas no codigo da branch; revisao e release ainda pendentes. Uma ADR registra a escolha e seus custos, nao comprova uma implantacao em producao.

## ADR-001 - Monolito modular

**Contexto:** equipe reduzida, autenticacao multiempresa e regras de agenda exigem consistencia; custo operacional precisa permanecer baixo.

**Decisao:** uma API Express, separada por modulos, com controller/service/repository e plataforma compartilhada. Interfaces Repository nos limites de persistencia; transacoes no adaptador SQL.

**Alternativas:** microsservicos por dominio exigiriam contratos remotos, deploy/observabilidade e consistencia distribuida adicionais; monolito sem limites facilitaria o inicio mas aumentaria alteracoes cruzadas.

**Consequencias:** deploy e transacoes simples; falha da API afeta varios contextos. Limites precisam ser mantidos em revisao, pois imports diretos ainda permitem acoplamento. Extrair servico so mediante necessidade medida, nao para satisfazer um nome de padrao.

**Evidencias:** `src/modules/clients`, `src/modules/appointments`, `src/platform/tenancy`; services recebem interfaces de repository e possuem testes.

## ADR-002 - Dados centrais, dados locais e cache separados

**Contexto:** usuarios compartilham dados por organizacao, mas precisam recuperar dados/fotos apos reiniciar o celular. Um banco local nao pode autorizar acesso de outro usuario.

**Decisao:** banco relacional central via Sequelize (PostgreSQL na stack de validacao; MySQL tambem suportado), SQLite nativo para copias locais/BLOB e Redis somente para cache/eventos. IndexedDB e o adaptador do Expo Web. Tokens permanecem no SecureStore nativo.

**Alternativas:** somente armazenamento chave/valor nao fornece consultas/transacoes relacionais; SQLite central por aparelho nao resolve compartilhamento e concorrencia; Redis como fonte de verdade perderia os dados ao expirar/evictar chaves.

**Consequencias:** tres responsabilidades de persistencia, migracoes e politicas distintas. Nao existem FKs entre banco local e remoto. Logout e troca de conta exigem isolamento/cleanup. Dados SQLite nao sao criptografados por SQLCipher nesta implementacao; riscos de aparelho comprometido continuam na revisao de seguranca.

**Evidencias:** `src/shared/database/schema.ts` no app; `src/config/database.ts` na API; DERs central/local separados; testes reais de SQLite, rollback e escopos.

## ADR-003 - Cache-aside versionado por escopo

**Contexto:** paginas/buscas de clientes repetem SELECTs; invalidar so uma pagina serviria registros antigos. Uma leitura concorrente nao pode reintroduzir valor na revisao atual apos update.

**Decisao:** chave inclui namespace, conta/organizacao, revisao UUID e hash dos parametros normalizados. TTL padrao 30 s, configuravel entre 1 e 300 s. Escrita confirmada troca a revisao; Lua publica o snapshot somente se a revisao ainda corresponder. Valor limitado a 512 KiB, fila de comandos limitada a 64.

**Alternativas:** DEL por chave desconhece todas as buscas; KEYS/SCAN em cada escrita aumenta custo; incrementar revisao com fallback zero permite reutilizar namespace antigo apos eviction. UUID impede reutilizacao acidental da revisao.

**Consequencias:** chaves antigas expiram sozinhas; uma chave de revisao por escopo permanece ate eviction. Desde 06/11, misses identicos compartilham o SELECT dentro do processo (ADR-005); coalescencia entre processos permanece futura. Falha de invalidacao pode manter leitura antiga ate o TTL; Redis nao e fonte de autorizacao. Deadline, circuito e fallback preservam o CRUD no banco. Testes cobrem concorrencia, TTL, parametros e tenants.

## ADR-004 - Pub/Sub para eventos observaveis, nao fila duravel

**Contexto:** a rubrica exige publicacao/consumo Redis com evidencia. E preciso evitar prometer notificacoes garantidas ou replay inexistente.

**Decisao:** depois da escrita SQL confirmada, publicar envelope v1 de `client.created/updated/deleted`. Uma conexao separada assina o canal e valida o envelope; logs de publicacao/consumo usam eventId e requestId. Nenhum nome, CPF, email ou conteudo de cliente e publicado.

**Alternativas:** Streams ou outbox SQL com consumidor idempotente oferecem recuperacao e durabilidade, com maior escopo; publicar antes do commit anunciaria alteracoes que podem falhar.

**Consequencias:** entrega at-most-once; evento pode ser perdido ao desconectar, ao falhar publish ou entre commit e publish. Isso nao reverte escrita confirmada nem substitui a fila SQLite de fotos. Consumo continuo em serverless nao e garantido. Notificacoes de usuario e efeitos de negocio criticos exigirao outbox/replay futuro.

Referencia: [semantica oficial Redis Pub/Sub](https://redis.io/docs/latest/develop/pubsub/).

## ADR-005 - Coalescencia local limitada e revisada

**Contexto:** uma rajada de misses identicos podia iniciar SELECTs simultaneos. Uma unica promise por termo de busca, sem tenant/revisao, misturaria dados ou reaproveitaria uma leitura anterior a uma escrita.

**Decisao (06/11):** a chave completa ja inclui escopo, revisao e hash. No maximo 128 chaves em voo sao coalescidas por processo. A consulta sai do mapa em finally, inclusive com erro; cada seguidor recebe uma copia do resultado. Uma invalidacao muda a chave e nao adere ao SELECT antigo. Redis indisponivel continua com fallback SQL direto.

**Alternativas:** lock distribuido exige TTL/renovacao e tratamento de dono morto; nao foi adicionado por falta de necessidade medida. Guardar resultado indefinidamente em memoria seria outro cache e esconderia invalidacao externa.

**Consequencias:** reduz stampede no mesmo processo, nao garante SELECT unico entre replicas. Ao atingir o limite, consulta normalmente sem acumular novas entradas. O timeout do SQL continua responsabilidade do driver; nao se mascara falha SQL como acerto de cache. Suites fake e Redis real verificam 20 leituras para um SELECT, invalidacao durante carga e recuperacao apos erro.

## ADR-006 - Observabilidade e ensaio de implantacao isolados

**Contexto:** contadores sem coletor e um runbook sem exercicio nao comprovavam a operacao. Nao ha aprovacao para mudar infraestrutura produtiva ou contratar servicos.

**Decisao (06/11):** Compose de validacao inclui Prometheus com volume e retencao de um dia; scrape autenticado, regras de disponibilidade/p95 e alertas locais. CI testa 80 leituras/5 concorrentes e 20 escritas/2 concorrentes pelo Nginx, registra p95/erros em JSON e verifica upload. Constroi candidata de configuracao, substitui API e restaura imagem anterior preservando cliente/avatar.

**Alternativas:** medir somente o service omite HTTP/proxy/auth; apontar carga para Vercel alteraria um ambiente real. Implantar Grafana/Alertmanager agora aumentaria o escopo sem fechar a coleta basica.

**Consequencias:** evidencia reproduzivel de pequena carga, nao capacidade de producao ou disponibilidade de 30 dias. Alertas sao avaliados no coletor, sem canal de notificacao externo. Credenciais sinteticas ficam apenas no perfil isolado; Prometheus tem bind loopback. Rollback de uma configuracao na mesma revisao de fonte nao comprova compatibilidade entre quaisquer releases/schema.
