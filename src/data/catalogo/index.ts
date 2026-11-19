// Índice do catálogo.
// Famosos: projetos grandes e conhecidos, escritos à mão em famosos/*.ts.
// Estudar: projetos de pessoas (estudantes e devs), gerados por scripts/catalogo-estudo.mjs em estudo.json.
// As trilhas do Estudar se montam sozinhas: uma por tema e uma por linguagem.
// estudo.json é grande e cresce: vem num pedaço separado, só quando alguém precisa (useEstudo).
import { useEffect, useState } from 'react';
import { AREAS } from './areas';
import { LINGUAGENS } from './linguagens';
import { TEMAS } from './temas';
import type { Area, AreaInfo, CategoriaFamoso, Entrada, Tema } from './tipos';

const modulos = import.meta.glob<{ default: Entrada[] }>('./famosos/*.ts', { eager: true });
export const FAMOSOS: Entrada[] = Object.keys(modulos)
  .sort()
  .flatMap((k) => modulos[k]!.default);

// famosos de saída; os de estudo entram quando estudo.json chega
const POR_REPO = new Map<string, Entrada>(FAMOSOS.map((e) => [e.repo.toLowerCase(), e]));

type Bruto = { repo: string; nota: string; lang: string; area?: Area; temas: string[]; dominio?: string; stack?: string[]; api?: Entrada['api']; estrelas?: number; readme?: number };

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

/** Uma área com os projetos dela e as trilhas (tudo, temas e linguagens com ao menos MINIMO projetos). */
export type AreaEstudo = AreaInfo & { repos: Entrada[]; trilhas: Trilha[] };
export type Estudo = { lista: Entrada[]; areas: AreaEstudo[] };

const MINIMO = 5; // trilha com menos projetos fica escondida até crescer

function montar(brutos: Bruto[]): Estudo {
  const lista: Entrada[] = brutos.map((e) => ({ ...e, area: e.area ?? 'backend', tipo: 'projeto' as const }));
  const areas: AreaEstudo[] = [];
  for (const a of AREAS) {
    const repos = lista.filter((e) => e.area === a.id);
    if (repos.length < MINIMO) continue;
    const trilhas: Trilha[] = [
      { id: 'tudo', titulo: `Tudo em ${a.titulo}`, grupo: 'Tudo' as const, icone: a.icone, cor: a.cor, resumo: a.resumo, repos },
      ...TEMAS.map((t) => ({ id: t.id, titulo: t.titulo, grupo: 'Temas' as const, icone: t.icone, cor: t.cor, resumo: t.resumo, repos: repos.filter((e) => e.temas.includes(t.id)) })),
      ...LINGUAGENS.map((l) => ({ id: `lang-${l.ext}`, titulo: l.nome, grupo: 'Linguagens' as const, ext: l.ext, cor: l.cor, repos: repos.filter((e) => e.lang === l.nome) })),
    ].filter((t) => t.repos.length >= MINIMO);
    areas.push({ ...a, repos, trilhas });
  }
  for (const e of lista) POR_REPO.set(e.repo.toLowerCase(), e);
  return { lista, areas };
}

let estudo: Estudo | null = null;
let carregando: Promise<Estudo> | null = null;
export function carregarEstudo(): Promise<Estudo> {
  carregando ??= import('./estudo.json').then((m) => (estudo = montar(m.default as Bruto[])));
  return carregando;
}

/** A lista de estudo; null enquanto o pedaço ainda chega. */
export function useEstudo(): Estudo | null {
  const [e, setE] = useState(estudo);
  useEffect(() => {
    if (e) return;
    let vivo = true;
    carregarEstudo().then((x) => vivo && setE(x));
    return () => {
      vivo = false;
    };
  }, [e]);
  return e;
}

export const CATEGORIAS: ('Todos' | CategoriaFamoso)[] = ['Todos', 'Aprender', 'Back-end', 'Front-end', 'IA', 'Dados', 'Sistemas', 'Linguagens', 'Ferramentas'];

export const entradaDe = (owner: string, repo: string): Entrada | null => POR_REPO.get(`${owner}/${repo}`.toLowerCase()) ?? null;
export const extDaLinguagem = (nome: string): string => LINGUAGENS.find((l) => l.nome === nome)?.ext ?? 'txt';

if (import.meta.env.DEV) {
  for (const e of FAMOSOS) if (!e.famoso) console.warn(`[catálogo] ${e.repo}: famoso sem categoria`);
}

export type { Area, AreaInfo, Entrada, Nivel } from './tipos';
export { AREAS } from './areas';
