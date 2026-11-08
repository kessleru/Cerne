// Token do GitHub: só em memória do navegador, nunca em arquivo nem em log. Sem "lembrar neste navegador", dura a sessão.
const KEY = 'cerne:token';

function read(store: Storage): string | null {
  try {
    return store.getItem(KEY);
  } catch {
    return null;
  }
}

export function getToken(): { value: string | null; remembered: boolean } {
  const local = read(localStorage);
  if (local) return { value: local, remembered: true };
  return { value: read(sessionStorage), remembered: false };
}

export function saveToken(value: string, remember: boolean) {
  clearToken();
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY, value);
  } catch {
    /* sem armazenamento: vale só até recarregar */
  }
  listeners.forEach((fn) => fn());
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
  listeners.forEach((fn) => fn());
}

const listeners = new Set<() => void>();
export function subscribeToken(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
