// Curadoria do Explorar: trilhas de estudo (por linguagem e por tema) e repositórios famosos.
// Critério: código de verdade (nada de listas de links), legível, mantido ou clássico, e que ensine algo ao ler.
// Cada `start` é o arquivo por onde começar; todos foram conferidos no ramo padrão em 2026-11-19.
import type { IconName } from '../components/Icon';

export type Nivel = 'iniciante' | 'intermediário' | 'avançado';

export type Indicado = {
  /** dono/nome */
  repo: string;
  /** arquivo para abrir primeiro (no ramo padrão) */
  start?: string;
  /** por que ler, em poucas palavras */
  nota: string;
  nivel: Nivel;
  /** linguagem principal: rótulo e uma extensão para o ícone */
  lang: string;
  ext: string;
};

export type Trilha = {
  id: string;
  titulo: string;
  grupo: 'Linguagens' | 'Temas';
  /** linguagem: extensão para o ícone de arquivo; tema: ícone da interface */
  ext?: string;
  icone?: IconName;
  /** token de cor do Catppuccin para o selo */
  cor: string;
  resumo: string;
  repos: Indicado[];
};

const R = (repo: string, start: string | undefined, nota: string, nivel: Nivel, lang: string, ext: string): Indicado => ({ repo, start, nota, nivel, lang, ext });

const PY = ['Python', 'py'] as const;
const JS = ['JavaScript', 'js'] as const;
const TS = ['TypeScript', 'ts'] as const;
const GO = ['Go', 'go'] as const;
const RS = ['Rust', 'rs'] as const;
const C = ['C', 'c'] as const;
const CPP = ['C++', 'cpp'] as const;
const JAVA = ['Java', 'java'] as const;
const CS = ['C#', 'cs'] as const;

export const TRILHAS: Trilha[] = [
  // ---------- Linguagens ----------
  {
    id: 'python', titulo: 'Python', grupo: 'Linguagens', ext: 'py', cor: 'yellow',
    resumo: 'Do autograd de 100 linhas à biblioteca padrão.',
    repos: [
      R('karpathy/micrograd', 'micrograd/engine.py', 'Autograd inteiro em ~100 linhas', 'iniciante', ...PY),
      R('pallets/click', 'src/click/core.py', 'CLI com API exemplar', 'intermediário', ...PY),
      R('psf/requests', 'src/requests/sessions.py', 'Design de API para humanos', 'intermediário', ...PY),
      R('pallets/flask', 'src/flask/app.py', 'Framework web legível', 'intermediário', ...PY),
      R('fastapi/fastapi', 'fastapi/routing.py', 'Tipos guiando a API', 'intermediário', ...PY),
      R('python/cpython', 'Lib/json/encoder.py', 'A stdlib escrita em Python', 'avançado', ...PY),
    ],
  },
  {
    id: 'javascript', titulo: 'JavaScript', grupo: 'Linguagens', ext: 'js', cor: 'yellow',
    resumo: 'Compilador comentado, algoritmos e o Node por dentro.',
    repos: [
      R('jamiebuilds/the-super-tiny-compiler', 'the-super-tiny-compiler.js', 'Compilador comentado linha a linha', 'iniciante', ...JS),
      R('trekhleb/javascript-algorithms', 'src/algorithms/sorting/quick-sort/QuickSort.js', 'Algoritmos com testes', 'iniciante', ...JS),
      R('expressjs/express', 'lib/application.js', 'Middleware em poucas linhas', 'intermediário', ...JS),
      R('preactjs/preact', 'src/diff/index.js', 'Um React em 3 KB', 'intermediário', ...JS),
      R('nodejs/node', 'lib/events.js', 'O EventEmitter do Node', 'avançado', ...JS),
    ],
  },
  {
    id: 'typescript', titulo: 'TypeScript', grupo: 'Linguagens', ext: 'ts', cor: 'blue',
    resumo: 'Bibliotecas pequenas e tipadas até um editor gigante.',
    repos: [
      R('developit/mitt', 'src/index.ts', 'Eventos em 200 bytes', 'iniciante', ...TS),
      R('type-challenges/type-challenges', 'questions/00004-easy-pick/template.ts', 'Treino de tipos, do fácil ao extremo', 'iniciante', ...TS),
      R('pmndrs/zustand', 'src/vanilla.ts', 'Estado global minimalista', 'intermediário', ...TS),
      R('sindresorhus/ky', 'source/core/Ky.ts', 'fetch com retries e hooks', 'intermediário', ...TS),
      R('honojs/hono', 'src/hono-base.ts', 'Web framework para qualquer runtime', 'intermediário', ...TS),
      R('TanStack/query', 'packages/query-core/src/queryClient.ts', 'Cache de dados assíncronos', 'avançado', ...TS),
      R('microsoft/vscode', 'src/vs/base/common/event.ts', 'Padrões de um app gigante', 'avançado', ...TS),
    ],
  },
  {
    id: 'go', titulo: 'Go', grupo: 'Linguagens', ext: 'go', cor: 'sky',
    resumo: 'Testes primeiro, CLIs, HTTP e a stdlib.',
    repos: [
      R('quii/learn-go-with-tests', 'hello-world/v1/hello.go', 'Go aprendendo por testes', 'iniciante', ...GO),
      R('spf13/cobra', 'command.go', 'A base de CLIs como o kubectl', 'intermediário', ...GO),
      R('go-chi/chi', 'mux.go', 'Roteador idiomático, sem mágica', 'intermediário', ...GO),
      R('gin-gonic/gin', 'gin.go', 'HTTP rápido e direto', 'intermediário', ...GO),
      R('charmbracelet/bubbletea', 'tea.go', 'Interfaces de terminal no estilo Elm', 'intermediário', ...GO),
      R('golang/go', 'src/net/http/server.go', 'A stdlib, o Go mais bem escrito', 'avançado', ...GO),
    ],
  },
  {
    id: 'rust', titulo: 'Rust', grupo: 'Linguagens', ext: 'rs', cor: 'peach',
    resumo: 'Exercícios, async com Tokio e CLIs de referência.',
    repos: [
      R('rust-lang/rustlings', 'exercises/01_variables/variables1.rs', 'Exercícios curtos guiados pelo compilador', 'iniciante', ...RS),
      R('tokio-rs/mini-redis', 'src/server.rs', 'Tokio explicado num Redis de estudo', 'intermediário', ...RS),
      R('tokio-rs/axum', 'examples/todos/src/main.rs', 'API web, com exemplos prontos', 'intermediário', ...RS),
      R('sharkdp/bat', 'src/bin/bat/main.rs', 'CLI bem organizada', 'intermediário', ...RS),
      R('BurntSushi/ripgrep', 'crates/core/main.rs', 'Busca rápida, código exemplar', 'avançado', ...RS),
      R('rust-lang/rust', 'library/core/src/option.rs', 'Option e Result por dentro', 'avançado', ...RS),
    ],
  },
  {
    id: 'c', titulo: 'C', grupo: 'Linguagens', ext: 'c', cor: 'lavender',
    resumo: 'Programas pequenos e completos até C de produção.',
    repos: [
      R('antirez/kilo', 'kilo.c', 'Editor de texto em ~1 000 linhas', 'iniciante', ...C),
      R('nothings/stb', 'stb_image.h', 'Bibliotecas de um arquivo só', 'intermediário', ...C),
      R('redis/redis', 'src/adlist.c', 'C limpo de produção', 'intermediário', ...C),
      R('curl/curl', 'lib/url.c', 'Rede portátil em C', 'avançado', ...C),
      R('sqlite/sqlite', 'src/btree.c', 'Um banco num arquivo, C exemplar', 'avançado', ...C),
    ],
  },
  {
    id: 'java', titulo: 'Java', grupo: 'Linguagens', ext: 'java', cor: 'red',
    resumo: 'Algoritmos, padrões de projeto e Spring.',
    repos: [
      R('TheAlgorithms/Java', 'src/main/java/com/thealgorithms/sorts/QuickSort.java', 'Algoritmos clássicos', 'iniciante', ...JAVA),
      R('iluwatar/java-design-patterns', 'singleton/src/main/java/com/iluwatar/singleton/IvoryTower.java', 'Cada padrão com exemplo', 'iniciante', ...JAVA),
      R('spring-projects/spring-petclinic', 'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java', 'App Spring de referência', 'intermediário', ...JAVA),
      R('google/guava', 'guava/src/com/google/common/collect/ImmutableList.java', 'APIs Java no estado da arte', 'avançado', ...JAVA),
    ],
  },
  {
    id: 'csharp', titulo: 'C#', grupo: 'Linguagens', ext: 'cs', cor: 'mauve',
    resumo: 'Arquitetura limpa e o .NET por dentro.',
    repos: [
      R('ardalis/CleanArchitecture', 'src/Clean.Architecture.Core/ContributorAggregate/Contributor.cs', 'Clean Architecture na prática', 'intermediário', ...CS),
      R('dotnet/eShop', 'src/Catalog.API/Apis/CatalogApi.cs', 'App .NET de referência da Microsoft', 'intermediário', ...CS),
      R('dotnet/runtime', 'src/libraries/System.Private.CoreLib/src/System/Collections/Generic/List.cs', 'A biblioteca base por dentro', 'avançado', ...CS),
    ],
  },

  // ---------- Temas ----------
  {
    id: 'apis', titulo: 'APIs e back-end', grupo: 'Temas', icone: 'server', cor: 'green',
    resumo: 'Clientes, roteadores e APIs completas.',
    repos: [
      R('psf/requests', 'src/requests/sessions.py', 'Como uma API deve parecer', 'iniciante', ...PY),
      R('expressjs/express', 'lib/application.js', 'O middleware que virou padrão', 'iniciante', ...JS),
      R('fastapi/full-stack-fastapi-template', 'backend/app/api/routes/items.py', 'API completa: auth, banco e testes', 'intermediário', ...PY),
      R('gothinkster/node-express-realworld-example-app', 'src/app/routes/article/article.controller.ts', 'A API RealWorld (um Medium)', 'intermediário', ...TS),
      R('encode/starlette', 'starlette/routing.py', 'O ASGI por baixo do FastAPI', 'intermediário', ...PY),
      R('tokio-rs/axum', 'axum/src/routing/mod.rs', 'Roteamento tipado em Rust', 'avançado', ...RS),
      R('dotnet/eShop', 'src/Catalog.API/Apis/CatalogApi.cs', 'Microsserviços em .NET', 'avançado', ...CS),
    ],
  },
  {
    id: 'frontend', titulo: 'Front-end', grupo: 'Temas', icone: 'layout', cor: 'sapphire',
    resumo: 'Virtual DOM, reatividade e cache no cliente.',
    repos: [
      R('pmndrs/zustand', 'src/vanilla.ts', 'Estado em poucas linhas', 'iniciante', ...TS),
      R('preactjs/preact', 'src/diff/index.js', 'Como o virtual DOM funciona', 'intermediário', ...JS),
      R('vuejs/core', 'packages/reactivity/src/ref.ts', 'A reatividade do Vue', 'intermediário', ...TS),
      R('sveltejs/svelte', 'packages/svelte/src/internal/client/reactivity/sources.js', 'Signals do Svelte 5', 'avançado', ...JS),
      R('TanStack/query', 'packages/query-core/src/queryClient.ts', 'Cache de servidor no cliente', 'avançado', ...TS),
      R('facebook/react', 'packages/react-reconciler/src/ReactFiberWorkLoop.js', 'O agendador do React', 'avançado', ...JS),
    ],
  },
  {
    id: 'algoritmos', titulo: 'Algoritmos', grupo: 'Temas', icone: 'branch', cor: 'teal',
    resumo: 'Estruturas de dados clássicas, com testes.',
    repos: [
      R('TheAlgorithms/Python', 'sorts/quick_sort.py', 'Centenas de algoritmos em Python', 'iniciante', ...PY),
      R('trekhleb/javascript-algorithms', 'src/algorithms/sorting/quick-sort/QuickSort.js', 'Com explicação e complexidade', 'iniciante', ...JS),
      R('TheAlgorithms/Java', 'src/main/java/com/thealgorithms/sorts/QuickSort.java', 'Os mesmos, em Java', 'iniciante', ...JAVA),
      R('rust-lang/rust', 'library/alloc/src/vec/mod.rs', 'Como um vetor cresce de verdade', 'avançado', ...RS),
    ],
  },
  {
    id: 'compiladores', titulo: 'Compiladores', grupo: 'Temas', icone: 'code', cor: 'pink',
    resumo: 'Do tokenizador ao gerador de código.',
    repos: [
      R('jamiebuilds/the-super-tiny-compiler', 'the-super-tiny-compiler.js', 'As fases de um compilador', 'iniciante', ...JS),
      R('munificent/craftinginterpreters', 'java/com/craftinginterpreters/lox/Scanner.java', 'O código do livro Crafting Interpreters', 'intermediário', ...JAVA),
      R('kanaka/mal', 'impls/python3/step1_read_print.py', 'Um Lisp em 11 passos', 'intermediário', ...PY),
      R('rui314/chibicc', 'tokenize.c', 'Compilador C, commit a commit', 'avançado', ...C),
    ],
  },
  {
    id: 'so', titulo: 'Sistemas operacionais', grupo: 'Temas', icone: 'cpu', cor: 'maroon',
    resumo: 'Do setor de boot ao agendador do Linux.',
    repos: [
      R('cfenollosa/os-tutorial', '01-bootsector-barebones/boot_sect_simple.asm', 'Um SO desde o boot', 'iniciante', 'Assembly', 'asm'),
      R('mit-pdos/xv6-riscv', 'kernel/proc.c', 'O Unix das aulas do MIT', 'intermediário', ...C),
      R('torvalds/linux', 'kernel/sched/core.c', 'O agendador do Linux', 'avançado', ...C),
    ],
  },
  {
    id: 'bancos', titulo: 'Bancos de dados', grupo: 'Temas', icone: 'database', cor: 'flamingo',
    resumo: 'B-trees, chave-valor e motores reais.',
    repos: [
      R('cstack/db_tutorial', 'db.c', 'Um clone do SQLite, passo a passo', 'iniciante', ...C),
      R('tokio-rs/mini-redis', 'src/server.rs', 'Servidor Redis de estudo', 'intermediário', ...RS),
      R('etcd-io/bbolt', 'db.go', 'Chave-valor com B+tree em Go', 'intermediário', ...GO),
      R('redis/redis', 'src/server.c', 'O Redis de verdade', 'avançado', ...C),
      R('sqlite/sqlite', 'src/btree.c', 'A B-tree mais usada do mundo', 'avançado', ...C),
      R('postgres/postgres', 'src/backend/access/nbtree/nbtree.c', 'Índices do PostgreSQL', 'avançado', ...C),
    ],
  },
  {
    id: 'ia', titulo: 'IA e LLMs', grupo: 'Temas', icone: 'sparkles', cor: 'mauve',
    resumo: 'Redes neurais e GPTs, do zero ao real.',
    repos: [
      R('karpathy/micrograd', 'micrograd/engine.py', 'Backpropagation sem mistério', 'iniciante', ...PY),
      R('karpathy/nanoGPT', 'model.py', 'Um GPT em ~300 linhas', 'intermediário', ...PY),
      R('rasbt/LLMs-from-scratch', 'ch04/01_main-chapter-code/ch04.ipynb', 'Um LLM do zero, em notebooks', 'intermediário', ...PY),
      R('karpathy/llm.c', 'train_gpt2.c', 'Treinar o GPT-2 em C puro', 'avançado', ...C),
      R('huggingface/transformers', 'src/transformers/models/gpt2/modeling_gpt2.py', 'O GPT-2 de referência', 'avançado', ...PY),
      R('ggml-org/llama.cpp', 'src/llama.cpp', 'Inferência local em C++', 'avançado', ...CPP),
    ],
  },
  {
    id: 'infra', titulo: 'Containers e infra', grupo: 'Temas', icone: 'box', cor: 'blue',
    resumo: 'Namespaces, consenso e orquestração.',
    repos: [
      R('lizrice/containers-from-scratch', 'main.go', 'Um container em ~100 linhas', 'iniciante', ...GO),
      R('etcd-io/raft', 'raft.go', 'Consenso Raft legível', 'avançado', ...GO),
      R('prometheus/prometheus', 'tsdb/head.go', 'Banco de séries temporais', 'avançado', ...GO),
      R('kubernetes/kubernetes', 'pkg/scheduler/schedule_one.go', 'Como o Kubernetes escolhe o nó', 'avançado', ...GO),
    ],
  },
];

export type Famoso = Indicado & { categoria: string };
const F = (repo: string, start: string, nota: string, categoria: string, lang: readonly [string, string]): Famoso => ({ repo, start, nota, categoria, nivel: 'avançado', lang: lang[0], ext: lang[1] });

export const FAMOSOS: Famoso[] = [
  F('torvalds/linux', 'kernel/fork.c', 'O kernel que roda o mundo', 'Sistemas', C),
  F('git/git', 'read-cache.c', 'O controle de versão de todos', 'Sistemas', C),
  F('curl/curl', 'lib/transfer.c', 'Transferências em bilhões de aparelhos', 'Sistemas', C),
  F('nginx/nginx', 'src/core/nginx.c', 'Servidor web e proxy', 'Sistemas', C),
  F('FFmpeg/FFmpeg', 'libavcodec/avcodec.c', 'Áudio e vídeo em tudo', 'Sistemas', C),
  F('golang/go', 'src/net/http/server.go', 'A linguagem Go', 'Linguagens', GO),
  F('rust-lang/rust', 'library/alloc/src/vec/mod.rs', 'A linguagem Rust', 'Linguagens', RS),
  F('python/cpython', 'Lib/json/encoder.py', 'O Python oficial', 'Linguagens', PY),
  F('nodejs/node', 'lib/events.js', 'JavaScript no servidor', 'Linguagens', JS),
  F('denoland/deno', 'cli/main.rs', 'Runtime JS e TS seguro', 'Linguagens', RS),
  F('postgres/postgres', 'src/backend/executor/execMain.c', 'O banco relacional mais completo', 'Dados', C),
  F('sqlite/sqlite', 'src/where.c', 'O banco mais usado do planeta', 'Dados', C),
  F('redis/redis', 'src/server.c', 'Estruturas de dados em memória', 'Dados', C),
  F('facebook/react', 'packages/react/src/ReactHooks.js', 'Interfaces com componentes', 'Web', JS),
  F('vuejs/core', 'packages/reactivity/src/ref.ts', 'Framework progressivo', 'Web', TS),
  F('django/django', 'django/db/models/query.py', 'Web em Python, com baterias', 'Web', PY),
  F('tailwindlabs/tailwindcss', 'packages/tailwindcss/src/compile.ts', 'CSS utilitário', 'Web', TS),
  F('flutter/flutter', 'packages/flutter/lib/src/widgets/framework.dart', 'Apps para todas as telas', 'Web', ['Dart', 'dart']),
  F('pytorch/pytorch', 'torch/nn/modules/linear.py', 'Deep learning', 'IA', PY),
  F('ggml-org/llama.cpp', 'src/llama.cpp', 'LLMs rodando em qualquer máquina', 'IA', CPP),
  F('ollama/ollama', 'server/routes.go', 'Modelos locais com uma linha', 'IA', GO),
  F('microsoft/vscode', 'src/vs/editor/common/model/textModel.ts', 'O editor mais usado', 'Ferramentas', TS),
  F('neovim/neovim', 'src/nvim/main.c', 'O Vim, renovado', 'Ferramentas', C),
  F('kubernetes/kubernetes', 'pkg/scheduler/schedule_one.go', 'Orquestração de containers', 'Ferramentas', GO),
  F('godotengine/godot', 'core/object/object.cpp', 'Motor de jogos livre', 'Ferramentas', CPP),
  F('bitcoin/bitcoin', 'src/validation.cpp', 'A primeira criptomoeda', 'Ferramentas', CPP),
  F('home-assistant/core', 'homeassistant/core.py', 'Automação residencial', 'Ferramentas', PY),
];

export const CATEGORIAS = ['Todos', 'Sistemas', 'Linguagens', 'Dados', 'Web', 'IA', 'Ferramentas'] as const;
