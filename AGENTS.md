# AGENTS.md — Cerne

Leia este arquivo **uma vez por chat**, antes da primeira tarefa. As especificações em `docs/tarefa-*.md` contam com ele e não repetem o que está aqui. Em conflito, vale a especificação da tarefa.

## O que é
Visualizador de repositórios do GitHub. Site estático (Vite, React, TypeScript), tudo no navegador, publicado em `/Cerne/` no GitHub Pages. Sem back-end, sem login.

## Comandos
- `npm run build` e `npm run lint`: precisam passar em toda entrega.
- `node scripts/conferir.mjs`: regras do Kessleru (hex, `transition: all`, `ease-in`, `scale(0)`, emoji, CDN no `dist`). Precisa dar `total=0`.
- `node scripts/medir-codeview.mjs`: mede o `CodeView` e faz um passeio pelo app no Chrome sem janela.
- `node scripts/capturar.mjs`: capturas de tela em `%TEMP%\cerne-shots\` (rode `npm run build` antes).

## Mapa
| Pasta | O que tem |
|---|---|
| `src/components/` | Telas e partes da interface (`Workspace`, `Entry`, `Preferences`, `Tree`, `Tabs`, `CommandPalette`, `SnippetDialog`, `CommitLoader`, `Tooltip`, `Select`) |
| `src/code/` | `CodeView` (só as linhas visíveis), worker do Shiki |
| `src/data/` | Contrato `types.ts` (`RepoSource`), `source.ts` (escolhe a fonte), `github/` (API, cota, erros), `cache/` (IndexedDB, separado por token) |
| `src/mock/` | Repositório falso, usado só para `kessleru/exemplo` |
| `src/kessleru/` | `tokens.css` e `bundle.css` copiados do cofre (não edite); `extensoes.css` e `extensoes-ui.css` (o que o Cerne acrescenta) |
| `src/state/`, `src/lib/`, `src/anim/`, `src/viewers/`, `src/icons/` | Preferências e token; funções puras (rotas, busca, diff); animações; visualizadores; ícones |
| `public/` | `404.html` e `restaurar-rota.js` (rotas no Pages), `sw.js` (offline), manifesto e ícones |

## Regras fixas
- **Visual:** só tokens e classes `ks-*` e `key` do Kessleru; sem hex no código-fonte (exceção: SVG em `public/`), sem emoji, sem `transition: all`, `ease-in` nem `scale(0)`. Botões são `key` (ver `Knowledge/07 • Design System/Kessleru/Componentes/Kessleru - Button.md`).
- **Token do GitHub:** só no cabeçalho `Authorization`. Nunca em URL, log, erro, exportação ou cache de service worker.
- **Rede:** só `api.github.com` e `raw.githubusercontent.com`. Nada de CDN ou serviço de terceiros.
- **Proibido sempre:** testes automatizados, commit, push, publicar, instalar pacote sem a especificação pedir, alterar fora da área da tarefa.
- **Leitura econômica:** procure com `grep` e leia por faixa de linhas. Não abra `bundle.css` nem arquivo grande inteiro.

## Retorno
Segue a seção "Comunicação entre agentes" do `AGENTS.md` da raiz: relatório completo em `docs/retornos/<nome-da-tarefa>.md` e uma linha ao Lead, numa única linha de comando, sem variável do PowerShell:
`maestri ask "Lead (Claude Code)" "<tarefa>: OK|FALHOU. Aceite: <resultado>. Desvios: <nenhum ou curtos>. Relatório: docs/retornos/<nome>.md"`
