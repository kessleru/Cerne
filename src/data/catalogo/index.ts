// Índice do catálogo: junta as entradas de repos/*.ts e monta trilhas, famosos e buscas.
// Trilhas não são escritas à mão: uma por linguagem e uma por tema, a partir das etiquetas de cada entrada.
import { GLOSSARIO } from './glossario';
import { LINGUAGENS } from './linguagens';
import { TEMAS } from './temas';
import type { CategoriaFamoso, Entrada, Nivel, Termo } from './tipos';

// cada arquivo em repos/ exporta por padrão uma lista de entradas
const modulos = import.meta.glob<{ default: Entrada[] }>('./repos/*.ts', { eager: true });
export const CATALOGO: Entrada[] = Object.keys(modulos)
  .sort()
  .flatMap((k) => modulos[k]!.default);

const ORDEM_NIVEL: Record<Nivel, number> = { iniciante: 0, intermediário: 1, avançado: 2 };
const porNivel = (lista: Entrada[]) => lista.map((e, i) => ({ e, i })).sort((a, b) => ORDEM_NIVEL[a.e.nivel] - ORDEM_NIVEL[b.e.nivel] || a.i - b.i).map((x) => x.e);

export type Trilha = {
  id: string;
  titulo: string;
  grupo: 'Linguagens' | 'Temas';
  ext?: string;
  icone?: import('../../components/Icon').IconName;
  cor: string;
  resumo: string;
  repos: Entrada[];
};

export const TRILHAS: Trilha[] = [
  ...LINGUAGENS.map((l) => ({ id: `lang-${l.ext}`, titulo: l.nome, grupo: 'Linguagens' as const, ext: l.ext, cor: l.cor, resumo: l.resumo, repos: porNivel(CATALOGO.filter((e) => e.lang === l.nome)) })),
  ...TEMAS.map((t) => ({ id: t.id, titulo: t.titulo, grupo: 'Temas' as const, icone: t.icone, cor: t.cor, resumo: t.resumo, repos: porNivel(CATALOGO.filter((e) => e.temas.includes(t.id))) })),
].filter((t) => t.repos.length > 0);

export const CATEGORIAS: ('Todos' | CategoriaFamoso)[] = ['Todos', 'Sistemas', 'Linguagens', 'Dados', 'Web', 'IA', 'Ferramentas'];
export const FAMOSOS: Entrada[] = CATALOGO.filter((e) => e.famoso);

const POR_REPO = new Map(CATALOGO.map((e) => [e.repo.toLowerCase(), e]));
export const entradaDe = (owner: string, repo: string): Entrada | null => POR_REPO.get(`${owner}/${repo}`.toLowerCase()) ?? null;
export const termoDe = (id: string): Termo | null => GLOSSARIO[id] ?? null;
export const extDaLinguagem = (nome: string): string => LINGUAGENS.find((l) => l.nome === nome)?.ext ?? 'txt';

/** Números para a página inicial. */
export const NUMEROS = {
  repos: CATALOGO.length,
  guias: CATALOGO.filter((e) => e.guia).length,
  passos: CATALOGO.reduce((n, e) => n + (e.guia?.passos.length ?? 0), 0),
  trilhas: TRILHAS.length,
  linguagens: new Set(CATALOGO.map((e) => e.lang)).size,
};

// conferências baratas só em desenvolvimento: erros de digitação aparecem no console na hora
if (import.meta.env.DEV) {
  const vistos = new Set<string>();
  for (const e of CATALOGO) {
    const k = e.repo.toLowerCase();
    if (vistos.has(k)) console.warn(`[catálogo] repetido: ${e.repo}`);
    vistos.add(k);
    if (!LINGUAGENS.some((l) => l.nome === e.lang)) console.warn(`[catálogo] ${e.repo}: linguagem desconhecida "${e.lang}" (acrescente em linguagens.ts)`);
    for (const t of e.temas) if (!TEMAS.some((x) => x.id === t)) console.warn(`[catálogo] ${e.repo}: tema desconhecido "${t}"`);
    for (const c of e.guia?.conceitos ?? []) if (!GLOSSARIO[c]) console.warn(`[catálogo] ${e.repo}: termo sem explicação "${c}" (acrescente em glossario.ts)`);
    if (e.guia?.depois && !POR_REPO.has(e.guia.depois.toLowerCase())) console.warn(`[catálogo] ${e.repo}: "depois" aponta para fora do catálogo (${e.guia.depois})`);
  }
}

export type { Entrada, Nivel } from './tipos';
