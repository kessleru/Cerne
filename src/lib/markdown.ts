// Markdown mínimo e seguro: devolve uma árvore de dados (sem HTML). Quem renderiza usa React, que escapa tudo;
// links só valem com http, https, mailto ou caminho relativo; HTML cru no texto aparece como texto.

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'link'; href: string | null; c: Inline[] }
  | { t: 'image'; src: string; alt: string };

export type Block =
  | { t: 'heading'; level: number; c: Inline[]; id: string }
  | { t: 'para'; c: Inline[] }
  | { t: 'code'; lang: string; v: string }
  | { t: 'quote'; c: Block[] }
  | { t: 'list'; ordered: boolean; items: Inline[][] }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'hr' };

export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:|mailto:)/i.test(h)) return h;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return null; // javascript:, data:, vbscript: ...
  if (h.startsWith('//')) return null;
  return h;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === '\\' && i + 1 < src.length) {
      buf += src[i + 1];
      i += 2;
      continue;
    }
    if (ch === '`') {
      const end = src.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ t: 'code', v: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if ((ch === '*' || ch === '_') && src[i + 1] === ch) {
      const end = src.indexOf(ch + ch, i + 2);
      if (end > i + 1) {
        flush();
        out.push({ t: 'strong', c: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (ch === '*' || (ch === '_' && (i === 0 || /\W/.test(src[i - 1]!)))) {
      const end = src.indexOf(ch, i + 1);
      if (end > i + 1 && src[i + 1] !== ' ') {
        flush();
        out.push({ t: 'em', c: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '!' && src[i + 1] === '[') {
      const m = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(src.slice(i));
      if (m) {
        flush();
        out.push({ t: 'image', alt: m[1]!, src: m[2]! });
        i += m[0].length;
        continue;
      }
    }
    if (ch === '[' && src[i + 1] === '!') {
      const m = /^\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)\)/.exec(src.slice(i));
      if (m) {
        flush();
        out.push({ t: 'link', href: safeHref(m[3]!), c: [{ t: 'image', alt: m[1]!, src: m[2]! }] });
        i += m[0].length;
        continue;
      }
    }
    if (ch === '[') {
      const m = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(src.slice(i));
      if (m) {
        flush();
        out.push({ t: 'link', href: safeHref(m[2]!), c: parseInline(m[1]!) });
        i += m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const plain = (inl: Inline[]): string =>
  inl.map((n) => ('v' in n ? n.v : 'c' in n ? plain(n.c) : n.t === 'image' ? n.alt : '')).join('');

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

/** HTML comum em README (img, a, h1..h6, p, br, details) vira Markdown; o resto das tags some.
 *  Blocos de código ficam como estão. Nada aqui vira HTML de verdade: o React só desenha texto. */
export function htmlParaMd(src: string): string {
  const attr = (tag: string, nome: string) => new RegExp(`${nome}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)?.[1] ?? '';
  const img = (tag: string) => {
    const s2 = attr(tag, 'src');
    return s2 ? `![${attr(tag, 'alt')}](${s2.replace(/\s/g, '%20')})` : '';
  };
  const partes = src.replace(/\r\n?/g, '\n').split(/(^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)\s*$)/m);
  return partes
    .map((p, k) => {
      if (k % 2 === 1) return p; // bloco de código
      return p
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
        .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (m, inner: string) => {
          const href = attr(m, 'href');
          const im = /<img\b[^>]*>/i.exec(inner);
          if (im) return href ? `[${img(im[0])}](${href})` : img(im[0]);
          const t = inner.replace(/<[^>]+>/g, '').trim();
          return href && t ? `[${t}](${href})` : t;
        })
        .replace(/<img\b[^>]*>/gi, (m) => img(m))
        .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n: string, t: string) => `\n${'#'.repeat(Number(n))} ${t.replace(/<[^>]+>/g, '').trim()}\n`)
        .replace(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi, (_m, t: string) => `\n**${t.replace(/<[^>]+>/g, '').trim()}**\n`)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(p|div|details|picture|center|table|tr|td|th|tbody|thead)\b[^>]*>/gi, '\n')
        .replace(/<\/?[a-z][a-z0-9-]*\b[^>]*>/gi, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    })
    .join('');
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = /^\s*(```|~~~)\s*([\w+#.-]*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      const ind = /^\s*/.exec(line)![0].length;
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${fence[1]}\\s*$`).test(lines[i]!)) body.push(lines[i++]!.slice(ind));
      i++;
      out.push({ t: 'code', lang: fence[2] ?? '', v: body.join('\n') });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const c = parseInline(h[2]!.replace(/\s+#+\s*$/, ''));
      out.push({ t: 'heading', level: h[1]!.length, c, id: slug(plain(c)) });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push({ t: 'hr' });
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) body.push(lines[i++]!.replace(/^>\s?/, ''));
      out.push({ t: 'quote', c: parseMarkdown(body.join('\n')) });
      continue;
    }
    if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      const head = splitRow(line).map(parseInline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) rows.push(splitRow(lines[i++]!).map(parseInline));
      out.push({ t: 'table', head, rows });
      continue;
    }
    const li = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[2]!);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[i]!);
        if (!m || /\d/.test(m[2]!) !== ordered) break;
        items.push(parseInline(m[3]!.replace(/^\[[ xX]\]\s+/, '')));
        i++;
      }
      out.push({ t: 'list', ordered, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,6}\s|\s*```|\s*~~~|>|\s*([-*+]|\d+\.)\s)/.test(lines[i]!)) para.push(lines[i++]!);
    if (!para.length) {
      para.push(line);
      i++;
    }
    out.push({ t: 'para', c: parseInline(para.join(' ')) });
  }
  return out;
}
