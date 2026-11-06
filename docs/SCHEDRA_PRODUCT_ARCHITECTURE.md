# Arquitetura de produto do Schedra

## Direção

O Schedra é uma plataforma de operação e agenda para negócios de serviços. O frontend web usa React e o aplicativo usa React Native com Expo, ambos consumindo a mesma API REST e os mesmos contratos de domínio.

## Identidade visual

| Token | Valor | Uso |
| --- | --- | --- |
| Ink | `#181A20` | Texto e hierarquia principal |
| Canvas | `#F3F3F5` | Fundo da aplicação |
| Framboesa | `#A72C53` | Ações, navegação e estados ativos |
| Lime | `#D7F75B` | Disponibilidade, confirmação e assinatura da marca |
| Coral | `#FF7051` | Prioridade e comunicação |
| Amber | `#F2B84B` | Atenção e indicadores |
| Verde mineral | `#2F8F89` | Categorias e visualizações complementares |
| Charcoal | `#202126` | Navegação lateral e superfícies de contraste |

Os valores exportados em `Frontend-Schedra/src/app/config/brand.ts` são a fonte compartilhável para uma futura biblioteca de design usada pelo app Expo.

Oswald Medium define a hierarquia de títulos e Roboto atende textos, formulários e controles. As fontes são empacotadas localmente no frontend. Os temas claro e escuro usam os mesmos tokens semânticos e a preferência fica persistida no navegador.

## Modelo de dados

O banco possui 34 tabelas de domínio, além de `schema_migrations` para controle técnico de versão. O DER completo e importável está em [`diagrams/schedra-database.dbml`](diagrams/schedra-database.dbml), com uma [visualização relacional no dbdiagram](https://dbdiagram.io/d/Schedra-DER-completo-6aabd504b73118d200aba4ce).

### Núcleo existente

`users`, `clients`, `services`, `professionals`, `professional_work_days`, `appointments` e `personal_events`.

### Organização e acesso

`organizations`, `locations`, `memberships`, `roles`, `permissions` e `role_permissions`.

### Catálogo e capacidade

`service_categories`, `professional_services`, `rooms`, `resources`, `appointment_resources` e `professional_time_off`.

### Jornada do cliente

`client_addresses`, `client_preferences`, `appointment_status_history`, `appointment_notes` e `waitlist_entries`.

### Financeiro, segurança e mobile

`payment_methods`, `payments`, `invoices`, `coupons`, `notifications`, `audit_logs`, `device_tokens`, `auth_sessions` e `appointment_slots`.

`notifications` e `device_tokens` são reservas de esquema e não representam uma funcionalidade ativa. Elas serão revisadas e migradas quando a proposta de lembretes entrar em implementação; até lá, o aplicativo não deve anunciar notificações como recurso concluído.

### Expansão proposta

A evolução documentada acrescenta `notification_preferences`, `reminders` e `sync_operations`. As duas primeiras separam preferências, agendamento e tentativas de entrega. A última registra operações web criadas offline com chave idempotente, versão base e estado de sincronização.

## Linha de base técnica

- A API permanece como fonte única de dados.
- Cores e marca já estão isoladas em TypeScript.
- O contrato de autenticação com access token curto e refresh rotativo é compartilhado por web e mobile.
- `memberships`, `roles` e `permissions` permitem sessões com escopos adequados no app.
- `locations` prepara seleção e troca de unidade.
- Nenhuma regra de negócio foi movida para componentes visuais.

## Arquitetura futura

- A aplicação web receberá manifesto PWA e Service Worker com cache explícito e versionado.
- Escritas offline permitidas passarão por fila local e endpoint idempotente; operações administrativas continuarão exclusivamente online.
- Um processador assíncrono selecionará lembretes vencidos e registrará entrega, falha, cancelamento ou nova tentativa.
- O aplicativo solicitará consentimento de notificação somente no contexto de uso, mantendo a central interna disponível em caso de recusa.
- O frontend web ganhará rota administrativa protegida, sem transferir regras de autorização para o navegador.
- O calendário compartilhará o contrato de resumo diário entre web e mobile, usando pop-up no desktop e painel inferior no celular.

## Implementação atual usada como ponto de partida

O backend opera como monólito modular multiempresa. Usuários acessam organizações por meio de vínculos com papéis e permissões; clientes, profissionais, serviços e agendamentos são isolados pela organização ativa da sessão. Contas existentes recebem automaticamente um workspace padrão e seus registros legados são vinculados durante o bootstrap.

Os agendamentos persistem início, fim, duração, preço e snapshots de cliente, profissional e serviço no momento da reserva. Slots transacionais de cinco minutos impedem sobreposição inclusive sob concorrência, enquanto `version` evita sobrescrita silenciosa. Regras semanais, intervalos, serviços habilitados e bloqueios de agenda são validados antes da transação. Mudanças de status e operações administrativas sensíveis geram histórico e auditoria.

Clientes, profissionais, serviços e agendamentos usam exclusão lógica. Relações históricas continuam legíveis pelos snapshots mesmo após o cadastro operacional ser arquivado.

As alterações de esquema são registradas em `schema_migrations`. Em desenvolvimento, `DB_AUTO_SYNC=true` cria tabelas ausentes antes das migrations; em ambientes provisionados, use `npm run db:migrate` e mantenha `DB_AUTO_SYNC=false`.

O runtime fornece readiness com verificação de banco, métricas Prometheus protegidas, logs JSON correlacionados e volume persistente para avatares. Backup e restauração estão definidos em `docs/OPERATIONS.md`. Para múltiplas réplicas, o adaptador local de mídia deve ser substituído por armazenamento de objetos compatível com S3.
