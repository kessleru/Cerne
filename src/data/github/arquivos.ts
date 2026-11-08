// Classificação de arquivos: tipo, binário, grande e ponteiro LFS.
import type { FileKind } from '../types';

export const LIMITE_GRANDE = 1_048_576; // 1 MB: acima disso o arquivo não é carregado
const LFS_PREFIXO = 'version https://git-lfs.github.com/spec/v1';

const BINARIAS = new Set(
  ('bmp tif tiff heic psd pdf zip gz tgz bz2 xz 7z rar jar war wasm ' +
    'woff woff2 ttf otf eot mp3 mp4 m4a mov avi mkv webm wav ogg flac exe dll so dylib bin class pyc ' +
    'o a lib iso dmg sqlite sqlite3 db').split(' '),
);

/** Imagens raster: mostradas pelo visualizador de imagem, nunca lidas como texto. */
const IMAGENS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico']);

const ext = (path: string) => {
  const nome = path.slice(path.lastIndexOf('/') + 1);
  const i = nome.lastIndexOf('.');
  return i > 0 ? nome.slice(i + 1).toLowerCase() : '';
};

export const ehImagemRaster = (path: string) => IMAGENS.has(ext(path));

/** Tipo pelo nome e pelo tamanho (o ponteiro LFS só se descobre lendo o conteúdo). */
export function tipoDoArquivo(path: string, size?: number): FileKind {
  const e = ext(path);
  if (IMAGENS.has(e)) return 'image';
  if (BINARIAS.has(e)) return 'binary';
  if (size !== undefined && size > LIMITE_GRANDE) return 'large';
  if (e === 'md' || e === 'markdown') return 'markdown';
  if (e === 'csv') return 'csv';
  if (e === 'json') return 'json';
  if (e === 'svg') return 'image';
  return 'text';
}

/** Bytes nulos nos primeiros 8 KB indicam binário. */
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
