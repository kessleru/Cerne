// Dobra por indentação e por chaves. Intervalo: start -> end oculta as linhas start+1 .. end (índices de 0).

export function indentOf(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n += 1;
    else if (ch === '\t') n += 4;
    else break;
  }
  return n;
}

const blank = (s: string) => s.trim() === '';

/** Dobra por indentação: um bloco vai até a última linha mais indentada que a de abertura. */
export function foldsByIndent(lines: string[]): Map<number, number> {
  const out = new Map<number, number>();
  const stack: { idx: number; ind: number }[] = [];
  let lastNonBlank = -1;
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k]!;
    if (blank(line)) continue;
    const ind = indentOf(line);
    while (stack.length && stack[stack.length - 1]!.ind >= ind) {
      const top = stack.pop()!;
      if (lastNonBlank > top.idx) out.set(top.idx, lastNonBlank);
    }
    stack.push({ idx: k, ind });
    lastNonBlank = k;
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (lastNonBlank > top.idx) out.set(top.idx, lastNonBlank);
  }
  return out;
}

const OPEN = '{[(';
const CLOSE = '}])';

/** Dobra por chaves: pareia { [ ( ignorando aspas e comentários (aproximação, sem gramática). */
export function foldsByBraces(lines: string[]): Map<number, number> {
  const out = new Map<number, number>();
  const stack: { idx: number; ch: string }[] = [];
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let quote = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]!;
      if (inBlockComment) {
        if (ch === '*' && line[c + 1] === '/') {
          inBlockComment = false;
          c++;
        }
        continue;
      }
      if (quote) {
        if (ch === '\\') c++;
        else if (ch === quote) quote = '';
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
        continue;
      }
      if (ch === '/' && line[c + 1] === '/') break;
      if (ch === '/' && line[c + 1] === '*') {
        inBlockComment = true;
        c++;
        continue;
      }
      if (OPEN.indexOf(ch) >= 0) stack.push({ idx: i, ch });
      const cl = CLOSE.indexOf(ch);
      if (cl >= 0) {
        for (let s = stack.length - 1; s >= 0; s--) {
          if (OPEN.indexOf(stack[s]!.ch) === cl) {
            const open = stack[s]!;
            stack.length = s;
            if (open.idx < i) {
              const onlyClosers = /^[\s}\])\\;,]*$/.test(line.slice(0, c + 1));
              const end = onlyClosers ? i - 1 : i;
              if (end > open.idx && !out.has(open.idx)) out.set(open.idx, end);
            }
            break;
          }
        }
      }
    }
  }
  return out;
}

/** União das duas: a de chaves vence quando as duas abrem na mesma linha. */
export function computeFolds(lines: string[]): Map<number, number> {
  const out = foldsByIndent(lines);
  for (const [k, v] of foldsByBraces(lines)) out.set(k, v);
  return out;
}
