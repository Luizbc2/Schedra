# Fluxos atuais do Schedra

Este documento mostra a versao integrada em `fd8a836`. [Os diagramas de evolucao](../DIAGRAMS.md) descrevem propostas, nao comportamento entregue. Veja tambem [C4 e DDD](README.md), [OpenAPI](../api/openapi.json) e [persistencia local](../SQLITE_LOCAL.md).

## Casos de uso

### UC01: Organizar agenda e clientes da empresa

**Ator:** membro autorizado da organizacao. **Entrada:** sessao valida, organizacao ativa e permissao da operacao. **Resultado:** cliente ou agendamento persistido no banco central; a copia local e atualizada apos a resposta.

```mermaid
flowchart LR
    Gestor["Membro da organizacao"]
    subgraph S["Schedra · modo empresarial"]
        Clientes(["Gerenciar clientes"])
        Agenda(["Organizar atendimentos"])
        Consulta(["Consultar agenda"])
    end
    Gestor --- Clientes
    Gestor --- Agenda
    Gestor --- Consulta
```

O backend valida as referencias e a disponibilidade. Sem permissao ou com conflito, rejeita a operacao. Sem conexao, o app pode ler dados ja salvos; nao enfileira novos agendamentos.

### UC02: Gerenciar compromissos pessoais e perfil

**Ator:** usuario autenticado. **Entrada:** sessao valida. **Resultado:** compromissos privados mantidos na API; a nova foto pode ficar salva no aparelho antes do envio.

```mermaid
flowchart LR
    Usuario["Usuario autenticado"]
    subgraph S["Schedra · pessoal e conta"]
        Compromisso(["Gerenciar compromissos pessoais"])
        Perfil(["Consultar e editar perfil"])
        Foto(["Trocar foto"])
    end
    Usuario --- Compromisso
    Usuario --- Perfil
    Usuario --- Foto
```

O compromisso pessoal nao exige cliente, profissional ou servico. A foto pertence a conta, nao a empresa ativa. Negar acesso a galeria ou falhar ao preparar a foto nao altera a anterior.

## Atividades

### A01: Criar atendimento

```mermaid
flowchart TD
    A["Selecionar cliente, profissional, servico e horario"] --> B["Enviar criacao autenticada"]
    B --> C{"Sessao e permissao validas?"}
    C -- Nao --> D["Negar a operacao"]
    C -- Sim --> E{"Referencias, jornada e intervalo validos?"}
    E -- Nao --> F["Mostrar erro de validacao"]
    E -- Sim --> G["Tentar reservar slots e gravar em transacao"]
    G --> H{"Reserva confirmada?"}
    H -- Nao --> I["Rejeitar conflito ou desfazer a transacao"]
    H -- Sim --> J["Atualizar a agenda com a resposta"]
```

### A02: Trocar avatar

```mermaid
flowchart TD
    A["Abrir galeria e selecionar foto"] --> B{"Selecao e preparo validos?"}
    B -- Nao --> C["Preservar a foto anterior"]
    B -- Sim --> D["Gravar BLOB e pendencia em uma transacao"]
    D --> E["Mostrar a previa local"]
    E --> F{"Conexao disponivel?"}
    F -- Nao --> G["Aguardar oportunidade de envio"]
    F -- Sim --> H["Enviar multipart para a API"]
    G --> F
    H --> I{"API confirmou?"}
    I -- Sim --> J["Salvar URL e marcar como sincronizado"]
    I -- Nao --> K["Manter BLOB; reagendar ou sinalizar rejeicao"]
```

## Sequencias

### S01: Cadastrar cliente e refletir a lista

```mermaid
sequenceDiagram
    actor U as Operador
    participant M as App Expo
    participant A as API / clientes
    participant B as PostgreSQL
    participant R as Redis (quando habilitado)
    participant L as SQLite do app
    U->>M: Salvar cliente
    M->>A: POST /api/clients
    alt Sessao, permissao ou entrada invalida
        A-->>M: 4xx com motivo
    else Solicitacao autorizada
        A->>B: Persistir cliente no escopo autorizado
        B-->>A: Escrita confirmada
        opt Redis habilitado
            A->>R: Invalidar revisao e publicar evento v1
        end
        A-->>M: 201 + cliente
        M->>L: Atualizar copia local do escopo
        M-->>U: Exibir cliente salvo
    end
```

Falha no Redis nao torna a operacao confirmada em falha de CRUD. Em modo offline, o app le a copia local; o POST nao tem outbox de negocio.

### S02: Persistir e sincronizar avatar

```mermaid
sequenceDiagram
    actor U as Usuario
    participant M as App Expo
    participant L as SQLite do app
    participant W as Worker de avatar
    participant A as API / avatar
    participant B as Banco central
    U->>M: Escolher imagem
    M->>M: Converter e preparar JPEG
    M->>L: Gravar midia BLOB e operacao atomicas
    M-->>U: Mostrar previa pendente
    opt Rede disponivel e sessao atual
        W->>L: Ler operacao e bytes da conta
        W->>A: PATCH /api/users/me/avatar (multipart)
        alt Imagem ou sessao rejeitada
            A-->>W: Erro HTTP
            W->>L: Manter BLOB e registrar falha
        else Conteudo aceito
            A->>B: Salvar WebP e atualizar referencia do perfil
            A-->>W: 200 + perfil atualizado
            W->>L: Confirmar somente se ainda for a foto selecionada
        end
    end
```

Falha de rede preserva a previa e a operacao local. O identificador da operacao protege o estado local contra respostas antigas; nao comprova deduplicacao do upload no servidor.

## Implantacao para demonstracao

```mermaid
flowchart LR
    subgraph Phone["Celular"]
        Expo["Expo Go / app"]
        Local[("SQLite local")]
        Expo --> Local
    end
    subgraph PC["Computador do apresentador"]
        Metro["Metro · bundle JS"]
        API["API Express · REST"]
        DB[("PostgreSQL isolado")]
        API --> DB
    end
    Expo -->|"Bundle pela rede local"| Metro
    Expo -->|"REST e multipart pela rede local"| API
```

Para mostrar Redis, Nginx, Prometheus e o microsservico de eventos, use o [perfil Compose de validacao](../VALIDACAO_OPERACIONAL.md). A demonstracao de celular pode usar API + PostgreSQL local sem Redis. O banco nao precisa aceitar conexoes da LAN.
