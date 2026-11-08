import type { Armazenamento } from './armazenamento';

const DB_NAME = 'cerne-cache';
const STORE = 'kv';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB indisponível'));
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
}

function pedido<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Falha no IndexedDB'));
  });
}

/** Cache persistente. Erros de leitura/escrita viram "sem cache", nunca derrubam a tela. */
export class ArmazenamentoIndexedDB implements Armazenamento {
  private db: Promise<IDBDatabase>;

  constructor() {
    this.db = abrir();
    this.db.catch(() => undefined);
  }

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.db;
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return (await pedido((await this.store('readonly')).get(key))) as T | undefined;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await pedido((await this.store('readwrite')).put(value, key));
    } catch {
      /* cota do navegador cheia ou sem IndexedDB: segue sem guardar */
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await pedido((await this.store('readwrite')).delete(key));
    } catch {
      /* ignora */
    }
  }

  async clearPrefix(prefix: string): Promise<void> {
    try {
      const s = await this.store('readwrite');
      await pedido(s.delete(IDBKeyRange.bound(prefix, prefix + '\uffff')));
    } catch {
      /* ignora */
    }
  }
}

export const temIndexedDB = () => {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
};
