# Auditoria de dependencias

Verificacao em 26/10/2026, no incremento do [PR #42](https://github.com/Luizbc2/Schedra/pull/42). O primeiro CI passou nos testes e exports, mas foi bloqueado pela auditoria. Nao se trata de falha nos testes de agendamento: o erro de unicidade mostrado no log do PostgreSQL faz parte do teste de concorrencia.

## Correcao aplicada

- Atualizacoes compativeis via `npm audit fix`, sem `--force`, nos tres projetos. Locks versionados para reproducao com `npm ci`.
- Vitest 3 para 5.0.5 no mobile e web, eliminando a cadeia vulneravel de tinypool/mocker. Vite 6 atualizado para 6.4.5; a versao 6 permanece explicita no mobile para evitar migracao de bundler desnecessaria.
- A [migracao oficial do Vitest](https://vitest.dev/guide/migration/) exige Node >=22.12 e Vite >=6.4. O CI usa Node 22 no web e 24 no mobile. As suites existentes foram executadas novamente, nao apenas compiladas.
- Politicas de auditoria do CI foram mantidas. Nao foram removidos checks ou ignorados avisos para tornar o PR verde.

## Estado residual

| Projeto | Comando | Resultado apos atualizacao |
| --- | --- | --- |
| Web | `npm audit --audit-level=high` | Zero vulnerabilidades |
| Backend, producao | `npm audit --omit=dev --audit-level=high` | Zero altas/criticas; duas entradas moderadas na cadeia uuid/Sequelize |
| Backend, incluindo desenvolvimento | `npm audit` | Duas moderadas e uma baixa (esbuild) |
| Mobile | `npm audit --audit-level=critical` | Zero criticas; seis entradas altas na cadeia do Expo |

Contagens sao um retrato da data, nao garantia permanente. As seis entradas mobile correspondem a duas origens e seus dependentes: `node-forge` ([advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)) e `zod` ([advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)), presentes no tooling do Expo. O risco inclui a cadeia de desenvolvimento/assinatura; nao se afirma que esteja automaticamente mitigado por nao ser codigo de tela.

O npm propoe downgrade para Expo 44 e Sequelize 3 com `--force`. Esses downgrades nao foram executados. Overrides de versoes principais tambem nao foram aplicados sem verificar compatibilidade com os consumidores.

## Acompanhamento e liberacao

Os riscos residuais pertencem a [SCHED-53](https://schedra-luiz.atlassian.net/browse/SCHED-53) e a revisao de seguranca da entrega. Antes de liberar: revisar alcance e impacto de cada advisory, verificar correcoes oficiais, testar toolchain/assinatura e runtime apos a atualizacao, registrar decisao e responsavel. Nenhum aceite formal de risco foi inventado. PR em rascunho; sem merge ou deploy de producao.

Enquanto houver alertas, nao declarar seguranca completa ou 100% da rubrica. Manter ferramentas locais restritas, nao processar projetos ou dados de assinatura nao confiaveis e nao expor servidores de desenvolvimento publicamente.
