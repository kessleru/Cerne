// Confere um token lendo o perfil (`GET /user`). O token só vai no cabeçalho; o erro nunca o carrega.
import { API, ACEITA_JSON } from './api';

export type TipoToken = 'fine-grained' | 'clássico' | 'outro';

export type Conta = {
  login: string;
  nome: string | null;
  /** endereço da foto em avatars.githubusercontent.com (o <img> não leva o token) */
  avatar: string;
  perfil: string;
  tipo: TipoToken;
  /** escopos do token clássico (cabeçalho X-OAuth-Scopes); null quando o GitHub não informa */
  escopos: string[] | null;
  /** chamadas por hora que o token libera */
  limite: number | null;
  // dados do perfil público (podem faltar em perfis guardados por versões antigas)
  bio?: string | null;
  empresa?: string | null;
  local?: string | null;
  site?: string | null;
  seguidores?: number;
  seguindo?: number;
  reposPublicos?: number;
  reposPrivados?: number;
  /** ISO 8601: quando a conta foi criada */
  desde?: string;
};

export type RepoDaConta = {
  /** dono/nome */
  nome: string;
  privado: boolean;
  fork: boolean;
  descricao: string | null;
  linguagem: string | null;
  estrelas: number;
  /** ISO 8601 do último push */
  atualizado: string;
};

/** Pelo começo do texto: github_pat_ é fine-grained, ghp_ é clássico. Só para orientar quem cola. */
export function tipoDoToken(t: string): TipoToken | null {
  const v = t.trim();
  if (!v) return null;
  if (v.startsWith('github_pat_')) return 'fine-grained';
  if (v.startsWith('ghp_')) return 'clássico';
  if (/^gh[ousr]_/.test(v)) return 'outro';
  return null;
}

export class ErroConta extends Error {}

export async function lerConta(token: string): Promise<Conta> {
  let res: Response;
  try {
    res = await fetch(`${API}/user`, { headers: { Accept: ACEITA_JSON, Authorization: `Bearer ${token}` } });
  } catch {
    throw new ErroConta('Sem conexão com o GitHub.');
  }
  if (res.status === 401) throw new ErroConta('Token recusado: errado, expirado ou apagado.');
  if (res.status === 403) throw new ErroConta('O GitHub recusou agora (limite ou organização). Tente em alguns minutos.');
  if (!res.ok) throw new ErroConta(`O GitHub respondeu com erro ${res.status}. Tente de novo em instantes.`);
  const j = (await res.json()) as Record<string, unknown>;
  const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  if (typeof j.login !== 'string') throw new ErroConta('Resposta inesperada do GitHub.');
  const escopos = res.headers.get('x-oauth-scopes');
  const limite = Number(res.headers.get('x-ratelimit-limit'));
  return {
    login: j.login,
    nome: typeof j.name === 'string' && j.name.trim() ? j.name : null,
    avatar: typeof j.avatar_url === 'string' && j.avatar_url.startsWith('https://avatars.githubusercontent.com/') ? j.avatar_url : '',
    perfil: `https://github.com/${encodeURIComponent(j.login)}`,
    tipo: tipoDoToken(token) ?? 'outro',
    escopos: escopos === null ? null : escopos.split(',').map((s) => s.trim()).filter(Boolean),
    limite: Number.isFinite(limite) && limite > 0 ? limite : null,
    bio: txt(j.bio),
    empresa: txt(j.company),
    local: txt(j.location),
    site: siteSeguro(txt(j.blog)),
    seguidores: num(j.followers),
    seguindo: num(j.following),
    reposPublicos: num(j.public_repos),
    reposPrivados: num(j.total_private_repos),
    desde: txt(j.created_at) ?? undefined,
  };
}

/** Só links http(s); o campo "blog" do GitHub aceita qualquer texto. */
function siteSeguro(v: string | null): string | null {
  if (!v) return null;
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/** Repositórios de quem entrou (seus, de organizações e onde colabora), do push mais recente ao mais antigo. */
export async function lerRepos(token: string): Promise<RepoDaConta[]> {
  let res: Response;
  try {
    res = await fetch(`${API}/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member`, { headers: { Accept: ACEITA_JSON, Authorization: `Bearer ${token}` } });
  } catch {
    throw new ErroConta('Sem conexão com o GitHub.');
  }
  if (!res.ok) throw new ErroConta(res.status === 401 ? 'O token parou de funcionar.' : `O GitHub respondeu com erro ${res.status}.`);
  const lista = (await res.json()) as Record<string, unknown>[];
  return lista
    .filter((r) => typeof r.full_name === 'string')
    .map((r) => ({
      nome: r.full_name as string,
      privado: r.private === true,
      fork: r.fork === true,
      descricao: typeof r.description === 'string' && r.description.trim() ? r.description : null,
      linguagem: typeof r.language === 'string' ? r.language : null,
      estrelas: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0,
      atualizado: typeof r.pushed_at === 'string' ? r.pushed_at : typeof r.updated_at === 'string' ? r.updated_at : '',
    }));
}

/** Foto de uma conta pelo login (para quando o endereço pelo nome devolve a foto padrão). */
export async function lerAvatar(login: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/users/${encodeURIComponent(login)}`, { headers: { Accept: ACEITA_JSON, Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const j = (await res.json()) as { avatar_url?: unknown };
    return typeof j.avatar_url === 'string' && j.avatar_url.startsWith('https://avatars.githubusercontent.com/') ? j.avatar_url : null;
  } catch {
    return null;
  }
}
