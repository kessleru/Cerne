// Do JSON de um tema do VS Code para as variáveis do Kessleru. As cores aqui são dados lidos em tempo de execução,
// nunca escritas no fonte. O resultado é aplicado no elemento do alcance, e todos os componentes acompanham.
import type { ThemeData } from '../code/protocol';

export type RGB = [number, number, number];

export function parseColor(s: string | undefined, over?: RGB): RGB | null {
  if (!s) return null;
  const m = /^#([0-9a-f]{3,8})$/i.exec(s.trim());
  if (!m) {
    const rgb = /^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?/.exec(s.trim());
    if (!rgb) return null;
    const c: RGB = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    return rgb[4] !== undefined && over ? mixRgb(over, c, Number(rgb[4])) : c;
  }
  let h = m[1]!;
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  const c: RGB = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  if (h.length === 8 && over) return mixRgb(over, c, parseInt(h.slice(6, 8), 16) / 255);
  return c;
}

export const toHex = (c: RGB) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminance = (c: RGB) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export function contrast(a: RGB, b: RGB): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Aproxima `c` de `toward` até passar `min` de contraste com todos os fundos de `bgs`. */
export function ensureContrast(c: RGB, bgs: RGB[], min: number, toward: RGB): RGB {
  let out = c;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    out = mixRgb(c, toward, t);
    if (bgs.every((b) => contrast(out, b) >= min)) return out;
  }
  return out;
}

export type ThemeVarOptions = {
  contrast: boolean;
  /** cor de destaque da interface já resolvida (hex) */
  accent: string | null;
  /** vermelho da interface (hex), usado em erros */
  red: string | null;
};

/** Variáveis CSS (e color-scheme) para o elemento do alcance. */
export function buildThemeVars(data: ThemeData, o: ThemeVarOptions): Record<string, string> {
  const c = data.colors;
  const bg = parseColor(c['editor.background']) ?? parseColor(data.bg) ?? ([30, 30, 46] as RGB);
  const fgRaw = parseColor(c['editor.foreground']) ?? parseColor(data.fg) ?? ([205, 214, 244] as RGB);
  const dark = data.dark;
  const black: RGB = [0, 0, 0];
  const white: RGB = [255, 255, 255];

  const fg = ensureContrast(fgRaw, [bg], 4.5, dark ? white : black);
  const baseRaw = parseColor(c['sideBar.background'], bg) ?? parseColor(c['activityBar.background'], bg);
  const base = baseRaw && contrast(baseRaw, bg) < 4 ? baseRaw : mixRgb(bg, fg, 0.05);
  const crustRaw = parseColor(c['titleBar.activeBackground'], bg) ?? parseColor(c['statusBar.background'], bg);
  const crust = crustRaw && contrast(crustRaw, bg) < 4 ? crustRaw : mixRgb(bg, dark ? black : fg, dark ? 0.25 : 0.07);

  let s0 = parseColor(c['panel.border'], bg) ?? parseColor(c['sideBar.border'], bg) ?? parseColor(c['editorGroup.border'], bg) ?? parseColor(c['tab.border'], bg);
  if (!s0 || contrast(s0, bg) < 1.15) s0 = mixRgb(bg, fg, o.contrast ? 0.45 : 0.14);
  const s1 = mixRgb(s0, fg, o.contrast ? 0.6 : 0.22);
  const s2 = mixRgb(s0, fg, o.contrast ? 1 : 0.42);

  const bgs = [bg, base];
  const text = fg;
  const sub = (t: number) => (o.contrast ? fg : ensureContrast(mixRgb(fg, bg, t), bgs, 4.5, fg));
  const subtext1 = sub(0.12);
  const subtext0 = sub(0.25);
  const meta = sub(0.34);
  const over = (t: number) => mixRgb(bg, fg, t);

  const v: Record<string, string> = {
    'color-scheme': dark ? 'dark' : 'light',
    '--ctp-base': toHex(base),
    '--ctp-mantle': toHex(bg),
    '--ctp-crust': toHex(crust),
    '--ctp-surface-0': toHex(s0),
    '--ctp-surface-1': toHex(s1),
    '--ctp-surface-2': toHex(s2),
    '--ctp-overlay-0': toHex(over(0.45)),
    '--ctp-overlay-1': toHex(over(0.58)),
    '--ctp-overlay-2': toHex(o.contrast ? fg : ensureContrast(over(0.7), bgs, 4.5, fg)),
    '--ctp-text': toHex(text),
    '--ctp-subtext-1': toHex(subtext1),
    '--ctp-subtext-0': toHex(subtext0),
    '--ctp-meta': toHex(meta),
  };

  // acento: abaixo de 3:1 com o novo fundo, ajusta em direção ao texto do tema, só neste alcance
  const accent = parseColor(o.accent ?? undefined);
  if (accent) v['--ctp-accent'] = toHex(ensureContrast(accent, bgs, 3, fg));
  const red = parseColor(o.red ?? undefined);
  if (red) v['--ctp-red'] = toHex(ensureContrast(red, bgs, 4.5, fg));

  // variáveis do CodeView (mesmos valores que o painel de código usa)
  const sel = parseColor(c['editor.selectionBackground'], bg);
  const line = parseColor(c['editor.lineHighlightBackground'], bg);
  const gut = parseColor(c['editorLineNumber.foreground'], bg);
  const guide = parseColor(c['editorIndentGuide.background1'] ?? c['editorIndentGuide.background'], bg);
  v['--ed-bg'] = toHex(bg);
  v['--ed-fg'] = toHex(fg);
  v['--ed-gutter'] = toHex(gut ? ensureContrast(gut, [bg], 3.5, fg) : meta);
  v['--ed-current-line'] = toHex(line ?? mixRgb(bg, fg, 0.07));
  if (sel) v['--ed-selected-line'] = toHex(sel);
  v['--ed-guide'] = toHex(guide ?? s0);
  return v;
}

/** Cartão de prévia: as mesmas cores, na forma que o cartão precisa. */
export function previewColors(data: ThemeData) {
  const c = data.colors;
  const bg = parseColor(c['editor.background']) ?? parseColor(data.bg) ?? ([30, 30, 46] as RGB);
  const fg = parseColor(c['editor.foreground']) ?? parseColor(data.fg) ?? ([205, 214, 244] as RGB);
  const side = parseColor(c['sideBar.background'], bg) ?? mixRgb(bg, fg, 0.05);
  const gut = parseColor(c['editorLineNumber.foreground'], bg) ?? mixRgb(bg, fg, 0.4);
  const line = parseColor(c['editor.lineHighlightBackground'], bg) ?? mixRgb(bg, fg, 0.07);
  return { bg: toHex(bg), fg: toHex(fg), side: toHex(side), gutter: toHex(gut), line: toHex(line) };
}
