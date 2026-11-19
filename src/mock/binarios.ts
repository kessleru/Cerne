// Arquivos binários do repositório de demonstração, gerados na hora (sem rede): som, PDF, ZIP e bytes soltos.
// A fonte é a JetBrains Mono que o próprio app já carrega.
import fonteUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';

const enc = new TextEncoder();

/** 1,2 s de três notas, WAV PCM de 8 bits a 8 kHz. */
export function wav(): Uint8Array {
  const rate = 8000;
  const n = Math.round(rate * 1.2);
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const str = (o: number, t: string) => b.set(enc.encode(t), o);
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
  const notas = [523.25, 659.25, 783.99];
  for (let i = 0; i < n; i++) {
    const f = notas[Math.min(2, Math.floor((i / n) * 3))]!;
    const env = Math.min(1, (n - i) / 800) * Math.min(1, i / 80);
    b[44 + i] = 128 + Math.round(Math.sin((2 * Math.PI * f * i) / rate) * 60 * env);
  }
  return b;
}

/** PDF de uma página com um título e duas linhas. */
export function pdf(): Uint8Array {
  const conteudo = 'BT /F1 28 Tf 72 720 Td (Manual do exemplo) Tj /F1 14 Tf 0 -40 Td (Um PDF pequeno, gerado pelo Cerne.) Tj 0 -22 Td (Role, aproxime ou baixe pelo visualizador.) Tj ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

/** ZIP sem compressão (método 0) com alguns arquivos e pastas. */
export function zip(): Uint8Array {
  const arquivos: [string, string][] = [
    ['pacote/README.md', '# Pacote\n\nExemplo de ZIP.\n'],
    ['pacote/src/index.js', 'export const oi = () => "olá";\n'],
    ['pacote/src/util/formato.js', 'export const dobro = (n) => n * 2;\n'],
    ['pacote/package.json', '{ "name": "pacote", "version": "1.0.0" }\n'],
    ['pacote/LICENSE', 'MIT\n'],
  ];
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let off = 0;
  for (const [nome, texto] of arquivos) {
    const n = enc.encode(nome);
    const d = enc.encode(texto);
    const l = new Uint8Array(30 + n.length + d.length);
    const lv = new DataView(l.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 10, true); lv.setUint32(18, d.length, true); lv.setUint32(22, d.length, true); lv.setUint16(26, n.length, true);
    l.set(n, 30); l.set(d, 30 + n.length);
    const c = new Uint8Array(46 + n.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 10, true); cv.setUint32(20, d.length, true); cv.setUint32(24, d.length, true);
    cv.setUint16(28, n.length, true); cv.setUint32(42, off, true); c.set(n, 46);
    locais.push(l); centrais.push(c); off += l.length;
  }
  const tamCentral = centrais.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true); fv.setUint16(8, arquivos.length, true); fv.setUint16(10, arquivos.length, true); fv.setUint32(12, tamCentral, true); fv.setUint32(16, off, true);
  const out = new Uint8Array(off + tamCentral + 22);
  let p = 0;
  for (const x of [...locais, ...centrais, fim]) {
    out.set(x, p);
    p += x.length;
  }
  return out;
}

/** 6 KB de bytes com um cabeçalho legível, para a visão em hexadecimal. */
export function dados(): Uint8Array {
  const b = new Uint8Array(6144);
  b.set(enc.encode('CERNE\u0000v1\u0000dados de exemplo\u0000'), 0);
  let x = 2463534242;
  for (let i = 32; i < b.length; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    b[i] = x & 0xff;
  }
  return b;
}

export async function fonte(): Promise<Uint8Array> {
  return new Uint8Array(await (await fetch(fonteUrl)).arrayBuffer());
}
