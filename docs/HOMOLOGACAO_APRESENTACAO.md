# Homologacao para apresentacao

**Versao de referencia da API:** [PR #47](https://github.com/Luizbc2/Schedra/pull/47), commit `fd8a836`, com hotfix de troca de senha em [PR #48](https://github.com/Luizbc2/Schedra/pull/48), commit `ab6f336` em producao. O [registro da versao](VERSAO_APRESENTACAO.md) separa a candidata de apresentacao desse deploy. Este registro nao substitui aceite do professor.

## O que foi verificado em 12/11/2026

| Verificacao | Resultado | Ambiente |
| --- | --- | --- |
| Suite mobile e TypeScript | 55 testes passaram apos a atualizacao do Expo e dos seletores: 18 de regras, 21 de interface e 16 de dados; typecheck passou | Node 24, SQLite de teste e simulacao de UI |
| Expo Go | SDK 57 recusado pelo iPhone com Expo Go SDK 58; manifesto e bundle SDK 58 verificados; responsavel confirmou login e abertura da agenda | Metro pela LAN, API na Vercel |
| Login e autorizacao | Login da conta sintetica aceito; rota administrativa respondeu 403 para usuario comum | API local e PostgreSQL isolado |
| Clientes | Criar, consultar, editar e excluir pelo HTTP | API local e PostgreSQL isolado |
| Agenda pessoal | Criar, editar, listar e excluir; termino igual ao inicio rejeitado | API local e PostgreSQL isolado |
| Agenda empresarial | Criar e listar atendimento de 45 min; segundo atendimento no mesmo horario rejeitado com 409; data invalida rejeitada | API local e PostgreSQL isolado |
| Avatar | Multipart PNG aceito, convertido para WebP e recuperado pela URL; conteudo invalido rejeitado com 415 | API local e PostgreSQL isolado |
| Avatar no iPhone | Foto trocada e ainda visivel apos fechar e reabrir o app; leitura do avatar vinculado a conta de teste retornou 200 com WebP valido | Confirmacao do responsavel e consulta a API publicada. Formato original e modo aviao nao confirmados nesse teste |
| Avatar no Android | JPEG selecionado e recortado pela galeria, com PATCH 200. HEIC original selecionado e recortado em modo aviao, previa e pendencia preservadas apos fechar o processo; envio automatico apos reconexao, com PATCH 200 | Pixel 6 virtual, Expo Go 58.0.5, API e PostgreSQL locais; ambas as respostas WebP foram conferidas com as cores das imagens sinteticas |
| DER central | 35 tabelas, 299 colunas e 56 pares de origem/destino de FK. Tipos e nulabilidade comparados; corrigido `clients.cpf` opcional no DBML | Models e migrations da versao integrada; nao foi feita auditoria de defaults, indices ou regras de exclusao |
| DER do aplicativo | Exportado do SQL implementado, sem diferenca no DBML: 11 tabelas e 10 relacionamentos | SQLite de teste |
| Fluxos atuais | Sete diagramas Mermaid renderizados: dois casos de uso, duas atividades, duas sequencias e implantacao | Chrome, sem depender de rede durante a renderizacao |

Os testes do app verificam a reabertura do SQLite, a fila e os bytes da foto, alem do bloqueio de data passada no editor. Isso nao substitui o fluxo nativo completo no aparelho. O [CI em main](https://github.com/Luizbc2/Schedra/actions/runs/43216448465) cobre o ensaio integrado com Compose, Nginx, Redis e microsservico; a sessao local acima usou a API sem Redis.

## Roteiro no aparelho

1. Conectar o aparelho e o computador a uma rede em que eles possam se comunicar. Abrir a URL de prontidao da API no aparelho e confirmar HTTP 200 antes de abrir o Expo.
2. Com a API local ativa e `EXPO_PUBLIC_API_URL` apontando para o IP do computador, iniciar o Expo Go pela LAN. Nao usar `localhost` no celular. O [README](../README.md) mostra a configuracao. No iPhone fisico, usar a [mesma conta no Expo Go e no CLI](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/) e nao iniciar o CLI em modo offline.
3. Entrar com uma conta de teste, fazer CRUD de cliente, cadastrar um compromisso pessoal futuro e reservar um horario empresarial. Conferir o conflito de horario e a recusa de uma data passada no editor.
4. Selecionar fotos JPEG e HEIC quando disponiveis. Confirmar previa e envio. Testar nova selecao em modo aviao, reabrir o app e conferir a previa; religar a rede e verificar a confirmacao da API.
5. Registrar aparelho, sistema, formato da foto e resultado em [SCHED-43](https://schedra-luiz.atlassian.net/browse/SCHED-43) e [SCHED-56](https://schedra-luiz.atlassian.net/browse/SCHED-56). Nao anexar foto pessoal, senha ou CPF.

Para demonstrar os modelos, abrir [fluxos atuais](architecture/FLOWS.md), [DER central](diagrams/schedra-database.dbml) e [DER local](diagrams/schedra-local.dbml). As [propostas de evolucao](DIAGRAMS.md) ficam separadas.

## Producao para apresentacao

Em 12/11/2026, o projeto Supabase da API foi retomado no plano Free, apos autorizacao. A API voltou a responder `200` em `/ready`. Login no site publicado e redirecionamento para a agenda foram verificados. A conta de apresentacao foi criada em uma organizacao separada e recebeu o papel global de administrador com autorizacao; a rota do painel respondeu `200`.

A organizacao de apresentacao tem 36 clientes, 7 profissionais, 10 servicos, 76 agendamentos com status variados e 5 compromissos pessoais sinteticos. A carga foi aplicada pelas rotas da API e conferida por leitura; nao substituiu registros de outras organizacoes. O QR Expo de apresentacao usa a API publicada. As credenciais nao pertencem a este documento nem ao repositorio.

**Limites:** o iPhone confirmou troca de foto e reabertura no fluxo online. JPEG, HEIC e retomada sem rede foram validados no Android virtual, nao no iPhone. Durante o modo aviao o Metro ficou disponivel apenas via ADB para reabrir o bundle de desenvolvimento; o acesso do aparelho a API foi bloqueado separadamente e o servidor ainda servia a imagem anterior. CRUD de negocio offline e conflito entre dispositivos nao fazem parte desta demonstracao. O [SCHED-59](https://schedra-luiz.atlassian.net/browse/SCHED-59) acompanha a recuperacao da API.
