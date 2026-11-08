// Busca difusa simples: os caracteres da consulta aparecem em ordem; pontua por proximidade e início de palavra.
export type FuzzyResult = { score: number; positions: number[] };

export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return { score: 0, positions: [] };
  const positions: number[] = [];
  let ti = 0;
  let score = 0;
  let prev = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const at = t.indexOf(q[qi]!, ti);
    if (at < 0) return null;
    positions.push(at);
    const boundary = at === 0 || '/._- '.includes(t[at - 1]!);
    score += 1;
    if (at === prev + 1) score += 3;
    if (boundary) score += 4;
    score -= Math.min(at - ti, 6) * 0.1;
    prev = at;
    ti = at + 1;
  }
  // acerto no nome do arquivo (depois da última barra) vale mais
  if (positions[0]! >= t.lastIndexOf('/') + 1) score += 5;
  score -= t.length * 0.02;
  return { score, positions };
}

export function fuzzyFilter<T>(items: T[], query: string, textOf: (i: T) => string, limit = 50) {
  const out: { item: T; score: number; positions: number[] }[] = [];
  for (const item of items) {
    const r = fuzzyMatch(query, textOf(item));
    if (r) out.push({ item, score: r.score, positions: r.positions });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
