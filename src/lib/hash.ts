// Seleção de linhas no endereço: #L3 ou #L3-L5.
export type LineRange = { from: number; to: number }; // 1-based, from <= to

export function parseLineHash(hash: string): LineRange | null {
  const m = /^#L(\d+)(?:-L?(\d+))?$/.exec(hash);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  if (!Number.isFinite(a) || a < 1 || b < 1) return null;
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

export function formatLineHash(r: LineRange | null): string {
  if (!r) return '';
  return r.from === r.to ? `#L${r.from}` : `#L${r.from}-L${r.to}`;
}
