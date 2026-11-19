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
- clicar na foto abre seu perfil do GitHub: bio, empresa, local, seguidores e a lista dos seus repositórios (`GET /user/repos`), que abrem no Cerne com um clique;
- um guia ilustrado, passo a passo, mostra como criar o token (fine-grained, recomendado, ou clássico), com um atalho que abre o formulário do GitHub já preenchido (nome, 90 dias, Contents só leitura);
- o token fica só neste navegador (ou só na aba, se "Lembrar" estiver desligado) e só vai no cabeçalho `Authorization`.

## Explorar

Na página inicial, três abas: **Para você** (recentes e seus repositórios), **Estudar** e **Famosos**.

- **Estudar:** 16 trilhas (8 linguagens e 8 temas, como APIs, compiladores, bancos de dados e IA), do iniciante ao avançado. Cada repositório abre direto no arquivo por onde começar, e dá para marcar o que já foi estudado (fica neste navegador).
- **Famosos:** 27 repositórios de referência (Linux, Go, React, PostgreSQL, llama.cpp…), filtráveis por área.
- Critério: só código de verdade (nada de listas de links), legível e mantido ou clássico. Os arquivos iniciais foram conferidos no ramo padrão de cada repositório. A curadoria fica em `src/data/explorar.ts`.

## Arquivos

Código com destaque em cerca de 150 linguagens (210 extensões e nomes como `Dockerfile` e `Makefile`), carregadas só quando o arquivo abre. Visualizadores próprios para Markdown, CSV/TSV, JSON, notebooks Jupyter, imagens (quadriculado, dimensões, 100%), PDF, áudio, vídeo, fontes, pacotes ZIP (lista do conteúdo) e binários (hexadecimal). PDF, mídia, fontes e pacotes vão até 25 MB; texto até 1 MB.

## Código

Guias de indentação (a do bloco atual mais forte), cabeçalho fixo do escopo ao rolar, ocorrências da palavra com duplo clique (Esc limpa) e **Ir para símbolo** (`Ctrl Shift O` ou `@` na paleta).

## Tema

Claro ou escuro segue o sistema por padrão (Preferências > Aparência, o botão de monitor/sol/lua na página inicial ou a paleta, Ctrl K). Escolha também o sabor do escuro: Frappé, Macchiato ou Mocha. O claro é o Latte. `public/tema-inicial.js` aplica o tema antes do primeiro desenho, para não piscar.

## Atalhos

`Ctrl K` paleta · `Ctrl G` ir à linha · `Ctrl Shift O` símbolo · `Ctrl F` buscar no arquivo · `Ctrl B` árvore · `Ctrl \` duas colunas · `Ctrl ,` preferências · `Alt L` copiar link das linhas · `Alt I` imagem do trecho · `Alt H` histórico · `Alt D` mudanças · `Alt Z` quebra de linha.
