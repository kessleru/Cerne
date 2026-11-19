// JavaScript e TypeScript: compiladores, APIs, front-end e ferramentas.
import { repos } from '../ajuda';

export default repos([
  {
    repo: 'jamiebuilds/the-super-tiny-compiler', famoso: 'Aprender', nota: 'Compilador comentado linha a linha', nivel: 'iniciante', lang: 'JavaScript', temas: ['compiladores'], tipo: 'tutorial', start: 'the-super-tiny-compiler.js',
  },
  {
    repo: 'trekhleb/javascript-algorithms', famoso: 'Aprender', nota: 'Algoritmos com testes', nivel: 'iniciante', lang: 'JavaScript', temas: ['algoritmos'], tipo: 'tutorial', start: 'src/algorithms/sorting/quick-sort/QuickSort.js',
  },
  {
    repo: 'expressjs/express', famoso: 'Back-end', nota: 'Middleware em poucas linhas', nivel: 'iniciante', lang: 'JavaScript', temas: ['apis'], tipo: 'framework', api: ['REST'], stack: ['Node.js'], start: 'lib/application.js',
  },
  {
    repo: 'gothinkster/node-express-realworld-example-app', famoso: 'Back-end', nota: 'A API RealWorld (um Medium)', nivel: 'intermediário', lang: 'TypeScript', temas: ['apis', 'arquitetura'], tipo: 'exemplo', api: ['REST'], stack: ['Express', 'Prisma', 'JWT'], start: 'src/app/routes/article/article.controller.ts',
  },
  {
    repo: 'honojs/hono', famoso: 'Back-end', nota: 'Web framework para qualquer runtime', nivel: 'intermediário', lang: 'TypeScript', temas: ['apis'], tipo: 'framework', api: ['REST'], stack: ['Web Standards'], start: 'src/hono-base.ts',
  },
  {
    repo: 'preactjs/preact', famoso: 'Front-end', nota: 'Um React em 3 KB', nivel: 'intermediário', lang: 'JavaScript', temas: ['frontend'], tipo: 'biblioteca', start: 'src/diff/index.js',
  },
  {
    repo: 'facebook/react', famoso: 'Front-end', nota: 'O agendador do React', nivel: 'avançado', lang: 'JavaScript', temas: ['frontend'], tipo: 'biblioteca', start: 'packages/react-reconciler/src/ReactFiberWorkLoop.js',
  },
  {
    repo: 'vuejs/core', famoso: 'Front-end', nota: 'A reatividade do Vue', nivel: 'intermediário', lang: 'TypeScript', temas: ['frontend'], tipo: 'framework', start: 'packages/reactivity/src/ref.ts',
  },
  {
    repo: 'sveltejs/svelte', famoso: 'Front-end', nota: 'Signals do Svelte 5', nivel: 'avançado', lang: 'JavaScript', temas: ['frontend'], tipo: 'framework', start: 'packages/svelte/src/internal/client/reactivity/sources.js',
  },
  {
    repo: 'pmndrs/zustand', famoso: 'Front-end', nota: 'Estado global minimalista', nivel: 'iniciante', lang: 'TypeScript', temas: ['frontend'], tipo: 'biblioteca', start: 'src/vanilla.ts',
  },
  {
    repo: 'TanStack/query', famoso: 'Front-end', nota: 'Cache de dados assíncronos', nivel: 'avançado', lang: 'TypeScript', temas: ['frontend'], tipo: 'biblioteca', start: 'packages/query-core/src/queryClient.ts',
  },
  {
    repo: 'nodejs/node', famoso: 'Linguagens', nota: 'O EventEmitter do Node', nivel: 'avançado', lang: 'JavaScript', temas: [], tipo: 'linguagem', start: 'lib/events.js',
  },
  {
    repo: 'developit/mitt', famoso: 'Front-end', nota: 'Eventos em 200 bytes', nivel: 'iniciante', lang: 'TypeScript', temas: [], tipo: 'biblioteca', start: 'src/index.ts',
  },
  {
    repo: 'type-challenges/type-challenges', famoso: 'Aprender', nota: 'Treino de tipos, do fácil ao extremo', nivel: 'iniciante', lang: 'TypeScript', temas: [], tipo: 'tutorial', start: 'questions/00004-easy-pick/template.ts',
  },
  {
    repo: 'sindresorhus/ky', famoso: 'Back-end', nota: 'fetch com retries e hooks', nivel: 'intermediário', lang: 'TypeScript', temas: ['apis'], tipo: 'biblioteca', api: ['REST'], start: 'source/core/Ky.ts',
  },
  {
    repo: 'microsoft/vscode', famoso: 'Ferramentas', nota: 'Padrões de um app gigante', nivel: 'avançado', lang: 'TypeScript', temas: ['arquitetura'], tipo: 'aplicação', start: 'src/vs/editor/common/model/textModel.ts',
  },
  {
    repo: 'tailwindlabs/tailwindcss', famoso: 'Front-end', nota: 'CSS utilitário', nivel: 'avançado', lang: 'TypeScript', temas: ['frontend', 'compiladores'], tipo: 'ferramenta', start: 'packages/tailwindcss/src/compile.ts',
  },
]);
