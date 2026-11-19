// Atalhos para escrever entradas do catálogo com menos ruído.
import type { Entrada, Passo } from './tipos';

/** Passo do roteiro: título, arquivo, âncora (texto que existe no arquivo) e o que observar. */
export const P = (titulo: string, arquivo: string, ancora: string | undefined, foco: string): Passo => ({ titulo, arquivo, ancora, foco });

/** Só para o TypeScript conferir a entrada. */
export const repos = (lista: Entrada[]) => lista;
