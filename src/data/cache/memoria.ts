import type { Armazenamento } from './armazenamento';

/** Cache só em memória: vale até recarregar a página. Também é o plano B quando o IndexedDB não abre. */
export class ArmazenamentoMemoria implements Armazenamento {
  private map = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async clearPrefix(prefix: string): Promise<void> {
    for (const k of [...this.map.keys()]) if (k.startsWith(prefix)) this.map.delete(k);
  }

  async clearExceptPrefixes(manter: string[]): Promise<void> {
    for (const k of [...this.map.keys()]) if (!manter.some((p) => k.startsWith(p))) this.map.delete(k);
  }

  async clearAll(): Promise<void> {
    this.map.clear();
  }
}
