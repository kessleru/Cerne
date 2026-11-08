// Repositório falso: cerca de 60 arquivos, ramos, tags e commits. Nenhuma chamada de rede.
import type { Commit, FileContent, FileKind, Ref, TreeEntry } from '../data/types';
import {
  couponsCsv,
  cssFile,
  fakeSha,
  hashStr,
  hugeFile,
  pageComponent,
  pyModule,
  rankingCsv,
  reactComponent,
  testFile,
  tsModule,
} from './gen';

type Def = { path: string; kind: FileKind; text?: () => string; size?: number; lfs?: { oid: string; size: number } };

const logo = (cor: string, texto: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="${texto}">\n  <circle cx="60" cy="60" r="52" fill="none" stroke="${cor}" stroke-width="4"/>\n  <circle cx="60" cy="60" r="36" fill="none" stroke="${cor}" stroke-width="4" opacity="0.7"/>\n  <circle cx="60" cy="60" r="20" fill="none" stroke="${cor}" stroke-width="4" opacity="0.5"/>\n  <circle cx="60" cy="60" r="6" fill="${cor}"/>\n</svg>\n`;

const README = `# Exemplo

Repositório de **demonstração** do Cerne. Tudo aqui é falso: serve para testar a leitura.

## O que tem

- árvore com cerca de 60 arquivos
- Markdown, CSV, JSON, SVG e código
- casos especiais: binário, arquivo grande e ponteiro LFS

## Começando

\`\`\`bash
npm install
npm run dev
\`\`\`

Depois abra \`src/main.tsx\` e veja como o app monta a tela.

> Dica: use **Ctrl K** para buscar um arquivo ou comando.

| Pasta | Conteúdo |
|---|---|
| src | código do app |
| docs | guias |
| data | dados de exemplo |

Veja o [guia](docs/guia.md) e a [documentação do Vite](https://vitejs.dev). Um link perigoso, [clique](javascript:alert(1)), fica sem destino.

<script>alert('isto aparece como texto')</script>
`;

const GUIA = `# Guia

## Estrutura

O app tem três camadas: **dados**, **estado** e **telas**.

1. Dados: \`src/lib/api.ts\`
2. Estado: \`src/lib/store.ts\`
3. Telas: \`src/pages\`

### Exemplo

\`\`\`ts
import { criarStore } from './lib/store';

const store = criarStore({ aberto: false });
store.set({ aberto: true });
\`\`\`

## Teclado

- \`Ctrl K\`: paleta
- \`Ctrl B\`: árvore
- *Esc*: fecha tudo
`;

const ARQ = `# Arquitetura

O app é estático. Cada tela lê do **cache** e só então pede à rede.

- cache por SHA
- sem dependências pesadas
- tudo acessível por teclado

> Decisões ficam na pasta de decisões.
`;

const defs: Def[] = [
  { path: 'README.md', kind: 'markdown', text: () => README },
  { path: 'LICENSE', kind: 'text', text: () => 'MIT License\n\nCopyright (c) 2026 Exemplo\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software.\n' },
  { path: '.gitignore', kind: 'text', text: () => 'node_modules\ndist\n.env\n*.log\ncoverage\n' },
  { path: '.editorconfig', kind: 'text', text: () => 'root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\n' },
  {
    path: 'package.json',
    kind: 'json',
    text: () =>
      JSON.stringify(
        {
          name: 'exemplo',
          version: '0.2.0',
          private: true,
          scripts: { dev: 'vite', build: 'tsc && vite build', test: 'vitest' },
          dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
          devDependencies: { typescript: '^5.6.0', vite: '^6.0.0' },
        },
        null,
        2,
      ) + '\n',
  },
  {
    path: 'tsconfig.json',
    kind: 'json',
    text: () => JSON.stringify({ compilerOptions: { target: 'ES2022', strict: true, jsx: 'react-jsx', moduleResolution: 'bundler' }, include: ['src'] }, null, 2) + '\n',
  },
  { path: 'vite.config.ts', kind: 'text', text: () => `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  base: '/exemplo/',\n  plugins: [react()],\n});\n` },
  { path: 'index.html', kind: 'text', text: () => '<!doctype html>\n<html lang="pt-BR">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Exemplo</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n' },
  { path: 'CHANGELOG.md', kind: 'markdown', text: () => '# Mudanças\n\n## 0.2.0\n\n- cache por SHA\n- tema escuro\n\n## 0.1.0\n\n- primeira versão\n' },
  { path: '.github/workflows/ci.yml', kind: 'text', text: () => 'name: ci\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm test\n' },
  { path: '.github/ISSUE_TEMPLATE.md', kind: 'markdown', text: () => '## O que aconteceu\n\n## O que esperava\n\n## Como repetir\n' },
  { path: 'docs/guia.md', kind: 'markdown', text: () => GUIA },
  { path: 'docs/arquitetura.md', kind: 'markdown', text: () => ARQ },
  { path: 'docs/api.md', kind: 'markdown', text: () => '# API\n\n## GET /itens\n\nDevolve a lista de itens.\n\n| Campo | Tipo |\n|---|---|\n| id | número |\n| nome | texto |\n' },
  { path: 'docs/contribuindo.md', kind: 'markdown', text: () => '# Contribuindo\n\n1. Abra uma issue\n2. Faça um fork\n3. Envie o pull request\n' },
  { path: 'data/cupons.csv', kind: 'csv', text: couponsCsv },
  { path: 'data/ranking.csv', kind: 'csv', text: rankingCsv },
  {
    path: 'data/config.json',
    kind: 'json',
    text: () =>
      JSON.stringify(
        {
          nome: 'exemplo',
          ativo: true,
          limite: 50,
          tema: { escuro: true, acento: 'green', fontes: ['JetBrains Mono', 'Roboto'] },
          rotas: [
            { caminho: '/', pagina: 'Home' },
            { caminho: '/sobre', pagina: 'Sobre' },
            { caminho: '/ajustes', pagina: 'Ajustes', privada: true },
          ],
          vazio: null,
        },
        null,
        2,
      ) + '\n',
  },
  {
    path: 'data/amostra.json',
    kind: 'json',
    text: () => JSON.stringify(Array.from({ length: 14 }, (_, i) => ({ id: i + 1, nome: `item ${i + 1}`, preco: 10 + (hashStr('p' + i) % 90) + 0.5, tags: ['a', 'b'].slice(0, 1 + (i % 2)) })), null, 2) + '\n',
  },
  { path: 'assets/logo.svg', kind: 'image', text: () => logo('royalblue', 'Logo') },
  { path: 'assets/banner.svg', kind: 'image', text: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120" role="img" aria-label="Banner">\n  <rect width="400" height="120" fill="none" stroke="slategray" stroke-width="2"/>\n  <text x="200" y="68" text-anchor="middle" font-family="monospace" font-size="28" fill="steelblue">exemplo</text>\n</svg>\n' },
  { path: 'assets/icone.svg', kind: 'image', text: () => logo('tomato', 'Ícone') },
  { path: 'assets/fonte.woff2', kind: 'binary', size: 48213 },
  { path: 'assets/pacote.bin', kind: 'binary', size: 1048576 },
  { path: 'assets/modelo.onnx', kind: 'lfs', size: 131, lfs: { oid: fakeSha('modelo.onnx').padEnd(64, '0'), size: 187654321 } },
  { path: 'assets/cena.glb', kind: 'lfs', size: 130, lfs: { oid: fakeSha('cena.glb').padEnd(64, '0'), size: 52428800 } },
  { path: 'assets/registro.log', kind: 'large', size: 6291456 },
  { path: 'src/main.tsx', kind: 'text', text: () => `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './styles.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n` },
  { path: 'src/App.tsx', kind: 'text', text: () => `import { useState } from 'react';\nimport Home from './pages/Home';\nimport Sobre from './pages/Sobre';\n\nexport default function App() {\n  const [rota, setRota] = useState<'home' | 'sobre'>('home');\n\n  return (\n    <div className="app">\n      <nav>\n        <button onClick={() => setRota('home')}>Home</button>\n        <button onClick={() => setRota('sobre')}>Sobre</button>\n      </nav>\n      {rota === 'home' ? <Home /> : <Sobre />}\n    </div>\n  );\n}\n` },
  { path: 'src/styles.css', kind: 'text', text: () => cssFile('app') },
  { path: 'src/vite-env.d.ts', kind: 'text', text: () => '/// <reference types="vite/client" />\n' },
  ...['Header', 'Footer', 'Card', 'Button', 'List', 'Modal', 'Tabs'].map((n): Def => ({ path: `src/components/${n}.tsx`, kind: 'text', text: () => reactComponent(n) })),
  { path: 'src/components/index.ts', kind: 'text', text: () => ['Header', 'Footer', 'Card', 'Button', 'List', 'Modal', 'Tabs'].map((n) => `export { ${n} } from './${n}';`).join('\n') + '\n' },
  ...['api', 'cache', 'format', 'router', 'store', 'fuzzy', 'hash'].map((n): Def => ({ path: `src/lib/${n}.ts`, kind: 'text', text: () => tsModule(n) })),
  ...['useTheme', 'useDebounce', 'useKeys'].map((n): Def => ({ path: `src/hooks/${n}.ts`, kind: 'text', text: () => tsModule(n) })),
  ...['Home', 'Sobre', 'Ajustes'].map((n): Def => ({ path: `src/pages/${n}.tsx`, kind: 'text', text: () => pageComponent(n) })),
  { path: 'src/generated/enorme.ts', kind: 'text', text: hugeFile, size: 2_150_000 },
  { path: 'tests/cache.test.ts', kind: 'text', text: () => testFile('cache') },
  { path: 'tests/format.test.ts', kind: 'text', text: () => testFile('format') },
  { path: 'scripts/build.mjs', kind: 'text', text: () => `import { build } from 'vite';\n\nawait build({ logLevel: 'info' });\nconsole.log('pronto');\n` },
  { path: 'scripts/deploy.sh', kind: 'text', text: () => '#!/usr/bin/env bash\nset -euo pipefail\n\nnpm run build\necho "enviando dist/"\n' },
  { path: 'python/app.py', kind: 'text', text: () => pyModule('app') },
  { path: 'python/utils.py', kind: 'text', text: () => pyModule('utils') },
];

export const HUGE_PATH = 'src/generated/enorme.ts';

/** Arquivos que mudam entre os ramos e tags. */
const ONLY_NEW = ['docs/api.md', 'src/pages/Ajustes.tsx', 'src/hooks/useKeys.ts', 'src/lib/hash.ts', 'tests/format.test.ts', HUGE_PATH];
const EXTRA: Record<string, Def[]> = {
  'feature/cache': [{ path: 'src/lib/cache-persist.ts', kind: 'text', text: () => tsModule('cachePersist') }],
  develop: [{ path: 'docs/roadmap.md', kind: 'markdown', text: () => '# Roteiro\n\n- [ ] busca no conteúdo\n- [ ] exportar imagem\n' }],
};

function defsFor(ref: string): Def[] {
  if (ref === 'v0.1.0') return defs.filter((d) => !ONLY_NEW.includes(d.path));
  return [...defs, ...(EXTRA[ref] ?? [])];
}

const textOf = (d: Def) => d.text?.() ?? '';

export function treeFor(ref: string): TreeEntry[] {
  return defsFor(ref).map((d) => ({
    path: d.path,
    kind: d.kind,
    size: d.size ?? textOf(d).length,
  }));
}

export function fileFor(ref: string, path: string): FileContent | null {
  const d = defsFor(ref).find((x) => x.path === path);
  if (!d) return null;
  if (d.kind === 'binary' || d.kind === 'large') return { path, kind: d.kind, size: d.size ?? 0 };
  if (d.kind === 'lfs') return { path, kind: 'lfs', size: d.size ?? 0, lfs: d.lfs };
  const text = textOf(d);
  let lines = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) lines++;
  if (text.endsWith('\n')) lines--;
  return { path, kind: d.kind, size: d.size ?? text.length, text, lines };
}

export const REFS: Ref[] = [
  { name: 'main', kind: 'branch', sha: fakeSha('main') },
  { name: 'develop', kind: 'branch', sha: fakeSha('develop') },
  { name: 'feature/cache', kind: 'branch', sha: fakeSha('feature/cache') },
  { name: 'v0.2.0', kind: 'tag', sha: fakeSha('v0.2.0') },
  { name: 'v0.1.0', kind: 'tag', sha: fakeSha('v0.1.0') },
];

const AUTORES = ['Ana Ribeiro', 'Caio Mendes', 'Lia Prado'];
const MENSAGENS = [
  'feat: primeira versão do app',
  'chore: configura Vite e TypeScript',
  'feat: componentes base',
  'fix: corrige ordem da lista',
  'feat: cache por SHA',
  'docs: guia de início rápido',
  'refactor: separa o estado da tela',
  'test: cobre o formatador',
  'fix: erro ao abrir pasta vazia',
  'feat: tema escuro',
  'style: ajusta espaçamento do cabeçalho',
  'feat: busca difusa',
  'perf: evita reler arquivos já guardados',
  'docs: explica a arquitetura',
  'fix: foco perdido ao fechar o modal',
  'feat: atalhos de teclado',
  'chore: atualiza dependências',
  'feat: página de ajustes',
  'fix: quebra de linha em nomes longos',
  'refactor: extrai hook de debounce',
  'feat: exportar dados em CSV',
  'docs: changelog da 0.2.0',
  'fix: cota exibida errada',
  'chore: prepara a versão 0.2.0',
];

export const COMMITS: Commit[] = MENSAGENS.map((message, i) => {
  const dia = 28 - i;
  const mes = dia > 0 ? 10 : 9;
  const d = dia > 0 ? dia : 30 + dia;
  return {
    sha: fakeSha('c' + i),
    message,
    author: AUTORES[i % AUTORES.length]!,
    date: `2026-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(9 + (i % 9)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00-03:00`,
  };
});

/** Commits que tocam um arquivo: determinístico por caminho, sempre o primeiro commit mais alguns. */
export function commitsFor(path?: string): Commit[] {
  if (!path) return COMMITS;
  const h = hashStr(path);
  const picked = COMMITS.filter((_, i) => i === COMMITS.length - 1 || (h + i) % 3 === 0);
  return picked.length >= 2 ? picked : [COMMITS[0]!, COMMITS[COMMITS.length - 1]!];
}
