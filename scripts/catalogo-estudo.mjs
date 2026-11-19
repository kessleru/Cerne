// Monta a lista do Estudar: repositórios de pessoas (não de organizações), focados em back-end e APIs,
// escolhidos pela qualidade do README. Gera src/data/catalogo/estudo.json.
//
// Uso: node scripts/catalogo-estudo.mjs              (busca e substitui a lista)
//      node scripts/catalogo-estudo.mjs --somar      (busca e acrescenta ao que já existe)
//      node scripts/catalogo-estudo.mjs --reavaliar  (relê os READMEs da lista atual e refaz notas e etiquetas)
//
// Busca pelo GitHub (gh api, já autenticado; ou fetch com GITHUB_TOKEN) e lê os READMEs pelo
// raw.githubusercontent.com. A nota do README é uma heurística: tamanho, seções, como rodar,
// rotas, tecnologias, arquitetura, testes e imagens. Ajuste NOTA_MINIMA para ser mais ou menos rígido.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(ROOT, 'src', 'data', 'catalogo', 'estudo.json');
const SOMAR = process.argv.includes('--somar');
const REAVALIAR = process.argv.includes('--reavaliar');
const NOTA_MINIMA = 12.5;
const FILTRO = 'stars:3..1500 fork:false archived:false pushed:>2021-06-01';

// ---------- o que buscar (foco em back-end, com variedade de domínio e de linguagem) ----------
const BUSCAS = [
  // domínios de projetos de estudo
  'bookstore api', 'book store api', 'library management api', 'api livraria', 'api biblioteca', 'books api',
  'ecommerce api', 'e-commerce backend', 'shopping cart api', 'loja api',
  'bank api', 'banking api', 'digital wallet api', 'payment api', 'carteira digital api',
  'blog api', 'todo api', 'task manager api', 'tarefas api', 'url shortener api', 'encurtador url',
  'hotel booking api', 'reservation api', 'school management api', 'student management api', 'inventory api',
  'parking api', 'movie api', 'recipe api', 'food delivery api', 'restaurant api', 'expense tracker api',
  'social network api', 'twitter clone api', 'chat api websocket', 'event ticket api', 'job board api',
  'clinic api', 'hospital management api', 'gym api', 'pet api', 'car rental api',
  // padrões e arquitetura
  'clean architecture api', 'hexagonal architecture api', 'ddd api', 'cqrs api', 'solid api', 'arquitetura limpa',
  'microservices api', 'microsservicos', 'graphql api', 'grpc api', 'jwt authentication api', 'oauth2 api',
  'rabbitmq api', 'kafka microservices', 'redis cache api', 'rate limiter api',
  // desafios de back-end (comuns entre estudantes no Brasil)
  'desafio backend', 'desafio back-end', 'rinha de backend', 'backend challenge api', 'teste tecnico api',
  // por stack
  'spring boot rest api', 'nestjs api', 'express typescript api', 'express mongodb api', 'fastapi crud',
  'django rest framework api', 'flask rest api', 'laravel api', 'golang rest api', 'gin gorm api',
  'rust axum api', 'actix web api', 'asp.net core web api', 'kotlin spring api', 'ktor api', 'rails api',
  'phoenix elixir api', 'prisma api', 'fastify api', 'echo golang api',
];

// linguagens do GitHub que o Cerne mostra (as outras ficam de fora)
const LINGUAGENS = new Set(['Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'Kotlin', 'C#', 'PHP', 'Ruby', 'Elixir', 'Dart', 'C', 'C++', 'Scala']);

// ---------- acesso ao GitHub ----------
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
function buscar(q, pagina = 1) {
  const consulta = `${q} ${FILTRO}`;
  if (process.env.GITHUB_TOKEN) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(consulta)}&per_page=100&page=${pagina}`;
    return fetch(url, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }).then((r) => r.json());
  }
  const out = execFileSync('gh', ['api', '-X', 'GET', 'search/repositories', '-f', `q=${consulta}`, '-f', 'per_page=100', '-f', `page=${pagina}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return Promise.resolve(JSON.parse(out));
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

// ---------- nota do README ----------
const semCodigo = (t) => t.replace(/```[\s\S]*?```/g, ' ');
function notaDoReadme(t) {
  if (!t) return { nota: 0, motivo: 'sem README' };
  const texto = semCodigo(t);
  const tamanho = texto.replace(/\s+/g, ' ').length;
  if (tamanho < 700) return { nota: 0, motivo: 'README curto' };
  if (/bootstrapped with \[?Create React App|This template provides a minimal setup|Welcome to your new TanStack/i.test(t)) return { nota: 0, motivo: 'modelo pronto' };
  const titulos = (t.match(/^#{1,3}\s+\S/gm) ?? []).length;
  if (titulos < 3) return { nota: 0, motivo: 'poucas seções' };
  let n = Math.min(tamanho / 900, 6) + Math.min(titulos, 10) * 0.45;
  const tem = (re, pts) => (re.test(t) ? pts : 0);
  n += tem(/(instala|install|getting started|como (rodar|executar|usar|iniciar)|run(ning)? (it )?locally|setup|configura|pré-requisitos|prerequisites|requirements)/i, 2);
  n += tem(/(endpoints?|rotas|routes|\b(GET|POST|PUT|DELETE|PATCH)\s+`?\/|swagger|openapi|postman|insomnia|api docs?|documentação da api)/i, 2.5);
  n += tem(/(tecnologias|technologies|tech stack|built with|stack|ferramentas utilizadas|tools)/i, 1.5);
  n += tem(/(arquitetura|architecture|clean code|clean arch|hexagonal|\bddd\b|\bsolid\b|camadas|layers|design patterns?|padrões)/i, 2);
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

const TEMAS = [
  ['apis', /\b(rest(ful)?|api|crud|endpoints?)\b/i],
  ['graphql', /graphql/i],
  ['microsservicos', /micro[- ]?servi(ce|ço)s?/i],
  ['auth', /\b(jwt|oauth2?|authentication|autentica(ção|cao)|spring security|passport\.?js|refresh tokens?)\b/i],
  ['arquitetura', /(clean arch|arquitetura limpa|hexagonal|\bddd\b|domain[- ]driven|\bcqrs\b|onion arch|\bsolid\b|ports and adapters)/i],
  ['tempo-real', /(websockets?|socket\.io|real[- ]time|tempo real|\bsse\b)/i],
  ['mensageria', /(rabbitmq|kafka|\bnats\b|\bsqs\b|message (queue|broker)|mensageria|event[- ]driven)/i],
  ['fullstack', /(full[- ]?stack)/i],
];

const DOMINIOS = [
  ['Livraria', /(book ?store|bookshop|livraria|\bbooks?\b|livros?)/i],
  ['Biblioteca', /(library management|biblioteca|lending|empr[ée]stimo)/i],
  ['E-commerce', /(e-?commerce|shopping|\bcart\b|carrinho|\bloja\b|\bstore\b|marketplace|\bproducts?\b|produtos)/i],
  ['Bancos e pagamentos', /(\bbank(ing)?\b|\bbanco\b|wallet|carteira|payments?|pagamentos?|picpay|transfer[êe]ncias?)/i],
  ['Blog', /\bblog\b/i],
  ['Tarefas', /(\btodos?\b|to-do|task manager|tarefas?|kanban)/i],
  ['Chat', /\bchat\b/i],
  ['Encurtador de URL', /(url shortener|shortener|encurtador)/i],
  ['Reservas', /(hotel|booking|reserva)/i],
  ['Escola', /(school|escola|students?|alunos?|universit|matr[íi]cula|enrollment)/i],
  ['Filmes', /(movies?|filmes?|cinema)/i],
  ['Comida e delivery', /(recipes?|receitas?|food|restaurant|restaurante|delivery|ifood)/i],
  ['Rede social', /(social network|rede social|twitter clone|instagram clone|\bfeed\b)/i],
  ['Estacionamento', /(parking|estacionamento)/i],
  ['Estoque', /(inventory|estoque|warehouse)/i],
  ['Finanças pessoais', /(expenses?|despesas?|finan(ce|ças)|budget|or[çc]amento)/i],
  ['Saúde', /(clinic|cl[íi]nica|hospital|health|sa[úu]de|medical|m[ée]dic)/i],
  ['Vagas', /(job board|\bjobs\b|vagas)/i],
  ['Eventos', /((?<!-)\bevents?\b(?![- ]?(driven|sourcing|bus|loop|emitter))|eventos?(?! de dom)|\btickets?\b|ingressos?)/i],
  ['Academia', /(\bgym\b|academia|fitness|workout)/i],
  ['Pets', /(\bpets?\b|veterin)/i],
  ['Aluguel de carros', /(car rental|aluguel de (carros|ve[íi]culos)|rent a car)/i],
];

// [nome, regex, linguagens] — frameworks só contam na linguagem deles (gin em Python é palavra comum)
const JS = ['JavaScript', 'TypeScript'];
const JVM = ['Java', 'Kotlin', 'Scala'];
const STACK = [
  ['Express', /\bexpress(\.js|js)?\b/i, JS], ['NestJS', /\bnest(js|\.js)?\b/i, JS], ['Fastify', /\bfastify\b/i, JS], ['Koa', /\bkoa\b/i, JS],
  ['Prisma', /\bprisma\b/i, JS], ['TypeORM', /\btypeorm\b/i, JS], ['Sequelize', /\bsequelize\b/i, JS], ['Mongoose', /\bmongoose\b/i, JS],
  ['MongoDB', /\bmongo(db)?\b/i], ['PostgreSQL', /\bpostgre(s|sql)\b/i], ['MySQL', /\bmysql\b/i], ['SQLite', /\bsqlite\b/i], ['Redis', /\bredis\b/i],
  ['Docker', /\bdocker\b/i], ['Kubernetes', /\b(kubernetes|k8s)\b/i], ['JWT', /\bjwt\b/i],
  ['Spring Boot', /spring ?boot/i, JVM], ['JPA', /\b(jpa|hibernate)\b/i, JVM], ['Django', /\bdjango\b/i, ['Python']], ['DRF', /django rest framework|\bdrf\b/i, ['Python']],
  ['FastAPI', /\bfastapi\b/i, ['Python']], ['Flask', /\bflask\b/i, ['Python']], ['SQLAlchemy', /\bsqlalchemy\b/i, ['Python']], ['Laravel', /\blaravel\b/i, ['PHP']],
  ['Gin', /\bgin\b/i, ['Go']], ['Echo', /\becho\b(?! [a-z]+ \$)/i, ['Go']], ['Fiber', /\bgofiber|go fiber|\bfiber\b/i, ['Go']], ['GORM', /\bgorm\b/i, ['Go']],
  ['Axum', /\baxum\b/i, ['Rust']], ['Actix', /\bactix\b/i, ['Rust']], ['Rocket', /\brocket\.rs|rust rocket|\brocket\b/i, ['Rust']], ['Diesel', /\bdiesel\b/i, ['Rust']], ['SQLx', /\bsqlx\b/i, ['Rust']],
  ['ASP.NET Core', /asp\.?net/i, ['C#']], ['EF Core', /(entity ?framework|ef core)/i, ['C#']], ['Rails', /\brails\b/i, ['Ruby']], ['Phoenix', /\bphoenix\b/i, ['Elixir']], ['Ktor', /\bktor\b/i, ['Kotlin']],
  ['GraphQL', /\bgraphql\b/i], ['gRPC', /\bgrpc\b/i], ['RabbitMQ', /\brabbitmq\b/i], ['Kafka', /\bkafka\b/i], ['Swagger', /\b(swagger|openapi)\b/i],
  ['Jest', /\bjest\b/i, JS], ['JUnit', /\bjunit\b/i, JVM], ['Pytest', /\bpytest\b/i, ['Python']], ['Socket.IO', /socket\.io/i], ['Celery', /\bcelery\b/i, ['Python']],
];

const semEmoji = (s) => s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/:[a-z0-9_+-]+:/g, '').replace(/\s+/g, ' ').trim();

// Não é back-end de estudante: front-end puro, plugin de jogo, bot, SDK de terceiros, app de celular, texto fora do alfabeto latino.
function foraDoEscopo(it, stack) {
  const id = `${it.full_name.replace(/[-_]/g, ' ')} ${it.description ?? ''}`;
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/.test(it.description ?? '')) return true;
  const backend = /(back ?end|\bapi\b|servidor|server|microservi)/i.test(id);
  if (/(spigot|bukkit|minecraft|paper ?mc|roblox|discord bot|telegram bot|desktop pet|chrome extension|browser extension|\bwrapper\b|\bsdk\b|client library|unofficial api)/i.test(id)) return true;
  if (/(front ?end|\bmobile app\b|flutter|android app|ios app)/i.test(id) && !/(back ?end|full ?stack|\bapi rest|rest api)/i.test(id)) return true;
  if (it.language === 'Dart' && !stack.length) return true;
  return !backend && !stack.length;
}

function etiquetas(it, t) {
  const amplo = tudo(it, t);
  const curto = cabeca(it, t);
  const temas = TEMAS.filter(([, re]) => re.test(curto)).map(([id]) => id);
  const identidade = `${it.full_name.replace(/[-_]/g, ' ')} ${it.description ?? ''} ${(it.topics ?? []).join(' ')}`;
  if (/(desafio|challenge|rinha|teste t[ée]cnico|technical test|take[- ]home)/i.test(identidade)) temas.push('desafios');
  if (!temas.includes('apis') && /api/i.test(curto)) temas.unshift('apis');
  const dominio = DOMINIOS.find(([, re]) => re.test(identidade))?.[0] ?? null;
  const stack = STACK.filter(([, re, langs]) => (!langs || langs.includes(it.language)) && re.test(amplo)).map(([nome]) => nome).slice(0, 8);
  const api = [];
  if (/\bgraphql\b/i.test(curto)) api.push('GraphQL');
  if (/\bgrpc\b/i.test(curto)) api.push('gRPC');
  if (/(websockets?|socket\.io)/i.test(curto)) api.push('WebSocket');
  if (!api.length || /\brest(ful)?\b/i.test(curto)) api.unshift('REST');
  return { temas: [...new Set(temas)], dominio, stack, api: [...new Set(api)] };
}

// ---------- reavaliar a lista atual (sem buscar de novo) ----------
if (REAVALIAR) {
  const atual = JSON.parse(fs.readFileSync(SAIDA, 'utf8'));
  const novos = [];
  let feitos = 0;
  for (let i = 0; i < atual.length; i += 24) {
    await Promise.all(
      atual.slice(i, i + 24).map(async (x) => {
        const t = await readme(x.repo, 'HEAD');
        feitos++;
        const { nota } = notaDoReadme(t);
        if (nota < NOTA_MINIMA) return;
        const it = { full_name: x.repo, description: x.nota, topics: [], language: x.lang };
        const e = etiquetas(it, t);
        if (foraDoEscopo(it, e.stack)) return;
        novos.push({ ...x, temas: e.temas, dominio: e.dominio ?? undefined, stack: e.stack, api: e.api, readme: nota });
      }),
    );
    process.stdout.write(`\rREADMEs ${feitos}/${atual.length}  ficam: ${novos.length}   `);
  }
  novos.sort((a, b) => b.readme - a.readme || b.estrelas - a.estrelas);
  fs.writeFileSync(SAIDA, JSON.stringify(novos) + '\n');
  console.log(`\nResumo: antes=${atual.length} depois=${novos.length}`);
  process.exit(0);
}

// ---------- principal ----------
const candidatos = new Map();
for (const [i, q] of BUSCAS.entries()) {
  try {
    const r = await buscar(q);
    for (const it of r.items ?? []) {
      if (it.owner?.type !== 'User' || it.fork || it.archived || !it.description || !LINGUAGENS.has(it.language) || it.size < 40) continue;
      candidatos.set(it.full_name.toLowerCase(), it);
    }
    process.stdout.write(`\rbusca ${i + 1}/${BUSCAS.length}  candidatos: ${candidatos.size}   `);
  } catch (e) {
    console.log(`\nfalhou: ${q} (${e.message ?? e})`);
  }
  await dormir(2300); // a busca do GitHub aceita 30 consultas por minuto
}
console.log();

// no máximo 3 por pessoa: variedade de autores
const porDono = new Map();
const lista = [...candidatos.values()].sort((a, b) => b.stargazers_count - a.stargazers_count);
const fila = lista.filter((it) => {
  const n = porDono.get(it.owner.login) ?? 0;
  porDono.set(it.owner.login, n + 1);
  return n < 3;
});

const aprovados = [];
const motivos = new Map();
let feitos = 0;
const LOTE = 16;
for (let i = 0; i < fila.length; i += LOTE) {
  await Promise.all(
    fila.slice(i, i + LOTE).map(async (it) => {
      const t = await readme(it.full_name, it.default_branch);
      const { nota, motivo } = notaDoReadme(t);
      feitos++;
      if (nota < NOTA_MINIMA) {
        motivos.set(motivo || 'nota baixa', (motivos.get(motivo || 'nota baixa') ?? 0) + 1);
        return;
      }
      const e = etiquetas(it, t);
      if (foraDoEscopo(it, e.stack)) {
        motivos.set('fora do escopo', (motivos.get('fora do escopo') ?? 0) + 1);
        return;
      }
      aprovados.push({
        repo: it.full_name,
        nota: semEmoji(it.description).slice(0, 110),
        lang: it.language,
        temas: e.temas,
        dominio: e.dominio ?? undefined,
        stack: e.stack,
        api: e.api,
        estrelas: it.stargazers_count,
        readme: nota,
      });
    }),
  );
  process.stdout.write(`\rREADMEs ${feitos}/${fila.length}  aprovados: ${aprovados.length}   `);
}
console.log();

let final = aprovados;
if (SOMAR && fs.existsSync(SAIDA)) {
  const antigos = JSON.parse(fs.readFileSync(SAIDA, 'utf8'));
  const ja = new Set(antigos.map((x) => x.repo.toLowerCase()));
  final = [...antigos, ...aprovados.filter((x) => !ja.has(x.repo.toLowerCase()))];
}
final.sort((a, b) => b.readme - a.readme || b.estrelas - a.estrelas);
fs.writeFileSync(SAIDA, JSON.stringify(final) + '\n');
console.log(`Resumo: candidatos=${candidatos.size} lidos=${fila.length} aprovados=${aprovados.length} total=${final.length}`);
console.log('Recusados:', [...motivos].map(([m, n]) => `${m}=${n}`).join(' '));
