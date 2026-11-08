# Cerne

Visualizador de repositórios do GitHub, em <https://kessleru.github.io/Cerne/>.

Protótipo navegável do visualizador de repositórios do GitHub (dados falsos, nenhuma chamada de rede). Vite, React, TypeScript, Shiki em Web Worker e o design system Kessleru (superfície aplicativo).

## Como abrir

```bash
npm install
npm run dev      # http://localhost:5173/Cerne/
```

Outros comandos: `npm run build`, `npm run lint`, `npm run preview`.

Medir o `CodeView` com o arquivo de 50 000 linhas (precisa de `npm run build` antes e do Chrome instalado):

```bash
node scripts/medir-codeview.mjs
```

## Estrutura

- `src/kessleru/`: `tokens.css` e `bundle.css` copiados do sistema (sem o `@import` do Google Fonts) e `extensoes.css` (movimento, alto contraste e as 10 lacunas).
- `src/data/`: tipos e a interface `RepoSource`, que a v1 implementa com a API do GitHub.
- `src/mock/`: repositório falso (cerca de 60 arquivos, ramos, tags, commits, arquivo de 50 000 linhas gerado na hora).
- `src/code/`: `CodeView` (virtualização, dobra, seleção por linha) e o worker do Shiki.
- `src/anim/`: View Transitions e coreografias em GSAP, carregado depois da primeira tela.
- `docs/tarefa-prototipo.md`: a especificação do protótipo.

## Atalhos

`Ctrl K` paleta · `Ctrl G` ir à linha · `Ctrl F` buscar no arquivo · `Ctrl B` árvore · `Ctrl \` duas colunas · `Ctrl ,` preferências · `Alt L` copiar link das linhas · `Alt I` imagem do trecho · `Alt H` histórico · `Alt D` mudanças · `Alt Z` quebra de linha.
