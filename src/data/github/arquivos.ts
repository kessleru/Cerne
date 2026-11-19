// Classificação de arquivos: tipo, binário, grande e ponteiro LFS.
import type { FileKind } from '../types';

export const LIMITE_GRANDE = 1_048_576; // 1 MB: acima disso o arquivo não é carregado
const LFS_PREFIXO = 'version https://git-lfs.github.com/spec/v1';

const BINARIAS = new Set(
  ('tif tiff heic psd gz tgz bz2 xz 7z rar wasm eot mov avi mkv exe dll so dylib bin class pyc ' +
    'o a lib iso dmg sqlite sqlite3 db').split(' '),
);

/** Imagens raster: mostradas pelo visualizador de imagem, nunca lidas como texto. */
const IMAGENS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'bmp', 'apng', 'jfif']);

/** Tipos com visualizador próprio (bytes, sem passar por texto) e o MIME para o navegador tocar ou desenhar. */
export const MIDIA: Record<string, { kind: FileKind; mime: string }> = {
  pdf: { kind: 'pdf', mime: 'application/pdf' },
  mp3: { kind: 'audio', mime: 'audio/mpeg' },
  wav: { kind: 'audio', mime: 'audio/wav' },
  ogg: { kind: 'audio', mime: 'audio/ogg' },
  oga: { kind: 'audio', mime: 'audio/ogg' },
  opus: { kind: 'audio', mime: 'audio/ogg' },
  flac: { kind: 'audio', mime: 'audio/flac' },
  m4a: { kind: 'audio', mime: 'audio/mp4' },
  aac: { kind: 'audio', mime: 'audio/aac' },
  weba: { kind: 'audio', mime: 'audio/webm' },
  mp4: { kind: 'video', mime: 'video/mp4' },
  m4v: { kind: 'video', mime: 'video/mp4' },
  webm: { kind: 'video', mime: 'video/webm' },
  ogv: { kind: 'video', mime: 'video/ogg' },
  ttf: { kind: 'font', mime: 'font/ttf' },
  otf: { kind: 'font', mime: 'font/otf' },
  woff: { kind: 'font', mime: 'font/woff' },
  woff2: { kind: 'font', mime: 'font/woff2' },
  zip: { kind: 'archive', mime: 'application/zip' },
  jar: { kind: 'archive', mime: 'application/java-archive' },
  war: { kind: 'archive', mime: 'application/zip' },
  apk: { kind: 'archive', mime: 'application/zip' },
  aar: { kind: 'archive', mime: 'application/zip' },
  vsix: { kind: 'archive', mime: 'application/zip' },
  whl: { kind: 'archive', mime: 'application/zip' },
  nupkg: { kind: 'archive', mime: 'application/zip' },
  xpi: { kind: 'archive', mime: 'application/zip' },
  epub: { kind: 'archive', mime: 'application/epub+zip' },
};
/** Até 25 MB para PDF, áudio, vídeo, fontes e pacotes (o navegador guarda tudo na memória). */
export const LIMITE_MIDIA = 25 * 1_048_576;
/** Binário desconhecido: até 2 MB é lido para a visão em hexadecimal e para baixar. */
export const LIMITE_BINARIO = 2 * 1_048_576;

export const extensao = (path: string) => {
  const nome = path.slice(path.lastIndexOf('/') + 1);
  const i = nome.lastIndexOf('.');
  return i > 0 ? nome.slice(i + 1).toLowerCase() : '';
};
const ext = extensao;

export const ehImagemRaster = (path: string) => IMAGENS.has(ext(path));
export const midiaDe = (path: string) => MIDIA[ext(path)] ?? null;

/** Tipo pelo nome e pelo tamanho (o ponteiro LFS só se descobre lendo o conteúdo). */
export function tipoDoArquivo(path: string, size?: number): FileKind {
  const e = ext(path);
  if (IMAGENS.has(e)) return 'image';
  if (MIDIA[e]) return size !== undefined && size > LIMITE_MIDIA ? 'large' : MIDIA[e].kind;
  if (BINARIAS.has(e)) return 'binary';
  if (size !== undefined && size > LIMITE_GRANDE) return 'large';
  if (e === 'md' || e === 'markdown' || e === 'mdx') return 'markdown';
  if (e === 'csv' || e === 'tsv') return 'csv';
  if (e === 'json' || e === 'geojson' || e === 'webmanifest') return 'json';
  if (e === 'ipynb') return 'notebook';
  if (e === 'svg') return 'image';
  return 'text';
}

export function pareceBinario(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8192);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}

export function lerPonteiroLfs(texto: string): { oid: string; size: number } | null {
  if (!texto.startsWith(LFS_PREFIXO)) return null;
  const oid = /^oid sha256:([0-9a-f]+)/m.exec(texto)?.[1];
  const size = /^size (\d+)/m.exec(texto)?.[1];
  return oid ? { oid, size: size ? Number(size) : 0 } : null;
}

export function contarLinhas(texto: string): number {
  let n = 1;
  for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 10) n++;
  if (texto.endsWith('\n')) n--;
  return n;
}

/** Codifica ramo ou caminho para a URL. Recusa `.`, `..` e trechos vazios: o navegador resolve
 *  `..` (mesmo como `%2E%2E`) e a chamada, com o token, iria para outro endpoint da API. */
export function codificarCaminho(p: string): string {
  const partes = p.split('/');
  if (partes.some((s) => s === '' || s === '.' || s === '..')) throw new Error('Caminho inválido.');
  return partes.map(encodeURIComponent).join('/');
}
