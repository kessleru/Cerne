// Tipos de dados do Cerne. A interface RepoSource é o contrato que a v1 vai implementar com o GitHub.

export type FileKind = 'text' | 'markdown' | 'image' | 'csv' | 'json' | 'binary' | 'large' | 'lfs';

export type TreeEntry = { path: string; size: number; kind: FileKind };

/** Árvore devolvida por `getTree`. Se `truncated`, o GitHub cortou a lista: só a raiz veio e as pastas em `dirs` carregam sob demanda por `loadDir`. */
export type Tree = TreeEntry[] & { truncated?: boolean; dirs?: string[] };

export type RefKind = 'branch' | 'tag' | 'commit';
export type Ref = { name: string; kind: RefKind; sha: string };

export type FileContent = {
  path: string;
  kind: FileKind;
  size: number;
  /** conteúdo textual (texto, Markdown, CSV, JSON e SVG) */
  text?: string;
  lines?: number;
  /** imagem raster sem token: endereço direto no raw, já preso ao SHA */
  src?: string;
  /** imagem raster com token: bytes crus; o visualizador cria e revoga o blob: */
  blob?: Blob;
  /** ponteiro LFS */
  lfs?: { oid: string; size: number };
};

export type Commit = {
  sha: string;
  message: string;
  author: string;
  /** ISO 8601 */
  date: string;
  /** SHA do primeiro pai (quando a fonte informa) */
  parent?: string;
};

export type RepoInfo = {
  owner: string;
  name: string;
  description: string;
  defaultBranch: string;
};

export type Quota = {
  limit: number;
  remaining: number;
  /** ms desde a época */
  resetAt: number;
  /** chamadas gastas na janela (X-RateLimit-Used) */
  used?: number;
  /** ms desde a época até quando o limite secundário pede espera (Retry-After) */
  retryAt?: number;
};

export interface RepoSource {
  getRepo(owner: string, name: string): Promise<RepoInfo>;
  listRefs(): Promise<Ref[]>;
  getTree(ref: string): Promise<Tree>;
  /** só para árvore truncada: arquivos e subpastas diretos de `dir` (caminhos completos) */
  loadDir?(ref: string, dir: string): Promise<Tree>;
  getFile(ref: string, path: string): Promise<FileContent>;
  /** histórico do repositório ou, com `path`, de um arquivo */
  getCommits(ref: string, path?: string): Promise<Commit[]>;
  /** texto antes e depois da mudança de um arquivo num commit */
  getChange(sha: string, path: string): Promise<{ before: string; after: string }>;
  quota(): Quota;
  subscribeQuota(fn: (q: Quota) => void): () => void;
}
