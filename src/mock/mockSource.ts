// Implementação falsa de RepoSource: latência curta, cota que cai a cada chamada, nenhuma rede.
import type { Commit, FileContent, Quota, Ref, RepoInfo, RepoSource, TreeEntry } from '../data/types';
import { previousVersion } from './gen';
import { COMMITS, REFS, commitsFor, fileFor, treeFor } from './repo';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class MockSource implements RepoSource {
  private q: Quota = { limit: 60, remaining: 44, resetAt: Date.now() + 38 * 60_000 };
  private listeners = new Set<(q: Quota) => void>();

  private spend(n = 1) {
    this.q = { ...this.q, remaining: Math.max(0, this.q.remaining - n) };
    this.listeners.forEach((fn) => fn(this.q));
  }

  /** Para o comando "Demonstrar estado: cota esgotada". */
  setRemaining(remaining: number) {
    this.q = { ...this.q, remaining, resetAt: Date.now() + 38 * 60_000 };
    this.listeners.forEach((fn) => fn(this.q));
  }

  quota() {
    return this.q;
  }

  subscribeQuota(fn: (q: Quota) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  async getRepo(owner: string, name: string): Promise<RepoInfo> {
    await sleep(60);
    this.spend();
    return { owner, name, description: 'Repositório de demonstração do Cerne (dados falsos).', defaultBranch: 'main' };
  }

  async listRefs(): Promise<Ref[]> {
    await sleep(40);
    return REFS;
  }

  async getTree(ref: string): Promise<TreeEntry[]> {
    await sleep(120);
    this.spend();
    return treeFor(ref);
  }

  async getFile(ref: string, path: string): Promise<FileContent> {
    await sleep(50);
    const f = fileFor(ref, path);
    if (!f) throw new Error(`Arquivo não encontrado: ${path}`);
    return f;
  }

  async getCommits(_ref: string, path?: string): Promise<Commit[]> {
    await sleep(80);
    this.spend();
    return path ? commitsFor(path) : COMMITS;
  }

  async getChange(sha: string, path: string): Promise<{ before: string; after: string }> {
    await sleep(60);
    const f = fileFor('main', path);
    if (!f?.text) throw new Error('Sem texto para comparar');
    // o diff por linhas é quadrático: arquivos enormes comparam só o começo
    const after = f.text.split('\n').slice(0, 1200).join('\n');
    return { before: previousVersion(after, sha + path), after };
  }
}

export const source = new MockSource();
