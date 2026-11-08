// CSV simples (RFC 4180): aspas duplas, vírgula, ponto e vírgula ou tab, quebras dentro de campos entre aspas.
export type Delimiter = ',' | ';' | '\t';

export function detectDelimiter(text: string): Delimiter {
  const head = text.slice(0, 2000).split('\n', 1)[0] ?? '';
  const counts: Record<Delimiter, number> = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of head) if (ch === ',' || ch === ';' || ch === '\t') counts[ch]++;
  const best = (Object.entries(counts) as [Delimiter, number][]).sort((a, b) => b[1] - a[1])[0]!;
  return best[1] > 0 ? best[0] : ',';
}

export function parseCsv(text: string, delimiter: Delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
