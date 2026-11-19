// Símbolos de um arquivo (funções, classes, tipos, títulos) achados por expressões simples, por família de linguagem.
// Não é um analisador: serve para pular rápido pelo arquivo (paleta com @).
export type SymbolKind = 'função' | 'classe' | 'tipo' | 'variável' | 'título' | 'seção' | 'método';
export type CodeSymbol = { name: string; kind: SymbolKind; line: number; depth: number };

type Rule = { re: RegExp; kind: SymbolKind };

const JS: Rule[] = [
  { re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)/, kind: 'função' },
  { re: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([\w$]+)/, kind: 'classe' },
  { re: /^\s*(?:export\s+)?(?:declare\s+)?(?:interface|enum)\s+([\w$]+)/, kind: 'tipo' },
  { re: /^\s*(?:export\s+)?(?:declare\s+)?type\s+([\w$]+)\s*(?:<[^=]*>)?\s*=/, kind: 'tipo' },
  { re: /^\s*(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*(?::[^=]+)?=>/, kind: 'função' },
  { re: /^\s*(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*(?::[^=]+)?=\s*(?:memo|forwardRef|React\.memo)\(/, kind: 'função' },
  { re: /^\s+(?:public\s+|private\s+|protected\s+|static\s+|async\s+|readonly\s+)*(?!if\b|for\b|while\b|switch\b|catch\b|return\b)([\w$]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*$/, kind: 'método' },
];
const PY: Rule[] = [
  { re: /^\s*(?:async\s+)?def\s+(\w+)/, kind: 'função' },
  { re: /^\s*class\s+(\w+)/, kind: 'classe' },
];
const GO: Rule[] = [
  { re: /^func\s+(?:\([^)]*\)\s*)?(\w+)/, kind: 'função' },
  { re: /^type\s+(\w+)\s+(?:struct|interface)/, kind: 'tipo' },
];
const RUST: Rule[] = [
  { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+(\w+)/, kind: 'função' },
  { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:struct|enum|trait|union)\s+(\w+)/, kind: 'tipo' },
  { re: /^\s*impl(?:<[^>]*>)?\s+(?:[\w:]+\s+for\s+)?([\w:]+)/, kind: 'classe' },
  { re: /^\s*(?:pub\s+)?mod\s+(\w+)/, kind: 'seção' },
];
const CLIKE: Rule[] = [
  { re: /^\s*(?:public|private|protected|internal|static|final|abstract|sealed|partial|\s)*\s*(?:class|interface|enum|struct|record|object)\s+(\w+)/, kind: 'classe' },
  { re: /^\s*(?:public|private|protected|internal|static|final|abstract|override|virtual|async|suspend|open|inline|\s)+[\w<>[\],.? ]+\s+(\w+)\s*\([^;]*$/, kind: 'método' },
  { re: /^\s*(?:fun|func)\s+(?:<[^>]*>\s*)?(?:[\w.]+\.)?(\w+)/, kind: 'função' },
  { re: /^[\w*&:<> ]+\s+\**(\w+)\s*\([^;]*\)\s*\{?\s*$/, kind: 'função' },
];
const RUBY: Rule[] = [
  { re: /^\s*def\s+(?:self\.)?([\w?!=]+)/, kind: 'função' },
  { re: /^\s*(?:class|module)\s+([\w:]+)/, kind: 'classe' },
];
const PHP: Rule[] = [
  { re: /^\s*(?:public|private|protected|static|\s)*function\s+(\w+)/, kind: 'função' },
  { re: /^\s*(?:abstract\s+|final\s+)?(?:class|interface|trait|enum)\s+(\w+)/, kind: 'classe' },
];
const SHELL: Rule[] = [{ re: /^\s*(?:function\s+)?([\w-]+)\s*\(\)\s*\{?/, kind: 'função' }];
const CSS: Rule[] = [{ re: /^([^\s@/{][^{]*?)\s*\{\s*$/, kind: 'seção' }, { re: /^(@media[^{]*|@layer[^{]*|@keyframes\s+[\w-]+)/, kind: 'seção' }];
const YAML: Rule[] = [{ re: /^([\w.-]+):(?:\s|$)/, kind: 'seção' }];
const INI: Rule[] = [{ re: /^\s*\[([^\]]+)\]/, kind: 'seção' }];
const SQL: Rule[] = [{ re: /^\s*create\s+(?:or\s+replace\s+)?(?:table|view|function|procedure|index|trigger)\s+(?:if\s+not\s+exists\s+)?([\w."]+)/i, kind: 'tipo' }];
const LUA: Rule[] = [{ re: /^\s*(?:local\s+)?function\s+([\w.:]+)/, kind: 'função' }];
const ELIXIR: Rule[] = [{ re: /^\s*(?:defp?|defmacro)\s+(\w+[?!]?)/, kind: 'função' }, { re: /^\s*defmodule\s+([\w.]+)/, kind: 'classe' }];

const BY_LANG: Record<string, Rule[]> = {
  typescript: JS, tsx: JS, javascript: JS, jsx: JS, vue: JS, svelte: JS, astro: JS,
  python: PY, go: GO, rust: RUST,
  java: CLIKE, kotlin: CLIKE, csharp: CLIKE, scala: CLIKE, swift: CLIKE, dart: CLIKE, c: CLIKE, cpp: CLIKE, 'objective-c': CLIKE, groovy: CLIKE,
  ruby: RUBY, php: PHP, shellscript: SHELL, powershell: SHELL,
  css: CSS, scss: CSS, less: CSS, sass: CSS, yaml: YAML, toml: INI, ini: INI, sql: SQL, lua: LUA, elixir: ELIXIR,
};

const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'else', 'new', 'do', 'try', 'function', 'constructor']);

export function extractSymbols(lines: string[], lang: string | null): CodeSymbol[] {
  const out: CodeSymbol[] = [];
  if (lang === 'markdown' || lang === 'mdx') {
    let fence = false;
    lines.forEach((l, i) => {
      if (/^\s*(```|~~~)/.test(l)) fence = !fence;
      const m = !fence && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(l);
      if (m) out.push({ name: m[2]!, kind: 'título', line: i + 1, depth: m[1]!.length - 1 });
    });
    return out;
  }
  const rules = lang ? BY_LANG[lang] : undefined;
  if (!rules) return out;
  const limit = Math.min(lines.length, 60000);
  for (let i = 0; i < limit; i++) {
    const l = lines[i]!;
    if (l.length > 400 || !l.trim()) continue;
    for (const r of rules) {
      const m = r.re.exec(l);
      const name = m?.[1]?.trim();
      if (name && !KEYWORDS.has(name)) {
        const ind = /^[ \t]*/.exec(l)![0].replace(/\t/g, '    ').length;
        out.push({ name: name.length > 80 ? name.slice(0, 80) + '…' : name, kind: r.kind, line: i + 1, depth: Math.min(4, Math.floor(ind / 2)) });
        break;
      }
    }
    if (out.length >= 2000) break;
  }
  return out;
}

/** O arquivo tem símbolos que valha listar? (Markdown e as linguagens com regras acima.) */
export function hasSymbols(lang: string | null): boolean {
  return !!lang && (lang === 'markdown' || lang === 'mdx' || lang in BY_LANG);
}
