import { useLayoutEffect, useRef, useState } from 'react';
import { FileIcon } from '../icons/FileIcon';
import { baseName } from '../lib/lang';
import type { IconPack } from '../state/prefs';
import { Icon } from './Icon';

export type Tab = { path: string; preview: boolean; pinned: boolean };

export function Tabs({
  tabs,
  active,
  pack,
  onSelect,
  onClose,
  onPin,
  label = 'Arquivos abertos',
}: {
  tabs: Tab[];
  active: string | null;
  pack: IconPack;
  onSelect: (path: string, via: 'mouse' | 'kbd') => void;
  onClose: (path: string) => void;
  onPin: (path: string) => void;
  label?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number; instant: boolean } | null>(null);
  const via = useRef<'mouse' | 'kbd'>('mouse');

  // indicador: desliza 120 ms; pelo teclado troca sem movimento
  useLayoutEffect(() => {
    const el = boxRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el) return setInd(null);
    setInd({ x: el.offsetLeft, w: el.offsetWidth, instant: via.current === 'kbd' });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active, tabs.length]);

  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.path === active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      if (n) {
        via.current = 'kbd';
        onSelect(n.path, 'kbd');
        requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
      }
      e.preventDefault();
    } else if (e.key === 'Delete' && active) {
      onClose(active);
      e.preventDefault();
    }
  };

  return (
    <div ref={boxRef} className="ks-tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => {
        const closeLabel = t.pinned ? `Desafixar ${baseName(t.path)}` : `Fechar ${baseName(t.path)}`;
        return (
          <div
            key={t.path}
            className={`ks-tab${t.preview ? ' is-preview' : ''}${t.pinned ? ' is-pinned' : ''}`}
            role="tab"
            aria-selected={t.path === active}
            tabIndex={t.path === active ? 0 : -1}
            onClick={() => {
              via.current = 'mouse';
              onSelect(t.path, 'mouse');
            }}
            onDoubleClick={() => onPin(t.path)}
            onMouseDown={(e) => e.button === 1 && e.preventDefault()}
            onAuxClick={(e) => e.button === 1 && onClose(t.path)}
          >
            <FileIcon pack={pack} path={t.path} className="ks-tab__icon" />
            <span className="ks-tab__name" title={t.path}>{baseName(t.path)}</span>
            <button
              className="ks-tab__close"
              type="button"
              aria-label={closeLabel}
              data-tip={closeLabel}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                if (t.pinned) onPin(t.path);
                else onClose(t.path);
              }}
            >
              <Icon name={t.pinned ? 'pin' : 'x'} />
            </button>
          </div>
        );
      })}
      {ind && (
        <span
          className={`ks-tabs__ind${ind.instant ? ' is-instant' : ''}`}
          aria-hidden="true"
          style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}
        />
      )}
    </div>
  );
}

export function Breadcrumb({ path, onCrumb }: { path: string; onCrumb: (folder: string) => void }) {
  const parts = path.split('/');
  return (
    <nav className="ks-breadcrumb" aria-label="Caminho do arquivo">
      <ol>
        {parts.map((p, i) => {
          const last = i === parts.length - 1;
          const to = parts.slice(0, i + 1).join('/');
          return (
            <li key={to} style={{ display: 'contents' }}>
              {i > 0 && (
                <span className="sep" aria-hidden="true">
                  /
                </span>
              )}
              {last ? (
                <span aria-current="page" style={{ padding: '2px 4px' }}>
                  {p}
                </span>
              ) : (
                <button type="button" onClick={() => onCrumb(to)}>
                  {p}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
