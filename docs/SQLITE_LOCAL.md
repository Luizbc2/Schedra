# Persistencia local do aplicativo

Implementacao em 26/10/2026, incremento R03, na branch `feature/SCHED-20-local-sqlite`. [PR #42 em rascunho](https://github.com/Luizbc2/Schedra/pull/42), destinado a dev. O [PR #41](https://github.com/Luizbc2/Schedra/pull/41) alinha dev com a base atual de main antes da revisao. O banco central da API permanece responsavel pelos dados compartilhados e pelas permissoes.

## O que esta funcionando

- SQLite no iOS/Android, com conexao privada reutilizada, WAL, chaves estrangeiras, versao do schema e transacoes serializadas.
- Perfil, organizacao selecionada, modo de uso e tema persistidos. A sessao antiga migra sem remover a credencial original antes de concluir a gravacao.
- SecureStore nativo contem somente credenciais e identificadores da sessao. Senha e tokens nao entram nas tabelas SQLite. No Expo Web, a sessao continua no armazenamento do navegador e os dados usam IndexedDB.
- Clientes, profissionais, servicos, agendamentos e compromissos consultados sao salvos. Sem conexao, as consultas leem os dados locais e mostram a data da atualizacao. Respostas 401/403 nao sao substituidas por cache.
- As consultas paginadas da API sao percorridas antes de publicar um snapshot local completo, com limite de 100 paginas por consulta.
- Fotos novas sao recortadas, convertidas para JPEG e reduzidas a ate 512 x 512. Bytes BLOB, dimensoes, MIME, tamanho e SHA-256 sao gravados junto da entrada da fila em uma transacao. Limite final: 5 MB.
- A foto e recuperada apos reiniciar. O envio retoma com reconexao, retorno ao aplicativo ou timer em primeiro plano. Arquivos temporarios multipart sao recriados a partir do BLOB e removidos depois do envio.
- Uma foto nova substitui a pendente anterior; resposta antiga nao restaura a selecao anterior. Erros temporarios usam espera progressiva; rejeicoes permanentes bloqueiam repeticao automatica e permitem tentar novamente pelo perfil.
- Logout avisa antes de descartar pendencias e limpa os dados da conta. Expiracao de sessao remove credenciais e preserva pendencias para o proximo login da mesma conta.

## Estrutura e limites

| Caminho no aplicativo | Responsabilidade |
| --- | --- |
| `src/shared/database/schema.ts` | Onze tabelas, indices e schema inicial |
| `src/shared/database/database.ts` | Adaptador nativo Expo SQLite |
| `src/shared/database/database.web.ts` | Adaptador IndexedDB do Expo Web |
| `src/shared/database/sql-store.ts` | SQL parametrizado, migracao e transacoes |
| `src/shared/database/scope.ts` | Conta, empresa, modo pessoal e invalidacao de operacoes antigas |
| `src/shared/database/session-store.ts` | Separacao entre perfil local e credenciais |
| `src/shared/database/collection-repository.ts` | Repositorios tipados, atualizacao e consulta dos registros locais |
| `src/shared/database/cached-query.ts` | Consulta remota com recuperacao local identificada |
| `src/shared/media/` | Conversao, BLOB, fila, transporte e apresentacao de fotos |
| `src/features/catalog/repositories/catalog-data.ts` | Integracao do catalogo com API e persistencia |

Escopos pessoais pertencem ao usuario; escopos empresariais incluem usuario e organizacao. O avatar pertence a conta, independentemente do modo selecionado. A interface nao recebe resultados de uma requisicao iniciada em outra sessao.

O arquivo nativo se chama `schedra.db`, no diretorio padrao do Expo SQLite dentro do aplicativo. O inspetor SQLite do Expo pode ser aberto pelo menu de ferramentas do terminal (`Shift + M`).

O [DER local completo](diagrams/schedra-local.dbml) e gerado do SQL real: `npm run docs:local-db`, dentro de `Aplicativo-Schedra`, com Node 24. O [DER central](diagrams/schedra-database.dbml) permanece separado. IDs remotos nao representam FKs entre bancos.

## Validacao realizada

- 16 testes de regras, 19 testes de interface/autenticacao e 16 testes de dados.
- SQLite real nos testes de reabertura, SQL parametrizado, rollback, escopos, sessao e BLOB; IndexedDB nos testes do adaptador web.
- As tres listagens do catalogo compartilham `useCatalogList`, incluindo protecao contra resultados de buscas antigas que chegam depois da busca atual.
- Chrome isolado com API simulada: login, consulta, escolha de foto offline, reinicio, leitura local, reconexao com um envio, logout e entrada em outra conta. Capturas locais em `tmp/offline-qa`.
- Typecheck e exportacao Expo para iOS/Android/web. A compilacao nao substitui o teste em aparelho fisico.

## Ainda pendente

- Criar, editar e excluir clientes/compromissos/agendamentos sem conexao. Os comandos de negocio ainda passam pela API; a fila ativa neste incremento e a de fotos.
- Idempotencia e controle de versao dos comandos de negocio, dependencias e interface de conflitos, previstos em R04. O header do avatar nao implica suporte geral de idempotencia na API.
- Validar iPhone/Android reais, revisar o PR em rascunho e homologar. Nao houve deploy deste incremento.
- Redis, infraestrutura, C4/DDD e revisao visual completa dos diagramas seguem nas entregas seguintes.
