// Busca do Estudar: sem acento, com sinônimos em português e inglês, prefixo e erro de digitação,
// e relevância por campo (o nome do projeto vale mais que uma palavra do README).
import type { Entrada } from '../data/catalogo/tipos';

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Quebra em palavras; separa camelCase e kebab-case ("BookStoreApi" e "book-store-api" viram book, store, api). */
export function palavras(s: string): string[] {
  const comEspacos = s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return normalizar(comEspacos)
    .split(/[^a-z0-9+#.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter((w) => w.length > 0);
}

// Grupos de sinônimos: qualquer palavra do grupo acha as outras.
const GRUPOS: string[][] = [
  ['livraria', 'livro', 'livros', 'bookstore', 'bookshop', 'book', 'books', 'ebook', 'ebooks'],
  ['biblioteca', 'library', 'acervo', 'emprestimo'],
  ['tarefa', 'tarefas', 'todo', 'todos', 'task', 'tasks', 'kanban', 'afazeres'],
  ['banco', 'bank', 'banking', 'bancario', 'wallet', 'carteira', 'pix', 'transferencia', 'transfer'],
  ['pagamento', 'pagamentos', 'payment', 'payments', 'checkout', 'stripe'],
  ['loja', 'ecommerce', 'e-commerce', 'shop', 'store', 'marketplace', 'carrinho', 'cart', 'shopping', 'vendas'],
  ['autenticacao', 'auth', 'authentication', 'login', 'jwt', 'oauth', 'oauth2', 'senha', 'password', 'signin'],
  ['autorizacao', 'authorization', 'permissoes', 'permissions', 'roles', 'rbac'],
  ['clima', 'weather', 'meteorologia', 'forecast'],
  ['filme', 'filmes', 'movie', 'movies', 'cinema', 'serie', 'series', 'netflix'],
  ['musica', 'musicas', 'music', 'song', 'songs', 'spotify', 'playlist'],
  ['receita', 'receitas', 'recipe', 'recipes', 'comida', 'food', 'restaurante', 'restaurant', 'delivery', 'cardapio', 'menu'],
  ['jogo', 'jogos', 'game', 'games', 'gamedev'],
  ['saude', 'health', 'healthcare', 'medical', 'medico', 'hospital', 'clinica', 'clinic', 'paciente', 'patient'],
  ['escola', 'school', 'aluno', 'alunos', 'student', 'students', 'curso', 'cursos', 'course', 'courses', 'lms', 'educacao', 'education'],
  ['noticia', 'noticias', 'news', 'rss'],
  ['chat', 'mensagem', 'mensagens', 'messaging', 'messenger', 'conversa'],
  ['agenda', 'agendamento', 'appointment', 'appointments', 'scheduling', 'calendario', 'calendar', 'consulta'],
  ['reserva', 'reservas', 'booking', 'reservation', 'hotel', 'hoteis', 'hospedagem', 'airbnb'],
  ['estoque', 'inventory', 'inventario', 'warehouse', 'almoxarifado'],
  ['financas', 'finance', 'financeiro', 'expense', 'expenses', 'gastos', 'despesas', 'budget', 'orcamento', 'dinheiro', 'money'],
  ['vaga', 'vagas', 'job', 'jobs', 'emprego', 'empregos', 'recrutamento', 'recruitment', 'rh', 'hr'],
  ['encurtador', 'shortener', 'url'],
  ['blog', 'post', 'posts', 'artigo', 'artigos'],
  ['social', 'rede', 'twitter', 'instagram', 'feed'],
  ['teste', 'testes', 'test', 'tests', 'testing', 'tdd', 'jest', 'pytest', 'junit', 'vitest'],
  ['microsservico', 'microsservicos', 'microservice', 'microservices'],
  ['arquitetura', 'architecture', 'clean', 'hexagonal', 'ddd', 'cqrs', 'solid', 'mvvm', 'mvc'],
  ['realtime', 'tempo-real', 'websocket', 'websockets', 'socket', 'sockets'],
  ['fila', 'filas', 'queue', 'queues', 'mensageria', 'rabbitmq', 'kafka', 'eventos', 'events'],
  ['ia', 'ai', 'llm', 'gpt', 'openai', 'chatbot', 'agente', 'agentes', 'agent', 'agents', 'rag'],
  ['aprendizado', 'machine', 'ml', 'modelo', 'model', 'classificacao', 'classification', 'previsao', 'prediction'],
  ['dados', 'data', 'analise', 'analysis', 'analytics', 'dashboard', 'etl', 'pipeline'],
  ['compilador', 'compiler', 'interpretador', 'interpreter', 'linguagem', 'language', 'parser', 'lexer'],
  ['emulador', 'emulator', 'chip8', 'chip-8', 'gameboy', 'nes'],
  ['robo', 'bot', 'bots', 'automacao', 'automation', 'scraper', 'scraping', 'crawler'],
  ['terminal', 'cli', 'tui', 'console', 'linha'],
  ['celular', 'mobile', 'android', 'ios', 'app', 'aplicativo'],
  ['site', 'website', 'web', 'pagina', 'landing', 'frontend', 'front-end', 'front'],
  ['servidor', 'server', 'backend', 'back-end', 'api', 'rest', 'restful', 'crud'],
  ['painel', 'dashboard', 'admin'],
  ['infra', 'infraestrutura', 'infrastructure', 'devops', 'deploy', 'kubernetes', 'k8s', 'docker', 'container', 'containers'],
  ['postgres', 'postgresql', 'pg'],
  ['mongo', 'mongodb', 'mongoose'],
  ['node', 'nodejs', 'node.js'],
  ['go', 'golang'],
  ['csharp', 'c#', 'dotnet', '.net', 'asp.net'],
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['py', 'python'],
  ['react', 'reactjs', 'react.js'],
  ['vue', 'vuejs', 'vue.js'],
  ['next', 'nextjs', 'next.js'],
  ['spring', 'springboot', 'spring-boot'],
  ['flutter', 'dart'],
  ['kotlin', 'kt'],
  ['sistema', 'sistemas', 'system', 'systems'],
  ['xadrez', 'chess'],
  ['cobrinha', 'snake'],
  ['velha', 'tictactoe', 'tic-tac-toe'],
  ['minado', 'minesweeper'],
  ['paciencia', 'solitaire'],
  ['quebra-cabeca', 'puzzle', 'puzzles'],
  ['memoria', 'memory'],
  ['plataforma', 'platformer'],
  ['tabuleiro', 'board'],
  ['cartas', 'cards', 'card'],
];
const SINONIMOS = new Map<string, string[]>();
for (const g of GRUPOS) for (const w of g) SINONIMOS.set(w, [...new Set([...(SINONIMOS.get(w) ?? []), ...g.filter((x) => x !== w)])]);

// Palavras que não ajudam a buscar.
const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'pra', 'um', 'uma', 'o', 'a', 'os', 'as', 'no', 'na', 'que', 'por', 'the', 'of', 'for', 'and', 'with', 'in', 'an', 'to', 'projeto', 'projetos', 'exemplo', 'exemplos']);

export type Rotulos = { temas: Record<string, string>; areas: Record<string, string> };

type Campo = { peso: number; ws: string[] };
type Indice = { campos: Campo[] };
const cache = new WeakMap<Entrada, Indice>();
// a mesma palavra aparece em milhares de projetos ("react", "api"): guarda uma cópia só de cada
const banco = new Map<string, string>();
const unica = (w: string): string => {
  const ja = banco.get(w);
  if (ja !== undefined) return ja;
  banco.set(w, w);
  return w;
};

function indiceDe(e: Entrada, r: Rotulos): Indice {
  let i = cache.get(e);
  if (i) return i;
  const [dono, nome] = e.repo.split('/') as [string, string];
  const campos: Campo[] = [
    { peso: 10, ws: palavras(nome) },
    { peso: 7, ws: e.dominio ? palavras(e.dominio) : [] },
    { peso: 6, ws: e.temas.flatMap((t) => palavras(r.temas[t] ?? t)) },
    { peso: 6, ws: (e.stack ?? []).flatMap((s) => [...palavras(s), normalizar(s).replace(/\s+/g, '')]) },
    { peso: 5, ws: [...palavras(e.lang), normalizar(e.lang)] },
    { peso: 4, ws: e.area ? palavras(r.areas[e.area] ?? e.area) : [] },
    { peso: 3, ws: palavras(e.nota) },
    { peso: 3, ws: palavras(dono) },
    { peso: 2, ws: e.k ? e.k.split(' ') : [] },
  ];
  for (const c of campos) c.ws = c.ws.map(unica);
  i = { campos };
  cache.set(e, i);
  return i;
}

/** Distância de edição até 1 (troca, falta ou sobra de uma letra), só para palavras parecidas. */
function quase(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a[0] !== b[0]) return false;
  let i = 0, j = 0, erros = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++erros > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return erros + (a.length - i) + (b.length - j) <= 1;
}

export type Consulta = { termos: { original: string; formas: string[] }[] };

export function consulta(q: string): Consulta {
  const ws = palavras(q).filter((w) => !VAZIAS.has(w));
  return { termos: ws.map((w) => ({ original: w, formas: [w, ...(SINONIMOS.get(w) ?? [])] })) };
}

/** Quanto um projeto casa com a busca (0 = não casa). Todos os termos precisam casar em algum campo. */
export function pontuar(e: Entrada, c: Consulta, r: Rotulos): number {
  if (!c.termos.length) return 0;
  const { campos } = indiceDe(e, r);
  let total = 0;
  for (const t of c.termos) {
    let melhor = 0;
    for (const campo of campos) {
      for (const w of campo.ws) {
        for (let k = 0; k < t.formas.length; k++) {
          const f = t.formas[k]!;
          const sin = k === 0 ? 1 : 0.85;
          let p = 0;
          // o termo digitado casa por prefixo e com um erro de digitação; sinônimo curto só casa inteiro
          if (w === f) p = 1;
          else if (w.startsWith(f) && (k === 0 ? f.length >= 2 : f.length >= 5)) p = 0.75;
          else if (k === 0 && f.length >= 5 && quase(w, f)) p = 0.5;
          if (p) melhor = Math.max(melhor, campo.peso * p * sin);
        }
      }
    }
    if (!melhor) return 0;
    total += melhor;
  }
  return total + (e.readme ?? 0) / 25 + Math.log10((e.estrelas ?? 0) + 1) * 0.3;
}

/** Palavras (já normalizadas) do texto que casaram com a busca, para destacar no cartão. */
export function casados(texto: string, c: Consulta): Set<string> {
  const s = new Set<string>();
  for (const w of palavras(texto)) {
    for (const t of c.termos) {
      if (t.formas.some((f, k) => w === f || (w.startsWith(f) && (k === 0 ? f.length >= 2 : f.length >= 5)) || (k === 0 && f.length >= 5 && quase(w, f)))) s.add(w);
    }
  }
  return s;
}

/** Sugestões de filtro: valores de faceta que casam com algum termo da busca. */
export function sugestoes<T extends string>(c: Consulta, valores: { campo: T; valor: string; rotulo?: string }[]) {
  const out: { campo: T; valor: string; rotulo: string; termo: string }[] = [];
  for (const v of valores) {
    const ws = palavras(v.rotulo ?? v.valor);
    const junto = normalizar(v.rotulo ?? v.valor).replace(/[^a-z0-9+#]/g, '');
    for (const t of c.termos) {
      if (t.original.length < 2) continue;
      // o que foi digitado casa inteiro ou como começo (3+ letras); sinônimo só inteiro
      // pedaço de nome composto ("api" em FastAPI) só conta com 4+ letras
      const casa = t.formas.some((f, k) => junto === f.replace(/[^a-z0-9+#]/g, '') || ((f.length >= 4 || ws.length === 1) && ws.includes(f)) || (k === 0 && f.length >= 4 && ws.some((w) => w.startsWith(f))));
      if (casa) {
        out.push({ campo: v.campo, valor: v.valor, rotulo: v.rotulo ?? v.valor, termo: t.original });
        break;
      }
    }
  }
  return out;
}
