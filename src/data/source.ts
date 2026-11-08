// Escolhe a fonte de dados: o repositório falso só para kessleru/exemplo; o GitHub para o resto.
import { source as mock } from '../mock/mockSource';
import { GitHubSource } from './github/GitHubSource';
import type { Commit, FileContent, Quota, Ref, RepoInfo, RepoSource, Tree } from './types';

const ehExemplo = (owner: string, name: string) => owner.toLowerCase() === 'kessleru' && name.toLowerCase() === 'exemplo';

class SeletorDeFonte implements RepoSource {
  private github = new GitHubSource();
  private ativa: RepoSource = this.github;
  private listeners = new Set<(q: Quota) => void>();

  constructor() {
    // a cota exibida é a da fonte em uso
    this.github.subscribeQuota((q) => this.ativa === this.github && this.avisar(q));
    mock.subscribeQuota((q) => this.ativa === mock && this.avisar(q));
  }

  private avisar(q: Quota) {
    this.listeners.forEach((fn) => fn(q));
  }

  getRepo(owner: string, name: string): Promise<RepoInfo> {
    const prox: RepoSource = ehExemplo(owner, name) ? mock : this.github;
    if (prox !== this.ativa) {
      this.ativa = prox;
      this.avisar(prox.quota());
    }
    return prox.getRepo(owner, name);
  }

  listRefs(): Promise<Ref[]> {
    return this.ativa.listRefs();
  }

  getTree(ref: string): Promise<Tree> {
    return this.ativa.getTree(ref);
  }

  loadDir(ref: string, dir: string): Promise<Tree> {
    if (!this.ativa.loadDir) return Promise.resolve(Object.assign([], {}) as Tree);
    return this.ativa.loadDir(ref, dir);
  }

  getFile(ref: string, path: string): Promise<FileContent> {
    return this.ativa.getFile(ref, path);
  }

  getCommits(ref: string, path?: string): Promise<Commit[]> {
    return this.ativa.getCommits(ref, path);
  }

  getChange(sha: string, path: string): Promise<{ before: string; after: string }> {
    return this.ativa.getChange(sha, path);
  }

  quota(): Quota {
    return this.ativa.quota();
  }

  subscribeQuota(fn: (q: Quota) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Apaga o cache de dados do GitHub: o banco `cerne-cache` inteiro e a memória. */
  apagarCache(): Promise<void> {
    return this.github.apagarCache();
  }

  /** Só o comando de demonstração "cota esgotada" usa: mexe na cota do repositório falso. */
  setRemaining(remaining: number) {
    mock.setRemaining(remaining);
  }
}

export const source = new SeletorDeFonte();
