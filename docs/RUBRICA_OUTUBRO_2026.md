# Rubrica de outubro de 2026: avaliação e plano de evidências

Revisão: 22/10/2026. Fonte: `C:\Users\lmcampos\Downloads\Rubrica 7º periodo.pdf`, página 1, conferida visualmente. O arquivo não contém texto extraível. Esta matriz substitui a matriz anterior como referência de planejamento da próxima entrega.

O status abaixo resulta de inspeção do código e da documentação. Não houve uma nova execução dos fluxos em aparelhos nesta revisão. Nenhum percentual de aprovação é atribuído: implementação, testes e avaliação docente são evidências diferentes.

## Desenvolvimento para Dispositivos Móveis

| ID | Critério da rubrica | Valor | Situação observada | Evidência necessária | Entrega |
| --- | --- | ---: | --- | --- | --- |
| MOB-01 | Arquitetura e padronização | 0,5 | Parcial: divisão por features existe; persistência local e responsabilidades das telas precisam de revisão | Fluxo tela → hook/serviço → repositório → SQLite/API; migrações; arquitetura correspondente ao código | PR02–PR05 |
| MOB-02 | Componentização e clean code | 1,0 | Parcial: botões e campos repetidos em várias telas; ausência de botão base compartilhado no mobile | Componentes de ação e formulário reutilizados de fato nas telas; estados e acessibilidade consistentes | PR02 |
| MOB-03 | Pelo menos um CRUD completo aplicativo × API × banco | 1,0 | CRUD de clientes existe; revalidar integração após a mudança local | Criar, ler, editar e excluir no celular, verificar SQLite e API/banco remoto, inclusive após reinício e reconexão | PR04, PR05, PR07 |
| MOB-04 | Regras de negócio entre funcionalidades | 0,5 | Validações existem; operação offline requer reconciliação com o servidor | Data passada, duração, conflitos, referência a cliente/serviço/profissional e autorização; rejeição remota deve aparecer como conflito | PR04, PR05, PR07 |
| MOB-05 | Usabilidade, funcionalidade, compatibilidade e segurança | 1,0 | Evidência em aparelhos ainda pendente nesta revisão | Roteiro executado em iOS e Android; teclado, tema, rede, foto, sessão e isolamento entre contas/organizações | PR02–PR05, PR07 |

SQLite e persistência das fotos são requisitos adicionais definidos pelo usuário. O PDF não exige nominalmente SQLite. Eles integram a solução escolhida para continuidade offline e qualidade arquitetural.

## Engenharia e Análise de Projeto de Software

| ID | Critério da rubrica | Valor | Situação observada | Evidência necessária | Entrega |
| --- | --- | ---: | --- | --- | --- |
| ENG-01 | Contextualização do problema, ideia e etapas | 0,50 | Proposta existe, mas deve incorporar persistência mobile e a nova ordem de entregas | Problema → persona → necessidade → solução → etapas, com limites e dependências | PR01, PR06 |
| ENG-02 | Requisitos funcionais e não funcionais | 1,00 | Base existente; faltam contratos e critérios para dados/fotos locais | RF/RNF identificados, mensuráveis e ligados a histórias, diagramas e evidências | PR01, PR06 |
| ENG-03 | Pelo menos dois diagramas de casos de uso | 0,50 | Há dois desenhos; revisão semântica e detalhamento pendentes | Atores, fronteira, objetivos, associações corretas e descrição textual de fluxos principal/alternativos | PR06 |
| ENG-04 | Pelo menos dois diagramas de atividades | 1,00 | Existentes, mas simplificados | Raias, início/fim, decisões com condições, validação, persistência e recuperação de falhas | PR06 |
| ENG-05 | Pelo menos dois diagramas de sequência | 1,00 | Existentes, mas sem detalhar corretamente alternativas e responsabilidades | Participantes separados, chamadas/retornos, transações e fragmentos `alt`, `opt` ou `loop` quando aplicáveis | PR06 |

O DER não aparece como critério separado nesta nova página. Continua no escopo solicitado: revisar o DER remoto completo e acrescentar o DER SQLite, vinculados às regras e aos diagramas.

A orientação docente anterior era documentar implementações futuras. Mantê-la enquanto não houver orientação substituta: identificar claramente o que existe, o que está proposto e o que foi efetivamente implementado. A nova página, sozinha, não esclarece uma mudança dessa orientação.

## Tech Forge

| ID | Critério da rubrica | Valor | Situação observada | Evidência necessária | Entrega |
| --- | --- | ---: | --- | --- | --- |
| TF-01 | Gestão do trabalho e progresso via Jira | 1 | Não verificado: não foi consultado um projeto Jira nesta revisão | Issues de tipos adequados, responsáveis reais, prioridades, vínculos e histórico real de atualização de status | PR01 e todas as entregas |
| TF-02 | Análise com Cynefin e escolha da abordagem | 1 | Falta consolidar análise aplicada ao Schedra | Classificação justificada, exemplos do projeto e relação com gestão preditiva, ágil ou híbrida | PR01 |
| TF-03 | Planejamento e condução do ciclo de vida | 2 | Backlog anterior não basta para a nova exigência | Para a abordagem ágil proposta: Product Backlog priorizado, User Stories, aceite, execução acompanhada e versões parciais. Se fosse preditiva, o PDF exigiria fases e PM Canvas | PR01–PR07 |

Upload com Multer e painel admin eram critérios específicos da rubrica anterior. Continuam funcionalidades a preservar e validar, mas não substituem Jira, Cynefin e gestão de entregas na nova avaliação.

## Evolução do projeto

| ID | Critério | Valor | Situação | Evidência necessária |
| --- | --- | ---: | --- | --- |
| EVO-01 | Conexão da proposta com persona/cliente | 0,20 | Personas documentadas; aceite ainda não registrado | Relacionar consulta offline, foto persistente e agenda a necessidades concretas; registrar validação real do usuário |
| EVO-02–04 | Três linhas NSA sem descrição | 0,20 cada | Indefinido na fonte | Obter o enunciado docente; não inventar tarefas ou atribuir atendimento |

Há outras linhas sem enunciado/valor em Engenharia e Tech Forge. Não foram tratadas como critérios novos. Os valores por item foram transcritos da página; não foi inferida uma fórmula para converter os subtotais em nota final.

## Evidências de aceite

Cada história deve vincular: requisito → desenho → PR → teste ou demonstração → versão. Os IDs `SC-xx` do [plano de reestruturação](PLANO_REESTRUTURACAO.md) são identificadores locais, não chaves de issues já criadas no Jira.

Estado recomendado: `Backlog → Pronto → Em andamento → Em revisão → Em validação → Concluído`. Bloqueios devem estar explícitos, com motivo. Uma tarefa só chega a Concluído quando o aceite tem evidência; uma branch ou um diagrama exportado não bastam.

Pendências para fechar a gestão: projeto Jira e participantes reais, prazo da banca e enunciados das linhas NSA. Elas não impedem iniciar componentização e fundação SQLite.
