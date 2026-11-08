// Armazenamento chave-valor assíncrono usado pelo cache de dados do GitHub.
export interface Armazenamento {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** apaga toda chave que começa com `prefix` */
  clearPrefix(prefix: string): Promise<void>;
  /** apaga toda chave que não começa com nenhum dos prefixos de `manter` */
  clearExceptPrefixes(manter: string[]): Promise<void>;
  /** apaga tudo; no IndexedDB, o banco inteiro */
  clearAll(): Promise<void>;
}
