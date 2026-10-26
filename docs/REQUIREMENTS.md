# Requisitos das próximas implementações do Schedra

> Catálogo detalhado. A narrativa consolidada está em [PROPOSTA.md](PROPOSTA.md).

## 1. Escopo

Os requisitos abaixo especificam funcionalidades futuras. O status `Planejado` indica que o comportamento foi documentado, mas ainda depende de implementação, testes e aceite.

## 2. Requisitos funcionais futuros

| Código | Requisito futuro | Perfil | Status |
| --- | --- | --- | --- |
| RFF01 | Exibir um calendário mensal com indicação dos dias que possuem compromissos | Todos | Planejado |
| RFF02 | Abrir um pop-up ao selecionar uma data no desktop e um painel inferior no celular | Todos | Planejado |
| RFF03 | Listar no componente contextual os compromissos da data selecionada | Todos | Planejado |
| RFF04 | Iniciar um novo compromisso com a data selecionada já preenchida | Todos | Planejado |
| RFF05 | Permitir abrir, editar, concluir ou excluir um compromisso a partir do resumo do dia | Todos | Planejado |
| RFF06 | Permitir configurar lembretes e antecedência por compromisso | Todos | Planejado |
| RFF07 | Exibir uma central com notificações não lidas, lidas, agendadas e falhas | Todos | Planejado |
| RFF08 | Solicitar consentimento antes de registrar um dispositivo para notificações | Todos | Planejado |
| RFF09 | Cancelar ou reagendar o lembrete quando o compromisso for alterado ou excluído | Todos | Planejado |
| RFF10 | Instalar a aplicação web como PWA em navegadores compatíveis | Web | Planejado |
| RFF11 | Disponibilizar o shell e leituras recentes autorizadas durante perda de conexão | Web | Planejado |
| RFF12 | Enfileirar alterações offline e sincronizá-las quando a conexão retornar | Web | Planejado |
| RFF13 | Exibir ao usuário o estado offline, pendente, sincronizado ou em conflito | Web | Planejado |
| RFF14 | Disponibilizar painel administrativo protegido na aplicação web | Admin | Planejado |
| RFF15 | Pesquisar e filtrar usuários por nome, e-mail, papel e estado | Admin | Planejado |
| RFF16 | Promover, rebaixar, bloquear e reativar outras contas pelo painel web | Admin | Planejado |
| RFF17 | Registrar em auditoria cada ação administrativa futura | Admin | Planejado |

## 3. Requisitos não funcionais futuros

| Código | Requisito | Critério de aceitação |
| --- | --- | --- |
| RNFF01 | Responsividade | Pop-up permanece visível no desktop e torna-se painel inferior em telas móveis sem sobreposição |
| RNFF02 | Acessibilidade | Calendário operável por teclado, foco preso no diálogo e rótulos compreensíveis por leitor de tela |
| RNFF03 | Desempenho | Alterar o mês não bloqueia a interface e consulta apenas o intervalo necessário |
| RNFF04 | Segurança de cache | Tokens, senhas e respostas administrativas não são gravados pelo Service Worker |
| RNFF05 | Consistência offline | Toda escrita pendente possui identificador idempotente e não cria duplicidade ao sincronizar |
| RNFF06 | Recuperação de conflito | Conflitos exibem os dados locais e remotos antes de exigir uma escolha |
| RNFF07 | Privacidade | Notificações dependem de consentimento revogável e evitam conteúdo sensível na tela bloqueada por padrão |
| RNFF08 | Autorização | A interface oculta controles indevidos e a API retorna `403` para usuários sem papel administrativo |
| RNFF09 | Observabilidade | Falhas de sincronização e entrega geram registros correlacionados sem expor dados pessoais |
| RNFF10 | Testabilidade | Fluxos críticos possuem testes unitários, de integração e ao menos um cenário de interface |

## 4. Regras de negócio futuras

| Código | Regra futura |
| --- | --- |
| RNFUT01 | Selecionar uma data não cria um compromisso automaticamente. |
| RNFUT02 | O formulário aberto pelo calendário recebe a data escolhida, mas o usuário confirma horário e demais campos. |
| RNFUT03 | Compromissos encerrados aparecem no histórico do dia, não na lista de próximos horários. |
| RNFUT04 | Um lembrete não pode ser agendado para depois do início do compromisso. |
| RNFUT05 | Alterar data, horário ou antecedência substitui o lembrete anterior. |
| RNFUT06 | Excluir um compromisso cancela seus lembretes ainda pendentes. |
| RNFUT07 | Negar permissão de notificação não impede o uso da agenda. |
| RNFUT08 | A central interna continua utilizável mesmo quando push remoto não estiver disponível. |
| RNFUT09 | Escritas offline são sincronizadas na ordem em que foram confirmadas pelo usuário. |
| RNFUT10 | Operações administrativas não podem ser executadas offline. |
| RNFUT11 | Um administrador não pode rebaixar, bloquear ou excluir a própria conta. |
| RNFUT12 | O backend sempre revalida papel e estado da conta; visibilidade da tela não concede permissão. |

## 5. Critérios de aceite por épico

### Calendário contextual

1. O usuário seleciona um dia com ou sem compromissos.
2. A interface abre o componente adequado ao tamanho da tela.
3. O resumo exibe somente registros autorizados daquele dia.
4. A ação de criar abre o formulário com a data correta.
5. Fechar o componente devolve o foco à data selecionada.

### Notificações

1. O usuário escolhe a antecedência e concede ou recusa a permissão.
2. O sistema registra o lembrete sem impedir o salvamento do compromisso em caso de recusa.
3. Editar ou excluir o compromisso atualiza o agendamento do lembrete.
4. A central interna informa se o lembrete está agendado, entregue, lido, cancelado ou falhou.

### PWA e operação offline

1. O navegador oferece instalação em ambiente HTTPS compatível.
2. Com a rede indisponível, o shell abre e indica o estado offline.
3. Uma alteração permitida entra na fila local com identificador único.
4. Ao retornar a conexão, a API recebe a operação uma única vez.
5. Conflitos não sobrescrevem silenciosamente os dados remotos.

### Administração web

1. O administrador acessa a rota e pesquisa usuários.
2. Um usuário comum recebe `403` ao chamar a API administrativa diretamente.
3. A alteração exige confirmação e atualiza a listagem após resposta da API.
4. Ações contra a própria conta são bloqueadas conforme as regras de negócio.
5. Toda alteração gera registro de auditoria.
