// Arquivos e pastas escondidos da árvore, por repositório, só neste navegador.
import { useCallback, useEffect, useState } from 'react';

const chave = (repo: string) => `cerne:ocultos:${repo.toLowerCase()}`;

function ler(repo: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(chave(repo)) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useOcultos(repo: string) {
  const [estado, setEstado] = useState(() => ({ repo, lista: ler(repo) }));
  // trocou de repositório: carrega a lista dele
  const lista = estado.repo === repo ? estado.lista : ler(repo);
  useEffect(() => {
    if (estado.repo !== repo) setEstado({ repo, lista: ler(repo) });
  }, [repo, estado.repo]);

  const mudar = useCallback(
    (f: (l: string[]) => string[]) =>
      setEstado((s) => {
        const atual = s.repo === repo ? s.lista : ler(repo);
        const nova = f(atual);
        try {
          if (nova.length) localStorage.setItem(chave(repo), JSON.stringify(nova));
          else localStorage.removeItem(chave(repo));
        } catch {
          /* sem armazenamento: vale só nesta visita */
        }
        return { repo, lista: nova };
      }),
    [repo],
  );

  return {
    ocultos: lista,
    esconder: useCallback((p: string) => mudar((l) => (l.includes(p) ? l : [...l, p])), [mudar]),
    mostrar: useCallback((p: string) => mudar((l) => l.filter((x) => x !== p)), [mudar]),
    mostrarTodos: useCallback((ps: string[]) => mudar((l) => l.filter((x) => !ps.includes(x))), [mudar]),
  };
}
