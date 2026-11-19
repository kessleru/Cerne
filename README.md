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

## Conta do GitHub

Sem token, o GitHub libera 60 chamadas por hora e só repositórios públicos. O botão **Entrar** (canto de cima, na tela inicial e na barra do app) abre a janela da conta:

- cole um token pessoal; o Cerne confere com o GitHub (`GET /user`) antes de guardar e mostra sua foto e seu @login;
- um guia ilustrado, passo a passo, mostra como criar o token (fine-grained, recomendado, ou clássico), com um atalho que abre o formulário do GitHub já preenchido (nome, 90 dias, Contents só leitura);
- o token fica só neste navegador (ou só na aba, se "Lembrar" estiver desligado) e só vai no cabeçalho `Authorization`.

## Atalhos

`Ctrl K` paleta · `Ctrl G` ir à linha · `Ctrl F` buscar no arquivo · `Ctrl B` árvore · `Ctrl \` duas colunas · `Ctrl ,` preferências · `Alt L` copiar link das linhas · `Alt I` imagem do trecho · `Alt H` histórico · `Alt D` mudanças · `Alt Z` quebra de linha.
