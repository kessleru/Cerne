import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { fuzzyFilter, fuzzyMatch } from '../lib/fuzzy';
import { Icon } from './Icon';
import { Kbd, trapTab } from './parts';

export type Command = { id: string; group: string; label: string; keys?: string[]; run: () => void };
export type PaletteOpen = { initial: string; origin: { x: number; y: number } | null };

function Marked({ text, positions }: { text: string; positions: number[] }) {
  if (!positions.length) return <>{text}</>;
  const set = new Set(positions);
  const out: React.ReactNode[] = [];
  let buf = '';
  let inMark = false;
  const flush = (key: number) => {
    if (!buf) return;
    out.push(inMark ? <mark key={key}>{buf}</mark> : <span key={key}>{buf}</span>);
    buf = '';
  };
  [...text].forEach((ch, i) => {
    const m = set.has(i);
    if (m !== inMark) {
      flush(i);
      inMark = m;
    }
    buf += ch;
  });
  flush(text.length);
  return <>{out}</>;
}

type Item =
  | { kind: 'file'; key: string; label: string; positions: number[]; run: () => void }
  | { kind: 'cmd'; key: string; label: string; positions: number[]; group: string; keys?: string[]; run: () => void }
  | { kind: 'line'; key: string; label: string; positions: number[]; run: () => void };

export function CommandPalette({
  open,
  files,
  commands,
  lineCount,
  onOpenFile,
  onGoToLine,
  onClose,
}: {
  open: PaletteOpen;
  files: string[];
  commands: Command[];
  lineCount: number | null;
  onOpenFile: (path: string) => void;
  onGoToLine: (line: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(open.initial);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(q.length, q.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items: { group: string; item: Item }[] = useMemo(() => {
    const out: { group: string; item: Item }[] = [];
    if (q.startsWith(':')) {
      const n = parseInt(q.slice(1), 10);
      const ok = Number.isFinite(n) && n >= 1 && (lineCount === null || n <= lineCount);
      out.push({
        group: 'Ir para a linha',
        item: {
          kind: 'line',
          key: 'goto',
          positions: [],
          label: ok ? `Ir para a linha ${n}${lineCount ? ` de ${lineCount.toLocaleString('pt-BR')}` : ''}` : lineCount ? `Digite um número de 1 a ${lineCount.toLocaleString('pt-BR')}` : 'Abra um arquivo de texto',
          run: () => ok && onGoToLine(n),
        },
      });
      return out;
    }
    const cmdOnly = q.startsWith('>');
    const query = cmdOnly ? q.slice(1).trim() : q.trim();
    if (!cmdOnly && query) {
      for (const r of fuzzyFilter(files, query, (f) => f, 8))
        out.push({ group: 'Arquivos', item: { kind: 'file', key: 'f:' + r.item, label: r.item, positions: r.positions, run: () => onOpenFile(r.item) } });
    }
    const cmds = query
      ? commands
          .map((c) => ({ c, m: fuzzyMatch(query, c.label) }))
          .filter((x) => x.m)
          .sort((a, b) => b.m!.score - a.m!.score)
          .slice(0, 12)
      : commands.slice(0, 14).map((c) => ({ c, m: { score: 0, positions: [] as number[] } }));
    for (const { c, m } of cmds) out.push({ group: 'Comandos', item: { kind: 'cmd', key: c.id, label: c.label, positions: m!.positions, group: c.group, keys: c.keys, run: c.run } });
    return out;
  }, [q, files, commands, lineCount, onOpenFile, onGoToLine]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel, items]);

  const run = (i: number) => {
    const it = items[i]?.item;
    if (!it) return;
    onClose();
    it.run();
  };

  const style = open.origin ? ({ '--ox': `${open.origin.x}px`, '--oy': `${open.origin.y}px` } as CSSProperties) : undefined;
  let lastGroup = '';

  return (
    <div className="ks-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`ks-palette${open.origin ? ' from-button' : ''}`}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onKeyDown={(e) => {
          trapTab(e);
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="ks-palette__input">
          <Icon name="search" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-lista"
            aria-activedescendant={items[sel] ? `pal-${sel}` : undefined}
            aria-label="Buscar arquivo ou comando"
            placeholder="Buscar arquivo, comando (>) ou linha (:)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                setSel((s) => Math.min(items.length - 1, s + 1));
                e.preventDefault();
              } else if (e.key === 'ArrowUp') {
                setSel((s) => Math.max(0, s - 1));
                e.preventDefault();
              } else if (e.key === 'Enter') {
                run(sel);
                e.preventDefault();
              }
            }}
          />
        </div>
        <ul ref={listRef} id="paleta-lista" className="ks-palette__list" role="listbox">
          {items.length === 0 && <li className="ks-palette__group">Nada encontrado</li>}
          {items.map(({ group, item }, i) => {
            const head = group !== lastGroup ? ((lastGroup = group), <li key={'g' + i} className="ks-palette__group" role="presentation">{group}</li>) : null;
            return (
              <li key={item.key} style={{ display: 'contents' }}>
                {head}
                <div
                  id={`pal-${i}`}
                  className="ks-palette__item"
                  role="option"
                  aria-selected={i === sel}
                  onMouseMove={() => setSel(i)}
                  onClick={() => run(i)}
                >
                  <span>
                    <Marked text={item.label} positions={item.positions} />
                  </span>
                  {item.kind === 'cmd' && item.keys && (
                    <span className="ks-palette__hint">
                      {item.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="ks-palette__foot">
          <span><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
          <span><Kbd>Enter</Kbd> abrir</span>
          <span><Kbd>Esc</Kbd> fechar</span>
          <span><Kbd>&gt;</Kbd> comandos</span>
          <span><Kbd>:</Kbd> linha</span>
        </div>
      </div>
    </div>
  );
}
