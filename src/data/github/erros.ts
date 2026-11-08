// Erros da leitura do GitHub, com tipo e mensagem em pt-BR. Nunca carregam token nem URL com segredo.
export type TipoErro =
  | 'nao-encontrado'
  | 'ref-nao-encontrada'
  | 'arquivo-nao-encontrado'
  | 'token-invalido'
  | 'cota-esgotada'
  | 'limite-secundario'
  | 'sem-acesso'
  | 'repositorio-vazio'
  | 'sem-rede'
  | 'servidor'
  | 'outro';

export class GitHubError extends Error {
  readonly tipo: TipoErro;
  readonly status?: number;
  /** ms desde a época: quando a cota ou o limite secundário voltam */
  readonly voltaEm?: number;

  constructor(tipo: TipoErro, message: string, extra: { status?: number; voltaEm?: number } = {}) {
    super(message);
    this.name = 'GitHubError';
    this.tipo = tipo;
    this.status = extra.status;
    this.voltaEm = extra.voltaEm;
  }
}

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const erroSemRede = () => new GitHubError('sem-rede', 'Sem conexão com o GitHub. Verifique a rede e tente de novo.');

export type Contexto = { temToken: boolean; oque: 'repo' | 'ref' | 'arquivo' | 'geral'; ref?: string; caminho?: string };

/** Converte uma resposta de erro do GitHub num GitHubError. `corpo` é a mensagem do JSON de erro, se houver. */
export function erroDaResposta(res: Response, corpo: string, ctx: Contexto): GitHubError {
  const status = res.status;
  const restante = res.headers.get('x-ratelimit-remaining');
  const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
  const retry = Number(res.headers.get('retry-after'));
  const msg = corpo.toLowerCase();

  if (status === 401) {
    return new GitHubError('token-invalido', 'O GitHub não aceitou o token: ele é inválido ou expirou. Troque ou remova o token nas preferências.', { status });
  }
  if (status === 403 || status === 429) {
    if (msg.includes('secondary rate limit') || msg.includes('abuse') || (Number.isFinite(retry) && retry > 0)) {
      const espera = Number.isFinite(retry) && retry > 0 ? retry : 60;
      return new GitHubError(
        'limite-secundario',
        `O GitHub pediu uma pausa por excesso de chamadas em pouco tempo. Tente de novo em ${espera} s.`,
        { status, voltaEm: Date.now() + espera * 1000 },
      );
    }
    if (restante === '0' || msg.includes('rate limit')) {
      const volta = Number.isFinite(reset) && reset > 0 ? reset : undefined;
      const quando = volta ? ` A cota volta às ${hora(volta)}.` : '';
      const dica = ctx.temToken ? '' : ' Um token libera 5 000 chamadas por hora.';
      return new GitHubError('cota-esgotada', `A cota de chamadas do GitHub acabou.${quando}${dica}`, { status, voltaEm: volta });
    }
    return new GitHubError('sem-acesso', 'O GitHub recusou o acesso a este conteúdo. O token pode não ter permissão ou o repositório exige login único (SSO).', { status });
  }
  if (status === 404 || status === 422) {
    if (ctx.oque === 'arquivo') {
      return new GitHubError('arquivo-nao-encontrado', `Arquivo não encontrado${ctx.caminho ? `: ${ctx.caminho}` : ''}.`, { status });
    }
    if (ctx.oque === 'ref') {
      return new GitHubError('ref-nao-encontrada', `Ramo, tag ou commit "${ctx.ref ?? ''}" não existe neste repositório.`, { status });
    }
    const dica = ctx.temToken
      ? ' Se ele for privado, confira se o token tem acesso a ele.'
      : ' Se ele for privado, adicione um token com acesso nas preferências.';
    return new GitHubError('nao-encontrado', `Repositório não encontrado.${dica}`, { status });
  }
  if (status === 409) {
    return new GitHubError('repositorio-vazio', 'O repositório está vazio: ainda não tem nenhum commit.', { status });
  }
  if (status >= 500) {
    return new GitHubError('servidor', `O GitHub está com problemas (erro ${status}). Tente de novo em instantes.`, { status });
  }
  return new GitHubError('outro', `O GitHub respondeu com o erro ${status}.`, { status });
}
