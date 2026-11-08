import type { Armazenamento } from './armazenamento';
import { ArmazenamentoIndexedDB, temIndexedDB } from './indexeddb';
import { ArmazenamentoMemoria } from './memoria';
import { ArmazenamentoRoteado } from './roteado';
import { PREFIXO_ANONIMO } from './token';

export type { Armazenamento } from './armazenamento';
export { ArmazenamentoIndexedDB } from './indexeddb';
export { ArmazenamentoMemoria } from './memoria';
export { prefixoDoToken, vigiarToken, PREFIXO_ANONIMO } from './token';

/**
 * Sem token (`anon|`): IndexedDB, quando existe. Com token: IndexedDB só se `tokenLembrado()` (opção
 * "lembrar neste navegador"); token só da sessão fica em memória e some ao fechar a aba.
 */
export function criarArmazenamento(tokenLembrado: () => boolean = () => false): Armazenamento {
  if (!temIndexedDB()) return new ArmazenamentoMemoria();
  return new ArmazenamentoRoteado(new ArmazenamentoIndexedDB(), new ArmazenamentoMemoria(), (key) => key.startsWith(PREFIXO_ANONIMO + '|') || tokenLembrado());
}
