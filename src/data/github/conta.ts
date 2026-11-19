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
    throw new ErroConta('Sem conexão com o GitHub. Confira a internet e tente de novo.');
  }
  if (res.status === 401) throw new ErroConta('O GitHub não aceitou esse token. Ele pode estar errado, expirado ou ter sido apagado. Copie de novo ou gere outro.');
  if (res.status === 403) throw new ErroConta('O GitHub recusou o token agora (limite de chamadas ou bloqueio da organização). Tente de novo em alguns minutos.');
  if (!res.ok) throw new ErroConta(`O GitHub respondeu com erro ${res.status}. Tente de novo em instantes.`);
  const j = (await res.json()) as { login?: unknown; name?: unknown; avatar_url?: unknown; html_url?: unknown };
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
  };
}
