// Índice do catálogo.
// Famosos: projetos grandes e conhecidos, escritos à mão em famosos/*.ts.
// Estudar: projetos de pessoas (estudantes e devs), gerados por scripts/catalogo-estudo.mjs em estudo.json.
// As trilhas do Estudar se montam sozinhas: uma por tema e uma por linguagem.
// estudo.json é grande e cresce: vem num pedaço separado, só quando alguém precisa (useEstudo).
import { useEffect, useState } from 'react';
import { LINGUAGENS } from './linguagens';
import { TEMAS } from './temas';
import type { CategoriaFamoso, Entrada, Tema } from './tipos';

const modulos = import.meta.glob<{ default: Entrada[] }>('./famosos/*.ts', { eager: true });
export const FAMOSOS: Entrada[] = Object.keys(modulos)
  .sort()
  .flatMap((k) => modulos[k]!.default);

// famosos de saída; os de estudo entram quando estudo.json chega
const POR_REPO = new Map<string, Entrada>(FAMOSOS.map((e) => [e.repo.toLowerCase(), e]));

type Bruto = { repo: string; nota: string; lang: string; temas: string[]; dominio?: string; stack?: string[]; api?: Entrada['api']; estrelas?: number };

export type Trilha = {
  id: string;
  titulo: string;
  grupo: 'Temas' | 'Linguagens';
  ext?: string;
  icone?: Tema['icone'];
  cor: string;
  resumo?: string;
  repos: Entrada[];
};

export type Estudo = { lista: Entrada[]; trilhas: Trilha[] };

function montar(brutos: Bruto[]): Estudo {
  const lista = brutos.map((e) => ({ ...e, tipo: 'projeto' as const }));
  const trilhas: Trilha[] = [
    ...TEMAS.map((t) => ({ id: t.id, titulo: t.titulo, grupo: 'Temas' as const, icone: t.icone, cor: t.cor, resumo: t.resumo, repos: lista.filter((e) => e.temas.includes(t.id)) })),
    ...LINGUAGENS.map((l) => ({ id: `lang-${l.ext}`, titulo: l.nome, grupo: 'Linguagens' as const, ext: l.ext, cor: l.cor, repos: lista.filter((e) => e.lang === l.nome) })),
  ].filter((t) => t.repos.length >= 5); // trilha com menos de 5 projetos fica de fora até crescer
  for (const e of lista) POR_REPO.set(e.repo.toLowerCase(), e);
  return { lista, trilhas };
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

export type { Entrada, Nivel } from './tipos';
