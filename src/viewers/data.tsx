import { createContext, memo, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { parseCsv } from '../lib/csv';
import { htmlParaMd, parseMarkdown, type Block, type Inline } from '../lib/markdown';
import { CodeBlock, shikiDaCerca } from './codeblock';
import { Icon } from '../components/Icon';

// ---------- CSV: DataTable (tabela densa, cabeçalho fixo) ----------
export function CsvView({ text, label }: { text: string; label: string }) {
  const rows = useMemo(() => parseCsv(text), [text]);
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const head = rows[0] ?? [];
  const body = useMemo(() => {
    const b = rows.slice(1);
    if (!sort) return b;
    const numeric = b.every((r) => r[sort.col] === '' || !Number.isNaN(Number(r[sort.col])));
    return [...b].sort((x, y) => {
      const a = x[sort.col] ?? '';
      const c = y[sort.col] ?? '';
      return sort.dir * (numeric ? Number(a) - Number(c) : a.localeCompare(c, 'pt-BR'));
    });
  }, [rows, sort]);
  return (
    <div className="ks-table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table className="ks-table">
        <thead>
          <tr>
            <th scope="col" className="ks-table__n">#</th>
            {head.map((h, i) => (
              <th key={i} scope="col" aria-sort={sort?.col === i ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => setSort((s) => (s?.col === i ? (s.dir === 1 ? { col: i, dir: -1 } : null) : { col: i, dir: 1 }))}>
                  {h}
                  {sort?.col === i && <Icon name="chevronDown" className={sort.dir === 1 ? '' : 'is-flip'} />}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              <td className="ks-table__n">{i + 1}</td>
              {head.map((_, c) => (
                <td key={c}>{r[c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ks-table__foot">{body.length.toLocaleString('pt-BR')} linhas, {head.length} colunas</p>
    </div>
  );
}

// ---------- JSON: JsonTree (JSON é só dado: JSON.parse, nunca eval) ----------
type J = null | boolean | number | string | J[] | { [k: string]: J };

function JNode({ k, v, depth, open0 }: { k?: string; v: J; depth: number; open0: boolean }) {
  const isObj = v !== null && typeof v === 'object';
  const [open, setOpen] = useState(open0);
  const entries: [string, J][] = isObj ? (Array.isArray(v) ? v.map((x, i): [string, J] => [String(i), x]) : Object.entries(v)) : [];
  const name = k !== undefined && <span className="ks-json__key">{Array.isArray(v) || typeof k !== 'string' ? k : `"${k}"`}</span>;
  if (!isObj) {
    const cls = v === null ? 'tok-comment' : typeof v === 'string' ? 'tok-string' : typeof v === 'number' ? 'tok-number' : 'tok-keyword';
    return (
      <div className="ks-tree__row ks-json__row" role="treeitem" aria-level={depth + 1} tabIndex={-1} style={{ paddingLeft: depth * 16 + 8 }}>
        <span className="ks-tree__spacer" />
        {name}
        {name && <span className="tok-punct">:</span>}
        <span className={cls}>{typeof v === 'string' ? JSON.stringify(v) : String(v)}</span>
      </div>
    );
  }
  const summary = Array.isArray(v) ? `[${entries.length}]` : `{${entries.length}}`;
  return (
    <>
      <div
        className="ks-tree__row ks-json__row"
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={open}
        tabIndex={-1}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setOpen(true);
          else if (e.key === 'ArrowLeft') setOpen(false);
          else if (e.key === 'Enter' || e.key === ' ') setOpen(!open);
          else return;
          e.preventDefault();
        }}
      >
        <Icon name="chevronRight" className="ks-tree__chev" />
        {name}
        {name && <span className="tok-punct">:</span>}
        <span className="tok-punct">{summary}</span>
      </div>
      {open && (
        <div role="group">
          {entries.map(([ck, cv]) => (
            <JNode key={ck} k={ck} v={cv} depth={depth + 1} open0={false} />
          ))}
        </div>
      )}
    </>
  );
}

export function JsonView({ text, label }: { text: string; label: string }) {
  const parsed = useMemo<{ ok: true; v: J } | { ok: false; error: string }>(() => {
    try {
      return { ok: true, v: JSON.parse(text) as J };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, [text]);
  if (!parsed.ok) return <p className="ks-panestate__text" role="alert">JSON inválido: {parsed.error}</p>;
  return (
    <div className="ks-json" role="tree" aria-label={label} onKeyDown={(e) => {
      const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=treeitem]')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') items[Math.min(items.length - 1, i + 1)]?.focus();
      else if (e.key === 'ArrowUp') items[Math.max(0, i - 1)]?.focus();
      else return;
      e.preventDefault();
    }}>
      <JNode v={parsed.v} depth={0} open0 />
    </div>
  );
}

// ---------- Imagem: SVG por data URL, raster por URL direta ou blob: (nunca inline) ----------
export function ImageView({ svg, src, blob, alt }: { svg?: string; src?: string; blob?: Blob; alt: string }) {
  const dataUrl = useMemo(() => (svg === undefined ? null : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`), [svg]);
  // imagem buscada com token: o blob: vive enquanto a aba (este visualizador) estiver aberta
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  const url = dataUrl ?? blobUrl ?? src;
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [real, setReal] = useState(false);
  return (
    <div className={`ks-imageview${real ? ' is-real' : ''}`}>
      <div className="ks-imageview__tools">
        {dim && <span className="ks-imageview__dim">{dim.w} × {dim.h}</span>}
        <button type="button" className="ks-icon-btn" aria-pressed={real} aria-label={real ? 'Ajustar à tela' : 'Tamanho real'} data-tip={real ? 'Ajustar à tela' : 'Tamanho real (100%)'} onClick={() => setReal((r) => !r)}>
          <Icon name="maximize" />
        </button>
      </div>
      <div className="ks-imageview__stage">
        {url ? <img src={url} alt={alt} onLoad={(e) => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} onClick={() => setReal((r) => !r)} /> : null}
      </div>
    </div>
  );
}

// ---------- Markdown: renderizado por React (nada de innerHTML) ----------
/** Onde o Markdown mora: resolve imagens e links relativos ao repositório. */
export type MdCtx = { owner: string; repo: string; ref: string; dir: string; onPath?: (path: string) => void; theme: string | null };
const Md = createContext<MdCtx | null>(null);
const RAW_BASE = 'https://raw.githubusercontent.com';

/** Junta pasta e caminho relativo (./, ../, /raiz). */
function juntar(dir: string, rel: string): string {
  const partes = rel.startsWith('/') ? [] : dir.split('/').filter(Boolean);
  for (const p of rel.replace(/^\//, '').split('/')) {
    if (p === '..') partes.pop();
    else if (p && p !== '.') partes.push(p);
  }
  return partes.join('/');
}

/** Imagem: do próprio repositório (relativa ou raw/blob do GitHub) vira raw; de fora (selos etc.) some. */
function srcDaImagem(src: string, c: MdCtx | null): string | null {
  if (/^https:\/\/raw\.githubusercontent\.com\//i.test(src)) return src;
  const gh = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:raw|blob)\/(.+)$/i.exec(src);
  if (gh) return `${RAW_BASE}/${gh[1]}/${gh[2]}/${gh[3]}`;
  if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(src) || !c) return null;
  return `${RAW_BASE}/${c.owner}/${c.repo}/${encodeURIComponent(c.ref)}/${juntar(c.dir, src.split(/[?#]/)[0]!)}`;
}

/** Link para arquivo do mesmo repositório: caminho dentro dele (abre no Cerne). */
function caminhoDoLink(href: string, c: MdCtx | null): string | null {
  if (!c || !c.onPath) return null;
  const gh = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/[^/]+\/(.+)$/i.exec(href);
  if (gh && gh[1]!.toLowerCase() === c.owner.toLowerCase() && gh[2]!.toLowerCase() === c.repo.toLowerCase()) return decodeURIComponent(gh[3]!.split(/[?#]/)[0]!);
  if (/^[a-z][a-z0-9+.-]*:|^\/\/|^#/i.test(href)) return null;
  return juntar(c.dir, decodeURIComponent(href.split(/[?#]/)[0]!));
}

function Img({ src, alt }: { src: string; alt: string }) {
  const c = useContext(Md);
  const [falhou, setFalhou] = useState(false);
  const url = srcDaImagem(src, c);
  if (!url || falhou) return null;
  return <img className="ks-prose__image" src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />;
}

function Inl({ nodes }: { nodes: Inline[] }): ReactNode {
  const c = useContext(Md);
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text': return <span key={i}>{n.v}</span>;
          case 'code': return <code key={i} className="ks-prose__code">{n.v}</code>;
          case 'strong': return <strong key={i}><Inl nodes={n.c} /></strong>;
          case 'em': return <em key={i}><Inl nodes={n.c} /></em>;
          case 'link': {
            if (!n.href) return <span key={i}><Inl nodes={n.c} /></span>;
            const interno = caminhoDoLink(n.href, c);
            if (interno && c?.onPath)
              return (
                <a key={i} href={n.href} onClick={(e) => { e.preventDefault(); c.onPath!(interno); }}>
                  <Inl nodes={n.c} />
                </a>
              );
            if (n.href.startsWith('#'))
              return (
                <a key={i} href={n.href} onClick={(e) => { e.preventDefault(); document.getElementById(n.href!.slice(1))?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}>
                  <Inl nodes={n.c} />
                </a>
              );
            return (
              <a key={i} href={n.href} {...(/^https?:/i.test(n.href) ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
                <Inl nodes={n.c} />
              </a>
            );
          }
          case 'image': return <Img key={i} src={n.src} alt={n.alt} />;
        }
      })}
    </>
  );
}

const Blocks = memo(function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'heading': {
            const H = `h${Math.min(6, b.level)}` as 'h1';
            return <H key={i} id={b.id}><Inl nodes={b.c} /></H>;
          }
          case 'para': return <p key={i}><Inl nodes={b.c} /></p>;
          case 'code': return <CodeBlockMd key={i} code={b.v} lang={b.lang} />;
          case 'quote': return <blockquote key={i}><Blocks blocks={b.c} /></blockquote>;
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul';
            return <L key={i}>{b.items.map((it, k) => <li key={k}><Inl nodes={it} /></li>)}</L>;
          }
          case 'table':
            return (
              <div key={i} className="ks-prose__tablewrap">
                <table className="ks-prose__table">
                  <thead><tr>{b.head.map((h, k) => <th key={k}><Inl nodes={h} /></th>)}</tr></thead>
                  <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}><Inl nodes={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          case 'hr': return <hr key={i} />;
        }
      })}
    </>
  );
});

function CodeBlockMd({ code, lang }: { code: string; lang: string }) {
  const c = useContext(Md);
  return <CodeBlock code={code} lang={shikiDaCerca(lang)} theme={c?.theme ?? null} className="ks-prose__pre" />;
}

export function MarkdownView({ text, ctx = null, className = '' }: { text: string; ctx?: MdCtx | null; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(htmlParaMd(text)), [text]);
  return (
    <Md.Provider value={ctx}>
      <article className={`ks-prose ks-markdown ${className}`.trim()} tabIndex={0}>
        <Blocks blocks={blocks} />
      </article>
    </Md.Provider>
  );
}
