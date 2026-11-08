// Matemática da virtualização do CodeView: linhas visíveis (depois das dobras), alturas em "linhas de texto"
// (com quebra de linha uma linha pode ocupar várias) e a janela que cabe na tela.

export type Layout = {
  /** índices das linhas que não estão dentro de uma dobra */
  visible: Int32Array;
  /** tops[i] = linhas de texto acima da i-ésima linha visível; tops[n] = total */
  tops: Float64Array;
  total: number;
};

export function buildLayout(
  lineCount: number,
  folds: Map<number, number>,
  folded: ReadonlySet<number>,
  rowsOf: (line: number) => number = () => 1,
): Layout {
  const all = new Int32Array(lineCount);
  let n = 0;
  for (let i = 0; i < lineCount; ) {
    all[n++] = i;
    const end = folded.has(i) ? folds.get(i) : undefined;
    i = end !== undefined ? end + 1 : i + 1;
  }
  const visible = all.subarray(0, n);
  const tops = new Float64Array(n + 1);
  let acc = 0;
  for (let k = 0; k < n; k++) {
    tops[k] = acc;
    acc += rowsOf(visible[k]!);
  }
  tops[n] = acc;
  return { visible, tops, total: acc };
}

/** Primeira linha visível (índice em `visible`) cujo fim está abaixo de `row`. Busca binária. */
export function indexAtRow(tops: Float64Array, count: number, row: number): number {
  let lo = 0;
  let hi = count - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tops[mid + 1]! <= row) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export type Win = { from: number; to: number };

/** Janela [from, to) em índices de `visible` para o scroll atual, com folga (overscan). */
export function windowFor(layout: Layout, scrollTop: number, viewport: number, lineH: number, overscan = 12): Win {
  const n = layout.visible.length;
  if (n === 0 || lineH <= 0) return { from: 0, to: 0 };
  const a = indexAtRow(layout.tops, n, Math.max(0, scrollTop / lineH));
  const b = indexAtRow(layout.tops, n, (scrollTop + viewport) / lineH);
  return { from: Math.max(0, a - overscan), to: Math.min(n, b + 1 + overscan) };
}

/** Índice em `visible` de uma linha do arquivo (ou da linha dobrada que a contém). */
export function visibleIndexOf(visible: Int32Array, line: number): number {
  let lo = 0;
  let hi = visible.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (visible[mid]! <= line) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
