// Fonte de dados real: lê repositórios públicos (e privados, com token) pela API do GitHub e pelo raw.
// Regras de custo: tudo que tem SHA vai para o cache e nunca é buscado de novo; sem token, o resto
// vale por 10 minutos (um 304 anônimo gasta cota); com token, revalida por If-None-Match (304 é grátis).
import { getToken, subscribeToken } from '../../state/token';
import { criarArmazenamento, prefixoDoToken, vigiarToken, type Armazenamento } from '../cache';
import type { Commit, FileContent, Quota, Ref, RepoInfo, RepoSource, Tree, TreeEntry } from '../types';
import { ACEITA_RAW, ACEITA_SHA, API, chamarApi, chamarRaw, RAW } from './api';
import { codificarCaminho, contarLinhas, ehImagemRaster, LIMITE_GRANDE, lerPonteiroLfs, pareceBinario, tipoDoArquivo } from './arquivos';
import { RastreadorCota } from './cota';
import { GitHubError, type Contexto } from './erros';

const TTL_ANONIMO = 10 * 60_000;
const TTL_SHA = 60_000;
const PAGINAS_REFS = 3;
const POR_PAGINA = 100;
const SHA_COMPLETO = /^[0-9a-f]{40}$/i;

type Registro<T> = { t: number; etag?: string; data: T };
type Ctx = Omit<Contexto, 'temToken'>;
type ApiRef = { name: string; commit: { sha: string } };
type ApiEntrada = { path: string; type: string; size?: number; sha: string };
type ApiArvore = { tree: ApiEntrada[]; truncated?: boolean };
type ApiCommit = {
  sha: string;
  commit: { message: string; author?: { name?: string; date?: string } | null; committer?: { date?: string } | null };
  author?: { login?: string } | null;
  parents?: { sha: string }[];
};
type ArvoreSalva = { entries: TreeEntry[]; truncated: boolean; dirs: Record<string, string> };

export class GitHubSource implements RepoSource {
  private cota = new RastreadorCota();
  private store: Armazenamento;
  private owner = '';
  private name = '';
  private flight = new Map<string, Promise<unknown>>();
  private shaMem = new Map<string, { sha: string; t: number }>();
  private defaults = new Map<string, string>();
  private treeMem = new Map<string, Map<string, TreeEntry>>();
  private dirSha = new Map<string, string>();
  private pais = new Map<string, string | null>();
  private cotaIniciada = false;

  constructor(store: Armazenamento = criarArmazenamento()) {
    this.store = store;
    // token que sai ou muda: apaga o cache dele e relê a cota (o limite muda de 60 para 5 000)
    vigiarToken(store, () => getToken().value, subscribeToken, () => void this.atualizarCota());
  }

  // ---------- cota ----------
  quota(): Quota {
    return this.cota.quota();
  }

  subscribeQuota(fn: (q: Quota) => void): () => void {
    if (!this.cotaIniciada) {
      this.cotaIniciada = true;
      void this.atualizarCota();
    }
    return this.cota.subscribe(fn);
  }

  /** `/rate_limit` não gasta cota: mostra o saldo real antes da primeira chamada. */
  private async atualizarCota() {
    try {
      const res = await chamarApi(`${API}/rate_limit`, { token: getToken().value, ctx: { oque: 'geral' } }, this.cota);
      const j = (await res.json()) as { resources?: { core?: { limit: number; remaining: number; reset: number; used?: number } } };
      if (j.resources?.core) this.cota.doRateLimit(j.resources.core);
    } catch {
      /* sem rede ou token inválido: o erro aparece na primeira chamada de verdade */
    }
  }

  // ---------- infraestrutura de cache ----------
  private slugAtual(): string {
    if (!this.owner || !this.name) throw new GitHubError('outro', 'Nenhum repositório aberto.');
    return `${this.owner}/${this.name}`;
  }

  private async chave(k: string): Promise<string> {
    return `${await prefixoDoToken(getToken().value)}|${k}`;
  }

  private dedupe<T>(full: string, produzir: () => Promise<T>): Promise<T> {
    const f = this.flight.get(full);
    if (f) return f as Promise<T>;
    const p = produzir().finally(() => this.flight.delete(full));
    this.flight.set(full, p);
    return p;
  }

  /** Dado que nunca muda (chaveado por SHA): lê do cache ou produz e guarda. */
  private async imutavel<T>(k: string, produzir: () => Promise<T>): Promise<T> {
    const full = await this.chave(k);
    return this.dedupe(full, async () => {
      const hit = await this.store.get<{ v: T }>(full);
      if (hit) return hit.v;
      const v = await produzir();
      await this.store.set(full, { v });
      return v;
    });
  }

  /** Dado que muda (repositório, ramos, tags): sem token vale 10 min; com token revalida por ETag. */
  private async mutavel<T>(k: string, url: string, o: { accept?: string; text?: boolean; ctx: Ctx }): Promise<T> {
    const token = getToken().value;
    const full = await this.chave(k);
    return this.dedupe(full, async () => {
      const reg = await this.store.get<Registro<T>>(full);
      if (reg && !token && Date.now() - reg.t < TTL_ANONIMO) return reg.data;
      let res: Response;
      try {
        res = await chamarApi(url, { token, accept: o.accept, etag: reg?.etag, ctx: o.ctx }, this.cota);
      } catch (e) {
        // sem rede: o que já foi lido vale, mesmo vencido
        if (reg && e instanceof GitHubError && e.tipo === 'sem-rede') return reg.data;
        throw e;
      }
      if (res.status === 304) {
        if (!reg) throw new GitHubError('outro', 'O GitHub respondeu 304 sem haver nada guardado.', { status: 304 });
        await this.store.set(full, { ...reg, t: Date.now() });
        return reg.data;
      }
      const data = (o.text ? (await res.text()).trim() : await res.json()) as T;
      await this.store.set(full, { t: Date.now(), etag: res.headers.get('etag') ?? undefined, data } satisfies Registro<T>);
      return data;
    });
  }

  // ---------- repositório e refs ----------
  getRepo(owner: string, name: string): Promise<RepoInfo> {
    // define o repositório de forma síncrona: listRefs e getTree chegam logo depois, na mesma rodada
    this.owner = owner;
    this.name = name;
    return this.infoDoRepo(`${owner}/${name}`);
  }

  private async infoDoRepo(slug: string): Promise<RepoInfo> {
    const j = await this.mutavel<{ name?: string; owner?: { login?: string }; description?: string | null; default_branch?: string }>(
      `repo:${slug}`,
      `${API}/repos/${slug}`,
      { ctx: { oque: 'repo' } },
    );
    const [owner = '', name = ''] = slug.split('/');
    const defaultBranch = j.default_branch ?? 'main';
    this.defaults.set(slug, defaultBranch);
    return { owner: j.owner?.login ?? owner, name: j.name ?? name, description: j.description ?? '', defaultBranch };
  }

  listRefs(): Promise<Ref[]> {
    return this.refsDe(this.slugAtual());
  }

  private async refsPaginadas(slug: string, tipo: 'branches' | 'tags'): Promise<Ref[]> {
    const kind = tipo === 'branches' ? 'branch' : 'tag';
    const out: Ref[] = [];
    for (let pagina = 1; pagina <= PAGINAS_REFS; pagina++) {
      const itens = await this.mutavel<ApiRef[]>(
        `refs:${slug}:${tipo}:${pagina}`,
        `${API}/repos/${slug}/${tipo}?per_page=${POR_PAGINA}&page=${pagina}`,
        { ctx: { oque: 'repo' } },
      );
      for (const r of itens) out.push({ name: r.name, kind, sha: r.commit.sha });
      if (itens.length < POR_PAGINA) break;
    }
    return out;
  }

  private async refsDe(slug: string): Promise<Ref[]> {
    // o repositório vem junto para o ramo padrão ir primeiro (e o erro "não encontrado" sair uma vez só)
    const [info, ramos, tags] = await Promise.all([this.infoDoRepo(slug), this.refsPaginadas(slug, 'branches'), this.refsPaginadas(slug, 'tags')]);
    const i = ramos.findIndex((r) => r.name === info.defaultBranch);
    if (i > 0) ramos.unshift(...ramos.splice(i, 1));
    return [...ramos, ...tags];
  }

  /** Ref (ramo, tag ou commit) para SHA. Fica 60 s em memória e o último valor fica guardado para uso sem rede. */
  private async resolverSha(slug: string, ref: string): Promise<string> {
    if (SHA_COMPLETO.test(ref)) return ref.toLowerCase();
    const k = `${slug}@${ref}`;
    const hit = this.shaMem.get(k);
    if (hit && Date.now() - hit.t < TTL_SHA) return hit.sha;
    const chaveSalva = await this.chave(`shaRef:${k}`);
    try {
      const sha = await this.resolverNaRede(slug, ref);
      this.shaMem.set(k, { sha, t: Date.now() });
      await this.store.set(chaveSalva, { sha });
      return sha;
    } catch (e) {
      if (e instanceof GitHubError && e.tipo === 'sem-rede') {
        const salvo = hit?.sha ?? (await this.store.get<{ sha: string }>(chaveSalva))?.sha;
        if (salvo) return salvo;
      }
      throw e;
    }
  }

  private async resolverNaRede(slug: string, ref: string): Promise<string> {
    const refs = await this.refsDe(slug);
    const achar = (n: string) => (refs.find((r) => r.kind === 'branch' && r.name === n) ?? refs.find((r) => r.kind === 'tag' && r.name === n))?.sha;
    return achar(ref) ?? (await this.shaPeloCommit(slug, ref));
  }

  private async shaPeloCommit(slug: string, ref: string): Promise<string> {
    const sha = await this.mutavel<string>(`sha:${slug}:${ref}`, `${API}/repos/${slug}/commits/${codificarCaminho(ref)}`, {
      accept: ACEITA_SHA,
      text: true,
      ctx: { oque: 'ref', ref },
    });
    if (!SHA_COMPLETO.test(sha)) throw new GitHubError('ref-nao-encontrada', `Ramo, tag ou commit "${ref}" não existe neste repositório.`);
    return sha.toLowerCase();
  }

  // ---------- árvore ----------
  private registrar(sha: string, entries: TreeEntry[]) {
    const m = this.treeMem.get(sha) ?? new Map<string, TreeEntry>();
    for (const e of entries) m.set(e.path, e);
    this.treeMem.set(sha, m);
  }

  private paraTree(s: ArvoreSalva, sha: string): Tree {
    this.registrar(sha, s.entries);
    for (const [dir, treeSha] of Object.entries(s.dirs)) this.dirSha.set(`${sha}:${dir}`, treeSha);
    const dirs = Object.keys(s.dirs);
    return Object.assign([...s.entries], s.truncated ? { truncated: true, dirs } : {}) as Tree;
  }

  private arquivosDe(arvore: ApiArvore, prefixo = ''): { entries: TreeEntry[]; dirs: Record<string, string> } {
    const entries: TreeEntry[] = [];
    const dirs: Record<string, string> = {};
    for (const e of arvore.tree) {
      const path = prefixo + e.path;
      if (e.type === 'blob') {
        const size = e.size ?? 0;
        entries.push({ path, size, kind: tipoDoArquivo(path, size) });
      } else if (e.type === 'tree') dirs[path] = e.sha;
    }
    return { entries, dirs };
  }

  async getTree(ref: string): Promise<Tree> {
    const slug = this.slugAtual();
    const sha = await this.resolverSha(slug, ref);
    const salva = await this.imutavel<ArvoreSalva>(`tree:${sha}`, async () => {
      const token = getToken().value;
      const ctx: Ctx = { oque: 'ref', ref };
      const res = await chamarApi(`${API}/repos/${slug}/git/trees/${sha}?recursive=1`, { token, ctx }, this.cota);
      const j = (await res.json()) as ApiArvore;
      if (!j.truncated) return { ...this.arquivosDe(j), truncated: false };
      // lista cortada (mais de 100 000 entradas ou 7 MB): só a raiz; as pastas carregam sob demanda
      const raiz = await chamarApi(`${API}/repos/${slug}/git/trees/${sha}`, { token, ctx }, this.cota);
      return { ...this.arquivosDe((await raiz.json()) as ApiArvore), truncated: true };
    });
    return this.paraTree(salva, sha);
  }

  async loadDir(ref: string, dir: string): Promise<Tree> {
    const slug = this.slugAtual();
    const sha = await this.resolverSha(slug, ref);
    const treeSha = this.dirSha.get(`${sha}:${dir}`) ?? `${sha}:${dir}`;
    const salva = await this.imutavel<ArvoreSalva>(`dir:${sha}:${dir}`, async () => {
      const res = await chamarApi(`${API}/repos/${slug}/git/trees/${encodeURIComponent(treeSha)}`, { token: getToken().value, ctx: { oque: 'ref', ref } }, this.cota);
      const j = (await res.json()) as ApiArvore;
      return { ...this.arquivosDe(j, dir + '/'), truncated: !!j.truncated };
    });
    return this.paraTree(salva, sha);
  }

  // ---------- arquivos ----------
  getFile(ref: string, path: string): Promise<FileContent> {
    const slug = this.slugAtual();
    return this.arquivoEm(slug, ref, path);
  }

  private async arquivoEm(slug: string, ref: string, path: string): Promise<FileContent> {
    const sha = await this.resolverSha(slug, ref);
    return this.imutavel<FileContent>(`file:${sha}:${path}`, () => this.lerArquivo(slug, sha, path));
  }

  private async lerArquivo(slug: string, sha: string, path: string): Promise<FileContent> {
    const entrada = this.treeMem.get(sha)?.get(path);
    const previsto = tipoDoArquivo(path, entrada?.size);
    if (previsto === 'large') return { path, kind: 'large', size: entrada?.size ?? 0 };
    // imagem raster: não passa por texto; o visualizador mostra pelo raw ou por um blob:
    if (ehImagemRaster(path)) return this.lerImagem(slug, sha, path, entrada?.size ?? 0);
    // binário conhecido só dispensa a leitura se for maior que um ponteiro LFS (que tem poucas centenas de bytes)
    if (previsto === 'binary' && entrada && entrada.size >= 1024) return { path, kind: 'binary', size: entrada.size };

    const token = getToken().value;
    let buf: ArrayBuffer;
    if (token) {
      const url = `${API}/repos/${slug}/contents/${codificarCaminho(path)}?ref=${sha}`;
      const res = await chamarApi(url, { token, accept: ACEITA_RAW, ctx: { oque: 'arquivo', caminho: path } }, this.cota);
      buf = await res.arrayBuffer();
    } else {
      buf = await chamarRaw(`${RAW}/${slug}/${sha}/${codificarCaminho(path)}`, path);
    }

    const bytes = new Uint8Array(buf);
    if (bytes.length > LIMITE_GRANDE) return { path, kind: 'large', size: bytes.length };
    if (pareceBinario(bytes)) return { path, kind: 'binary', size: bytes.length };
    const text = new TextDecoder('utf-8').decode(bytes);
    const lfs = bytes.length < 1024 ? lerPonteiroLfs(text) : null;
    if (lfs) return { path, kind: 'lfs', size: lfs.size, lfs };
    if (previsto === 'binary') return { path, kind: 'binary', size: bytes.length };
    return { path, kind: previsto, size: bytes.length, text, lines: contarLinhas(text) };
  }

  /** Imagem raster: sem token, o `<img>` lê o raw direto pelo SHA (não gasta cota); com token, os bytes viram um blob:. */
  private async lerImagem(slug: string, sha: string, path: string, size: number): Promise<FileContent> {
    const token = getToken().value;
    if (!token) return { path, kind: 'image', size, src: `${RAW}/${slug}/${sha}/${codificarCaminho(path)}` };
    const url = `${API}/repos/${slug}/contents/${codificarCaminho(path)}?ref=${sha}`;
    const res = await chamarApi(url, { token, accept: ACEITA_RAW, ctx: { oque: 'arquivo', caminho: path } }, this.cota);
    const blob = await res.blob();
    return { path, kind: 'image', size: blob.size, blob };
  }

  // ---------- histórico ----------
  async getCommits(ref: string, path?: string): Promise<Commit[]> {
    const slug = this.slugAtual();
    const sha = await this.resolverSha(slug, ref);
    // o histórico a partir de um SHA não muda: dispensa revalidação
    const lista = await this.imutavel<Commit[]>(`hist:${sha}:${path ?? ''}`, async () => {
      const filtro = path ? `&path=${encodeURIComponent(path)}` : '';
      const res = await chamarApi(`${API}/repos/${slug}/commits?sha=${sha}&per_page=30${filtro}`, { token: getToken().value, ctx: { oque: 'ref', ref } }, this.cota);
      return ((await res.json()) as ApiCommit[]).map(this.paraCommit);
    });
    for (const c of lista) this.pais.set(c.sha, c.parent ?? null);
    return lista;
  }

  private paraCommit = (c: ApiCommit): Commit => ({
    sha: c.sha,
    message: (c.commit.message ?? '').split('\n')[0] ?? '',
    author: c.commit.author?.name ?? c.author?.login ?? 'desconhecido',
    date: c.commit.author?.date ?? c.commit.committer?.date ?? '',
    parent: c.parents?.[0]?.sha,
  });

  private async paiDe(slug: string, sha: string): Promise<string | null> {
    const conhecido = this.pais.get(sha);
    if (conhecido !== undefined) return conhecido;
    const c = await this.imutavel<Commit>(`commit:${sha}`, async () => {
      const res = await chamarApi(`${API}/repos/${slug}/commits/${sha}`, { token: getToken().value, ctx: { oque: 'ref', ref: sha } }, this.cota);
      return this.paraCommit((await res.json()) as ApiCommit);
    });
    const pai = c.parent ?? null;
    this.pais.set(sha, pai);
    return pai;
  }

  async getChange(sha: string, path: string): Promise<{ before: string; after: string }> {
    const slug = this.slugAtual();
    const pai = await this.paiDe(slug, sha);
    const [after, before] = await Promise.all([this.textoEm(slug, sha, path), pai ? this.textoEm(slug, pai, path) : Promise.resolve('')]);
    return { before, after };
  }

  /** Texto do arquivo num commit; arquivo que não existia nele conta como vazio (adição ou remoção). */
  private async textoEm(slug: string, sha: string, path: string): Promise<string> {
    try {
      const f = await this.arquivoEm(slug, sha, path);
      if (f.text === undefined) throw new GitHubError('outro', 'Sem texto para comparar: o arquivo é binário, grande demais ou está no Git LFS.');
      return f.text;
    } catch (e) {
      if (e instanceof GitHubError && e.tipo === 'arquivo-nao-encontrado') return '';
      throw e;
    }
  }
}
