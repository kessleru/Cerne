// Camada de rede: uma função para a API (com token, cota e erros tipados) e outra para o raw.
import { erroDaResposta, erroSemRede, GitHubError, type Contexto } from './erros';
import type { RastreadorCota } from './cota';

export const API = 'https://api.github.com';
export const RAW = 'https://raw.githubusercontent.com';
export const ACEITA_JSON = 'application/vnd.github+json';
export const ACEITA_SHA = 'application/vnd.github.sha';
export const ACEITA_RAW = 'application/vnd.github.raw';

export type PedidoApi = {
  token: string | null;
  accept?: string;
  etag?: string;
  ctx: Omit<Contexto, 'temToken'>;
};

/** Chama a API. Respostas 200 e 304 voltam; o resto vira GitHubError. A cota é lida de toda resposta. */
export async function chamarApi(url: string, p: PedidoApi, cota: RastreadorCota): Promise<Response> {
  const headers: Record<string, string> = { Accept: p.accept ?? ACEITA_JSON };
  // o token só vai no cabeçalho, nunca na URL
  if (p.token) headers.Authorization = `Bearer ${p.token}`;
  if (p.etag) headers['If-None-Match'] = p.etag;
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw erroSemRede();
  }
  cota.daResposta(res.headers);
  if (res.ok || res.status === 304) return res;
  let corpo = '';
  try {
    const j = (await res.json()) as { message?: unknown };
    if (typeof j.message === 'string') corpo = j.message;
  } catch {
    /* corpo sem JSON */
  }
  throw erroDaResposta(res, corpo, { ...p.ctx, temToken: !!p.token });
}

/** Lê um arquivo público pelo raw (não gasta cota, sem Authorization). */
export async function chamarRaw(url: string, caminho: string): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw erroSemRede();
  }
  if (res.ok) return res.arrayBuffer();
  if (res.status === 404) {
    throw new GitHubError('arquivo-nao-encontrado', `Arquivo não encontrado: ${caminho}. Se o repositório for privado, adicione um token nas preferências.`, { status: 404 });
  }
  if (res.status === 429) {
    throw new GitHubError('limite-secundario', 'O GitHub limitou temporariamente a leitura de arquivos. Tente de novo em instantes.', { status: 429 });
  }
  throw new GitHubError(res.status >= 500 ? 'servidor' : 'outro', `Não foi possível ler ${caminho} (erro ${res.status}).`, { status: res.status });
}
