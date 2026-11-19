// Progresso de estudo, só neste navegador: repositórios marcados como estudados e passos de guia já abertos.
import { useSyncExternalStore } from 'react';

function conjunto(chave: string) {
  let atual: ReadonlySet<string> = new Set(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(chave) ?? '[]') as string[];
      } catch {
        return [];
      }
    })(),
  );
  const ouvintes = new Set<() => void>();
  const gravar = (n: Set<string>) => {
    atual = n;
    try {
      localStorage.setItem(chave, JSON.stringify([...n]));
    } catch {
      /* sem armazenamento */
    }
    ouvintes.forEach((f) => f());
  };
  return {
    alternar(id: string) {
      const n = new Set(atual);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      gravar(n);
    },
    marcar(id: string) {
      if (!atual.has(id)) gravar(new Set(atual).add(id));
    },
    use: () =>
      useSyncExternalStore(
        (f) => {
          ouvintes.add(f);
          return () => ouvintes.delete(f);
        },
        () => atual,
      ),
  };
}

/** repositórios marcados como estudados (dono/nome) */
export const estudados = conjunto('cerne:estudados');
/** passos de guia já abertos ("dono/nome#índice") */
export const passosVistos = conjunto('cerne:passos');
