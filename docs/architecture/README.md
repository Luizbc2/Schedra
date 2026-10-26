# Arquitetura atual do Schedra

Revisao de 26/10/2026. Diagramas abaixo descrevem o codigo desta branch, nao uma promessa de microsservicos. Os modelos antigos de evolucao continuam sendo propostas. Referencias: [C4](https://c4model.com/diagrams), [dominio e contextos](DDD.md), [decisoes](ADRS.md), [qualidade](QUALITY.md), [operacao Redis](../REDIS_OPERACAO.md).

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
  }
  Rel(user, mobile, "Usa")
  Rel(user, web, "Usa", "Navegador")
  Rel(mobile, local, "Consulta e grava", "SQL parametrizado")
  Rel(mobile, api, "Requisicoes autenticadas", "HTTPS / JSON e multipart")
  Rel(web, proxy, "Requisicoes no perfil de containers", "HTTP local ou HTTPS implantado")
  Rel(proxy, api, "Encaminha /api e /uploads", "HTTP interno")
  Rel(proxy, web, "Busca assets", "HTTP interno")
  Rel(api, db, "Le e grava dados autorizados", "SQL via driver")
  Rel(api, redis, "Cache e publicacao/assinatura", "TCP / RESP")
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

- Monolito modular com API unica, deploy unico e transacoes locais; nao e um sistema de microsservicos.
- Modulos de negocio em `Backend-Schedra/src/modules`; tenancy, auditoria e Redis em `src/platform`; HTTP e utilitarios em `src/shared`.
- Contratos Repository permitem testar services sem banco. Ainda existem acoplamentos diretos de algumas regras ao Sequelize; nao se declara arquitetura hexagonal pura.
- `Aplicativo-Schedra/src/features` agrupa telas, APIs e regras por funcionalidade; `src/shared` contem UI, banco, rede e midia.
- SQLite permite consultas ja salvas e fila de fotos. CRUD de negocio offline, conflitos e idempotencia geral ainda nao foram entregues.
- Pub/Sub exige processo duradouro para consumo continuo. Funcoes serverless nao garantem assinante ativo; esta entrega o demonstra no processo Node/containers.
- Nginx HTTP e credenciais sinteticas de `compose.validation.yml` sao exclusivamente locais/CI. Producao requer TLS, segredos e infraestrutura proprios.
