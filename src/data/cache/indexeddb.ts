import type { Armazenamento } from './armazenamento';

const DB_NAME = 'cerne-cache';
const STORE = 'kv';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close(); // não trava um deleteDatabase de outra aba
      resolve(db);
    };
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

  async clearExceptPrefixes(manter: string[]): Promise<void> {
    try {
      const s = await this.store('readwrite');
      await new Promise<void>((resolve, reject) => {
        const cur = s.openKeyCursor();
        cur.onsuccess = () => {
          const c = cur.result;
          if (!c) return resolve();
          const k = String(c.key);
          if (!manter.some((p) => k.startsWith(p))) s.delete(c.primaryKey);
          c.continue();
        };
        cur.onerror = () => reject(cur.error ?? new Error('Falha no IndexedDB'));
      });
    } catch {
      /* ignora */
    }
  }

  /** Apaga o banco inteiro (não só as chaves) e deixa uma conexão nova para o que vier depois. */
  async clearAll(): Promise<void> {
    try {
      (await this.db).close();
    } catch {
      /* já estava fechado ou nunca abriu */
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error('Falha ao apagar o IndexedDB'));
        req.onblocked = () => resolve(); // outra aba segura; o `onversionchange` dela fecha e o apagamento termina
      });
    } catch {
      /* ignora */
    }
    this.db = abrir();
    this.db.catch(() => undefined);
  }
}

export const temIndexedDB = () => {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
};
