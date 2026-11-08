import { useSyncExternalStore } from 'react';

// Store mínimo com persistência opcional no localStorage.
export type Store<T> = {
  get: () => T;
  set: (patch: Partial<T>) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createStore<T extends object>(initial: T, persistKey?: string): Store<T> {
  let state = initial;
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) {
        // só as chaves que existem hoje: o que sobrou de versões antigas é descartado
        const saved = JSON.parse(raw) as Record<string, unknown>;
        const keep: Record<string, unknown> = {};
        for (const k of Object.keys(initial)) if (k in saved) keep[k] = saved[k];
        state = { ...initial, ...(keep as Partial<T>) };
      }
    } catch {
      /* sem localStorage: vale só para esta visita */
    }
  }
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      if (persistKey) {
        try {
          localStorage.setItem(persistKey, JSON.stringify(state));
        } catch {
          /* ignora */
        }
      }
      listeners.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

export function useStore<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
