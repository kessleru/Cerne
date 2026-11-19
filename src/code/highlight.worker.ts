/// <reference lib="webworker" />
// Worker do Shiki: carrega linguagens e temas sob demanda e destaca o arquivo por blocos de CHUNK linhas,
// começando pelos que a pessoa está vendo. Motor de regex em JS (sem WebAssembly).
import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { CHUNK, THEME_KEYS, type FromWorker, type ThemeData, type ThemeInfo, type Tok, type ToWorker } from './protocol';

type Loader = () => Promise<unknown>;

// cada gramática vira um pedaço separado no build e só é baixada quando um arquivo dela abre
const LANGS: Record<string, Loader> = {
  ada: () => import('@shikijs/langs/ada'),
  ahk2: () => import('@shikijs/langs/ahk2'),
  apache: () => import('@shikijs/langs/apache'),
  applescript: () => import('@shikijs/langs/applescript'),
  asciidoc: () => import('@shikijs/langs/asciidoc'),
  asm: () => import('@shikijs/langs/asm'),
  astro: () => import('@shikijs/langs/astro'),
  awk: () => import('@shikijs/langs/awk'),
  bat: () => import('@shikijs/langs/bat'),
  bibtex: () => import('@shikijs/langs/bibtex'),
  bicep: () => import('@shikijs/langs/bicep'),
  blade: () => import('@shikijs/langs/blade'),
  c: () => import('@shikijs/langs/c'),
  cairo: () => import('@shikijs/langs/cairo'),
  clojure: () => import('@shikijs/langs/clojure'),
  cmake: () => import('@shikijs/langs/cmake'),
  cobol: () => import('@shikijs/langs/cobol'),
  codeowners: () => import('@shikijs/langs/codeowners'),
  'common-lisp': () => import('@shikijs/langs/common-lisp'),
  cpp: () => import('@shikijs/langs/cpp'),
  crystal: () => import('@shikijs/langs/crystal'),
  csharp: () => import('@shikijs/langs/csharp'),
  css: () => import('@shikijs/langs/css'),
  cue: () => import('@shikijs/langs/cue'),
  d: () => import('@shikijs/langs/d'),
  dart: () => import('@shikijs/langs/dart'),
  diff: () => import('@shikijs/langs/diff'),
  docker: () => import('@shikijs/langs/docker'),
  dotenv: () => import('@shikijs/langs/dotenv'),
  elixir: () => import('@shikijs/langs/elixir'),
  elm: () => import('@shikijs/langs/elm'),
  'emacs-lisp': () => import('@shikijs/langs/emacs-lisp'),
  erb: () => import('@shikijs/langs/erb'),
  erlang: () => import('@shikijs/langs/erlang'),
  fennel: () => import('@shikijs/langs/fennel'),
  fish: () => import('@shikijs/langs/fish'),
  'fortran-fixed-form': () => import('@shikijs/langs/fortran-fixed-form'),
  'fortran-free-form': () => import('@shikijs/langs/fortran-free-form'),
  fsharp: () => import('@shikijs/langs/fsharp'),
  gdscript: () => import('@shikijs/langs/gdscript'),
  gdshader: () => import('@shikijs/langs/gdshader'),
  gherkin: () => import('@shikijs/langs/gherkin'),
  gleam: () => import('@shikijs/langs/gleam'),
  glsl: () => import('@shikijs/langs/glsl'),
  go: () => import('@shikijs/langs/go'),
  graphql: () => import('@shikijs/langs/graphql'),
  groovy: () => import('@shikijs/langs/groovy'),
  haml: () => import('@shikijs/langs/haml'),
  handlebars: () => import('@shikijs/langs/handlebars'),
  haskell: () => import('@shikijs/langs/haskell'),
  hcl: () => import('@shikijs/langs/hcl'),
  hlsl: () => import('@shikijs/langs/hlsl'),
  html: () => import('@shikijs/langs/html'),
  http: () => import('@shikijs/langs/http'),
  ini: () => import('@shikijs/langs/ini'),
  java: () => import('@shikijs/langs/java'),
  javascript: () => import('@shikijs/langs/javascript'),
  jinja: () => import('@shikijs/langs/jinja'),
  json: () => import('@shikijs/langs/json'),
  json5: () => import('@shikijs/langs/json5'),
  jsonc: () => import('@shikijs/langs/jsonc'),
  jsonl: () => import('@shikijs/langs/jsonl'),
  jsonnet: () => import('@shikijs/langs/jsonnet'),
  jsx: () => import('@shikijs/langs/jsx'),
  julia: () => import('@shikijs/langs/julia'),
  just: () => import('@shikijs/langs/just'),
  kdl: () => import('@shikijs/langs/kdl'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  latex: () => import('@shikijs/langs/latex'),
  less: () => import('@shikijs/langs/less'),
  liquid: () => import('@shikijs/langs/liquid'),
  llvm: () => import('@shikijs/langs/llvm'),
  log: () => import('@shikijs/langs/log'),
  lua: () => import('@shikijs/langs/lua'),
  luau: () => import('@shikijs/langs/luau'),
  makefile: () => import('@shikijs/langs/makefile'),
  markdown: () => import('@shikijs/langs/markdown'),
  mdx: () => import('@shikijs/langs/mdx'),
  mermaid: () => import('@shikijs/langs/mermaid'),
  mojo: () => import('@shikijs/langs/mojo'),
  move: () => import('@shikijs/langs/move'),
  nginx: () => import('@shikijs/langs/nginx'),
  nim: () => import('@shikijs/langs/nim'),
  nix: () => import('@shikijs/langs/nix'),
  nsis: () => import('@shikijs/langs/nsis'),
  nushell: () => import('@shikijs/langs/nushell'),
  'objective-c': () => import('@shikijs/langs/objective-c'),
  'objective-cpp': () => import('@shikijs/langs/objective-cpp'),
  ocaml: () => import('@shikijs/langs/ocaml'),
  odin: () => import('@shikijs/langs/odin'),
  org: () => import('@shikijs/langs/org'),
  pascal: () => import('@shikijs/langs/pascal'),
  perl: () => import('@shikijs/langs/perl'),
  php: () => import('@shikijs/langs/php'),
  po: () => import('@shikijs/langs/po'),
  postcss: () => import('@shikijs/langs/postcss'),
  powershell: () => import('@shikijs/langs/powershell'),
  prisma: () => import('@shikijs/langs/prisma'),
  properties: () => import('@shikijs/langs/properties'),
  proto: () => import('@shikijs/langs/proto'),
  pug: () => import('@shikijs/langs/pug'),
  puppet: () => import('@shikijs/langs/puppet'),
  python: () => import('@shikijs/langs/python'),
  r: () => import('@shikijs/langs/r'),
  racket: () => import('@shikijs/langs/racket'),
  razor: () => import('@shikijs/langs/razor'),
  reg: () => import('@shikijs/langs/reg'),
  rst: () => import('@shikijs/langs/rst'),
  ruby: () => import('@shikijs/langs/ruby'),
  rust: () => import('@shikijs/langs/rust'),
  sas: () => import('@shikijs/langs/sas'),
  sass: () => import('@shikijs/langs/sass'),
  scala: () => import('@shikijs/langs/scala'),
  scheme: () => import('@shikijs/langs/scheme'),
  scss: () => import('@shikijs/langs/scss'),
  shaderlab: () => import('@shikijs/langs/shaderlab'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  solidity: () => import('@shikijs/langs/solidity'),
  sql: () => import('@shikijs/langs/sql'),
  'ssh-config': () => import('@shikijs/langs/ssh-config'),
  stata: () => import('@shikijs/langs/stata'),
  stylus: () => import('@shikijs/langs/stylus'),
  svelte: () => import('@shikijs/langs/svelte'),
  swift: () => import('@shikijs/langs/swift'),
  'system-verilog': () => import('@shikijs/langs/system-verilog'),
  tcl: () => import('@shikijs/langs/tcl'),
  templ: () => import('@shikijs/langs/templ'),
  terraform: () => import('@shikijs/langs/terraform'),
  toml: () => import('@shikijs/langs/toml'),
  tscn: () => import('@shikijs/langs/tscn'),
  tsx: () => import('@shikijs/langs/tsx'),
  twig: () => import('@shikijs/langs/twig'),
  typescript: () => import('@shikijs/langs/typescript'),
  typst: () => import('@shikijs/langs/typst'),
  v: () => import('@shikijs/langs/v'),
  vb: () => import('@shikijs/langs/vb'),
  verilog: () => import('@shikijs/langs/verilog'),
  vhdl: () => import('@shikijs/langs/vhdl'),
  viml: () => import('@shikijs/langs/viml'),
  vue: () => import('@shikijs/langs/vue'),
  wasm: () => import('@shikijs/langs/wasm'),
  wgsl: () => import('@shikijs/langs/wgsl'),
  xml: () => import('@shikijs/langs/xml'),
  xsl: () => import('@shikijs/langs/xsl'),
  yaml: () => import('@shikijs/langs/yaml'),
  zig: () => import('@shikijs/langs/zig'),
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
