// Monta a lista do Estudar: repositórios de pessoas (não de organizações) para estudar, em várias áreas
// (back-end, front-end, mobile, dados e IA, DevOps, jogos, ferramentas, sistemas), escolhidos pela
// qualidade do README. Gera src/data/catalogo/estudo/ (um arquivo por área e indice.json).
//
// Uso: node scripts/catalogo-estudo.mjs              (busca e substitui a lista)
//      node scripts/catalogo-estudo.mjs --somar      (busca e acrescenta ao que já existe)
//      node scripts/catalogo-estudo.mjs --reavaliar  (não busca: relê os READMEs da lista atual e refaz notas e etiquetas)
//      --area=jogos,mobile                           (só as buscas dessas áreas; combina com --somar)
//
// Busca pelo GitHub (gh api, já autenticado; ou fetch com GITHUB_TOKEN) e lê os READMEs pelo
// raw.githubusercontent.com. Grava em src/data/catalogo/estudo/<área>.json. A nota do README é uma heurística: tamanho, seções, como rodar,
// como funciona (rotas, telas, comandos, resultados), tecnologias, arquitetura, testes e imagens.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// A lista fica em src/data/catalogo/estudo/<área>.json (o site baixa só a área aberta) mais indice.json
// (contagens e a amostra do carrossel). CATALOGO_SAIDA troca a pasta, para testar regras numa cópia.
const PASTA = process.env.CATALOGO_SAIDA ?? path.join(ROOT, 'src', 'data', 'catalogo', 'estudo');
const ANTIGO = path.join(ROOT, 'src', 'data', 'catalogo', 'estudo.json'); // formato de antes, num arquivo só: lido uma vez e apagado
const VITRINE_POR_AREA = 25;
const SOMAR = process.argv.includes('--somar');
const REAVALIAR = process.argv.includes('--reavaliar');
const SO_AREAS = process.argv.find((a) => a.startsWith('--area='))?.slice(7).split(',');
const NOTA_MINIMA = 12.5;
const POR_PESSOA = 3;
const FILTRO = 'stars:3..1500 fork:false archived:false pushed:>2021-06-01';

// ---------- o que buscar, por área ----------
const BUSCAS = {
  backend: [
    // assuntos de projetos de estudo
    'bookstore api', 'library management api', 'api livraria', 'api biblioteca',
    'ecommerce api', 'e-commerce backend', 'shopping cart api', 'loja virtual api', 'marketplace api',
    'bank api', 'banking api', 'digital wallet api', 'payment api', 'carteira digital api', 'crypto exchange backend',
    'blog api', 'todo api', 'task manager api', 'tarefas api', 'notes api', 'url shortener api', 'encurtador url',
    'hotel booking api', 'reservation api', 'appointment scheduling api', 'agendamento api', 'barbearia api',
    'school management api', 'student management api', 'online course api', 'inventory api', 'estoque api',
    'parking api', 'movie api', 'music streaming backend', 'recipe api', 'food delivery api', 'restaurant api',
    'expense tracker api', 'finance api', 'social network api', 'twitter clone backend', 'chat backend websocket',
    'event ticket api', 'job board api', 'clinic api', 'hospital management api', 'pharmacy api', 'gym api', 'pet api',
    'petshop api', 'car rental api', 'real estate api', 'news api backend', 'quiz api', 'forum api', 'voting api',
    'helpdesk api', 'crm api', 'ride sharing backend', 'video streaming backend', 'file upload api', 'notification service',
    'auction api', 'logistics api', 'delivery tracking api', 'football api', 'weather api backend', 'travel api', 'hr management api',
    // padrões e arquitetura
    'clean architecture api', 'hexagonal architecture api', 'ddd api', 'cqrs api', 'event sourcing', 'arquitetura limpa',
    'microservices api', 'microsservicos', 'graphql api', 'grpc api', 'jwt authentication api', 'oauth2 api',
    'rabbitmq api', 'kafka microservices', 'redis cache api', 'rate limiter api', 'api gateway', 'saga pattern', 'outbox pattern',
    // desafios de back-end
    'desafio backend', 'desafio back-end', 'rinha de backend', 'backend challenge api', 'teste tecnico api', 'desafio picpay',
    // por stack
    'spring boot rest api', 'nestjs api', 'express typescript api', 'express mongodb api', 'fastapi crud',
    'django rest framework api', 'flask rest api', 'laravel api', 'golang rest api', 'gin gorm api',
    'rust axum api', 'actix web api', 'asp.net core web api', 'kotlin spring api', 'ktor api', 'rails api',
    'phoenix elixir api', 'prisma api', 'fastify api', 'echo golang api', 'adonisjs api', 'quarkus api', 'hono api', 'bun api',
  ],
  frontend: [
    'react ecommerce', 'react todo app', 'react weather app', 'react movie app', 'react quiz app', 'react chat app',
    'react kanban', 'react expense tracker', 'react dashboard', 'react recipe app', 'react pokedex', 'react blog',
    'netflix clone', 'spotify clone', 'twitter clone react', 'youtube clone', 'airbnb clone', 'amazon clone', 'trello clone',
    'nextjs ecommerce', 'nextjs blog', 'nextjs dashboard', 'nextjs saas', 'vue app', 'vue ecommerce', 'vue dashboard', 'nuxt app',
    'angular app', 'angular crud', 'angular ecommerce', 'svelte app', 'sveltekit app', 'solidjs app',
    'tailwind dashboard', 'react redux', 'zustand react', 'react query app', 'design system react', 'component library react',
    'storybook components', 'pwa app', 'javascript vanilla project', 'projeto react', 'projeto front-end', 'desafio frontend',
    'frontend mentor', 'react typescript project', 'astro blog', 'remix app',
    // mais assuntos, nas várias bibliotecas
    'react notes app', 'react calculator', 'react music player', 'react portfolio', 'react landing page', 'react admin panel',
    'react crypto tracker', 'react github finder', 'react news app', 'react shopping cart', 'react food delivery', 'react hotel booking',
    'react real estate', 'react job board', 'react social media', 'react video player', 'react game', 'react markdown editor',
    'react drag and drop', 'react infinite scroll', 'react form validation', 'react hooks project', 'react context api', 'react router project',
    'react firebase app', 'react supabase app', 'react tmdb', 'react rick and morty', 'react countries api', 'react pomodoro',
    'vue todo', 'vue weather app', 'vue movie app', 'vue pinia', 'vue 3 composition api', 'nuxt ecommerce', 'nuxt blog',
    'angular dashboard', 'angular weather', 'angular ngrx', 'angular material app', 'angular signals',
    'svelte todo', 'sveltekit blog', 'svelte weather', 'nextjs portfolio', 'nextjs app router', 'nextjs prisma', 'nextjs tailwind',
    'nextjs supabase', 'nextjs stripe', 'nextjs auth', 'vite react app', 'typescript frontend project',
    'clone netflix react', 'clone spotify', 'clone twitter', 'clone instagram', 'clone whatsapp web', 'clone ifood', 'clone nubank',
    'projeto react typescript', 'aplicacao react', 'site react', 'rocketseat react', 'ignite react', 'nlw react', 'alura react',
    'html css javascript project', 'vanilla js app', 'javascript dom project', 'css animations project', 'responsive website',
    'web components', 'three.js portfolio', 'chrome dino game javascript', 'pwa react',
  ],
  mobile: [
    'flutter app', 'flutter ecommerce', 'flutter todo', 'flutter clean architecture', 'flutter firebase app', 'flutter bloc',
    'flutter riverpod', 'react native app', 'react native expo', 'expo app', 'react native ecommerce', 'react native chat',
    'android kotlin app', 'jetpack compose app', 'android mvvm', 'android room', 'kotlin multiplatform app',
    'swiftui app', 'ios swift app', 'swiftui mvvm', 'aplicativo flutter', 'aplicativo react native', 'mobile app weather',
  ],
  dados: [
    'exploratory data analysis', 'data analysis python', 'analise de dados python', 'ciencia de dados projeto', 'data science project',
    'machine learning project', 'house price prediction', 'sentiment analysis', 'customer churn prediction', 'recommendation system',
    'fraud detection', 'stock price prediction', 'image classification cnn', 'object detection yolo', 'face recognition',
    'rag chatbot', 'langchain chatbot', 'llm app', 'ai agent python', 'openai api app', 'streamlit dashboard', 'streamlit app',
    'etl pipeline', 'airflow pipeline', 'dbt project', 'data engineering project', 'spark data pipeline', 'web scraping python',
    'nlp project', 'time series forecasting', 'deep learning project', 'pytorch project', 'tensorflow project', 'kaggle competition',
    'power bi python', 'dashboard plotly', 'engenharia de dados', 'aprendizado de maquina',
  ],
  devops: [
    'terraform aws', 'terraform project', 'terraform modules', 'ansible playbook', 'kubernetes manifests', 'kubernetes deployment app',
    'helm chart', 'github actions ci cd', 'devops project', 'homelab', 'docker compose stack', 'prometheus grafana monitoring',
    'gitops argocd', 'jenkins pipeline', 'aws serverless', 'aws lambda project', 'infraestrutura como codigo', 'projeto devops',
    'ci cd pipeline docker', 'nginx reverse proxy docker', 'k3s cluster',
  ],
  jogos: [
    'pygame game', 'unity game', 'godot game', 'phaser game', 'javascript game canvas', 'snake game', 'tetris game', 'chess engine',
    'platformer game', 'roguelike', 'raylib game', 'sdl2 game', 'bevy game', 'libgdx game', 'monogame game', 'multiplayer game',
    'jogo python', 'jogo em c', 'love2d game', 'three.js game', 'pong game', 'sudoku solver', 'jogo javascript', 'game engine from scratch',
  ],
  ferramentas: [
    'cli tool go', 'cli tool rust', 'command line tool python', 'tui app', 'terminal app', 'discord bot', 'telegram bot', 'whatsapp bot',
    'web scraper', 'automation scripts python', 'file organizer', 'password manager cli', 'todo cli', 'markdown cli', 'cli node',
    'vscode extension', 'chrome extension', 'browser extension', 'git cli tool', 'automacao python',
  ],
  sistemas: [
    'compiler from scratch', 'interpreter written in', 'toy programming language', 'chip-8 emulator', 'nes emulator', 'gameboy emulator',
    'operating system from scratch', 'hobby kernel', 'http server from scratch', 'build your own redis', 'build your own git', 'codecrafters',
    'key value store', 'database from scratch', 'shell implementation', 'memory allocator', 'virtual machine bytecode', 'ray tracer',
    'tcp server c', 'load balancer go', 'compilador', 'interpretador', 'lisp interpreter', 'regex engine', 'container runtime from scratch',
  ],
};

// linguagens do GitHub que o Cerne mostra (as outras ficam de fora)
const LINGUAGENS = new Set([
  'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'Kotlin', 'C#', 'PHP', 'Ruby', 'Elixir', 'Dart', 'C', 'C++', 'Scala',
  'Swift', 'Shell', 'HCL', 'Jupyter Notebook', 'GDScript', 'Lua', 'Vue', 'Svelte', 'HTML', 'CSS', 'Zig', 'Haskell', 'Assembly', 'OCaml',
]);

// ---------- acesso ao GitHub ----------
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const rodar = promisify(execFile);
// a busca do GitHub aceita 30 consultas por minuto: uma nova a cada 2,2 s, várias em andamento ao mesmo tempo
let proximaVez = 0;
async function minhaVez() {
  const agora = Date.now();
  const espera = Math.max(0, proximaVez - agora);
  proximaVez = Math.max(agora, proximaVez) + 2200;
  await dormir(espera);
}
async function buscar(q, pagina = 1) {
  await minhaVez();
  const consulta = `${q} ${FILTRO}`;
  if (process.env.GITHUB_TOKEN) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(consulta)}&per_page=100&page=${pagina}`;
    return fetch(url, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }).then((r) => r.json());
  }
  const { stdout } = await rodar('gh', ['api', '-X', 'GET', 'search/repositories', '-f', `q=${consulta}`, '-f', 'per_page=100', '-f', `page=${pagina}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return JSON.parse(stdout);
}

async function readme(repo, ramo) {
  for (const nome of ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.rst', 'README']) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ramo)}/${nome}`);
      if (r.ok) return await r.text();
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

// Arquivo de dependências na raiz: diz o que o projeto usa de verdade (o README às vezes só cita).
const MANIFESTOS = {
  JavaScript: ['package.json'], TypeScript: ['package.json'], Vue: ['package.json'], Svelte: ['package.json'], HTML: ['package.json'],
  Python: ['requirements.txt', 'pyproject.toml', 'Pipfile'], 'Jupyter Notebook': ['requirements.txt'],
  Java: ['pom.xml', 'build.gradle', 'build.gradle.kts'], Kotlin: ['build.gradle.kts', 'build.gradle', 'pom.xml', 'app/build.gradle.kts', 'app/build.gradle'], Scala: ['build.sbt'],
  Go: ['go.mod'], Rust: ['Cargo.toml'], PHP: ['composer.json'], Ruby: ['Gemfile'], Dart: ['pubspec.yaml'], Elixir: ['mix.exs'],
};
async function manifesto(repo, lang) {
  for (const nome of MANIFESTOS[lang] ?? []) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${nome}`);
      if (r.ok) return await r.text();
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

// ---------- nota do README ----------
const semCodigo = (t) => t.replace(/```[\s\S]*?```/g, ' ');
const MODELO_PRONTO = /bootstrapped with \[?Create React App|This template provides a minimal setup|Welcome to your new TanStack|This is a \[Next\.js\]\(https:\/\/nextjs\.org\) project bootstrapped|This project was generated with \[Angular CLI\]|# Getting Started with Create React App|A new Flutter project\.\s*## Getting Started/i;
function notaDoReadme(t) {
  if (!t) return { nota: 0, motivo: 'sem README' };
  const texto = semCodigo(t);
  const tamanho = texto.replace(/\s+/g, ' ').length;
  if (tamanho < 700) return { nota: 0, motivo: 'README curto' };
  if (MODELO_PRONTO.test(t)) return { nota: 0, motivo: 'modelo pronto' };
  const titulos = (t.match(/^#{1,3}\s+\S/gm) ?? []).length;
  if (titulos < 3) return { nota: 0, motivo: 'poucas seções' };
  let n = Math.min(tamanho / 900, 6) + Math.min(titulos, 10) * 0.45;
  const tem = (re, pts) => (re.test(t) ? pts : 0);
  n += tem(/(instala|install|getting started|como (rodar|executar|usar|iniciar|jogar)|run(ning)? (it )?locally|setup|configura|pré-requisitos|prerequisites|requirements)/i, 2);
  // como funciona: rotas (back-end), telas (front, mobile, jogos), comandos (CLI), resultados (dados), diagramas (infra)
  n += tem(/(endpoints?|rotas|routes|\b(GET|POST|PUT|DELETE|PATCH)\s+`?\/|swagger|openapi|postman|insomnia|api docs?|screenshots?|capturas? de tela|demo|preview|telas|usage|\buso\b|comandos|commands|controls|controles|como jogar|how to play|results|resultados|dataset|accuracy|métricas|metrics|diagram)/i, 2.5);
  n += tem(/(tecnologias|technologies|tech stack|built with|stack|ferramentas utilizadas|tools|bibliotecas|libraries)/i, 1.5);
  n += tem(/(arquitetura|architecture|clean code|clean arch|hexagonal|\bddd\b|\bsolid\b|camadas|layers|design patterns?|padrões|mvvm|\bmvc\b|project structure|estrutura do projeto|folder structure)/i, 2);
  n += tem(/(\btests?\b|testes|jest|pytest|junit|vitest|coverage|cobertura)/i, 1);
  n += tem(/docker/i, 0.5);
  n += tem(/(features|funcionalidades|recursos)/i, 1);
  const imagens = (t.match(/!\[[^\]]*\]\((?!https?:\/\/img\.shields\.io)[^)]+\)|<img\b(?![^>]*shields\.io)/gi) ?? []).length;
  n += Math.min(imagens, 3) * 0.5;
  return { nota: Math.round(n * 10) / 10, motivo: '' };
}

// ---------- etiquetas ----------
const tudo = (it, t) => `${it.full_name} ${it.description ?? ''} ${(it.topics ?? []).join(' ')} ${t ?? ''}`;
const cabeca = (it, t) => `${it.full_name.replace(/[-_]/g, ' ')} ${it.description ?? ''} ${(it.topics ?? []).join(' ')} ${(t ?? '').slice(0, 1500)}`;
const identidadeDe = (it) => `${it.full_name.replace(/[-_]/g, ' ')} ${it.description ?? ''} ${(it.topics ?? []).join(' ').replace(/-/g, ' ')}`;

// Sinais de cada área (contados no nome, descrição e tópicos). Vence a área com mais sinais;
// a área da busca que achou o repositório ganha um empurrão e desempata.
const AREAS = {
  backend: [/back ?end/i, /\b(rest(ful)?|crud) ?api\b|\bapi (rest|restful)\b/i, /\bservidor\b|\bserver\b(?! ?(side )?render)/i, /micro ?servi/i, /\b(express|nestjs|spring ?boot|django|fastapi|flask|laravel|gin|asp\.?net|rails|phoenix|ktor|actix|axum|fastify|adonis|quarkus)\b/i, /\b(graphql|grpc)\b/i, /\bapi\b/i],
  frontend: [/front ?end/i, /\breact(js)?\b(?! ?native)/i, /\b(next\.?js|nextjs|vue(js)?|nuxt|angular|svelte(kit)?|solid ?js|astro|remix)\b/i, /\b(tailwind|css|html|landing page|website|web ?app|spa|ui|pwa)\b/i, /\b(redux|zustand|pinia|storybook)\b/i, /\bclone\b/i],
  mobile: [/\b(android|ios)\b/i, /\b(flutter|react native|expo|swiftui|jetpack compose|kotlin multiplatform)\b/i, /\bmobile\b|\baplicativo\b/i],
  dados: [/(machine learning|aprendizado de m[áa]quina|deep learning|\bml\b)/i, /(data (analysis|science|engineering|pipeline|visuali)|an[áa]lise de dados|ci[êe]ncia de dados|engenharia de dados)/i, /\b(pandas|numpy|scikit|sklearn|pytorch|tensorflow|keras|jupyter|notebook|kaggle|streamlit|plotly)\b/i, /\b(llm|rag|langchain|openai|gpt|ollama|chatbot|nlp|embeddings?)\b/i, /\b(prediction|previs[ãa]o|classification|classifica|regression|forecast|computer vision|yolo|opencv|dataset)\b/i, /\b(etl|airflow|dbt|spark|data warehouse)\b/i],
  devops: [/\b(terraform|ansible|pulumi|cloudformation)\b/i, /\b(kubernetes|k8s|k3s|helm|argo ?cd)\b/i, /(ci ?\/ ?cd|github actions|gitlab ci|jenkins)/i, /\b(devops|homelab|infra(structure|estrutura)?|iac|sre)\b/i, /\b(prometheus|grafana|monitoring|monitoramento|observab)/i],
  jogos: [/\b(game|games|jogo|jogos)\b/i, /\b(unity|godot|pygame|phaser|raylib|bevy|libgdx|monogame|love2d|sdl2?)\b/i, /\b(platformer|roguelike|tetris|snake|chess|xadrez|sudoku|pong|rpg|arcade)\b/i],
  ferramentas: [/\bcli\b|command[- ]line|linha de comando/i, /\b(tui|terminal)\b/i, /\bbot\b/i, /\b(scraper|scraping|crawler|automation|automa[çc][ãa]o)\b/i, /\b(extension|extens[ãa]o|vscode|plugin)\b/i],
  sistemas: [/\b(compiler|compilador|interpreter|interpretador|lexer|parser|bytecode|toy language|programming language)\b/i, /\b(emulator|emulador|chip-?8|gameboy|nes)\b/i, /(operating system|sistema operacional|\bkernel\b|bootloader)/i, /(from scratch|build your own|codecrafters|do zero)/i, /\b(allocator|ray ?tracer|virtual machine|key[- ]value store|storage engine|b-?tree)\b/i],
};
const ORDEM_AREAS = Object.keys(AREAS);

const DE_SERVIDOR = ['Express', 'NestJS', 'Fastify', 'Hono', 'AdonisJS', 'Spring Boot', 'Quarkus', 'Django', 'DRF', 'FastAPI', 'Flask', 'Laravel', 'Gin', 'Echo', 'Fiber', 'Axum', 'Actix', 'Rocket', 'ASP.NET Core', 'Rails', 'Phoenix', 'Ktor'];
const DE_TELA = ['React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'Astro'];
const DE_CELULAR = ['React Native', 'Expo', 'Flutter', 'Jetpack Compose', 'SwiftUI'];
const DE_JOGO = ['Unity', 'Godot', 'Pygame', 'Phaser', 'Raylib', 'Bevy', 'LibGDX', 'MonoGame', 'LÖVE'];

function areaDe(it, dica, confirmada = []) {
  const id = identidadeDe(it);
  const pontos = Object.fromEntries(ORDEM_AREAS.map((a) => [a, AREAS[a].filter((re) => re.test(id)).length]));
  const base = { ...pontos };
  // as dependências confirmadas pesam mais que palavras soltas
  const tem = (l) => confirmada.some((x) => l.includes(x));
  if (tem(DE_CELULAR)) pontos.mobile += 2;
  if (tem(DE_JOGO)) pontos.jogos += 2;
  if (tem(DE_SERVIDOR)) pontos.backend += 1.5;
  if (tem(DE_TELA) && !tem(DE_SERVIDOR) && !tem(DE_CELULAR)) pontos.frontend += 1.5;
  // a linguagem já diz muito
  if (it.language === 'Jupyter Notebook') pontos.dados += 2;
  if (it.language === 'HCL') pontos.devops += 2;
  if (it.language === 'GDScript') pontos.jogos += 2;
  if (it.language === 'Swift' || it.language === 'Dart') pontos.mobile += 1;
  if (['Vue', 'Svelte', 'HTML', 'CSS'].includes(it.language)) pontos.frontend += 1;
  if (dica && pontos[dica] !== undefined) pontos[dica] += 1.5;
  let melhor = dica && pontos[dica] !== undefined ? dica : 'backend';
  for (const a of ORDEM_AREAS) if (pontos[a] > pontos[melhor]) melhor = a;
  return { area: melhor, sinais: base[melhor] + (pontos[melhor] - base[melhor] - (melhor === dica ? 1.5 : 0)) };
}

// [id, regex, áreas em que o tema vale (vazio = todas)]
const TEMAS = [
  ['apis', /\b(rest(ful)?|api|crud|endpoints?)\b/i, ['backend']],
  ['graphql', /graphql/i, ['backend', 'frontend']],
  ['microsservicos', /micro[- ]?servi(ce|ço)s?/i, ['backend', 'devops']],
  ['auth', /\b(jwt|oauth2?|authentication|autentica(ção|cao)|spring security|passport\.?js|refresh tokens?|next-?auth|firebase auth)\b/i, ['backend', 'frontend', 'mobile']],
  ['arquitetura', /(clean arch|arquitetura limpa|hexagonal|\bddd\b|domain[- ]driven|\bcqrs\b|onion arch|\bsolid\b|ports and adapters|\bmvvm\b|\bbloc\b pattern|feature[- ]sliced)/i, []],
  ['tempo-real', /(websockets?|socket\.io|real[- ]time|tempo real|\bsse\b|webrtc)/i, ['backend', 'frontend', 'mobile']],
  ['mensageria', /(rabbitmq|kafka|\bnats\b|\bsqs\b|message (queue|broker)|mensageria|event[- ]driven)/i, ['backend', 'devops']],
  ['fullstack', /(full[- ]?stack|\bmern\b|\bmean\b|\bpern\b|\bt3\b stack)/i, ['backend', 'frontend']],
  ['testes', /\b(tdd|unit tests?|testes (unit[áa]rios|automatizados)|integration tests?|e2e|cypress|playwright|vitest|jest|pytest|junit|testing library)\b/i, []],
  ['estado', /\b(redux|zustand|pinia|vuex|context api|recoil|mobx|ngrx|jotai|riverpod|provider|state management|gerenciamento de estado)\b/i, ['frontend', 'mobile']],
  ['interfaces', /(design system|component library|biblioteca de componentes|storybook|shadcn|material ui|\bmui\b|chakra|styled-components|anima[çc](ões|ao)|framer motion|responsiv)/i, ['frontend', 'mobile']],
  ['offline', /(offline|\bpwa\b|service worker|local storage|sqlite|room database|\bhive\b|realm)/i, ['frontend', 'mobile']],
  ['ml', /(machine learning|aprendizado de m[áa]quina|scikit|sklearn|regression|classification|random forest|xgboost|deep learning|neural network|redes neurais|pytorch|tensorflow|keras)/i, ['dados']],
  ['llm', /\b(llm|rag|langchain|llama ?index|openai|gpt|chatbot|ollama|embeddings?|vector (db|database|store)|agentes? de ia|ai agents?)\b/i, ['dados', 'backend', 'ferramentas']],
  ['analise', /(data analysis|an[áa]lise (de dados|explorat)|exploratory|\beda\b|pandas|data visuali|visualiza[çc][ãa]o de dados|dashboard|power ?bi|streamlit|plotly|seaborn)/i, ['dados']],
  ['etl', /\b(etl|elt|data pipeline|airflow|dbt|spark|data warehouse|data lake|data engineering|engenharia de dados)\b/i, ['dados', 'devops']],
  ['visao', /(computer vision|vis[ãa]o computacional|opencv|yolo|image classification|object detection|face recognition|reconhecimento facial)/i, ['dados']],
  ['containers', /\b(kubernetes|k8s|k3s|helm|docker swarm|container orchestration)\b/i, ['devops', 'backend']],
  ['iac', /\b(terraform|ansible|pulumi|cloudformation|infrastructure as code|infraestrutura como c[óo]digo|iac)\b/i, ['devops']],
  ['ci-cd', /(ci ?\/ ?cd|github actions|gitlab ci|jenkins|continuous (integration|deployment|delivery)|argo ?cd|gitops)/i, ['devops']],
  ['observabilidade', /\b(prometheus|grafana|observability|observabilidade|monitoring|monitoramento|opentelemetry|loki|elk)\b/i, ['devops']],
  ['multiplayer', /\b(multiplayer|netcode|online game|jogo online)\b/i, ['jogos']],
  ['compiladores', /\b(compiler|compilador|interpreter|interpretador|lexer|parser|bytecode|toy language|programming language|linguagem de programa[çc][ãa]o)\b/i, ['sistemas']],
  ['emuladores', /\b(emulator|emulador|chip-?8|gameboy|game boy|nes|virtual machine|m[áa]quina virtual)\b/i, ['sistemas']],
  ['so', /(operating system|sistema operacional|\bkernel\b|bootloader|\bx86\b|risc-?v|bare metal)/i, ['sistemas']],
  ['redes', /\b(tcp|udp|http server|servidor http|protocol|socket programming|dns|proxy|load balancer|balanceador)\b/i, ['sistemas', 'devops']],
  ['bancos', /(database engine|storage engine|b-?tree|key[- ]value store|\blsm\b|write[- ]ahead log|build your own (redis|sqlite|database))/i, ['sistemas']],
  ['automacao', /\b(bot|automation|automa[çc][ãa]o|scraper|scraping|crawler|web scraping)\b/i, ['ferramentas', 'dados']],
  ['terminal', /(\bcli\b|command[- ]line|linha de comando|\btui\b|terminal)/i, ['ferramentas', 'sistemas']],
];

// Assunto do projeto, pelo nome, descrição e tópicos. A primeira regra que casar vale (as mais específicas primeiro).
const DOMINIOS = [
  ['Livraria', /(book ?store|bookshop|livraria|\bbooks?\b|livros?|ebooks?)/i],
  ['Biblioteca', /(library management|biblioteca|lending|empr[ée]stimo)/i],
  ['Criptomoedas', /(crypto|bitcoin|blockchain|ethereum|web3|cripto)/i],
  ['Bancos e pagamentos', /(\bbank(ing)?\b|\bbanco\b|wallet|carteira|payments?|pagamentos?|picpay|\bpix\b|transfer[êe]ncias?)/i],
  ['Finanças pessoais', /(expenses?|despesas?|gastos|finan(ce|ças)|budget|or[çc]amento|stock price|investiment)/i],
  ['E-commerce', /(e-?commerce|shopping|\bcart\b|carrinho|\bloja\b|online store|web store|marketplace|\bproducts?\b|produtos|amazon clone)/i],
  ['Leilão', /(auction|leil[ãa]o)/i],
  ['Blog', /\bblog\b/i],
  ['Notícias', /\b(news|not[íi]cias|rss)\b/i],
  ['Fórum e perguntas', /(\bforum\b|f[óo]rum|q&a|stack ?overflow clone|reddit clone)/i],
  ['Tarefas', /(\btodos?\b|to-do|task manager|tarefas?|kanban|trello)/i],
  ['Notas', /\b(notes?|notas|note[- ]taking|anota[çc]\w*)\b/i],
  ['Chat', /\b(chat|messenger|whatsapp clone|mensagens)\b/i],
  ['Rede social', /(social network|social media|rede social|twitter clone|instagram clone|\bfeed\b|threads clone)/i],
  ['Encurtador de URL', /(url shortener|shortener|encurtador)/i],
  ['Reservas e hotéis', /(hotel|booking|reserva|airbnb)/i],
  ['Agendamentos', /(appointment|agendamento|scheduling|calend[áa]rio|calendar|barbe(r|ar)|sal[ãa]o de beleza)/i],
  ['Escola e cursos', /(school|escola|students?|alunos?|universit|matr[íi]cula|enrollment|\blms\b|online courses?|cursos online)/i],
  ['Quiz', /\b(quiz|trivia|flashcards?)\b/i],
  ['Filmes e séries', /(movies?|filmes?|cinema|netflix|tmdb|\bseries\b)/i],
  ['Música', /(\bmusic|m[úu]sica|spotify|playlist|\bsongs?\b|podcast)/i],
  ['Vídeos e streaming', /(video streaming|youtube clone|twitch|streaming de v[íi]deo|\bvideos?\b)/i],
  ['Comida e receitas', /(recipes?|receitas?|\bfood\b|comida|restaurant|restaurante|delivery|ifood)/i],
  ['Saúde', /(clinic|cl[íi]nica|hospital|health|sa[úu]de|medical|m[ée]dic|pharmacy|farm[áa]cia|doctor)/i],
  ['Academia', /(\bgym\b|academia|fitness|workout|treino)/i],
  ['Pets', /(\bpets?\b|petshop|veterin|pet adoption|ado[çc][ãa]o de)/i],
  ['Estacionamento', /(parking|estacionamento)/i],
  ['Aluguel de carros', /(car rental|aluguel de (carros|ve[íi]culos)|rent a car)/i],
  ['Transporte', /(ride[- ]?sharing|uber clone|\btaxi\b|transporte|\btransport\b|logistic|log[íi]stica|entregas|delivery tracking)/i],
  ['Viagens', /(\btravel|viage(m|ns)|trip planner|turismo|tourism|\bflights?\b|\bvoos?\b)/i],
  ['Imóveis', /(real estate|im[óo]veis|\bpropert(y|ies)\b)/i],
  ['Clima', /(weather|\bclima\b|previs[ãa]o do tempo)/i],
  ['Estoque', /(inventory|estoque|warehouse|almoxarifado)/i],
  ['Vagas e RH', /(job board|\bjobs? (portal|finder|search)|vagas de emprego|\bvagas\b|recruit|human resources|recursos humanos|\bemployees?\b|funcion[áa]rios|payroll)/i],
  ['CRM e vendas', /\b(crm|sales|vendas|invoices?|nota fiscal|pdv|point of sale)\b/i],
  ['Suporte', /(help ?desk|support tickets?|chamados|ticketing)/i],
  ['Eventos', /((?<!-)\bevents?\b(?![- ]?(driven|sourcing|bus|loop|emitter|store))|\beventos?\b(?! de dom)|\btickets?\b|ingressos?)/i],
  ['Votação', /(voting|vota[çc][ãa]o|\bpolls?\b|enquete|election)/i],
  ['Esportes', /(football|futebol|soccer|\bnba\b|\bsports?\b|esportes?|fantasy league)/i],
  ['Pokémon', /(pok[ée]mon|pok[ée]dex)/i],
  ['Arquivos e fotos', /(file (upload|sharing|storage)|upload de arquivos|\bphotos?\b|\bfotos?\b|gallery|galeria|image (upload|hosting)|drive clone|dropbox)/i],
  ['Portfólio', /(portfolio|portf[óo]lio)/i],
  ['Casa e IoT', /\b(iot|smart home|casa inteligente|home automation|arduino|esp32|raspberry)\b/i],
  ['Jogos clássicos', /\b(tetris|snake|pong|chess|xadrez|sudoku|minesweeper|campo minado|tic[- ]tac[- ]toe|jogo da velha|breakout|flappy|space invaders|2048|wordle)\b/i],
];

// [nome, regex, linguagens] — frameworks só contam na linguagem deles (gin em Python é palavra comum)
const JS = ['JavaScript', 'TypeScript', 'Vue', 'Svelte', 'HTML'];
const JVM = ['Java', 'Kotlin', 'Scala'];
const PY = ['Python', 'Jupyter Notebook'];
const STACK = [
  // back-end
  ['Express', /\bexpress(\.js|js)?\b/i, JS], ['NestJS', /\bnest(js|\.js)?\b/i, JS], ['Fastify', /\bfastify\b/i, JS], ['Hono', /\bhono\b/i, JS], ['AdonisJS', /\badonis(js)?\b/i, JS],
  ['Prisma', /\bprisma\b/i, JS], ['TypeORM', /\btypeorm\b/i, JS], ['Sequelize', /\bsequelize\b/i, JS], ['Mongoose', /\bmongoose\b/i, JS],
  ['MongoDB', /\bmongo(db)?\b/i], ['PostgreSQL', /\bpostgre(s|sql)\b/i], ['MySQL', /\bmysql\b/i], ['SQLite', /\bsqlite\b/i], ['Redis', /\bredis\b/i],
  ['Firebase', /\bfirebase\b/i], ['Supabase', /\bsupabase\b/i],
  ['Docker', /\bdocker\b/i], ['Kubernetes', /\b(kubernetes|k8s)\b/i], ['JWT', /\bjwt\b/i],
  ['Spring Boot', /spring ?boot/i, JVM], ['JPA', /\b(jpa|hibernate)\b/i, JVM], ['Quarkus', /\bquarkus\b/i, JVM], ['Django', /\bdjango\b/i, PY], ['DRF', /django rest framework|\bdrf\b/i, PY],
  ['FastAPI', /\bfastapi\b/i, PY], ['Flask', /\bflask\b/i, PY], ['SQLAlchemy', /\bsqlalchemy\b/i, PY], ['Laravel', /\blaravel\b/i, ['PHP']],
  ['Gin', /\bgin\b/i, ['Go']], ['Echo', /\becho\b(?! [a-z]+ \$)/i, ['Go']], ['Fiber', /\bgofiber|go fiber|\bfiber\b/i, ['Go']], ['GORM', /\bgorm\b/i, ['Go']],
  ['Axum', /\baxum\b/i, ['Rust']], ['Actix', /\bactix\b/i, ['Rust']], ['Rocket', /\brocket\.rs|rust rocket|\brocket\b/i, ['Rust']], ['Diesel', /\bdiesel\b/i, ['Rust']], ['SQLx', /\bsqlx\b/i, ['Rust']],
  ['ASP.NET Core', /asp\.?net/i, ['C#']], ['EF Core', /(entity ?framework|ef core)/i, ['C#']], ['Rails', /\brails\b/i, ['Ruby']], ['Phoenix', /\bphoenix\b/i, ['Elixir']], ['Ktor', /\bktor\b/i, ['Kotlin']],
  ['GraphQL', /\bgraphql\b/i], ['gRPC', /\bgrpc\b/i], ['RabbitMQ', /\brabbitmq\b/i], ['Kafka', /\bkafka\b/i], ['Swagger', /\b(swagger|openapi)\b/i],
  ['Socket.IO', /socket\.io/i], ['Celery', /\bcelery\b/i, PY],
  // front-end
  ['React', /\breact(js|\.js)?\b(?! ?native)/i, JS], ['Next.js', /\bnext\.?js\b/i, JS], ['Vue', /\bvue(\.?js)?\b/i, JS], ['Nuxt', /\bnuxt\b/i, JS], ['Angular', /\bangular\b/i, JS],
  ['Svelte', /\bsvelte(kit)?\b/i, JS], ['Astro', /\bastro\b/i, JS], ['Tailwind', /\btailwind/i], ['Redux', /\bredux\b/i, JS], ['Zustand', /\bzustand\b/i, JS], ['Vite', /\bvite\b/i, JS],
  ['TanStack Query', /(react|tanstack) query/i, JS], ['Storybook', /\bstorybook\b/i, JS], ['Three.js', /three\.?js/i, JS],
  // mobile
  ['React Native', /react ?native/i, JS], ['Expo', /\bexpo\b/i, JS], ['Flutter', /\bflutter\b/i, ['Dart']], ['Bloc', /\b(flutter_)?bloc\b/i, ['Dart']], ['Riverpod', /\briverpod\b/i, ['Dart']],
  ['Jetpack Compose', /jetpack compose|\bcompose\b ui/i, ['Kotlin', 'Java']], ['Room', /\broom\b (database|db|library)/i, ['Kotlin', 'Java']], ['Hilt', /\b(hilt|dagger)\b/i, ['Kotlin', 'Java']], ['SwiftUI', /\bswiftui\b/i, ['Swift']],
  // dados e IA
  ['Pandas', /\bpandas\b/i, PY], ['NumPy', /\bnumpy\b/i, PY], ['scikit-learn', /(scikit|sklearn)/i, PY], ['PyTorch', /\bpytorch\b|\btorch\b/i, PY], ['TensorFlow', /\btensorflow\b|\bkeras\b/i, PY],
  ['Jupyter', /\bjupyter\b|\.ipynb/i, PY], ['Streamlit', /\bstreamlit\b/i, PY], ['LangChain', /\blangchain\b/i], ['OpenAI', /\bopenai\b/i], ['Ollama', /\bollama\b/i],
  ['Airflow', /\bairflow\b/i], ['dbt', /\bdbt\b/i], ['Spark', /\b(py)?spark\b/i], ['OpenCV', /\bopencv\b/i], ['Plotly', /\bplotly\b/i, PY], ['BeautifulSoup', /beautiful ?soup|\bbs4\b/i, PY], ['Selenium', /\bselenium\b/i],
  // DevOps
  ['Terraform', /\bterraform\b/i], ['Ansible', /\bansible\b/i], ['Helm', /\bhelm\b/i], ['GitHub Actions', /github actions/i], ['AWS', /\b(aws|amazon web services|ec2)\b/i], ['Azure', /\bazure\b/i], ['GCP', /\b(gcp|google cloud)\b/i],
  ['Prometheus', /\bprometheus\b/i], ['Grafana', /\bgrafana\b/i], ['Nginx', /\bnginx\b/i], ['Argo CD', /argo ?cd/i], ['Jenkins', /\bjenkins\b/i],
  // jogos
  ['Unity', /\bunity\b/i, ['C#']], ['Godot', /\bgodot\b/i], ['Pygame', /\bpygame\b/i, PY], ['Phaser', /\bphaser\b/i, JS], ['Raylib', /\braylib\b/i], ['SDL', /\bsdl2?\b/i], ['Bevy', /\bbevy\b/i, ['Rust']],
  ['LibGDX', /\blibgdx\b/i, JVM], ['MonoGame', /\bmonogame\b/i, ['C#']], ['LÖVE', /\blove2d\b|\blöve\b/i, ['Lua']], ['OpenGL', /\bopengl\b/i],
  // ferramentas
  ['Cobra', /\bcobra\b/i, ['Go']], ['Bubble Tea', /bubble ?tea/i, ['Go']], ['Clap', /\bclap\b/i, ['Rust']], ['Ratatui', /\bratatui\b/i, ['Rust']], ['Click', /\bclick\b (library|framework)|python click/i, PY], ['Typer', /\btyper\b/i, PY],
  ['Textual', /\btextual\b/i, PY], ['Commander', /\bcommander(\.js)?\b/i, JS], ['discord.js', /discord\.js/i, JS], ['discord.py', /discord\.py/i, PY], ['Puppeteer', /\bpuppeteer\b/i, JS], ['Playwright', /\bplaywright\b/i],
  // testes
  ['Jest', /\bjest\b/i, JS], ['Vitest', /\bvitest\b/i, JS], ['Cypress', /\bcypress\b/i, JS], ['JUnit', /\bjunit\b/i, JVM], ['Pytest', /\bpytest\b/i, PY],
];

const semEmoji = (s) => s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/:[a-z0-9_+-]+:/g, '').replace(/\s+/g, ' ').trim();

// Não serve para estudar: listas, anotações, exercícios soltos, SDK de terceiros, dotfiles, texto fora do alfabeto latino.
function foraDoEscopo(it) {
  const id = identidadeDe(it);
  if (/[぀-ヿ㐀-鿿가-힯Ѐ-ӿ؀-ۿ฀-๿]/.test(it.description ?? '')) return 'idioma';
  if (/\b(awesome|curated list|resources|roadmap|cheat ?sheet|interview questions|perguntas de entrevista|my notes|course notes|anota[çc][õo]es do curso|exerc[íi]cios|exercises|leetcode|hackerrank|beecrowd|codewars)\b/i.test(id)) return 'lista ou exercícios';
  if (/(spigot|bukkit|minecraft|paper ?mc|roblox|\bwrapper\b|\bsdk\b|client library|unofficial api|api client for|dotfiles)/i.test(id)) return 'SDK, plugin ou dotfiles';
  return null;
}

// No arquivo de dependências, alguns nomes são diferentes do que se escreve no README.
const NO_MANIFESTO = {
  NestJS: /@nestjs\//, AdonisJS: /@adonisjs\//, Angular: /@angular\/core/, Redux: /\b(redux|@reduxjs)/, 'TanStack Query': /@tanstack\/(react-)?query|react-query/,
  'React Native': /"react-native"/, React: /"react"\s*:/, Vue: /"vue"\s*:/, 'Next.js': /"next"\s*:/, Svelte: /"svelte"|@sveltejs/, Expo: /"expo"\s*:/,
  DRF: /djangorestframework/i, 'scikit-learn': /scikit-learn|sklearn/i, PyTorch: /^torch\b|\btorch[>=<~ ]|"torch"/im, TensorFlow: /tensorflow|keras/i, BeautifulSoup: /beautifulsoup4|bs4/i,
  Click: /^click\b/im, Typer: /^typer\b/im, Textual: /^textual\b/im, 'discord.py': /discord\.py/i, Pygame: /pygame/i, Pytest: /pytest/i, Celery: /celery/i,
  'Spring Boot': /spring-boot/, JPA: /(jpa|hibernate)/i, JUnit: /junit/i, LibGDX: /gdx/i, Ktor: /ktor/i, Quarkus: /quarkus/i,
  'Jetpack Compose': /compose/i, Room: /androidx\.room/, Hilt: /(hilt|dagger)/i,
  Gin: /gin-gonic\/gin/, Echo: /labstack\/echo/, Fiber: /gofiber\/fiber/, GORM: /gorm\.io\/gorm|jinzhu\/gorm/, Cobra: /spf13\/cobra/, 'Bubble Tea': /charmbracelet\/bubbletea/,
  Axum: /^axum\b/m, Actix: /^actix-web\b/m, Rocket: /^rocket\b/m, Diesel: /^diesel\b/m, SQLx: /^sqlx\b/m, Bevy: /^bevy\b/m, Clap: /^clap\b/m, Ratatui: /^ratatui\b/m,
  Laravel: /laravel\/framework/, Rails: /gem ['"]rails['"]/, Phoenix: /:phoenix\b/, Flutter: /sdk: flutter/, Bloc: /\bbloc:|flutter_bloc/, Riverpod: /riverpod/,
};

function etiquetas(it, t, dica, man = null) {
  const amplo = tudo(it, t);
  const curto = cabeca(it, t);
  const identidade = identidadeDe(it);
  // frameworks e bibliotecas: com arquivo de dependências, só o que está nele; sem, o que o README cita
  const stack = STACK.filter(([nome, re, langs]) => {
    if (langs && !langs.includes(it.language)) return false;
    if (langs && man) return (NO_MANIFESTO[nome] ?? re).test(man);
    return re.test(amplo);
  }).map(([nome]) => nome).slice(0, 8);
  const { area, sinais } = areaDe(it, dica, man ? stack : []);
  const temas = TEMAS.filter(([, re, areas]) => (!areas.length || areas.includes(area)) && re.test(curto)).map(([id]) => id);
  if (/(desafio|challenge|rinha|teste t[ée]cnico|technical test|take[- ]home|frontend mentor)/i.test(identidade)) temas.push('desafios');
  if (area === 'backend' && !temas.includes('apis') && /api/i.test(curto)) temas.unshift('apis');
  const dominio = DOMINIOS.find(([, re]) => re.test(identidade))?.[0] ?? null;
  let api;
  if (area === 'backend') {
    api = [];
    if (/\bgraphql\b/i.test(curto)) api.push('GraphQL');
    if (/\bgrpc\b/i.test(curto)) api.push('gRPC');
    if (/(websockets?|socket\.io)/i.test(curto)) api.push('WebSocket');
    if (!api.length || /\brest(ful)?\b/i.test(curto)) api.unshift('REST');
    api = [...new Set(api)];
  }
  return { area, sinais, temas: [...new Set(temas)], dominio, stack, api };
}

const entradaDe = (it, e, nota) => ({
  repo: it.full_name,
  // corta por caractere (não por unidade UTF-16) e nunca deixa meio emoji: o leitor de JSON do build recusa
  nota: [...semEmoji(it.description ?? '')].slice(0, 110).join('').toWellFormed(),
  lang: it.language,
  area: e.area,
  temas: e.temas,
  dominio: e.dominio ?? undefined,
  stack: e.stack,
  api: e.api,
  estrelas: it.stargazers_count,
  readme: nota,
});

const ordenar = (lista) => lista.sort((a, b) => b.readme - a.readme || b.estrelas - a.estrelas);
function lerLista() {
  if (!process.env.CATALOGO_SAIDA && fs.existsSync(ANTIGO)) return JSON.parse(fs.readFileSync(ANTIGO, 'utf8'));
  if (!fs.existsSync(PASTA)) return [];
  return fs
    .readdirSync(PASTA)
    .filter((f) => f.endsWith('.json') && f !== 'indice.json')
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(PASTA, f), 'utf8')).map((e) => ({ ...e, area: f.replace(/\.json$/, '') })));
}
function gravar(lista) {
  fs.mkdirSync(PASTA, { recursive: true });
  const porArea = Object.fromEntries(ORDEM_AREAS.map((a) => [a, []]));
  for (const e of ordenar(lista)) (porArea[e.area] ??= []).push(e);
  const contagem = {};
  const vitrine = [];
  for (const [a, l] of Object.entries(porArea)) {
    const alvo = path.join(PASTA, `${a}.json`);
    if (!l.length) {
      if (fs.existsSync(alvo)) fs.rmSync(alvo);
      continue;
    }
    // a área é o nome do arquivo: não se repete em cada entrada
    fs.writeFileSync(alvo, JSON.stringify(l.map(({ area, ...resto }) => resto)) + '\n');
    contagem[a] = l.length;
    vitrine.push(...l.slice(0, VITRINE_POR_AREA).map((e) => ({ repo: e.repo, nota: e.nota, lang: e.lang, area: a })));
  }
  fs.writeFileSync(path.join(PASTA, 'indice.json'), JSON.stringify({ contagem, vitrine }) + '\n');
  if (!process.env.CATALOGO_SAIDA && fs.existsSync(ANTIGO)) fs.rmSync(ANTIGO);
}
const contar = (lista, f) => {
  const m = new Map();
  for (const e of lista) for (const k of [].concat(f(e) ?? '(nenhum)')) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(' ');
};
function resumo(lista) {
  console.log('Áreas:', contar(lista, (e) => e.area));
  console.log('Linguagens:', contar(lista, (e) => e.lang));
  console.log('Temas:', contar(lista, (e) => e.temas));
  console.log('Assuntos:', contar(lista, (e) => e.dominio));
}

// lê os READMEs em lotes, em paralelo
async function emLotes(lista, lote, fazer, rotulo) {
  let feitos = 0;
  for (let i = 0; i < lista.length; i += lote) {
    await Promise.all(
      lista.slice(i, i + lote).map(async (x) => {
        await fazer(x);
        feitos++;
      }),
    );
    process.stdout.write(`\r${rotulo} ${feitos}/${lista.length}   `);
  }
  console.log();
}

// ---------- reavaliar a lista atual (sem buscar de novo) ----------
if (REAVALIAR) {
  const atual = lerLista();
  const novos = [];
  const motivos = new Map();
  const conta = (m) => motivos.set(m, (motivos.get(m) ?? 0) + 1);
  await emLotes(atual, 24, async (x) => {
    const t = await readme(x.repo, 'HEAD');
    const { nota, motivo } = notaDoReadme(t);
    if (nota < NOTA_MINIMA) return conta(motivo || 'nota baixa');
    const it = { full_name: x.repo, description: x.nota, topics: [], language: x.lang, stargazers_count: x.estrelas };
    const fora = foraDoEscopo(it);
    if (fora) return conta(fora);
    const man = await manifesto(x.repo, x.lang);
    novos.push(entradaDe(it, etiquetas(it, t, x.area ?? 'backend', man), nota));
  }, 'READMEs');
  gravar(novos);
  console.log(`Resumo: antes=${atual.length} depois=${novos.length}`);
  console.log('Saíram:', [...motivos].map(([m, n]) => `${m}=${n}`).join(' '));
  resumo(novos);
  process.exit(0);
}

// ---------- principal ----------
const candidatos = new Map(); // nome -> { it, dica }
const fila = Object.entries(BUSCAS)
  .filter(([a]) => !SO_AREAS || SO_AREAS.includes(a))
  .flatMap(([area, qs]) => qs.map((q) => [area, q]));
let feitas = 0;
async function buscarTudo(area, q) {
  for (let pagina = 1; pagina <= 2; pagina++) {
    let r;
    for (let tentativa = 0; tentativa < 3 && !r; tentativa++) {
      try {
        r = await buscar(q, pagina);
      } catch (e) {
        if (tentativa === 2) console.log(`\nfalhou: ${q} (${String(e.stderr || e.message || e).trim().slice(0, 80)})`);
        await dormir(20000 * (tentativa + 1)); // limite secundário do GitHub: espera e tenta de novo
      }
    }
    if (!r) return;
    for (const it of r.items ?? []) {
      if (it.owner?.type !== 'User' || it.fork || it.archived || !it.description || !LINGUAGENS.has(it.language) || it.size < 40) continue;
      const k = it.full_name.toLowerCase();
      if (!candidatos.has(k)) candidatos.set(k, { it, dica: area });
    }
    if ((r.total_count ?? 0) <= 100) return; // só vai à 2ª página quando há mais resultados
  }
}
const pendentes = [...fila];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (pendentes.length) {
      const [area, q] = pendentes.shift();
      await buscarTudo(area, q);
      feitas++;
      process.stdout.write(`\rbusca ${feitas}/${fila.length}  candidatos: ${candidatos.size}   `);
    }
  }),
);
console.log();

const antigos = SOMAR ? lerLista() : [];
const ja = new Set(antigos.map((x) => x.repo.toLowerCase()));

// no máximo POR_PESSOA por pessoa: variedade de autores (contando os que já estão na lista)
const porDono = new Map();
for (const x of antigos) {
  const d = x.repo.split('/')[0].toLowerCase();
  porDono.set(d, (porDono.get(d) ?? 0) + 1);
}
const lista = [...candidatos.values()].filter(({ it }) => !ja.has(it.full_name.toLowerCase())).sort((a, b) => b.it.stargazers_count - a.it.stargazers_count);
const ler = lista.filter(({ it }) => {
  const d = it.owner.login.toLowerCase();
  const n = porDono.get(d) ?? 0;
  porDono.set(d, n + 1);
  return n < POR_PESSOA;
});

const aprovados = [];
const motivos = new Map();
const conta = (m) => motivos.set(m, (motivos.get(m) ?? 0) + 1);
await emLotes(ler, 16, async ({ it, dica }) => {
  const fora = foraDoEscopo(it);
  if (fora) return conta(fora);
  const t = await readme(it.full_name, it.default_branch);
  const { nota, motivo } = notaDoReadme(t);
  if (nota < NOTA_MINIMA) return conta(motivo || 'nota baixa');
  const e = etiquetas(it, t, dica, await manifesto(it.full_name, it.language));
  if (e.sinais === 0 && !e.stack.length) return conta('sem sinal da área');
  aprovados.push(entradaDe(it, e, nota));
}, 'READMEs');

const final = [...antigos, ...aprovados];
gravar(final);
console.log(`Resumo: candidatos=${candidatos.size} lidos=${ler.length} aprovados=${aprovados.length} total=${final.length}`);
console.log('Recusados:', [...motivos].map(([m, n]) => `${m}=${n}`).join(' '));
resumo(final);
