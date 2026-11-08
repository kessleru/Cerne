import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { TreeEntry } from '../data/types';
import { FileIcon } from '../icons/FileIcon';
import { fuzzyMatch } from '../lib/fuzzy';
import { baseName } from '../lib/lang';
import type { IconPack } from '../state/prefs';
import { Icon } from './Icon';

type Node = { name: string; path: string; dir: boolean; size: number; children: Node[] };

export function buildTree(entries: TreeEntry[]): Node {
  const root: Node = { name: '', path: '', dir: true, size: 0, children: [] };
  for (const e of entries) {
    const parts = e.path.split('/');
    let cur = root;
    parts.forEach((name, i) => {
      const path = parts.slice(0, i + 1).join('/');
      const last = i === parts.length - 1;
      let next = cur.children.find((c) => c.name === name);
      if (!next) {
        next = { name, path, dir: !last, size: last ? e.size : 0, children: [] };
        cur.children.push(next);
      }
      cur = next;
    });
  }
  const sort = (n: Node) => {
    n.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name, 'pt-BR') : a.dir ? -1 : 1));
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

type Row = { node: Node; depth: number };

function flatten(node: Node, expanded: ReadonlySet<string>, keep: ReadonlySet<string> | null, depth = 0, out: Row[] = []): Row[] {
  for (const c of node.children) {
    if (keep && !keep.has(c.path)) continue;
    out.push({ node: c, depth });
    if (c.dir && expanded.has(c.path)) flatten(c, expanded, keep, depth + 1, out);
  }
  return out;
}

export function Tree({
  entries,
  active,
  pack,
  onOpen,
  filterRef,
  focusPath,
}: {
  entries: TreeEntry[];
  active: string | null;
  pack: IconPack;
  onOpen: (path: string, mode: 'preview' | 'pin') => void;
  filterRef?: React.RefObject<HTMLInputElement | null>;
  /** pasta/arquivo a revelar (breadcrumb, paleta) */
  focusPath?: { path: string; nonce: number } | null;
}) {
  const root = useMemo(() => buildTree(entries), [entries]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['src']));
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const input = useRef<'mouse' | 'kbd'>('mouse');

  // revela o arquivo ativo (abre as pastas pais)
  useEffect(() => {
    const target = focusPath?.path ?? active;
    if (!target) return;
    const parts = target.split('/');
    setExpanded((prev) => {
      const next = new Set(prev);
      for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join('/'));
      if (focusPath && entries.every((e) => e.path !== target)) next.add(target);
      return next;
    });
  }, [active, focusPath, entries]);

  // filtro: mostra os arquivos que combinam e as pastas que os contêm
  const keep = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    const s = new Set<string>();
    for (const e of entries) {
      if (fuzzyMatch(q, e.path)) {
        const parts = e.path.split('/');
        for (let i = 1; i <= parts.length; i++) s.add(parts.slice(0, i).join('/'));
      }
    }
    return s;
  }, [query, entries]);

  const rows = useMemo(() => {
    const exp = keep ? new Set([...keep]) : expanded;
    return flatten(root, exp, keep);
  }, [root, expanded, keep]);

  // abrir um arquivo rola até a linha dele; abrir ou fechar pasta não mexe na rolagem
  const scrolled = useRef<string | null>(null);
  useEffect(() => {
    if (!active) {
      scrolled.current = null;
      return;
    }
    if (scrolled.current === active) return;
    if (!rows.some((r) => r.node.path === active)) return;
    scrolled.current = active;
    requestAnimationFrame(() => {
      boxRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(active)}"]`)?.scrollIntoView({ block: 'nearest' });
    });
  }, [active, rows]);

  const toggle = (path: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      const want = open ?? !next.has(path);
      if (want) next.add(path);
      else next.delete(path);
      return next;
    });

  const tabbable = focus && rows.some((r) => r.node.path === focus) ? focus : active && rows.some((r) => r.node.path === active) ? active : rows[0]?.node.path;

  const move = (path: string | undefined) => {
    if (!path) return;
    setFocus(path);
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`)?.focus());
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    input.current = 'kbd';
    const idx = rows.findIndex((r) => r.node.path === tabbable);
    const row = rows[idx];
    if (!row) return;
    const n = row.node;
    switch (e.key) {
      case 'ArrowDown': move(rows[Math.min(rows.length - 1, idx + 1)]?.node.path); break;
      case 'ArrowUp': move(rows[Math.max(0, idx - 1)]?.node.path); break;
      case 'Home': move(rows[0]?.node.path); break;
      case 'End': move(rows[rows.length - 1]?.node.path); break;
      case 'ArrowRight':
        if (n.dir && !expanded.has(n.path)) toggle(n.path, true);
        else if (n.dir) move(rows[idx + 1]?.node.path);
        break;
      case 'ArrowLeft':
        if (n.dir && expanded.has(n.path)) toggle(n.path, false);
        else {
          const parent = n.path.includes('/') ? n.path.slice(0, n.path.lastIndexOf('/')) : undefined;
          move(parent);
        }
        break;
      case 'Enter':
      case ' ':
        if (n.dir) toggle(n.path);
        else onOpen(n.path, e.key === 'Enter' ? 'pin' : 'preview');
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <>
      <div className="ks-tree__filter">
        <input
          ref={filterRef}
          className="ks-input"
          placeholder="Filtrar arquivos"
          aria-label="Filtrar arquivos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              move(rows[0]?.node.path);
              e.preventDefault();
            } else if (e.key === 'Escape') setQuery('');
          }}
        />
      </div>
      <div
        ref={boxRef}
        className="ks-tree"
        role="tree"
        aria-label="Arquivos do repositório"
        data-input={input.current}
        onKeyDown={onKey}
        onPointerDown={() => (input.current = 'mouse')}
      >
        {rows.length === 0 && <p className="ks-tree__none">Nenhum arquivo combina.</p>}
        {renderRows(rows, { expanded, keep, active, tabbable, pack, toggle, onOpen, setFocus })}
      </div>
    </>
  );
}

type Ctx = {
  expanded: ReadonlySet<string>;
  keep: ReadonlySet<string> | null;
  active: string | null;
  tabbable: string | undefined;
  pack: IconPack;
  toggle: (p: string) => void;
  onOpen: (p: string, m: 'preview' | 'pin') => void;
  setFocus: (p: string) => void;
};

// As linhas vêm achatadas; a estrutura ARIA (linha + grupo) é refeita pela profundidade.
function renderRows(rows: Row[], c: Ctx) {
  const out: React.ReactNode[] = [];
  let i = 0;
  const walk = (depth: number): React.ReactNode[] => {
    const level: React.ReactNode[] = [];
    while (i < rows.length && rows[i]!.depth >= depth) {
      const { node, depth: d } = rows[i]!;
      if (d > depth) break;
      i++;
      const open = c.expanded.has(node.path) || !!c.keep;
      const selected = !node.dir && node.path === c.active;
      level.push(
        <Row key={node.path} node={node} depth={d} open={open} selected={selected} tabbable={node.path === c.tabbable} c={c} />,
      );
      if (node.dir && open) level.push(<div key={node.path + '/'} role="group">{walk(depth + 1)}</div>);
    }
    return level;
  };
  out.push(...walk(0));
  return out;
}

function Row({ node, depth, open, selected, tabbable, c }: { node: Node; depth: number; open: boolean; selected: boolean; tabbable: boolean; c: Ctx }) {
  const dim = baseName(node.path).startsWith('.');
  return (
    <div
      className={`ks-tree__row${dim ? ' is-dim' : ''}`}
      role="treeitem"
      data-path={node.path}
      aria-expanded={node.dir ? open : undefined}
      aria-selected={node.dir ? undefined : selected}
      aria-level={depth + 1}
      tabIndex={tabbable ? 0 : -1}
      onFocus={() => c.setFocus(node.path)}
      onClick={() => (node.dir ? c.toggle(node.path) : c.onOpen(node.path, 'preview'))}
      onDoubleClick={() => !node.dir && c.onOpen(node.path, 'pin')}
    >
      {Array.from({ length: depth }, (_, k) => (
        <span key={k} className="ks-tree__indent" />
      ))}
      {node.dir ? <Icon name="chevronRight" className="ks-tree__chev" /> : <span className="ks-tree__spacer" />}
      <FileIcon pack={c.pack} path={node.path} dir={node.dir} open={node.dir && open} className="ks-tree__icon" />
      <span className="ks-tree__name">{node.name}</span>
    </div>
  );
}
