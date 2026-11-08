import { memo, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { parseCsv } from '../lib/csv';
import { parseMarkdown, type Block, type Inline } from '../lib/markdown';
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
  return (
    <div className="ks-imageview">
      <div className="ks-imageview__stage">
        {url ? <img src={url} alt={alt} /> : null}
      </div>
    </div>
  );
}

// ---------- Markdown: renderizado por React (nada de innerHTML) ----------
function Inl({ nodes }: { nodes: Inline[] }): ReactNode {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text': return <span key={i}>{n.v}</span>;
          case 'code': return <code key={i} className="ks-prose__code">{n.v}</code>;
          case 'strong': return <strong key={i}><Inl nodes={n.c} /></strong>;
          case 'em': return <em key={i}><Inl nodes={n.c} /></em>;
          case 'link':
            return n.href ? (
              <a key={i} href={n.href} {...(/^https?:/i.test(n.href) ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
                <Inl nodes={n.c} />
              </a>
            ) : (
              <span key={i}><Inl nodes={n.c} /></span>
            );
          case 'image': return <span key={i} className="ks-prose__img">[imagem: {n.alt || n.src}]</span>;
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
          case 'code': return <pre key={i} className="ks-prose__pre"><code>{b.v}</code></pre>;
          case 'quote': return <blockquote key={i}><Blocks blocks={b.c} /></blockquote>;
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul';
            return <L key={i}>{b.items.map((it, k) => <li key={k}><Inl nodes={it} /></li>)}</L>;
          }
          case 'table':
            return (
              <table key={i} className="ks-prose__table">
                <thead><tr>{b.head.map((h, k) => <th key={k}><Inl nodes={h} /></th>)}</tr></thead>
                <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}><Inl nodes={c} /></td>)}</tr>)}</tbody>
              </table>
            );
          case 'hr': return <hr key={i} />;
        }
      })}
    </>
  );
});

export function MarkdownView({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <article className="ks-prose ks-markdown" tabIndex={0}>
      <Blocks blocks={blocks} />
    </article>
  );
}
