# Proposta de evolução do Schedra

> Resumo temático. O documento acadêmico consolidado está em [PROPOSTA.md](PROPOSTA.md).

## 1. Objetivo deste documento

Este documento descreve implementações futuras do Schedra. Ele parte do sistema existente apenas para identificar lacunas; portanto, os itens apresentados como proposta, requisito futuro ou backlog ainda não devem ser tratados como funcionalidades concluídas.

## 2. Situação atual e lacunas

O Schedra já oferece autenticação, agenda, cadastros operacionais, perfil, modos pessoal e empresarial e integração entre interfaces, API e banco. A análise de uso revelou quatro lacunas prioritárias:

| Lacuna observada | Impacto para o usuário | Evolução proposta |
| --- | --- | --- |
| O calendário não oferece uma interação direta por data | Criar ou consultar um evento exige mais navegação do que o necessário | Pop-up contextual ao selecionar uma data |
| O usuário não recebe lembretes dos compromissos | Eventos importantes podem ser esquecidos | Central de notificações e lembretes configuráveis |
| A aplicação web depende integralmente de conexão | Uma oscilação de rede interrompe até consultas recentes | PWA com Service Worker, cache controlado e fila de sincronização |
| A administração está concentrada no aplicativo móvel | A gestão de muitos usuários é pouco ergonômica | Painel administrativo web responsivo |

## 3. Personas impactadas

### Marina - gestora de negócio

Administra uma equipe e precisa encontrar rapidamente os compromissos de um dia, receber alertas operacionais e gerenciar usuários em uma tela ampla. O painel web e o calendário contextual reduzem tarefas repetitivas.

### Carlos - profissional autônomo

Trabalha principalmente pelo celular e nem sempre possui conexão estável. Precisa consultar a agenda recente, registrar uma ação temporariamente sem rede e ser lembrado antes do próximo atendimento.

### Ana - usuária pessoal

Organiza estudos, consultas e atividades recorrentes. Precisa tocar em uma data, entender o que acontecerá naquele dia e criar um compromisso sem preencher novamente a data selecionada.

## 4. Visão da solução futura

### 4.1 Calendário interativo

Ao selecionar uma data, a interface abrirá um pop-up no desktop e um painel inferior no celular. O componente mostrará um resumo do dia e permitirá criar, editar, concluir ou abrir os detalhes de um compromisso. A data selecionada será preenchida automaticamente no formulário.

### 4.2 Notificações

O usuário poderá definir se deseja lembretes, com qual antecedência e por qual canal disponível. A primeira entrega priorizará notificações locais no aplicativo e uma central interna; notificações push remotas dependerão de development build, registro do dispositivo e consentimento explícito.

### 4.3 PWA e Service Worker

A aplicação web será instalável e manterá em cache apenas o shell da interface e leituras permitidas. Operações de escrita feitas sem conexão entrarão em uma fila local identificada por chave idempotente. A sincronização ocorrerá quando a conexão retornar, com indicação visual de pendência ou conflito.

O Service Worker não substituirá a API nem o banco de dados. Dados sensíveis, credenciais e respostas administrativas não serão armazenados indiscriminadamente no cache.

### 4.4 Administração web

Usuários administradores terão uma rota web protegida para pesquisar contas, consultar estado e papel, promover ou rebaixar usuários e bloquear ou reativar acessos. A API continuará revalidando papel e estado da conta em todas as operações.

## 5. Objetivos mensuráveis

1. Reduzir para no máximo dois toques a criação de compromisso a partir de uma data.
2. Exibir compromissos do dia sem abandonar a visualização do calendário.
3. Entregar lembretes no horário configurado e registrar o resultado da tentativa.
4. Permitir consulta ao shell e aos dados recentes autorizados durante uma interrupção de rede.
5. Sincronizar operações pendentes sem duplicar registros.
6. Disponibilizar no navegador todas as ações administrativas já protegidas pela API.

## 6. Backlog proposto por entregas

| Prioridade | Entrega | Conteúdo | Dependências |
| --- | --- | --- | --- |
| P0 | PR 1 - Calendário contextual | Componente mensal, seleção de data, pop-up/painel inferior e testes de interação | Contratos atuais de eventos |
| P0 | PR 2 - Administração web | Rota protegida, tabela de usuários, filtros, ações e estados de erro | RBAC da API |
| P1 | PR 3 - Preferências de lembrete | Modelo de preferências, endpoints, formulário e central interna | Usuário autenticado |
| P1 | PR 4 - Notificações no dispositivo | Permissão, agendamento local, cancelamento e histórico de entrega | Development build para validação completa |
| P1 | PR 5 - Fundação PWA | Manifesto, instalação, Service Worker e estratégia de cache | HTTPS e versão do frontend |
| P2 | PR 6 - Operação offline | Fila idempotente, reconciliação, conflitos e indicadores de sincronização | Fundação PWA e suporte da API |

## 7. Fora do primeiro ciclo

- envio de SMS ou WhatsApp;
- cobrança por notificações;
- edição colaborativa em tempo real;
- funcionamento administrativo offline;
- sincronização bidirecional com Google Calendar.

Esses itens podem ser reavaliados após métricas de uso das quatro evoluções prioritárias.
