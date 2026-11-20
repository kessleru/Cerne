// Índice do catálogo.
// Famosos: projetos grandes e conhecidos, escritos à mão em famosos/*.ts.
// Estudar: projetos de pessoas (estudantes e devs), gerados por scripts/catalogo-estudo.mjs em estudo/<área>.json.
// Cada área vem num pedaço separado, só quando alguém a abre (useArea); estudo/indice.json, pequeno, traz as
// contagens e a amostra do carrossel. As trilhas de cada área se montam sozinhas: tudo, uma por tema e uma por linguagem.
import { useEffect, useState } from 'react';
import { AREAS } from './areas';
import INDICE from './estudo/indice.json';
import { LINGUAGENS } from './linguagens';
import { TEMAS } from './temas';
import type { Area, AreaInfo, CategoriaFamoso, Entrada, Tema } from './tipos';

const modulos = import.meta.glob<{ default: Entrada[] }>('./famosos/*.ts', { eager: true });
export const FAMOSOS: Entrada[] = Object.keys(modulos)
  .sort()
  .flatMap((k) => modulos[k]!.default);

// famosos de saída; os de estudo entram quando a área deles chega
const POR_REPO = new Map<string, Entrada>(FAMOSOS.map((e) => [e.repo.toLowerCase(), e]));

type Bruto = { repo: string; nota: string; lang: string; area?: Area; temas?: string[]; dominio?: string; stack?: string[]; api?: Entrada['api']; estrelas?: number; readme?: number; k?: string };
const projeto = (e: Bruto, area: Area): Entrada => ({ ...e, temas: e.temas ?? [], area, tipo: 'projeto' });

export type Trilha = {
  id: string;
  titulo: string;
  grupo: 'Tudo' | 'Temas' | 'Linguagens';
  ext?: string;
  icone?: Tema['icone'];
  cor: string;
  resumo?: string;
  repos: Entrada[];
};

const MINIMO = 5; // área ou trilha com menos projetos fica escondida até crescer

/** Áreas que aparecem no Estudar, com o total de projetos (sem baixar a lista). */
export const AREAS_ESTUDO: (AreaInfo & { total: number })[] = AREAS.map((a) => ({ ...a, total: (INDICE.contagem as Partial<Record<Area, number>>)[a.id] ?? 0 })).filter((a) => a.total >= MINIMO);

/** Amostra para o carrossel: os de README mais completo de cada área. */
export const VITRINE: Entrada[] = (INDICE.vitrine as Bruto[]).map((e) => projeto(e, e.area ?? 'backend'));

/** Uma área com os projetos dela e as trilhas (tudo, temas e linguagens com ao menos MINIMO projetos). */
export type AreaEstudo = AreaInfo & { repos: Entrada[]; trilhas: Trilha[] };

function montar(a: AreaInfo, brutos: Bruto[]): AreaEstudo {
  const repos = brutos.map((e) => projeto(e, a.id));
  const trilhas: Trilha[] = [
    { id: 'tudo', titulo: `Tudo em ${a.titulo}`, grupo: 'Tudo' as const, icone: a.icone, cor: a.cor, resumo: a.resumo, repos },
    ...TEMAS.map((t) => ({ id: t.id, titulo: t.titulo, grupo: 'Temas' as const, icone: t.icone, cor: t.cor, resumo: t.resumo, repos: repos.filter((e) => e.temas.includes(t.id)) })),
    ...LINGUAGENS.map((l) => ({ id: `lang-${l.ext}`, titulo: l.nome, grupo: 'Linguagens' as const, ext: l.ext, cor: l.cor, repos: repos.filter((e) => e.lang === l.nome) })),
  ].filter((t) => t.repos.length >= MINIMO);
  for (const e of repos) POR_REPO.set(e.repo.toLowerCase(), e);
  return { ...a, repos, trilhas };
}

const ARQUIVOS = import.meta.glob<{ default: Bruto[] }>(['./estudo/*.json', '!./estudo/indice.json']);
const prontas = new Map<Area, AreaEstudo>();
const pedidos = new Map<Area, Promise<AreaEstudo | null>>();

export function carregarArea(id: Area): Promise<AreaEstudo | null> {
  const info = AREAS.find((a) => a.id === id);
  const arquivo = ARQUIVOS[`./estudo/${id}.json`];
  if (!info || !arquivo) return Promise.resolve(null);
  let p = pedidos.get(id);
  if (!p) {
    p = arquivo().then((m) => {
      const pronta = montar(info, m.default);
      prontas.set(id, pronta);
      return pronta;
    });
    pedidos.set(id, p);
  }
  return p;
}

/** Todos os projetos de todas as áreas (para a busca geral); só carrega quando `ativar` vira true. */
export function useTodasAreas(ativar: boolean): Entrada[] | null {
  const [, redesenhar] = useState(0);
  const prontas_ = AREAS_ESTUDO.every((a) => prontas.has(a.id));
  useEffect(() => {
    if (!ativar || prontas_) return;
    let vivo = true;
    void Promise.all(AREAS_ESTUDO.map((a) => carregarArea(a.id))).then(() => vivo && redesenhar((n) => n + 1));
    return () => {
      vivo = false;
    };
  }, [ativar, prontas_]);
  if (!ativar || !prontas_) return null;
  // a mesma lista sempre (quem usa memoriza por identidade)
  todasCache ??= AREAS_ESTUDO.flatMap((a) => prontas.get(a.id)!.repos);
  return todasCache;
}
let todasCache: Entrada[] | null = null;

/** Os projetos de uma área; null enquanto o pedaço ainda chega. */
export function useArea(id: Area | null): AreaEstudo | null {
  const [, redesenhar] = useState(0);
  const pronta = id ? (prontas.get(id) ?? null) : null;
  useEffect(() => {
    if (!id || prontas.has(id)) return;
    let vivo = true;
    void carregarArea(id).then(() => vivo && redesenhar((n) => n + 1));
    return () => {
      vivo = false;
    };
  }, [id]);
  return pronta;
}

export const CATEGORIAS: ('Todos' | CategoriaFamoso)[] = ['Todos', 'Aprender', 'Back-end', 'Front-end', 'IA', 'Dados', 'Sistemas', 'Linguagens', 'Ferramentas'];

export const entradaDe = (owner: string, repo: string): Entrada | null => POR_REPO.get(`${owner}/${repo}`.toLowerCase()) ?? null;
export const extDaLinguagem = (nome: string): string => LINGUAGENS.find((l) => l.nome === nome)?.ext ?? 'txt';

if (import.meta.env.DEV) {
  for (const e of FAMOSOS) if (!e.famoso) console.warn(`[catálogo] ${e.repo}: famoso sem categoria`);
}

export type { Area, AreaInfo, Entrada, Nivel } from './tipos';
export { AREAS } from './areas';
