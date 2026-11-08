import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import type { FindMatch } from '../code/CodeView';
import type { Ref } from '../data/types';
import { Icon } from './Icon';
import { Kbd, trapTab, useDismiss } from './parts';

// ---------- FindBar: busca dentro do arquivo aberto ----------
export const FindBar = forwardRef<
  HTMLInputElement,
  { lines: string[]; onChange: (f: { matches: FindMatch[]; current: number } | null) => void; onJump: (line: number) => void; onClose: () => void }
>(function FindBar({ lines, onChange, onJump, onClose }, ref) {
  const [q, setQ] = useState('');
  const [cs, setCs] = useState(false);
  const [idx, setIdx] = useState(0);

  const matches = useMemo(() => {
    const out: FindMatch[] = [];
    if (!q) return out;
    const needle = cs ? q : q.toLowerCase();
    for (let i = 0; i < lines.length && out.length < 5000; i++) {
      const hay = cs ? lines[i]! : lines[i]!.toLowerCase();
      let at = hay.indexOf(needle);
      while (at >= 0 && out.length < 5000) {
        out.push({ line: i, start: at, end: at + needle.length });
        at = hay.indexOf(needle, at + needle.length);
      }
    }
    return out;
  }, [q, cs, lines]);

  const current = matches.length ? Math.min(idx, matches.length - 1) : 0;
  useEffect(() => {
    onChange(q ? { matches, current } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, current, q]);
  useEffect(() => () => onChange(null), [onChange]);

  const go = (to: number) => {
    if (!matches.length) return;
    const n = (to + matches.length) % matches.length;
    setIdx(n);
    onJump(matches[n]!.line + 1);
  };
  const cur = matches[current];
  const snippet = cur ? lines[cur.line]!.trim().slice(0, 80) : '';

  return (
    <div className="ks-findbar" role="search" aria-label="Buscar no arquivo">
      <div className="ks-findbar__row">
        <Icon name="search" />
        <input
          ref={ref}
          className="ks-input"
          value={q}
          placeholder="Buscar no arquivo"
          aria-label="Buscar no arquivo"
          onChange={(e) => {
            setQ(e.target.value);
            setIdx(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              go(current + (e.shiftKey ? -1 : 1));
              e.preventDefault();
            } else if (e.key === 'Escape') {
              onClose();
              e.stopPropagation();
            }
          }}
        />
        <span className="ks-findbar__count" aria-live="polite">
          {q ? (matches.length ? `${current + 1} de ${matches.length}${matches.length >= 5000 ? '+' : ''}` : 'sem resultados') : ''}
        </span>
        <button type="button" className="ks-findbar__opt" aria-pressed={cs} onClick={() => setCs(!cs)} title="Diferenciar maiúsculas">
          Aa
        </button>
        <button type="button" className="ks-icon-btn" aria-label="Resultado anterior" onClick={() => go(current - 1)}>
          <Icon name="chevronDown" className="is-flip" />
        </button>
        <button type="button" className="ks-icon-btn" aria-label="Próximo resultado" onClick={() => go(current + 1)}>
          <Icon name="chevronDown" />
        </button>
        <button type="button" className="ks-icon-btn" aria-label="Fechar busca" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      {cur && (
        <div className="ks-findbar__snippet" aria-hidden="true">
          <span>L{cur.line + 1}</span> {snippet}
        </div>
      )}
    </div>
  );
});

// ---------- RefPicker: ramo, tag ou commit ----------
export function RefPicker({ refs, commits, current, onPick, onClose }: { refs: Ref[]; commits: { sha: string; message: string }[]; current: string; onPick: (name: string) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  useDismiss(box, onClose);
  useEffect(() => box.current?.querySelector('input')?.focus(), []);
  const f = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  const branches = refs.filter((r) => r.kind === 'branch' && f(r.name));
  const tags = refs.filter((r) => r.kind === 'tag' && f(r.name));
  const cm = commits.filter((c) => f(c.message) || f(c.sha)).slice(0, 6);
  const Item = ({ name, label, icon, meta }: { name: string; label: string; icon: 'branch' | 'tag' | 'commit'; meta?: string }) => (
    <button type="button" role="menuitemradio" aria-checked={current === name} className="ks-menu__item" onClick={() => { onPick(name); onClose(); }}>
      <Icon name={icon} />
      <span className="ks-refpicker__name">{label}</span>
      {meta && <span className="ks-refpicker__meta">{meta}</span>}
      <Icon name="check" className="ks-menu__check" />
    </button>
  );
  return (
    <div
      ref={box}
      className="ks-menu ks-refpicker"
      role="menu"
      aria-label="Trocar ramo, tag ou commit"
      onKeyDown={(e) => {
        trapTab(e);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const items = [...e.currentTarget.querySelectorAll<HTMLElement>('input, [role=menuitemradio]')];
          const i = items.indexOf(document.activeElement as HTMLElement);
          items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
          e.preventDefault();
        }
      }}
    >
      <div className="ks-refpicker__search">
        <input className="ks-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar ramos, tags e commits" aria-label="Filtrar ramos, tags e commits" />
      </div>
      {branches.length > 0 && <div className="ks-menu__label">Ramos</div>}
      {branches.map((r) => <Item key={r.name} name={r.name} label={r.name} icon="branch" meta={r.sha.slice(0, 7)} />)}
      {tags.length > 0 && <div className="ks-menu__sep" role="separator" />}
      {tags.length > 0 && <div className="ks-menu__label">Tags</div>}
      {tags.map((r) => <Item key={r.name} name={r.name} label={r.name} icon="tag" meta={r.sha.slice(0, 7)} />)}
      {cm.length > 0 && <div className="ks-menu__sep" role="separator" />}
      {cm.length > 0 && <div className="ks-menu__label">Commits</div>}
      {cm.map((c) => <Item key={c.sha} name={c.sha.slice(0, 7)} label={c.message} icon="commit" meta={c.sha.slice(0, 7)} />)}
      {!branches.length && !tags.length && !cm.length && <div className="ks-menu__label">Nada encontrado</div>}
      <div className="ks-menu__label ks-refpicker__hint"><Kbd>Esc</Kbd> fecha</div>
    </div>
  );
}
