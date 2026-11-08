import type { Armazenamento } from './armazenamento';

/**
 * Separa onde cada chave mora: `persistente` (IndexedDB) ou `volatil` (memória).
 * `vaiParaDisco(key)` decide só para get/set/delete; limpezas valem para os dois.
 */
export class ArmazenamentoRoteado implements Armazenamento {
  constructor(
    private persistente: Armazenamento,
    private volatil: Armazenamento,
    private vaiParaDisco: (key: string) => boolean,
  ) {}

  private de(key: string): Armazenamento {
    return this.vaiParaDisco(key) ? this.persistente : this.volatil;
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.de(key).get<T>(key);
  }

  set<T>(key: string, value: T): Promise<void> {
    return this.de(key).set(key, value);
  }

  delete(key: string): Promise<void> {
    return this.de(key).delete(key);
  }

  async clearPrefix(prefix: string): Promise<void> {
    await Promise.all([this.persistente.clearPrefix(prefix), this.volatil.clearPrefix(prefix)]);
  }

  async clearExceptPrefixes(manter: string[]): Promise<void> {
    await Promise.all([this.persistente.clearExceptPrefixes(manter), this.volatil.clearExceptPrefixes(manter)]);
  }

  async clearAll(): Promise<void> {
    await Promise.all([this.persistente.clearAll(), this.volatil.clearAll()]);
  }
}
