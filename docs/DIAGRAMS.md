# Diagramas das implementações futuras do Schedra

> Catálogo técnico. A proposta consolidada com os diagramas incorporados está em [PROPOSTA.md](PROPOSTA.md).

Os diagramas desta seção representam a solução proposta para lacunas ainda existentes. Eles não afirmam que os componentes, tabelas ou fluxos já estejam implementados.

Versão visual editável: [Schedra-revisado.excalidraw](diagrams/Schedra-revisado.excalidraw). Prévia das nove pranchas: [overview.png](diagrams/overview.png).

## Banco atual

O DER completo do banco existente está em [schedra-database.dbml](diagrams/schedra-database.dbml), pronto para importação no dbdiagram. A [visualização online no dbdiagram](https://dbdiagram.io/d/Schedra-DER-completo-6aabd504b73118d200aba4ce) apresenta todas as tabelas e relações em formato enxuto. O modelo contém 34 tabelas de domínio, a tabela técnica `schema_migrations` e 56 relacionamentos. O DER desta página, por outro lado, descreve apenas a evolução futura.

## 1. Arquitetura proposta

```mermaid
flowchart LR
    WEB[Aplicação web React]
    APP[Aplicativo Expo]
    SW[Service Worker]
    QUEUE[Fila offline]
    API[API Express]
    WORKER[Processador de notificações]
    PUSH[Serviço de push]
    DB[(Banco de dados)]

    WEB --> SW
    SW -->|cache seguro| WEB
    SW --> QUEUE
    QUEUE -->|sincronização idempotente| API
    WEB -->|HTTPS| API
    APP -->|HTTPS| API
    API --> DB
    WORKER --> DB
    WORKER --> PUSH
    PUSH --> APP
```

O Service Worker atende somente a aplicação web. Ele preserva o shell e leituras autorizadas, mas não substitui a API. O processador de notificações consulta lembretes pendentes e registra o resultado de cada tentativa.

## 2. DER proposto para lembretes e sincronização

```mermaid
erDiagram
    USERS ||--o{ NOTIFICATION_PREFERENCES : configura
    USERS ||--o{ DEVICE_TOKENS : autoriza
    USERS ||--o{ NOTIFICATIONS : recebe
    USERS ||--o{ SYNC_OPERATIONS : produz
    APPOINTMENTS ||--o{ REMINDERS : agenda
    PERSONAL_EVENTS ||--o{ REMINDERS : agenda
    REMINDERS ||--o{ NOTIFICATIONS : origina

    NOTIFICATION_PREFERENCES {
        int id PK
        int userId FK
        boolean enabled
        string channel
        int defaultLeadMinutes
        boolean showSensitiveContent
    }
    DEVICE_TOKENS {
        int id PK
        int userId FK
        string tokenHash UK
        string platform
        datetime revokedAt
    }
    REMINDERS {
        int id PK
        int appointmentId FK
        int personalEventId FK
        datetime scheduledFor
        string status
    }
    NOTIFICATIONS {
        int id PK
        int userId FK
        int reminderId FK
        string channel
        string status
        datetime readAt
    }
    SYNC_OPERATIONS {
        string idempotencyKey PK
        int userId FK
        string resourceType
        string operation
        int baseVersion
        string status
    }
```

## 3. Caso de uso proposto - calendário e operação offline

```mermaid
flowchart LR
    U([Usuário autenticado])
    UC1((Selecionar uma data))
    UC2((Consultar resumo do dia))
    UC3((Criar compromisso))
    UC4((Editar ou concluir compromisso))
    UC5((Consultar dados recentes offline))
    UC6((Sincronizar alteração pendente))
    UC7((Resolver conflito))

    U --- UC1
    U --- UC2
    U --- UC3
    U --- UC4
    U --- UC5
    U --- UC6
    U --- UC7
    UC1 -. abre .-> UC2
    UC3 -. pode gerar .-> UC6
    UC4 -. pode gerar .-> UC6
    UC6 -. estende .-> UC7
```

## 4. Caso de uso proposto - notificações e administração web

```mermaid
flowchart LR
    U([Usuário autenticado])
    A([Administrador])
    UC1((Configurar lembretes))
    UC2((Autorizar dispositivo))
    UC3((Consultar central de notificações))
    UC4((Marcar notificação como lida))
    UC5((Pesquisar usuários))
    UC6((Alterar papel ou estado))
    UC7((Consultar auditoria))

    U --- UC1
    U --- UC2
    U --- UC3
    U --- UC4
    A --- UC5
    A --- UC6
    A --- UC7
    UC1 -. inclui .-> UC3
    UC6 -. inclui .-> UC7
```

## 5. Atividade proposta - interação com uma data

```mermaid
flowchart TD
    A([Início]) --> B[Selecionar uma data no calendário]
    B --> C[Consultar compromissos autorizados do dia]
    C --> D{Tamanho da tela}
    D -- Desktop --> E[Abrir pop-up ancorado]
    D -- Mobile --> F[Abrir painel inferior]
    E --> G[Exibir resumo e ações]
    F --> G
    G --> H{Ação escolhida}
    H -- Novo --> I[Abrir formulário com data preenchida]
    H -- Abrir --> J[Mostrar detalhes do compromisso]
    H -- Fechar --> K[Devolver foco ao dia selecionado]
    I --> L([Fim])
    J --> L
    K --> L
```

## 6. Atividade proposta - preparar e entregar lembrete

```mermaid
flowchart TD
    A([Compromisso salvo]) --> B{Lembrete habilitado?}
    B -- Não --> Z([Fim sem notificação])
    B -- Sim --> C[Validar antecedência e consentimento]
    C --> D{Canal disponível?}
    D -- Não --> E[Registrar indisponibilidade na central]
    D -- Sim --> F[Agendar lembrete]
    F --> G[Processador busca lembretes vencidos]
    G --> H[Enviar pelo canal autorizado]
    H --> I{Entrega aceita?}
    I -- Sim --> J[Registrar entrega]
    I -- Não --> K[Registrar falha e política de nova tentativa]
    E --> Z
    J --> Z
    K --> Z
```

## 7. Sequência proposta - escrita offline e sincronização

```mermaid
sequenceDiagram
    actor U as Usuário
    participant W as Aplicação web
    participant SW as Service Worker
    participant Q as Fila local
    participant API as API
    participant DB as Banco

    U->>W: Confirma uma alteração sem rede
    W->>SW: Solicita persistência temporária
    SW->>Q: Salvar operação + chave idempotente + versão base
    Q-->>W: Estado pendente
    W-->>U: Exibir aguardando sincronização
    Note over SW,API: A conexão retorna
    SW->>Q: Ler próxima operação
    SW->>API: Enviar operação idempotente
    API->>DB: Validar usuário, escopo e versão
    alt versão compatível
        DB-->>API: Alteração persistida
        API-->>SW: 200/201 + nova versão
        SW->>Q: Marcar como sincronizada
        W-->>U: Exibir sincronizado
    else conflito
        API-->>SW: 409 + estado remoto
        SW->>Q: Marcar conflito
        W-->>U: Solicitar resolução consciente
    end
```

## 8. Sequência proposta - administração web

```mermaid
sequenceDiagram
    actor A as Administrador
    participant W as Painel web
    participant API as API
    participant DB as Banco
    participant AUD as Auditoria

    A->>W: Pesquisa um usuário
    W->>API: GET /api/admin/users?search=...
    API->>DB: Revalidar administrador ativo
    DB-->>API: Papel e estado atuais
    API->>DB: Consultar usuários filtrados
    DB-->>API: Página de resultados
    API-->>W: 200 + usuários
    A->>W: Confirma alteração de papel ou estado
    W->>API: PATCH /api/admin/users/:id
    API->>DB: Validar alvo e regra de autoproteção
    DB-->>API: Usuário atualizado
    API->>AUD: Registrar ator, alvo e alteração
    API-->>W: 200 + estado atualizado
    W-->>A: Atualizar linha e informar sucesso
```

## 9. Rastreabilidade da proposta

| Lacuna | Requisitos | Diagramas | Entrega planejada |
| --- | --- | --- | --- |
| Calendário sem interação contextual | RFF01-RFF05 | 3 e 5 | PR 1 |
| Ausência de lembretes | RFF06-RFF09 | 2, 4 e 6 | PRs 3 e 4 |
| Dependência integral de conexão | RFF10-RFF13 | 1, 3 e 7 | PRs 5 e 6 |
| Ausência de administração web | RFF14-RFF17 | 4 e 8 | PR 2 |

## 10. Evidência exigida para considerar uma proposta concluída

Uma proposta só muda de `Planejada` para `Concluída` quando possuir código integrado, testes automatizados, validação manual no ambiente correspondente e atualização desta rastreabilidade. O diagrama isoladamente comprova apenas análise e projeto.
