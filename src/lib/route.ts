// Links e endereços do app: /Cerne/{dono}/{repo}/blob/{ramo}/{caminho}#L3-L5
import { formatLineHash, parseLineHash, type LineRange } from './hash';

export type RepoLink = { owner: string; repo: string; ref?: string; path?: string; lines?: LineRange | null };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // "/Cerne"
/** A base do app depois do host, para quando o endereço vem colado inteiro: `https://host/Cerne/dono/repo`. */
const BASE_NA_URL = new RegExp(`^[^/]*${BASE}/`, 'i');

/** Lê um link colado: `dono/repo`, URL do GitHub (raiz, tree ou blob, com #L3-L5) ou o endereço do próprio app. */
export function parseRepoLink(input: string): RepoLink | null {
  let s = input.trim();
  if (!s) return null;
  let hash = '';
  const h = s.indexOf('#');
  if (h >= 0) {
    hash = s.slice(h);
    s = s.slice(0, h);
  }
  s = s.replace(/^https?:\/\/(www\.)?/i, '').replace(/^github\.com\//i, '').replace(BASE_NA_URL, '');
  s = s.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo, kind, ref, ...rest] = parts as [string, string, string?, string?, ...string[]];
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  const link: RepoLink = { owner, repo };
  if ((kind === 'tree' || kind === 'blob') && ref) {
    link.ref = ref;
    if (kind === 'blob' && rest.length) link.path = rest.join('/');
  }
  const lines = parseLineHash(hash);
  if (lines) link.lines = lines;
  return link;
}

export type Loc = { owner: string; repo: string; ref: string | null; path: string | null; lines: LineRange | null };

export function parseLocation(pathname: string, hash: string): Loc | null {
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const parts = rel.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length < 2) return null;
  const [owner, repo, kind, ref, ...rest] = parts as [string, string, string?, string?, ...string[]];
  return { owner, repo, ref: ref && (kind === 'blob' || kind === 'tree') ? ref : null, path: kind === 'blob' && rest.length ? rest.join('/') : null, lines: parseLineHash(hash) };
}

/** Sem ramo e sem arquivo, o endereço fica só `/dono/repo`: o ramo padrão não é gravado. Com arquivo, o ramo é obrigatório. */
export function buildPath(l: { owner: string; repo: string; ref: string | null; path: string | null; lines: LineRange | null }): string {
  const enc = (s: string) => s.split('/').map(encodeURIComponent).join('/');
  const base = `${BASE}/${l.owner}/${l.repo}`;
  if (!l.ref) return base;
  if (!l.path) return `${base}/tree/${encodeURIComponent(l.ref)}`;
  return `${base}/blob/${encodeURIComponent(l.ref)}/${enc(l.path)}${formatLineHash(l.lines)}`;
}

export function homePath() {
  return `${BASE}/`;
}
