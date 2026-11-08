/// <reference lib="webworker" />
// Worker do Shiki: carrega linguagens e temas sob demanda e destaca o arquivo por blocos de CHUNK linhas,
// começando pelos que a pessoa está vendo. Motor de regex em JS (sem WebAssembly).
import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { CHUNK, THEME_KEYS, type FromWorker, type ThemeData, type ThemeInfo, type Tok, type ToWorker } from './protocol';

type Loader = () => Promise<unknown>;

const LANGS: Record<string, Loader> = {
  typescript: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  javascript: () => import('@shikijs/langs/javascript'),
  jsx: () => import('@shikijs/langs/jsx'),
  json: () => import('@shikijs/langs/json'),
  css: () => import('@shikijs/langs/css'),
  html: () => import('@shikijs/langs/html'),
  markdown: () => import('@shikijs/langs/markdown'),
  yaml: () => import('@shikijs/langs/yaml'),
  python: () => import('@shikijs/langs/python'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  ini: () => import('@shikijs/langs/ini'),
  xml: () => import('@shikijs/langs/xml'),
};

const THEMES: Record<string, Loader> = {
  'catppuccin-mocha': () => import('@shikijs/themes/catppuccin-mocha'),
  'catppuccin-macchiato': () => import('@shikijs/themes/catppuccin-macchiato'),
  'catppuccin-frappe': () => import('@shikijs/themes/catppuccin-frappe'),
  'catppuccin-latte': () => import('@shikijs/themes/catppuccin-latte'),
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-light': () => import('@shikijs/themes/github-light'),
  dracula: () => import('@shikijs/themes/dracula'),
  'tokyo-night': () => import('@shikijs/themes/tokyo-night'),
  'one-dark-pro': () => import('@shikijs/themes/one-dark-pro'),
  nord: () => import('@shikijs/themes/nord'),
  'gruvbox-dark-medium': () => import('@shikijs/themes/gruvbox-dark-medium'),
  'gruvbox-light-medium': () => import('@shikijs/themes/gruvbox-light-medium'),
  'rose-pine': () => import('@shikijs/themes/rose-pine'),
  'rose-pine-dawn': () => import('@shikijs/themes/rose-pine-dawn'),
  'solarized-dark': () => import('@shikijs/themes/solarized-dark'),
  'solarized-light': () => import('@shikijs/themes/solarized-light'),
  monokai: () => import('@shikijs/themes/monokai'),
  'night-owl': () => import('@shikijs/themes/night-owl'),
  'ayu-dark': () => import('@shikijs/themes/ayu-dark'),
  'material-theme': () => import('@shikijs/themes/material-theme'),
};

const SYSTEM = 'cerne-sistema';
// Tema "seguir o sistema": o Shiki devolve `var(--shiki-token-*)` e a classe tok-* correspondente é aplicada na tela.
const systemTheme = createCssVariablesTheme({ name: SYSTEM, variablePrefix: '--shiki-', variableDefaults: {}, fontStyle: true });
const CLASS_BY_TOKEN: Record<string, string> = {
  keyword: 'tok-keyword',
  string: 'tok-string',
  'string-expression': 'tok-string',
  constant: 'tok-number',
  comment: 'tok-comment',
  punctuation: 'tok-punct',
  function: 'tok-fn',
  parameter: 'tok-key',
  link: 'tok-op',
};

let hl: Promise<HighlighterCore> | null = null;
function highlighter() {
  hl ??= createHighlighterCore({ themes: [systemTheme], langs: [], engine: createJavaScriptRegexEngine() });
  return hl;
}

// temas importados pela pessoa (JSON do VS Code), registrados pelo nome
const custom = new Map<string, Record<string, unknown>>();

type FileState = { lines: string[]; lang: string | null; theme: string | null };
const files = new Map<number, FileState>();
const post = (m: FromWorker) => (self as unknown as Worker).postMessage(m);

async function ensure(lang: string | null, theme: string | null) {
  const h = await highlighter();
  if (lang && !h.getLoadedLanguages().includes(lang) && LANGS[lang]) await h.loadLanguage(LANGS[lang]() as never);
  if (theme && !h.getLoadedThemes().includes(theme)) {
    const json = custom.get(theme);
    if (json) await h.loadTheme({ ...json, name: theme } as never);
    else if (THEMES[theme]) await h.loadTheme(THEMES[theme]() as never);
  }
  return h;
}

function themeData(h: HighlighterCore, id: string): ThemeData {
  const t = h.getTheme(id);
  const all = (t.colors ?? {}) as Record<string, string | undefined>;
  const colors: Record<string, string> = {};
  for (const k of THEME_KEYS) if (all[k]) colors[k] = all[k]!;
  return { id, dark: t.type !== 'light', bg: t.bg, fg: t.fg, colors };
}

function themeInfo(h: HighlighterCore, theme: string | null): ThemeInfo | null {
  if (!theme) return null;
  const t = h.getTheme(theme);
  const c = (t.colors ?? {}) as Record<string, string | undefined>;
  return {
    dark: t.type !== 'light',
    bg: t.bg,
    fg: t.fg,
    gutter: c['editorLineNumber.foreground'],
    current: c['editor.lineHighlightBackground'],
    selected: c['editor.selectionBackground'],
    guide: c['editorIndentGuide.background1'] ?? c['editorIndentGuide.background'],
  };
}

async function open(fileId: number, text: string, lang: string | null, theme: string | null) {
  files.set(fileId, { lines: text.split('\n'), lang, theme });
  try {
    const h = await ensure(lang, theme);
    post({ type: 'ready', fileId, theme, info: themeInfo(h, theme), lang });
  } catch (e) {
    post({ type: 'error', fileId, message: String(e) });
  }
}

/** Começa o bloco numa linha sem recuo, depois de uma linha em branco (aproximação do estado da gramática). */
function safeStart(lines: string[], s: number): number {
  for (let i = s; i > Math.max(0, s - 400); i--) {
    const l = lines[i];
    if (l && !/^\s/.test(l) && (i === 0 || lines[i - 1] === '')) return i;
  }
  return s;
}

function tokenize(h: HighlighterCore, f: FileState, chunk: number): Tok[][] {
  const from = chunk * CHUNK;
  const to = Math.min(f.lines.length, from + CHUNK);
  if (from >= f.lines.length) return [];
  if (!f.lang || !LANGS[f.lang]) return f.lines.slice(from, to).map((t) => [{ t }]);
  const start = safeStart(f.lines, from);
  const theme = f.theme ?? SYSTEM;
  const raw = h.codeToTokensBase(f.lines.slice(start, to).join('\n'), { lang: f.lang, theme });
  const out: Tok[][] = [];
  for (let i = from - start; i < raw.length; i++) {
    out.push(
      raw[i]!.map((tk) => {
        const o: Tok = { t: tk.content };
        if (f.theme) {
          if (tk.color) o.k = tk.color;
        } else {
          const m = /token-([a-z-]+)\)/.exec(tk.color ?? '');
          const cls = m ? CLASS_BY_TOKEN[m[1]!] : undefined;
          if (cls) o.c = cls;
        }
        if (tk.fontStyle) o.f = tk.fontStyle;
        return o;
      }),
    );
  }
  return out;
}

let epoch = 0;
async function want(fileId: number, theme: string | null, chunks: number[]) {
  const mine = ++epoch;
  const f = files.get(fileId);
  if (!f || f.theme !== theme) return;
  const h = await highlighter();
  for (const chunk of chunks) {
    if (mine !== epoch) return; // chegou um pedido mais novo: abandona este
    try {
      post({ type: 'chunk', fileId, theme, chunk, lines: tokenize(h, f, chunk) });
    } catch (e) {
      post({ type: 'error', fileId, message: String(e) });
      return;
    }
    await new Promise((r) => setTimeout(r, 0)); // dá a vez para mensagens novas
  }
}

async function preview(reqId: number, theme: string | null, lang: string | null, code: string) {
  try {
    const h = await ensure(lang, theme);
    const f: FileState = { lines: code.split(String.fromCharCode(10)), lang, theme };
    const lines = tokenize(h, f, 0);
    post({ type: 'preview', fileId: 0, reqId, data: theme ? themeData(h, theme) : null, lines });
  } catch {
    post({ type: 'preview', fileId: 0, reqId, data: null, lines: [] });
  }
}

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const m = ev.data;
  if (m.type === 'registerTheme') {
    custom.set(m.id, m.json as Record<string, unknown>);
    void highlighter().then((h) => h.loadTheme({ ...(m.json as Record<string, unknown>), name: m.id } as never)).then(
      () => post({ type: 'registered', fileId: 0, reqId: m.reqId, ok: true }),
      () => post({ type: 'registered', fileId: 0, reqId: m.reqId, ok: false }),
    );
  } else if (m.type === 'themeData') {
    void ensure(null, m.theme).then(
      (h) => post({ type: 'themeData', fileId: 0, reqId: m.reqId, data: themeData(h, m.theme) }),
      () => post({ type: 'themeData', fileId: 0, reqId: m.reqId, data: null }),
    );
  } else if (m.type === 'preview') void preview(m.reqId, m.theme, m.lang, m.code);
  else if (m.type === 'open') void open(m.fileId, m.text, m.lang, m.theme);
  else if (m.type === 'retheme') {
    const f = files.get(m.fileId);
    if (!f) return;
    f.theme = m.theme;
    void ensure(f.lang, m.theme).then((h) => post({ type: 'ready', fileId: m.fileId, theme: m.theme, info: themeInfo(h, m.theme), lang: f.lang }));
  } else if (m.type === 'want') void want(m.fileId, m.theme, m.chunks);
  else if (m.type === 'close') files.delete(m.fileId);
};
