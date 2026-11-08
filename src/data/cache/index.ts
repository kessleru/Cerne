import type { Armazenamento } from './armazenamento';
import { ArmazenamentoIndexedDB, temIndexedDB } from './indexeddb';
import { ArmazenamentoMemoria } from './memoria';

export type { Armazenamento } from './armazenamento';
export { ArmazenamentoIndexedDB } from './indexeddb';
export { ArmazenamentoMemoria } from './memoria';
export { prefixoDoToken, vigiarToken, PREFIXO_ANONIMO } from './token';

/** IndexedDB quando existe; senão memória. */
export function criarArmazenamento(): Armazenamento {
  return temIndexedDB() ? new ArmazenamentoIndexedDB() : new ArmazenamentoMemoria();
}
