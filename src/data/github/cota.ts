// Cota da API: lida dos cabeçalhos de toda resposta; quem assina é avisado a cada mudança.
import type { Quota } from '../types';

export class RastreadorCota {
  private q: Quota = { limit: 60, remaining: 60, resetAt: Date.now() + 3_600_000 };
  private listeners = new Set<(q: Quota) => void>();

  quota(): Quota {
    return this.q;
  }

  subscribe(fn: (q: Quota) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private set(q: Quota) {
    this.q = q;
    this.listeners.forEach((fn) => fn(q));
  }

  /** Lê X-RateLimit-* e Retry-After. Sem esses cabeçalhos (resposta de cache ou raw), não muda nada. */
  daResposta(h: Headers) {
    const limit = Number(h.get('x-ratelimit-limit'));
    const remaining = Number(h.get('x-ratelimit-remaining'));
    const reset = Number(h.get('x-ratelimit-reset'));
    const used = h.get('x-ratelimit-used');
    const retry = Number(h.get('retry-after'));
    const temCota = h.get('x-ratelimit-limit') !== null && Number.isFinite(limit) && Number.isFinite(remaining);
    const temRetry = Number.isFinite(retry) && retry > 0;
    if (!temCota && !temRetry) return;
    const prox: Quota = { ...this.q };
    if (temCota) {
      prox.limit = limit;
      prox.remaining = remaining;
      if (Number.isFinite(reset) && reset > 0) prox.resetAt = reset * 1000;
      prox.used = used !== null && Number.isFinite(Number(used)) ? Number(used) : limit - remaining;
    }
    if (temRetry) prox.retryAt = Date.now() + retry * 1000;
    else if (prox.retryAt && prox.retryAt < Date.now()) delete prox.retryAt;
    this.set(prox);
  }

  /** Estado vindo de `/rate_limit` (que não gasta cota). */
  doRateLimit(core: { limit: number; remaining: number; reset: number; used?: number }) {
    this.set({ limit: core.limit, remaining: core.remaining, resetAt: core.reset * 1000, used: core.used ?? core.limit - core.remaining });
  }
}
