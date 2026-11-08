// Armazenamento chave-valor assíncrono usado pelo cache de dados do GitHub.
export interface Armazenamento {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** apaga toda chave que começa com `prefix` */
  clearPrefix(prefix: string): Promise<void>;
}
