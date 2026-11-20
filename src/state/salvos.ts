// Repositórios salvos, só neste navegador (como os estudados): dono/nome, um resumo para a lista e quando foi salvo.
import { useSyncExternalStore } from 'react';

export type Salvo = { repo: string; nota?: string; lang?: string; em: number };

const CHAVE = 'cerne:salvos';

function ler(): Salvo[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is Salvo => x && typeof x.repo === 'string' && typeof x.em === 'number') : [];
  } catch {
    return [];
  }
}

let atual: Salvo[] = ler();
const ouvintes = new Set<() => void>();
const igual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function gravar(n: Salvo[]) {
  atual = n;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(n));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  ouvintes.forEach((f) => f());
}

// outra aba do navegador salvou ou removeu: acompanha
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CHAVE) return;
    atual = ler();
    ouvintes.forEach((f) => f());
  });
}

export const salvos = {
  tem: (repo: string) => atual.some((s) => igual(s.repo, repo)),
  /** salva (no topo da lista) ou tira dos salvos */
  alternar(dados: Omit<Salvo, 'em'>) {
    if (salvos.tem(dados.repo)) gravar(atual.filter((s) => !igual(s.repo, dados.repo)));
    else gravar([{ ...dados, nota: dados.nota?.slice(0, 160), em: Date.now() }, ...atual]);
  },
  remover: (repo: string) => gravar(atual.filter((s) => !igual(s.repo, repo))),
  use: () =>
    useSyncExternalStore(
      (f) => {
        ouvintes.add(f);
        return () => ouvintes.delete(f);
      },
      () => atual,
    ),
};
