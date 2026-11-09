# Arquitetura atual do Schedra

Revisao de 09/11/2026. A API principal permanece modular e ha um microsservico
independente de atividade por eventos, extraido por orientacao docente adicional.
Os modelos antigos de evolucao continuam sendo propostas. Referencias:
[C4](https://c4model.com/diagrams), [dominio](DDD.md), [ADRs](ADRS.md),
[qualidade](QUALITY.md), [Redis](../REDIS_OPERACAO.md),
[microsservico](../../Microservico-Eventos/README.md).

## C4 - Contexto

```mermaid
C4Context
  title Schedra - contexto de uso
  Person(user, "Usuario", "Organiza compromissos pessoais e acessa sua empresa")
  Person(manager, "Gestor empresarial", "Mantem clientes, equipe, servicos e agenda")
  Person(admin, "Administrador da plataforma", "Gerencia usuarios, conforme permissoes")
  System(schedra, "Schedra", "Aplicativo e site de agenda pessoal e empresarial")
  Rel(user, schedra, "Consulta e organiza agenda", "App ou navegador")
  Rel(manager, schedra, "Opera cadastros e atendimentos", "App ou navegador")
  Rel(admin, schedra, "Administra usuarios", "Interface autorizada")
```

Autenticacao e banco pertencem ao Schedra; nao sao sistemas externos neste nivel. GitHub, Expo e Vercel sao ferramentas de construcao/entrega, nao atores de agendamento.

## C4 - Containers

```mermaid
C4Container
  title Schedra - containers e protocolos
  Person(user, "Usuario", "Pessoal ou empresarial")
  System_Boundary(schedra, "Schedra") {
    Container(mobile, "Aplicativo", "Expo / React Native", "Telas por feature e controles compartilhados")
    ContainerDb(local, "Persistencia do aparelho", "SQLite / BLOB", "Perfil, preferencias, copias de dados e fila de fotos")
    Container(web, "Site", "React / Vite", "Interface web; assets estaticos")
    Container(proxy, "Proxy de containers", "Nginx", "Encaminha web, API e assets; nao participa do deploy Vercel")
    Container(api, "API modular", "Express / TypeScript", "Autentica, autoriza e executa regras de negocio")
    ContainerDb(db, "Banco central", "PostgreSQL ou MySQL / Sequelize", "Fonte de verdade compartilhada e controle de acesso")
    ContainerDb(redis, "Cache e eventos", "Redis", "Cache temporario de clientes e Pub/Sub sem durabilidade")
    Container(metrics, "Coletor de validacao", "Prometheus", "Consulta metricas autenticadas, avalia regras e guarda series por um dia")
    Container(events, "Atividade por eventos", "Node 24 / TypeScript", "Microsservico: valida eventos e mantem projecao operacional; deploy independente")
    ContainerDb(eventdb, "Dados de atividade", "SQLite / volume exclusivo", "Recibos idempotentes com retencao e totais persistentes; nao e banco da API")
  }
  Rel(user, mobile, "Usa")
  Rel(user, web, "Usa", "Navegador")
  Rel(mobile, local, "Consulta e grava", "SQL parametrizado")
  Rel(mobile, api, "Requisicoes autenticadas", "HTTPS / JSON e multipart")
  Rel(web, proxy, "Requisicoes no perfil de containers", "HTTP local ou HTTPS implantado")
  Rel(proxy, api, "Encaminha /api e /uploads", "HTTP interno")
  Rel(proxy, web, "Busca assets", "HTTP interno")
  Rel(api, db, "Le e grava dados autorizados", "SQL via driver")
  Rel(api, redis, "Cache e publicacao de eventos v1", "TCP / RESP")
  Rel(events, redis, "Assina eventos de clientes v1", "TCP / RESP")
  Rel(events, eventdb, "Grava recibo e projecao atomicamente", "SQL local")
  Rel(metrics, api, "Consulta /metrics com token operacional", "HTTP interno")
  Rel(metrics, events, "Consulta /metrics com token proprio", "HTTP interno")
```

No Expo Web, IndexedDB substitui SQLite nativo. Tokens nativos ficam no SecureStore, fora do SQLite. O banco central suporta dois dialetos; a stack de validacao usa PostgreSQL 16. Nao se infere o banco de producao a partir desse perfil. Redis nao armazena permissoes nem decide disponibilidade de horarios.

## Caminho de uma operacao

```mermaid
flowchart LR
  HTTP["Rota + autenticacao"] --> ACL["Permissao e contexto do tenant"]
  ACL --> Controller["Controller: DTO e resposta"]
  Controller --> Service["Service: regras de negocio"]
  Service --> Port["Contrato de Repository"]
  Port --> SQL["Adaptador Sequelize"]
  SQL --> DB[("Banco central")]
  Port -. "Listagem de clientes" .-> Cache["Decorator cache-aside"]
  Cache --> Redis[("Redis: TTL e revisao")]
  Cache --> SQL
```

O decorator envolve o adaptador SQL na composicao do controller. Leituras individuais seguem no banco. Escritas confirmadas invalidam o namespace e publicam evento. Sem Redis, o decorator continua pelo banco; sem banco, Redis nao mascara falhas de autenticacao ou autorizacao.

## Qualidades e limites da estrutura

- API principal modular, mais um microsservico independente de atividade.
  Agenda e autenticacao nao foram reescritas como microsservicos. Cada processo
  possui build/deploy proprio e dados sob sua responsabilidade; eventos sao o
  contrato entre eles, sem imports de codigo interno ou SQL compartilhado.
- Modulos de negocio em `Backend-Schedra/src/modules`; tenancy, auditoria e Redis em `src/platform`; HTTP e utilitarios em `src/shared`.
- Contratos Repository permitem testar services sem banco. Ainda existem acoplamentos diretos de algumas regras ao Sequelize; nao se declara arquitetura hexagonal pura.
- `Aplicativo-Schedra/src/features` agrupa telas, APIs e regras por funcionalidade; `src/shared` contem UI, banco, rede e midia.
- SQLite permite consultas ja salvas e fila de fotos. CRUD de negocio offline, conflitos e idempotencia geral ainda nao foram entregues.
- Pub/Sub exige consumidor duradouro. Agora roda em Microservico-Eventos, nao no
  startup da API. A persistencia de recibos nao recupera eventos perdidos durante
  queda. Funcoes serverless nao garantem assinante continuo; usar processo/container.
- Nginx HTTP e credenciais sinteticas de `compose.validation.yml` sao exclusivamente locais/CI. Producao requer TLS, segredos e infraestrutura proprios.
