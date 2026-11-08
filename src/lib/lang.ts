// Linguagem de um arquivo pelo nome. `shiki` é o id da gramática; null destaca nada (texto puro).
export type LangInfo = { shiki: string | null; label: string };

const BY_EXT: Record<string, LangInfo> = {
  ts: { shiki: 'typescript', label: 'TypeScript' },
  mts: { shiki: 'typescript', label: 'TypeScript' },
  tsx: { shiki: 'tsx', label: 'TypeScript React' },
  js: { shiki: 'javascript', label: 'JavaScript' },
  mjs: { shiki: 'javascript', label: 'JavaScript' },
  jsx: { shiki: 'jsx', label: 'JavaScript React' },
  json: { shiki: 'json', label: 'JSON' },
  css: { shiki: 'css', label: 'CSS' },
  html: { shiki: 'html', label: 'HTML' },
  md: { shiki: 'markdown', label: 'Markdown' },
  yml: { shiki: 'yaml', label: 'YAML' },
  yaml: { shiki: 'yaml', label: 'YAML' },
  py: { shiki: 'python', label: 'Python' },
  sh: { shiki: 'shellscript', label: 'Shell' },
  csv: { shiki: null, label: 'CSV' },
  svg: { shiki: 'xml', label: 'SVG' },
  log: { shiki: null, label: 'Log' },
};

const BY_NAME: Record<string, LangInfo> = {
  '.gitignore': { shiki: null, label: 'Texto' },
  '.editorconfig': { shiki: 'ini', label: 'EditorConfig' },
  LICENSE: { shiki: null, label: 'Texto' },
};

export function langOf(path: string): LangInfo {
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (BY_NAME[name]) return BY_NAME[name]!;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  return BY_EXT[ext] ?? { shiki: null, label: 'Texto' };
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0).replace('.', ',')} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
