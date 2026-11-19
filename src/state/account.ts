// Conta do GitHub: o perfil de quem entrou com um token. O perfil não é segredo; fica no mesmo lugar
// que o token (sessão ou navegador) para a foto aparecer na hora, e é conferido de novo ao abrir o app.
import { useSyncExternalStore } from 'react';
import { ErroConta, lerConta, lerRepos, type Conta, type RepoDaConta } from '../data/github/conta';
import { clearToken, getToken, saveToken, subscribeToken } from './token';

const KEY = 'cerne:conta';

export type EstadoConta =
  | { status: 'anonimo' }
  | { status: 'conferindo'; conta: Conta | null }
  | { status: 'ok'; conta: Conta; lembrado: boolean }
  /** o token guardado deixou de valer (expirou ou foi apagado no GitHub) */
  | { status: 'invalido'; conta: Conta | null; erro: string };

function lerGuardada(): Conta | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(KEY);
      if (raw) return JSON.parse(raw) as Conta;
    } catch {
      /* ignora */
    }
  }
  return null;
}

function guardar(conta: Conta | null, lembrar: boolean) {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    if (conta) (lembrar ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(conta));
  } catch {
    /* sem armazenamento */
  }
}

let estado: EstadoConta = { status: 'anonimo' };
const listeners = new Set<() => void>();
const set = (e: EstadoConta) => {
  estado = e;
  listeners.forEach((fn) => fn());
};

/** Confere o token guardado (uma chamada a /user). */
async function conferir() {
  const { value, remembered } = getToken();
  if (!value) return set({ status: 'anonimo' });
  const antes = lerGuardada();
  set({ status: 'conferindo', conta: antes });
  try {
    const conta = await lerConta(value);
    if (getToken().value !== value) return;
    guardar(conta, remembered);
    set({ status: 'ok', conta, lembrado: remembered });
  } catch (e) {
    if (getToken().value !== value) return;
    // sem rede: mantém o perfil guardado e não acusa o token
    if (antes && e instanceof ErroConta && e.message.startsWith('Sem conexão')) set({ status: 'ok', conta: antes, lembrado: remembered });
    else set({ status: 'invalido', conta: antes, erro: e instanceof Error ? e.message : 'Erro ao conferir o token.' });
  }
}

let iniciado = false;
function iniciar() {
  if (iniciado) return;
  iniciado = true;
  void conferir();
  // token removido por fora (apagar dados, outra aba): volta a anônimo
  subscribeToken(() => {
    if (!getToken().value && estado.status !== 'anonimo') {
      guardar(null, false);
      set({ status: 'anonimo' });
    }
  });
}

export function useConta(): EstadoConta {
  iniciar();
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => estado,
  );
}

/** Confere o token antes de guardar: só entra se o GitHub aceitar. */
export async function entrar(token: string, lembrar: boolean): Promise<Conta> {
  iniciar();
  const conta = await lerConta(token.trim());
  saveToken(token.trim(), lembrar);
  setRepos({ status: 'ocioso', lista: [] });
  guardar(conta, lembrar);
  set({ status: 'ok', conta, lembrado: lembrar });
  return conta;
}

// ---------- repositórios de quem entrou (só em memória, relidos a cada visita) ----------
export type EstadoRepos = { status: 'ocioso' | 'carregando' | 'ok' | 'erro'; lista: RepoDaConta[]; erro?: string };
let repos: EstadoRepos = { status: 'ocioso', lista: [] };
const ouvintesRepos = new Set<() => void>();
const setRepos = (r: EstadoRepos) => {
  repos = r;
  ouvintesRepos.forEach((fn) => fn());
};

export function carregarRepos(forcar = false) {
  const token = getToken().value;
  if (!token) return setRepos({ status: 'ocioso', lista: [] });
  if (!forcar && (repos.status === 'carregando' || repos.status === 'ok')) return;
  setRepos({ status: 'carregando', lista: repos.lista });
  lerRepos(token).then(
    (lista) => getToken().value === token && setRepos({ status: 'ok', lista }),
    (e: unknown) => getToken().value === token && setRepos({ status: 'erro', lista: [], erro: e instanceof Error ? e.message : 'Erro ao ler os repositórios.' }),
  );
}

/** Lista dos repositórios da conta; carrega na primeira vez que alguém pede. */
export function useRepos(ativo = true): EstadoRepos {
  const r = useSyncExternalStore(
    (fn) => {
      ouvintesRepos.add(fn);
      return () => ouvintesRepos.delete(fn);
    },
    () => repos,
  );
  if (ativo && r.status === 'ocioso' && getToken().value) queueMicrotask(() => carregarRepos());
  return r;
}

export function sair() {
  setRepos({ status: 'ocioso', lista: [] });
  guardar(null, false);
  clearToken();
  set({ status: 'anonimo' });
}

/** Iniciais para quando a foto não carrega. */
export function iniciais(c: Pick<Conta, 'login' | 'nome'>): string {
  const base = (c.nome ?? c.login).trim();
  const partes = base.split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1]![0] : '')).toUpperCase() || '?';
}
