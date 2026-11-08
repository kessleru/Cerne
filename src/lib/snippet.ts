// Imagem do trecho: uma cena (retângulos, círculos e texto) montada uma vez e desenhada em canvas (PNG, a 2x)
// ou escrita como SVG com <text>. A prévia da tela é o próprio canvas, então o que se vê é o que se exporta.
import type { Tok } from '../code/protocol';
import { mixRgb, parseColor, toHex, type RGB } from './themeVars';

export type SnippetBg = 'transparent' | 'theme' | 'accent';
export type SnippetOptions = { background: SnippetBg; margin: number; frame: boolean; numbers: boolean };

export type SnippetPalette = {
  bg: string;
  fg: string;
  gutter: string;
  /** fundo "tema": um pouco mais fundo que o painel */
  page: string;
  /** fundo "acento suave" */
  accentSoft: string;
  border: string;
  bar: string;
  barFg: string;
  dots: [string, string, string];
};

export type Run = { text: string; color: string; italic: boolean; bold: boolean };
export type SnippetLine = { no: number; runs: Run[] };
export type SnippetModel = { title: string; lines: SnippetLine[]; font: { family: string; size: number; lineHeight: number }; palette: SnippetPalette };

type Op =
  | { t: 'rect'; x: number; y: number; w: number; h: number; r: number; fill?: string; stroke?: string }
  | { t: 'path'; d: string; fill: string }
  | { t: 'circle'; cx: number; cy: number; r: number; fill: string }
  | { t: 'text'; x: number; y: number; text: string; fill: string; anchor: 'start' | 'middle' | 'end'; size: number; bold: boolean; italic: boolean };

export type Scene = { width: number; height: number; ops: Op[]; family: string };

const MAX_COLS = 120;

/** Cor CSS qualquer (rgb, color(srgb ...), color-mix já resolvido) para #rrggbb, pelo canvas. */
export function cssToHex(css: string): string {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return toHex([d[0]!, d[1]!, d[2]!]);
}

/** Lê uma cor computada dentro de `host`, para respeitar o escopo do tema (área de trabalho ou tudo). */
export function resolveColor(host: HTMLElement, css: string, className?: string): string {
  const span = document.createElement('span');
  span.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  if (className) span.className = className;
  else span.style.color = css;
  host.appendChild(span);
  const v = getComputedStyle(span).color;
  span.remove();
  return cssToHex(v);
}

export function buildPalette(host: HTMLElement, theme: { bg: string; fg: string; gutter: string; dark: boolean } | null): SnippetPalette {
  const tok = (name: string) => resolveColor(host, `var(--ctp-${name})`);
  const accent = parseColor(tok('accent'))!;
  const dots: [string, string, string] = [tok('red'), tok('yellow'), tok('green')];
  const black: RGB = [0, 0, 0];
  const white: RGB = [255, 255, 255];
  let bg: RGB;
  let fg: RGB;
  let gutter: RGB;
  let page: RGB;
  if (theme) {
    bg = parseColor(theme.bg)!;
    fg = parseColor(theme.fg)!;
    gutter = parseColor(theme.gutter)!;
    page = mixRgb(bg, theme.dark ? black : white, theme.dark ? 0.28 : 0.35);
  } else {
    bg = parseColor(tok('mantle'))!;
    fg = parseColor(tok('text'))!;
    gutter = parseColor(tok('meta'))!;
    page = parseColor(tok('crust'))!;
  }
  return {
    bg: toHex(bg),
    fg: toHex(fg),
    gutter: toHex(gutter),
    page: toHex(page),
    accentSoft: toHex(mixRgb(page, accent, 0.3)),
    border: toHex(mixRgb(bg, fg, 0.18)),
    bar: toHex(mixRgb(bg, fg, 0.06)),
    barFg: toHex(mixRgb(fg, bg, 0.4)),
    dots,
  };
}

/** Do que o Shiki devolveu para o modelo: tabs viram espaços, cores viram #rrggbb. */
export function buildLines(toks: Tok[][], startLine: number, tab: number, color: (t: Tok) => string): SnippetLine[] {
  return toks.map((line, i) => {
    const runs: Run[] = [];
    let cols = 0;
    for (const t of line) {
      let text = t.t.replace(/\t/g, ' '.repeat(tab));
      if (cols >= MAX_COLS) break;
      if (cols + text.length > MAX_COLS) text = text.slice(0, MAX_COLS - cols - 1) + '…';
      cols += text.length;
      runs.push({ text, color: color(t), italic: !!(t.f && t.f & 1), bold: !!(t.f && t.f & 2) });
    }
    return { no: startLine + i, runs };
  });
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(font: string, text: string): number {
  measureCtx ??= document.createElement('canvas').getContext('2d')!;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}
const fontOf = (family: string, size: number, bold: boolean, italic: boolean) => `${italic ? 'italic ' : ''}${bold ? '700' : '400'} ${size}px ${family}`;

export function buildScene(m: SnippetModel, o: SnippetOptions): Scene {
  const { family, size, lineHeight } = m.font;
  const pal = m.palette;
  const padX = 16;
  const padY = 12;
  const gap = 16;
  const regular = fontOf(family, size, false, false);
  const ch = measure(regular, '0');
  const digits = String(m.lines[m.lines.length - 1]?.no ?? 1).length;
  const gutterW = o.numbers ? digits * ch : 0;
  const codeX = padX + (o.numbers ? gutterW + gap : 0);
  let maxW = 0;
  for (const l of m.lines) {
    let w = 0;
    for (const r of l.runs) w += measure(fontOf(family, size, r.bold, r.italic), r.text);
    maxW = Math.max(maxW, w);
  }
  const titleH = o.frame ? 36 : 0;
  const innerW = Math.max(codeX + maxW + padX, o.frame ? 220 : 0);
  const innerH = titleH + padY * 2 + m.lines.length * lineHeight;
  const mg = o.margin;
  const W = Math.ceil(innerW + mg * 2);
  const H = Math.ceil(innerH + mg * 2);
  const ops: Op[] = [];
  if (o.background !== 'transparent') ops.push({ t: 'rect', x: 0, y: 0, w: W, h: H, r: 0, fill: o.background === 'theme' ? pal.page : pal.accentSoft });
  const r = o.frame ? 10 : 8;
  ops.push({ t: 'rect', x: mg + 0.5, y: mg + 0.5, w: innerW - 1, h: innerH - 1, r, fill: pal.bg, stroke: o.frame ? pal.border : undefined });
  if (o.frame) {
    const x = mg + 0.5;
    const y = mg + 0.5;
    const w = innerW - 1;
    ops.push({ t: 'path', fill: pal.bar, d: `M${x} ${y + titleH}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + titleH}Z` });
    ops.push({ t: 'rect', x, y: y + titleH, w, h: 1, r: 0, fill: pal.border });
    pal.dots.forEach((c, i) => ops.push({ t: 'circle', cx: mg + 18 + i * 18, cy: mg + titleH / 2, r: 5, fill: c }));
    ops.push({ t: 'text', x: mg + innerW / 2, y: mg + titleH / 2 + 4, text: m.title, fill: pal.barFg, anchor: 'middle', size: 12, bold: false, italic: false });
  }
  m.lines.forEach((l, i) => {
    const top = mg + titleH + padY + i * lineHeight;
    const base = top + lineHeight / 2 + size * 0.34;
    if (o.numbers) ops.push({ t: 'text', x: mg + padX + gutterW, y: base, text: String(l.no), fill: pal.gutter, anchor: 'end', size, bold: false, italic: false });
    let x = mg + codeX;
    for (const run of l.runs) {
      ops.push({ t: 'text', x, y: base, text: run.text, fill: run.color, anchor: 'start', size, bold: run.bold, italic: run.italic });
      x += measure(fontOf(family, size, run.bold, run.italic), run.text);
    }
  });
  return { width: W, height: H, ops, family };
}

export function drawScene(canvas: HTMLCanvasElement, scene: Scene, scale = 2) {
  canvas.width = Math.round(scene.width * scale);
  canvas.height = Math.round(scene.height * scale);
  canvas.style.aspectRatio = `${scene.width} / ${scene.height}`;
  canvas.style.setProperty('--w', String(scene.width));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, scene.width, scene.height);
  ctx.textBaseline = 'alphabetic';
  for (const op of scene.ops) {
    if (op.t === 'rect') {
      ctx.beginPath();
      ctx.roundRect(op.x, op.y, op.w, op.h, op.r);
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (op.t === 'path') {
      ctx.fillStyle = op.fill;
      ctx.fill(new Path2D(op.d));
    } else if (op.t === 'circle') {
      ctx.beginPath();
      ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2);
      ctx.fillStyle = op.fill;
      ctx.fill();
    } else {
      ctx.font = fontOf(scene.family, op.size, op.bold, op.italic);
      ctx.fillStyle = op.fill;
      ctx.textAlign = op.anchor === 'middle' ? 'center' : op.anchor === 'end' ? 'right' : 'left';
      ctx.fillText(op.text, op.x, op.y);
    }
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function sceneToSvg(scene: Scene, fontCss = ''): string {
  const body = scene.ops
    .map((op) => {
      if (op.t === 'rect') {
        const fill = op.fill ? ` fill="${op.fill}"` : ' fill="none"';
        const stroke = op.stroke ? ` stroke="${op.stroke}" stroke-width="1"` : '';
        return `<rect x="${op.x}" y="${op.y}" width="${op.w}" height="${op.h}" rx="${op.r}"${fill}${stroke}/>`;
      }
      if (op.t === 'path') return `<path d="${op.d}" fill="${op.fill}"/>`;
      if (op.t === 'circle') return `<circle cx="${op.cx}" cy="${op.cy}" r="${op.r}" fill="${op.fill}"/>`;
      const weight = op.bold ? ' font-weight="700"' : '';
      const style = op.italic ? ' font-style="italic"' : '';
      return `<text x="${op.x}" y="${op.y}" fill="${op.fill}" font-size="${op.size}" text-anchor="${op.anchor}"${weight}${style} xml:space="preserve">${esc(op.text)}</text>`;
    })
    .join('\n');
  const family = esc(scene.family);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" font-family="${family}">\n${fontCss ? `<style>${fontCss}</style>\n` : ''}${body}\n</svg>\n`;
}

/** @font-face com a JetBrains Mono embutida (data URI), para o SVG não depender da fonte instalada. */
export async function embeddedFontCss(urls: { regular: string; bold: string }): Promise<string> {
  const toUri = async (u: string) => {
    const buf = await (await fetch(u)).arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:font/woff2;base64,${btoa(bin)}`;
  };
  const [reg, bold] = await Promise.all([toUri(urls.regular), toUri(urls.bold)]);
  return `@font-face{font-family:'JetBrains Mono';font-weight:400;src:url(${reg}) format('woff2')}@font-face{font-family:'JetBrains Mono';font-weight:700;src:url(${bold}) format('woff2')}`;
}
