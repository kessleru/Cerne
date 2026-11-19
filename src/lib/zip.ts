// Lista o conteúdo de um ZIP lendo só o diretório central (não descompacta nada).
export type EntradaZip = { nome: string; tamanho: number; compactado: number; pasta: boolean };

export function lerZip(b: Uint8Array): { entradas: EntradaZip[] } | { erro: string } {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  // fim do diretório central: assinatura 0x06054b50, nos últimos 64 KB + 22 bytes
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { erro: 'Não parece um ZIP válido.' };
  const total = v.getUint16(eocd + 10, true);
  const inicio = v.getUint32(eocd + 16, true);
  if (inicio === 0xffffffff || total === 0xffff) return { erro: 'ZIP64 ainda não é lido aqui. Baixe para abrir.' };
  const dec = new TextDecoder();
  const entradas: EntradaZip[] = [];
  let p = inicio;
  for (let k = 0; k < total && p + 46 <= b.length; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const compactado = v.getUint32(p + 20, true);
    const tamanho = v.getUint32(p + 24, true);
    const nLen = v.getUint16(p + 28, true);
    const xLen = v.getUint16(p + 30, true);
    const cLen = v.getUint16(p + 32, true);
    const nome = dec.decode(b.subarray(p + 46, p + 46 + nLen));
    entradas.push({ nome, tamanho, compactado, pasta: nome.endsWith('/') });
    p += 46 + nLen + xLen + cLen;
  }
  // pastas implícitas (ZIPs que só guardam arquivos) e ordem de árvore: pasta antes do conteúdo
  const nomes = new Set(entradas.map((e) => e.nome));
  for (const e of [...entradas]) {
    const partes = e.nome.replace(/\/$/, '').split('/');
    for (let i = 1; i < partes.length; i++) {
      const pasta = partes.slice(0, i).join('/') + '/';
      if (!nomes.has(pasta)) {
        nomes.add(pasta);
        entradas.push({ nome: pasta, tamanho: 0, compactado: 0, pasta: true });
      }
    }
  }
  entradas.sort((a, c) => a.nome.localeCompare(c.nome, 'pt-BR'));
  return { entradas };
}
