# Rastreabilidade da rubrica e da proposta futura

Esta matriz separa dois tipos de evidência: implementação existente, usada nos critérios técnicos, e documentação das próximas evoluções, usada em Engenharia e Análise de Projeto. Um item futuro documentado não é apresentado como funcionalidade pronta.

## Desenvolvimento para Dispositivos Móveis

| Item | Valor | Status | Evidência |
| --- | ---: | --- | --- |
| Arquitetura e padronização | 0,5 | Atendido | `Aplicativo-Schedra/src` organizado por feature, shared, navigation e theme |
| Componentização e clean code | 1,0 | Atendido | Componentes compartilhados, APIs, tipos e validações isoladas |
| CRUD aplicativo x API x banco | 1,0 | Atendido | CRUD completo de clientes no aplicativo e backend |
| Regras de negócio | 0,5 | Atendido | `REQUIREMENTS.md`, serviços do backend e validações mobile |
| Usabilidade, compatibilidade e segurança | 1,0 | Implementado; aceite em aparelho pendente | `MOBILE_VALIDATION.md`, SecureStore, JWT, RBAC e bundles multiplataforma |

## Engenharia e Análise de Projeto de Software

| Item | Valor | Status | Evidência |
| --- | ---: | --- | --- |
| Contextualização e evolução | 1,0 | Proposta documentada | Resumo, necessidades, objetivos e limites em `PROPOSTA.md` |
| Diagrama entidade-relacionamento | 0,5 | Proposta documentada | Modelo futuro e classificação das tabelas em `PROPOSTA.md`, seção 4 |
| Requisitos funcionais e não funcionais | 1,0 | Proposta documentada | Requisitos, metas e indicadores em `PROPOSTA.md`, seções 2 e 3 |
| Dois diagramas de casos de uso | 0,5 | Proposta documentada | Calendário/offline e notificações/admin web em `DIAGRAMS.md`, seções 3 e 4 |
| Dois diagramas de atividades | 0,5 | Proposta documentada | Pop-up do calendário e entrega de lembrete em `DIAGRAMS.md`, seções 5 e 6 |
| Dois diagramas de sequência | 0,5 | Proposta documentada | Sincronização offline e administração web em `DIAGRAMS.md`, seções 7 e 8 |

## Tech Forge

| Item | Valor | Status | Evidência |
| --- | ---: | --- | --- |
| Receber e salvar imagens com Multer | 1,0 | Atendido | `avatar-upload.ts`, rota de avatar e ProfileScreen |
| Validar extensão, tamanho e colisão | 1,0 | Atendido | MIME + extensão, limite de 5 MB, UUID e testes Jest |
| Controle funcional admin e usuário | 2,0 | Atendido | Middleware authorize, rotas admin, painel mobile e testes |

## Evolução do projeto

| Critério | Status | Evidência |
| --- | --- | --- |
| Conexão com persona/cliente | Proposta documentada | Necessidades e lacunas consolidadas em `PROPOSTA.md`; personas detalhadas em `PRODUCT_EVOLUTION.md` |
| Três linhas NSA sem descrição | Esclarecimento docente pendente | Não atribuir nota nem considerar cumprido um critério ausente do PDF |

## Checklist de entrega

- [x] Aplicativo Expo no repositório.
- [x] API e banco integrados.
- [x] CRUD completo demonstrável.
- [x] Upload de avatar demonstrável.
- [x] Controle admin/usuário demonstrável.
- [x] Requisitos e regras das implementações futuras documentados.
- [x] DER da expansão futura documentado.
- [x] Dois casos de uso futuros documentados.
- [x] Dois diagramas de atividades futuras documentados.
- [x] Dois diagramas de sequência futuras documentados.
- [x] Personas, lacunas e backlog futuro documentados.
- [ ] Implementar calendário contextual.
- [ ] Implementar painel administrativo web.
- [ ] Implementar preferências e central de notificações.
- [ ] Implementar PWA e sincronização offline.
- [x] Roteiro de testes mobile documentado.
- [ ] Reexecutar o roteiro manual no aparelho imediatamente antes da apresentação.
