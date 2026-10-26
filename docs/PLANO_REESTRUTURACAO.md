# Schedra: reestruturação e próxima entrega

Data: 22/10/2026. Estado: planejamento registrado; implementação das entregas abaixo pendente. Referência de avaliação: [rubrica de outubro](RUBRICA_OUTUBRO_2026.md).

## 1. Diagnóstico verificado

| Área | Evidência atual | Correção necessária |
| --- | --- | --- |
| Mobile: componentes | `src/shared/components` possui Screen, AppHeader e switches, mas não botão base. CatalogScreen, ServicesScreen, ProfessionalsScreen, ProfileModals e AgendaScreen repetem ações e estilos | Criar e adotar componentes comuns em todas as telas relevantes; extrair campos, estados e lógica repetida |
| Web: componentes | `Frontend-Schedra/src/app/components/ui/button.tsx` já é reutilizado, por exemplo em Login e Clientes | Auditar e completar adoção da base existente; manter implementações visuais adequadas a web/mobile |
| Persistência mobile | Sem dependência SQLite. APIs das features chamam o servidor diretamente. Tema usa AsyncStorage; sessão nativa usa SecureStore | Banco local versionado, repositórios, consultas locais e sincronização explícita |
| Fotos | Seleção/conversão no dispositivo e envio imediato. No backend, Multer usa memoryStorage e avatar_assets guarda bytes | Persistir a foto no SQLite antes do envio; fila e retomada; revisar armazenamento do backend conforme pedido anterior |
| Diagramas | Nove pranchas de evolução e DBML remoto. A sequência offline agrupa API/banco e desenha sucesso/conflito no mesmo caminho | Revisar todas as pranchas, aprofundando semântica, participantes, regras e exceções; acrescentar DER local |
| Rastreabilidade | Matriz anterior marcou componentização como atendida e usa critérios antigos de Tech Forge | Corrigir status e produzir evidências para a nova rubrica, sem declarar 100% antecipadamente |

Organização por pastas e versões recentes das dependências não demonstram, por si, uma arquitetura melhor. A comparação anterior com os projetos da empresa não sustentava essa conclusão.

### Referências da empresa efetivamente consultadas

- `C:\projetos\aplicativos\app-ipe\src\components\generics\buttons\CustomButton.tsx`: variantes, loading, disabled e ícone em um componente compartilhado.
- `C:\projetos\aplicativos\app-ipe\src\database\dbService.ts`: conexão e acesso centralizado ao SQLite.
- `C:\projetos\aplicativos\app-ipe\src\database\tables\global\file.ts` e `src\database\global\file.ts`: tabela local de arquivos e operações de leitura/escrita; conteúdo atual em base64.
- `C:\projetos\aplicativos\vipbov-app\src\database\dbService.ts`: conexão reutilizada e operações parametrizadas.

Aplicar os padrões úteis de reuso e persistência. No Schedra, usar parâmetros nas consultas, migrações e contratos tipados; arquivos binários pequenos podem ser armazenados como BLOB, evitando a expansão de base64. Não copiar credenciais nem dados de negócio da empresa.

## 2. Arquitetura alvo

```text
Tela + componentes compartilhados
  → Hook / serviço da funcionalidade
    → Repositório local
      → SQLite: dados, fotos, preferências e operações pendentes
    → Coordenador de sincronização
      → Cliente HTTP / API da feature
        → Backend: autenticação, RBAC, regras e persistência central

SecureStore: access token e refresh token
```

Decisões propostas:

1. SQLite será a persistência dos dados locais de negócio e das fotos do aplicativo. Fechar o processo ou perder a rede não pode eliminar uma alteração salva localmente.
2. Usar `expo-sqlite` compatível com o SDK instalado. A instalação local do Expo 57 lista `~57.0.2` em bundledNativeModules; confirmar no momento da implementação. Não acoplar esta entrega a uma atualização de SDK.
3. Tokens permanecem no SecureStore. Separar credenciais do perfil/cache hoje serializados juntos. Perfil, preferências e modo de uso migram para SQLite; senhas não são persistidas no cliente.
4. O banco central da API continua responsável por autorização e consistência entre dispositivos. SQLite mobile não substitui o banco compartilhado do servidor.
5. Criar consultas e escritas locais isoladas por conta e organização, com IDs locais estáveis e mapeamento para IDs remotos. Telas não executam SQL nem fazem sincronização por conta própria.
6. Uma gravação de negócio e sua entrada na fila devem compartilhar uma transação. Alteração offline fica identificada como pendente; agendamento empresarial só é confirmado após a validação de disponibilidade no servidor.
7. Login inicial, mudanças de senha, papéis e ações administrativas exigem rede. Permissões locais só orientam a interface; a API revalida cada operação sincronizada.
8. No logout ou troca de conta, cancelar sincronização em andamento e aplicar política explícita de limpeza. Avisar antes de descartar pendências; nunca permitir que a conta seguinte leia ou envie dados da anterior.
9. A PWA tem armazenamento e ciclo próprios. Definir adaptador de persistência web e testar a compatibilidade do Expo Web; não confundir Service Worker com SQLite nativo.

Destino proposto no mobile:

```text
Aplicativo-Schedra/src/
  shared/components/ui/        Button, IconButton, FormField, FeedbackState
  shared/database/             conexão, migrations, transactions, escopo
  shared/sync/                 fila, retry, conflitos, coordenação
  shared/media/                conversão, leitura de BLOB, transporte
  shared/api/                 cliente HTTP atual
  features/<feature>/
    screens/                  composição e navegação
    components/               componentes específicos
    hooks/                    estado e orquestração da tela
    repositories/             contratos e implementação local
    api/                      transporte remoto
    domain/                   tipos e validações
```

Criar diretórios apenas quando houver responsabilidade concreta. Não construir um repositório genérico que esconda regras particulares de agenda, cliente ou foto.

### Contrato mínimo de componentes

- `Button`: variantes primary, secondary, ghost e destructive; tamanhos consistentes; loading, disabled, ícones e proteção contra reenvio enquanto ocupado.
- `IconButton`: área de toque estável, rótulo acessível obrigatório, loading/disabled e feedback de interação.
- `FormField`: label, erro, helper, required, readOnly, multiline, máscara e integração com TextInput; manter montagem estável para não fechar o teclado a cada tecla.
- `FeedbackState`: carregando, vazio, falha e tentar novamente; ações via Button.
- Usar tema e tokens já existentes. Cards, abas, switches e células de calendário mantêm sua semântica; não transformar todo Pressable em botão de formulário.

### Dados e fotos locais

Modelo lógico inicial, a detalhar e versionar no PR03:

| Estrutura | Conteúdo e regras |
| --- | --- |
| `local_scopes` | Conta remota e contexto pessoal/organização; controla o acesso ao conjunto local |
| Tabelas de clientes, serviços e profissionais | Campos do domínio, localId, remoteId, scopeId, remoteVersion, updatedAt, deletedAt e estado local; relações não podem atravessar escopos |
| Tabelas de eventos pessoais e agendamentos | Datas, fuso, referências, versão conhecida e indicação de confirmação remota; índices por escopo/data |
| `media_assets` | id, scopeId, ownerLocalId, content BLOB, mimeType, byteSize, checksum, width, height, remoteUrl, syncStatus, createdAt, updatedAt |
| `outbox` | operationId/idempotencyKey, scopeId, entityType, entityLocalId, action, baseVersion, payload, mediaAssetId, dependencyId, attempts, nextAttemptAt, status e lastErrorCode |
| `sync_state` | Marcadores por escopo/recurso e data da última sincronização; persistir depois de aplicar a página recebida |
| `preferences` | Tema, modo de uso e preferências locais; migração idempotente do armazenamento anterior |
| Migrações | Histórico/versão do schema, ordem determinística e execução transacional quando suportada |

Fotos devem ser convertidas e reduzidas antes de persistir. Para avatar, a proposta é até 512 × 512 e limite de bytes explícito. A galeria original não é o armazenamento do app: o SQLite recebe os bytes e os metadados. Uma URI temporária pode ser recriada a partir do BLOB para exibição/transporte, mas a persistência não depende dela. Listagens consultam metadados sem carregar todos os BLOBs.

O registro do avatar local e a operação de envio entram na mesma transação. O envio recupera o BLOB, monta arquivo multipart compatível com Expo e só marca sincronizado após confirmação do servidor. Reenvio deve ser idempotente; falha mantém a foto disponível localmente. Trocar a foto remove mídia antiga somente quando não houver referência ou envio pendente.

### Pedido anterior sobre Multer

A mudança para disco ainda não foi implementada. Incorporar no PR05: diskStorage para entrada temporária limitada, validação real, conversão e limpeza tanto em sucesso quanto em falha. No Docker local, publicar o resultado processado em volume persistente. Migrar imagens existentes de avatar_assets de forma verificável antes de desativar a leitura antiga.

Antes de publicar em produção, conferir o ambiente efetivo: uma função Vercel não oferece disco local durável como o volume Docker. A publicação deve usar armazenamento remoto persistente ou um serviço com volume. Não lançar uma versão que dependa de arquivos temporários para servir avatares. Esta decisão de backend é independente dos BLOBs locais no SQLite do celular.

## 3. Nova rubrica e gestão

A [matriz de outubro](RUBRICA_OUTUBRO_2026.md) cobre todos os enunciados preenchidos. Tech Forge agora cobra Jira, Cynefin e condução do projeto. As três linhas NSA sem descrição permanecem pendentes de esclarecimento docente.

### Cynefin e abordagem proposta

Classificação de trabalho: domínio predominante complexo nesta evolução, pela necessidade de experimentar e validar comportamento offline, reconciliação e experiência em aparelhos reais. Componentização e CRUD têm partes claras/complicadas com soluções conhecidas. Esta é uma análise do Schedra, não uma classificação universal de aplicativos.

Escolha: abordagem ágil com backlog priorizado, ciclos curtos, revisão de incrementos e retrospectiva dos problemas encontrados. Registrar objetivo de cada ciclo, quem executa e quem valida. Não afirmar que houve cerimônias, sprints ou participação de uma equipe quando não ocorreram. Caso a composição real não sustente Scrum completo, descrever precisamente a adaptação ágil utilizada.

O Jira deve acompanhar execução real desde o primeiro ciclo. Markdown/CSV de preparação não comprova o uso da ferramenta. Para cada issue: história, aceite, prioridade, responsável real, dependências, PR, evidência de teste e versão. Bugs como falha no upload ou teclado fechando ficam vinculados à história afetada.

### Personas e valor

- Carlos, profissional com conexão instável: consultar agenda e registrar alterações sem perder trabalho; valida PR03–PR05.
- Ana, usuária pessoal: organizar próximos horários e manter foto/preferências ao reabrir o app; valida PR02–PR05.
- Marina, gestora: preservar separação de empresas e evitar confirmação de horários conflitantes; valida PR05 e PR07.

As personas são hipóteses de projeto documentadas. Registrar feedback real separadamente; não apresentar personas como entrevistas já realizadas.

## 4. Bateladas de PR

IDs SC abaixo são locais. Todas as histórias de implementação estão em Backlog. Cada linha tem um resultado verificável; a aceitação exige a demonstração descrita.

### PR01 — Plano, rubrica e gestão

| ID | História | Aceite |
| --- | --- | --- |
| SC-01 | Como responsável pelo projeto, quero relacionar cada critério à entrega e à evidência | Todos os enunciados da página 1 mapeados, lacunas explícitas e critérios antigos identificados |
| SC-02 | Como responsável, quero acompanhar trabalho no Jira | Projeto/board real com stories, tasks e bugs; responsáveis e vínculos; histórico sem atualizações retroativas inventadas |
| SC-03 | Como responsável, quero justificar a abordagem de gestão | Análise Cynefin aplicada, abordagem escolhida e execução descrita de acordo com os participantes reais |
| SC-04 | Como mantenedor, quero contratos claros de arquitetura e persistência | Decisões de SQLite, fotos, sessão, escopo e backend registradas; dependências e alternativa web explícitas |
| SC-05 | Como usuário, quero evoluções ligadas às minhas necessidades | Personas ligadas a histórias e critérios; versões parciais e objetivos definidos |

Este documento e a matriz são a preparação de SC-01, SC-04 e SC-05. Atualização: o Jira foi configurado em 22/10/2026; consultar [tickets e ordem vigente de oito incrementos](GESTAO_JIRA.md). Os IDs SC foram preservados.

### PR02 — Componentes comuns e adoção nas telas

| ID | História | Aceite |
| --- | --- | --- |
| SC-06 | Como usuário, quero ações consistentes em todas as telas | Button e IconButton usados em autenticação, agenda, catálogo, perfil e admin; variantes, tema e rótulos consistentes |
| SC-07 | Como usuário, quero preencher formulários com feedback previsível | FormField compartilhado; máscara, erro, leitura e senha funcionam sem perda de foco |
| SC-08 | Como usuário, quero entender carregamento, vazio e falha | Estados compartilhados com ação de repetição e bloqueio de duplo envio |
| SC-09 | Como mantenedor, quero telas legíveis e responsabilidades separadas | Remover estilos e componentes duplicados substituídos; extrair hooks/editores sem alterar contratos de negócio |
| SC-10 | Como usuário web, quero consistência com a base existente | Auditar adoção de Button/Input web; verificar layouts e teclado em telas pequenas e grandes |

### PR03 — Fundação SQLite

| ID | História | Aceite |
| --- | --- | --- |
| SC-11 | Como usuário, quero dados persistentes após reiniciar o aplicativo | SQLite inicializa uma única vez, migra versão anterior e preserva dados; consultas parametrizadas |
| SC-12 | Como usuário, quero meus dados separados dos de outras contas | Consultas e relações respeitam scopeId; troca de conta/organização não revela dados nem envia fila alheia |
| SC-13 | Como usuário, quero manter perfil, tema e modo localmente | Migração de preferências executa uma vez; tokens permanecem no SecureStore; logout cobre estado local e sessão |
| SC-14 | Como usuário, quero consultar cadastros e agenda salvos | Repositórios tipados, índices e paginação; leituras do SQLite sem HTTP quando offline |
| SC-15 | Como usuário, quero minhas fotos armazenadas no aparelho | BLOB e metadados persistidos; leitura após reinício; limite de tamanho; ausência de BLOB em listagens gerais |

### PR04 — CRUD offline e fotos persistentes

| ID | História | Aceite |
| --- | --- | --- |
| SC-16 | Como usuário, quero criar, editar e excluir clientes sem conexão | Escrita local e outbox atômicas; IDs locais estáveis; exclusão não reaparece após reinício |
| SC-17 | Como usuário, quero registrar compromissos pessoais offline | Consultar/criar/editar/concluir/excluir; validação de datas; próximos e histórico baseados no relógio |
| SC-18 | Como gestor, quero preparar alterações da agenda empresarial offline | Catálogo disponível localmente; dependências de IDs preservadas; indicação de pendência até validação remota |
| SC-19 | Como usuário, quero trocar a foto offline | Converter, persistir BLOB e exibir prévia; fechar/reabrir em modo avião mantém a imagem |
| SC-20 | Como usuário, quero ver o que ainda não foi enviado | Fila persistente com pendência/erro/conflito; retentativa e limpeza sem perder alterações ou mídia referenciada |

### PR05 — Sincronização, API e armazenamento de uploads

| ID | História | Aceite |
| --- | --- | --- |
| SC-21 | Como usuário, quero que uma alteração seja aplicada uma única vez | Backend aceita operationId por escopo, mantém resultado e usa transação; repetir envio após timeout não duplica |
| SC-22 | Como usuário, quero resolver divergências entre dispositivos | Controle de versão nos recursos editáveis, tombstones e 409 explícito; preservar cópia local até decisão |
| SC-23 | Como usuário, quero retomar sincronização após falhas | Ordem por dependência, retries limitados, sessão renovada, exclusão mútua do worker; pausa em 401/403 sem apagar fila |
| SC-24 | Como usuário, quero minha foto confirmada no servidor | BLOB → multipart compatível → API; reenvio idempotente; URL final só substitui estado pendente após sucesso |
| SC-25 | Como mantenedor, quero uploads em disco com persistência e validação | Multer diskStorage temporário, limites, Sharp, limpeza, volume local e migração verificável das imagens; destino durável validado antes de produção |

### PR06 — Revisão completa dos diagramas e documentação

| ID | História | Aceite |
| --- | --- | --- |
| SC-26 | Como avaliador, quero entender arquitetura e execução | Vistas de contexto, componentes e implantação mostrando SQLite, API, banco, sessão e sincronização |
| SC-27 | Como mantenedor, quero modelos de dados completos e coerentes | DER remoto conferido com models/migrations e banco de teste; DER SQLite com atributos, tipos, PK/FK, índices, cardinalidade e restrições |
| SC-28 | Como avaliador, quero entender objetivos e regras | Pelo menos 2 casos de uso com especificação e 2 atividades com decisões/erros, conforme catálogo abaixo |
| SC-29 | Como mantenedor, quero entender as mensagens e falhas | Pelo menos 2 sequências completas; participantes separados, fragmentos alternativos e transações corretas |
| SC-30 | Como leitor, quero diagramas legíveis e rastreáveis | Todos os desenhos existentes revisados; alinhamento, tipografia e legendas consistentes; PDF/PNG e editáveis conferidos no renderizador real |

Começar rascunhos junto a PR01 e atualizar durante PR03–PR05. PR06 consolida conteúdo e acabamento; não descobrir o modelo somente no fim.

### PR07 — Validação, evidências e release

| ID | História | Aceite |
| --- | --- | --- |
| SC-31 | Como usuário, quero que as regras sobrevivam à migração | CRUD integrado e agenda: datas, conflitos, duração, cliente/profissional/serviço inválido e exclusões |
| SC-32 | Como usuário, quero proteção de conta e organização | Testes de RBAC, isolamento local/remoto, logout, sessão expirada, conta bloqueada e acesso negado |
| SC-33 | Como usuário, quero continuidade após interrupções | Modo avião, morte do processo entre etapas, falha de upload, resposta perdida e edição concorrente sem perda silenciosa |
| SC-34 | Como usuário, quero compatibilidade e usabilidade | Roteiro real iOS/Android e regressão web; foto HEIC/JPEG, teclado, área segura, tema e foco acessível |
| SC-35 | Como avaliador, quero rastrear o que foi entregue | Jira, PRs, critérios e evidências ligados a uma versão; changelog e homologação; nenhum item pendente marcado como concluído |

### Entregas adicionais preservadas no backlog

Depois da fundação, manter as propostas já discutidas em PRs próprios: calendário contextual, notificações/lembretes, painel administrativo web e PWA com Service Worker. Detalhar histórias e aceite antes de iniciar cada uma. Push remoto exige validação do ambiente/build; não presumir comportamento de background ou entrega garantida. Essas funcionalidades não são exigidas nominalmente pela nova página da rubrica e não substituem as correções prioritárias.

## 5. Conteúdo exigido para todos os diagramas

O catálogo substitui a ideia de apenas recolorir nove pranchas. O conjunto pode crescer e ser dividido por assunto para preservar legibilidade.

| Desenho | Conteúdo mínimo para revisão |
| --- | --- |
| Arquitetura de contexto e containers | Atores, mobile, web, API, banco remoto, SQLite, SecureStore, armazenamento de mídia e fronteiras; protocolo e responsabilidade de cada ligação |
| Componentes mobile e backend | Componentes UI, hooks, repositórios, fila, cliente HTTP; middleware, controller, service, repository; dependências reais |
| DER remoto completo | Todas as tabelas reais e todos os atributos; chaves, nulabilidade, índices, cardinalidade, isolamento de organização; identificar reservas sem funcionalidade ativa |
| DER local e mapeamento | Tabelas SQLite, fotos BLOB, fila, referências locais/remotas, versões e escopos; não confundir uma correspondência de sincronização com uma FK entre bancos |
| Casos de uso 1: agenda pessoal/offline | Usuário, consultar, criar, editar, concluir, excluir, consultar pendências e resolver conflito; pré/pós-condições e fluxos alternativos em texto |
| Casos de uso 2: operação empresarial/perfil | Gestor/profissional/usuário conforme permissões, clientes/serviços/profissionais, agendamento, foto e administração; fronteira e generalização correta dos papéis |
| Atividade 1: cadastro/edição e sincronização | Raias usuário/app/SQLite/API; validação, transação local, ausência de rede, retry, sucesso, 401/403 e 409; condições em cada decisão |
| Atividade 2: troca de foto | Galeria, cancelamento, permissão negada, conversão, tamanho, BLOB, fila, multipart, validação backend, armazenamento final e recuperação |
| Sequência 1: CRUD offline | Tela, serviço, repositório, SQLite, worker, API, serviço remoto e banco; commit local, reconnect, idempotência, dependências e respostas alternativas |
| Sequência 2: foto | Picker/conversor, mídia local, outbox, File/multipart, Multer, Sharp, armazenamento e perfil; rejeição de conteúdo, rede interrompida, limpeza e sucesso |
| Sequência complementar: auth/admin | Login, SecureStore, refresh com rotação, sessão, cargo atual, 401/403, auditoria e revogação |
| Matriz final | RF/RNF → caso/atividade/sequência → história → código/PR → teste; estado atual e proposto identificados |

Casos de uso não viram fluxogramas; decisões pertencem às atividades e alternativas temporais às sequências. Usar `include`/`extend` apenas quando a relação for justificável. Sucesso e conflito ficam em ramos alternativos, não como duas respostas consecutivas de uma mesma operação.

Diagrama de sequência extenso pode ocupar mais de uma prancha, com continuação explícita. Usar formatos de página consistentes dentro da família, fonte legível e margens constantes; não encolher todo o conteúdo para caber. Conferir textos, contêineres e setas no Excalidraw real, além dos testes de geometria. Exportação sem overflow não prova correção UML.

## 6. Fluxo de entrega e conclusão

Cada feature sai de `dev` e abre PR para `dev`. Homologar o incremento com sua versão de teste; então abrir PR de release de `dev` para `main`, com tag e changelog. Antes de executar, verificar o estado real das branches e preservar as alterações locais já existentes. Nenhum commit, merge ou deploy foi feito por este planejamento.

Uma entrega só é concluída com: implementação integrada, critérios de aceite demonstrados, testes apropriados ao risco, documentos coerentes e evidência vinculada. PR01 prepara Jira e contrato; PR02→PR03→PR04→PR05 formam o caminho da implementação; PR06 acompanha o desenvolvimento e PR07 fecha a validação.

As sete bateladas originais contêm 35 histórias. Elas foram cadastradas no projeto Jira SCHED e reorganizadas em oito incrementos junto da nova rubrica, conforme [rastreabilidade](GESTAO_JIRA.md). Datas finais e responsáveis adicionais ainda dependem da equipe e do prazo reais.

## Referências técnicas

- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/): API de persistência local e armazenamento binário; consultar a versão compatível com o SDK do projeto na implementação.
- [The Cynefin Company](https://thecynefin.co/about-us/about-cynefin-framework/): classificação do contexto para orientar decisões; a aplicação ao Schedra neste plano é uma análise própria.

As referências locais da empresa e o PDF foram consultados em 22/10/2026. Este plano registra o trabalho a realizar; não substitui a revisão técnica nem o aceite em dispositivos.
