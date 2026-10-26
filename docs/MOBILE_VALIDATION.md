# Validação do aplicativo móvel

## 1. Escopo

Este documento registra como validar usabilidade, funcionalidade principal, compatibilidade e segurança do aplicativo Schedra. A execução deve ser repetida antes da apresentação sempre que houver alteração funcional relevante.

## 2. Ambientes cobertos

| Ambiente | Evidência técnica | Situação |
| --- | --- | --- |
| iOS | Expo SDK 57, bundle Hermes gerado em 08/09/2026 | Compilação passou; aceite em aparelho pendente |
| Android | Expo SDK 57, bundle Hermes gerado em 08/09/2026 | Compilação passou; aceite em aparelho pendente |
| Web responsiva | Expo Web, bundle gerado em 08/09/2026 | Compilação passou; não equivale a teste nativo |
| API | Node.js, Express, Sequelize e Jest | Validado automaticamente |
| Banco | MySQL no Docker e PostgreSQL/Supabase por configuração | Suportado |

> Gerar um bundle não comprova usabilidade, teclado, permissões e seletores nativos. Registrar modelo, sistema, data, versão e resultado dos cenários em iOS e Android antes de considerar a validação completa.

## 3. Roteiro da funcionalidade principal

### CRUD de clientes

- [ ] Entrar e ativar o modo empresarial pelo switch do cabeçalho.
- [ ] Abrir a aba Clientes.
- [ ] Cadastrar cliente com nome, e-mail e telefone válidos.
- [ ] Confirmar que o cliente aparece imediatamente.
- [ ] Pesquisar pelo nome cadastrado.
- [ ] Editar telefone ou observações.
- [ ] Recarregar e confirmar que a alteração permaneceu no banco.
- [ ] Excluir o cliente e confirmar sua remoção.
- [ ] Tentar cadastrar dados inválidos e conferir a mensagem de erro.

### Agenda pessoal e empresarial

- [ ] Ativar o modo pessoal e criar um compromisso.
- [ ] Editar e excluir o compromisso.
- [ ] Ativar o modo empresarial e criar um agendamento selecionando cliente, profissional e serviço.
- [ ] Confirmar que o formulário preserva o foco durante a digitação.

### Perfil e imagem

- [ ] Selecionar uma imagem JPG, PNG ou WEBP válida.
- [ ] Confirmar atualização do avatar após o upload.
- [ ] Enviar arquivo com extensão proibida e conferir rejeição.
- [ ] Enviar arquivo maior que 5 MB e conferir rejeição.

### Administração

- [ ] Confirmar que usuário comum não visualiza a aba Admin.
- [ ] Confirmar que acesso direto à API administrativa retorna `403`.
- [ ] Promover outro usuário para admin.
- [ ] Bloquear outro usuário e confirmar que ele não autentica.
- [ ] Reativar o usuário.
- [ ] Confirmar que o admin não altera ou exclui a própria conta.

## 4. Checklist de usabilidade

Itens abaixo descrevem a implementação. O aceite visual e funcional depende do roteiro em aparelho da seção 3.

- [x] Navegação principal permanece acessível na barra inferior.
- [x] Botões possuem ícones e estados ativos identificáveis.
- [x] Tema claro e escuro mantêm contraste funcional.
- [x] Campos exibem rótulos e mensagens de validação.
- [x] Senha possui verificação visual em tempo real.
- [x] Ações destrutivas solicitam confirmação.
- [x] Carregamento, lista vazia e falha possuem estados visuais.
- [x] Teclado permanece aberto durante digitação contínua.
- [x] Textos longos usam truncamento ou quebra controlada.
- [x] Fluxos pessoal e empresarial apresentam somente módulos pertinentes.

## 5. Checklist de segurança

- [x] Token armazenado pelo SecureStore no aplicativo.
- [x] Senhas armazenadas com hash no backend.
- [x] JWT obrigatório nas rotas privadas.
- [x] Papel administrativo revalidado no banco.
- [x] Conta bloqueada invalida acesso existente.
- [x] Usuário edita somente o próprio perfil.
- [x] Registros operacionais são isolados por organização autorizada; pessoais por usuário.
- [x] Upload exige autenticação.
- [x] Extensão e MIME do avatar devem ser compatíveis.
- [x] Upload limitado a 5 MB e um arquivo por requisição.
- [x] Nome de arquivo usa UUID para impedir colisão.

## 6. Comandos de evidência

```powershell
cd C:\facul\Horarius\Aplicativo-Schedra
npm run typecheck
npm test
npx expo export --platform ios
npx expo export --platform android
npx expo export --platform web
```

```powershell
cd C:\facul\Horarius\Backend-Schedra
npm test
npm run build
```

```powershell
cd C:\facul\Horarius
npm run test:e2e
```

## 7. Critério de aprovação

A versão está apta para apresentação quando os comandos terminarem sem erro, os testes automatizados estiverem verdes e o roteiro da funcionalidade principal for executado no aparelho usado na demonstração.

## 8. Revisão de 08/09/2026

- Testes mobile: 12 passaram (8 de agenda: duração, conclusão, lembrete, status, data/hora Android e histórico; 4 de MIME e nome do arquivo de avatar).
- Backend com PostgreSQL 18 temporário, em localhost e banco `schedra_test`: 93 testes passaram, 22 suítes, nenhum pulado. Inclui CRUD HTTP com sessão real e upload lido por outra instância; o servidor de banco foi encerrado após a execução.
- TypeScript: aplicativo e backend passaram.
- Exportação Expo SDK 57: iOS, Android e web passaram.
- Upload: armazenamento persistente em `avatar_assets`; entrega por `/uploads/avatars/:filename`; validação real com Sharp e compatibilidade com arquivos legados.
- Integração HTTP adicionada: CRUD com sessões reais, isolamento entre organizações, exclusão lógica e foto lida em outra instância da API. Exige `TEST_DATABASE_URL` apontando para um banco de testes.
- O teste bloqueia banco cujo nome não contém `test` e utiliza `TEST_DATABASE_URL`, nunca a URL de desenvolvimento implicitamente.
- Os diagramas acadêmicos foram redirecionados para as implementações futuras; não são evidência de execução desta revisão.
- Expo web em viewport 390 x 844, conectado à API e ao PostgreSQL locais: login, criação e edição de cliente, persistência após recarregar a página e restauração da sessão conferidos no navegador. Exclusão coberta pela integração HTTP; sua confirmação visual não foi concluída.
- Não executado nesta revisão: aceite em aparelho físico. Não marcar os cenários manuais como concluídos sem executá-los.

## 9. Plano de validação das implementações futuras

Os cenários abaixo permanecem pendentes até que o respectivo item do backlog seja implementado:

- [ ] Selecionar uma data e validar pop-up no desktop e painel inferior no celular.
- [ ] Confirmar retorno de foco, teclado e leitor de tela no calendário contextual.
- [ ] Conceder e negar permissão de notificação sem bloquear o uso da agenda.
- [ ] Editar e excluir compromisso e confirmar substituição ou cancelamento do lembrete.
- [ ] Instalar a PWA e abrir o shell com a rede indisponível.
- [ ] Sincronizar uma escrita pendente uma única vez após reconexão.
- [ ] Simular conflito de versão e confirmar que nenhum dado é sobrescrito silenciosamente.
- [ ] Acessar o painel web como administrador e receber `403` como usuário comum.
- [ ] Confirmar que operações administrativas não são oferecidas offline.
