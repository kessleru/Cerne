// Diff por linhas (LCS) com blocos e contexto, para o DiffView.
export type DiffLine = { kind: 'ctx' | 'add' | 'del'; text: string; a?: number; b?: number };
export type Hunk = { aStart: number; bStart: number; lines: DiffLine[] };

export function diffLines(a: string[], b: string[]): DiffLine[] {
  // corta prefixo e sufixo iguais para a tabela do LCS ficar pequena
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let ea = a.length;
  let eb = b.length;
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) {
    ea--;
    eb--;
  }
  const A = a.slice(s, ea);
  const B = b.slice(s, eb);
  const n = A.length;
  const m = B.length;
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i * w + j] =
        A[i] === B[j] ? dp[(i + 1) * w + j + 1]! + 1 : Math.max(dp[(i + 1) * w + j]!, dp[i * w + j + 1]!);
  const out: DiffLine[] = [];
  for (let i = 0; i < s; i++) out.push({ kind: 'ctx', text: a[i]!, a: i + 1, b: i + 1 });
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ kind: 'ctx', text: A[i]!, a: s + i + 1, b: s + j + 1 });
      i++;
      j++;
    } else if (dp[(i + 1) * w + j]! >= dp[i * w + j + 1]!) {
      out.push({ kind: 'del', text: A[i]!, a: s + i + 1 });
      i++;
    } else {
      out.push({ kind: 'add', text: B[j]!, b: s + j + 1 });
      j++;
    }
  }
  while (i < n) {
    out.push({ kind: 'del', text: A[i]!, a: s + i + 1 });
    i++;
  }
  while (j < m) {
    out.push({ kind: 'add', text: B[j]!, b: s + j + 1 });
    j++;
  }
  for (let k = 0; k < a.length - ea; k++) out.push({ kind: 'ctx', text: a[ea + k]!, a: ea + k + 1, b: eb + k + 1 });
  return out;
}

/** Agrupa em blocos com `context` linhas de contexto em volta das mudanças. */
export function toHunks(lines: DiffLine[], context = 3): Hunk[] {
  const changed: number[] = [];
  lines.forEach((l, i) => {
    if (l.kind !== 'ctx') changed.push(i);
  });
  if (!changed.length) return [];
  const hunks: Hunk[] = [];
  let start = Math.max(0, changed[0]! - context);
  let end = Math.min(lines.length - 1, changed[0]! + context);
  const flush = () => {
    const slice = lines.slice(start, end + 1);
    hunks.push({
      aStart: slice.find((l) => l.a !== undefined)?.a ?? 0,
      bStart: slice.find((l) => l.b !== undefined)?.b ?? 0,
      lines: slice,
    });
  };
  for (let k = 1; k < changed.length; k++) {
    const c = changed[k]!;
    if (c - context <= end + 1) end = Math.min(lines.length - 1, c + context);
    else {
      flush();
      start = Math.max(0, c - context);
      end = Math.min(lines.length - 1, c + context);
    }
  }
  flush();
  return hunks;
}

export function stats(lines: DiffLine[]) {
  let add = 0;
  let del = 0;
  for (const l of lines) {
    if (l.kind === 'add') add++;
    else if (l.kind === 'del') del++;
  }
  return { add, del };
}
