// Visualizadores de arquivos que não são texto: PDF, áudio, vídeo, fonte, pacote ZIP e binário (hexadecimal).
// Os bytes chegam pela fonte de dados; aqui viram um blob: que vive enquanto o visualizador estiver aberto.
import { useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { formatSize } from '../lib/lang';
import { lerZip } from '../lib/zip';

/** blob: para os bytes; revogado ao sair. */
export function useBlobUrl(bytes: Uint8Array | undefined, mime: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!bytes) return setUrl(null);
    const u = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime || 'application/octet-stream' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bytes, mime]);
  return url;
}

/** Baixa os bytes com o nome do arquivo. */
export function baixar(nome: string, bytes: Uint8Array | string, mime = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const nomeDe = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** Cabeçalho comum: ícone, nome, tamanho e ações. */
function Head({ icon, path, size, extra, children }: { icon: IconName; path: string; size: number; extra?: string; children?: React.ReactNode }) {
  return (
    <div className="ks-media__head">
      <span className="ks-media__icon"><Icon name={icon} size={18} /></span>
      <span className="ks-media__name">
        <strong>{nomeDe(path)}</strong>
        <span>{formatSize(size)}{extra ? ` · ${extra}` : ''}</span>
      </span>
      <span className="ks-media__actions">{children}</span>
    </div>
  );
}

function BaixarBtn({ path, bytes, mime }: { path: string; bytes?: Uint8Array; mime?: string }) {
  if (!bytes) return null;
  return (
    <button type="button" className="ks-icon-btn" aria-label="Baixar" data-tip="Baixar" onClick={() => baixar(nomeDe(path), bytes, mime)}>
      <Icon name="arrowDown" />
    </button>
  );
}

// ---------- PDF ----------
export function PdfView({ path, bytes, mime, size }: { path: string; bytes?: Uint8Array; mime?: string; size: number }) {
  const url = useBlobUrl(bytes, mime);
  return (
    <div className="ks-media is-full">
      <Head icon="file" path={path} size={size} extra="PDF">
        {url && (
          <a className="ks-icon-btn" href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir em outra aba" data-tip="Abrir em outra aba">
            <Icon name="external" />
          </a>
        )}
        <BaixarBtn path={path} bytes={bytes} mime={mime} />
      </Head>
      {url && <iframe className="ks-media__pdf" src={url} title={`PDF: ${nomeDe(path)}`} />}
    </div>
  );
}

// ---------- Áudio e vídeo ----------
export function AudioView({ path, bytes, mime, size }: { path: string; bytes?: Uint8Array; mime?: string; size: number }) {
  const url = useBlobUrl(bytes, mime);
  const [dur, setDur] = useState<number | null>(null);
  return (
    <div className="ks-media is-center">
      <div className="ks-media__card">
        <Head icon="audio" path={path} size={size} extra={dur ? tempo(dur) : undefined}>
          <BaixarBtn path={path} bytes={bytes} mime={mime} />
        </Head>
        {url && <audio className="ks-media__audio" src={url} controls preload="metadata" onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} />}
      </div>
    </div>
  );
}

export function VideoView({ path, bytes, mime, size }: { path: string; bytes?: Uint8Array; mime?: string; size: number }) {
  const url = useBlobUrl(bytes, mime);
  const [meta, setMeta] = useState<string | null>(null);
  return (
    <div className="ks-media is-full">
      <Head icon="video" path={path} size={size} extra={meta ?? undefined}>
        <BaixarBtn path={path} bytes={bytes} mime={mime} />
      </Head>
      <div className="ks-media__stage">
        {url && (
          <video
            className="ks-media__video"
            src={url}
            controls
            preload="metadata"
            onLoadedMetadata={(e) => setMeta(`${e.currentTarget.videoWidth}×${e.currentTarget.videoHeight} · ${tempo(e.currentTarget.duration)}`)}
          />
        )}
      </div>
    </div>
  );
}

function tempo(s: number): string {
  if (!Number.isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

// ---------- Fonte ----------
const AMOSTRA = 'A rápida raposa marrom pula sobre o cão preguiçoso';
let fontes = 0;

export function FontView({ path, bytes, size }: { path: string; bytes?: Uint8Array; size: number }) {
  const [familia, setFamilia] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [texto, setTexto] = useState(AMOSTRA);
  useEffect(() => {
    if (!bytes) return;
    const nome = `cerne-fonte-${++fontes}`;
    const face = new FontFace(nome, bytes.slice().buffer as ArrayBuffer);
    let vivo = true;
    face.load().then(
      (f) => {
        if (!vivo) return;
        document.fonts.add(f);
        setFamilia(nome);
      },
      () => vivo && setErro(true),
    );
    return () => {
      vivo = false;
      document.fonts.delete(face);
    };
  }, [bytes]);
  const style = familia ? { fontFamily: `"${familia}", var(--font-mono)` } : undefined;
  return (
    <div className="ks-media">
      <Head icon="type" path={path} size={size} extra="fonte">
        <BaixarBtn path={path} bytes={bytes} mime="font/ttf" />
      </Head>
      {erro ? (
        <p className="ks-media__note"><Icon name="alert" size={14} /> O navegador não conseguiu ler esta fonte.</p>
      ) : (
        <div className="ks-font" style={style} aria-busy={!familia}>
          <div className="ks-font__hero" aria-hidden="true">Aa</div>
          <div className="ks-font__glyphs" aria-hidden="true">
            <span>ABCDEFGHIJKLMNOPQRSTUVWXYZ</span>
            <span>abcdefghijklmnopqrstuvwxyz</span>
            <span>0123456789 áéíóúãõç !?&@#%(){'{}'}[]</span>
          </div>
          <input className="ks-font__input" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto de amostra" spellCheck={false} style={style} />
          <div className="ks-font__sizes">
            {[12, 16, 24, 36, 56].map((px) => (
              <div key={px} className="ks-font__size">
                <span className="ks-font__px">{px}</span>
                <span style={{ fontSize: px }}>{texto || AMOSTRA}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Pacote ZIP ----------
export function ArchiveView({ path, bytes, mime, size }: { path: string; bytes?: Uint8Array; mime?: string; size: number }) {
  const zip = useMemo(() => (bytes ? lerZip(bytes) : null), [bytes]);
  const [q, setQ] = useState('');
  const lista = useMemo(() => (zip && 'entradas' in zip ? zip.entradas.filter((e) => !q || e.nome.toLowerCase().includes(q.toLowerCase())) : []), [zip, q]);
  const arquivos = zip && 'entradas' in zip ? zip.entradas.filter((e) => !e.pasta) : [];
  const total = arquivos.reduce((n, e) => n + e.tamanho, 0);
  return (
    <div className="ks-media">
      <Head icon="archive" path={path} size={size} extra={zip && 'entradas' in zip ? `${arquivos.length} arquivos · ${formatSize(total)} descompactado` : undefined}>
        <BaixarBtn path={path} bytes={bytes} mime={mime} />
      </Head>
      {!zip ? null : 'erro' in zip ? (
        <p className="ks-media__note"><Icon name="alert" size={14} /> {zip.erro}</p>
      ) : (
        <>
          <input className="ks-input ks-zip__filter" placeholder="Filtrar" aria-label="Filtrar arquivos do pacote" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="ks-zip" aria-label="Conteúdo do pacote">
            {lista.slice(0, 3000).map((e) => {
              const nivel = e.nome.replace(/\/$/, '').split('/').length - 1;
              return (
                <li key={e.nome} className="ks-zip__row" style={{ paddingLeft: `calc(${Math.min(nivel, 8)} * 16px + var(--space-3))` }}>
                  <Icon name={e.pasta ? 'folder' : 'file'} size={14} />
                  <span className="ks-zip__name">{e.nome.replace(/\/$/, '').split('/').pop()}</span>
                  {!e.pasta && <span className="ks-zip__size">{formatSize(e.tamanho)}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------- Binário: hexadecimal ----------
const LINHAS_HEX = 1024; // 16 KB

export function HexView({ path, bytes, size }: { path: string; bytes?: Uint8Array; size: number }) {
  const linhas = useMemo(() => {
    if (!bytes) return [];
    const out: { off: string; hex: string; asc: string }[] = [];
    const n = Math.min(bytes.length, LINHAS_HEX * 16);
    for (let o = 0; o < n; o += 16) {
      let hex = '';
      let asc = '';
      for (let k = 0; k < 16; k++) {
        const b = bytes[o + k];
        if (b === undefined) {
          hex += '   ';
          continue;
        }
        hex += b.toString(16).padStart(2, '0') + (k === 7 ? '  ' : ' ');
        asc += b >= 32 && b < 127 ? String.fromCharCode(b) : '·';
      }
      out.push({ off: o.toString(16).padStart(8, '0'), hex, asc });
    }
    return out;
  }, [bytes]);
  return (
    <div className="ks-media">
      <Head icon="binary" path={path} size={size} extra={bytes ? 'binário' : 'binário, grande demais para mostrar'}>
        <BaixarBtn path={path} bytes={bytes} />
      </Head>
      {bytes && (
        <div className="ks-hex" role="region" aria-label={`Bytes de ${nomeDe(path)} em hexadecimal`} tabIndex={0}>
          {linhas.map((l) => (
            <div key={l.off} className="ks-hex__row">
              <span className="ks-hex__off">{l.off}</span>
              <span className="ks-hex__bytes">{l.hex}</span>
              <span className="ks-hex__asc">{l.asc}</span>
            </div>
          ))}
          {bytes.length > LINHAS_HEX * 16 && <p className="ks-media__note">Primeiros 16 KB de {formatSize(bytes.length)}.</p>}
        </div>
      )}
    </div>
  );
}
