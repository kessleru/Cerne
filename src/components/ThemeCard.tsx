import { useEffect, useRef, useState } from 'react';
import { fetchPreview } from '../code/client';
import type { ThemeData, Tok } from '../code/protocol';
import { previewColors } from '../lib/themeVars';
import { registerImportedThemes } from '../state/themes';
import { Icon } from './Icon';

/** Quatro linhas de exemplo, coloridas pelo mesmo Shiki do CodeView. */
export const SAMPLE = ['const oi = "olá";', 'function dizer(n) {', '  return oi + n;', '}'].join(String.fromCharCode(10));

type Preview = { data: ThemeData | null; lines: Tok[][] };
const cache = new Map<string, Preview>();
const pending = new Map<string, Promise<Preview>>();

function load(id: string | null): Promise<Preview> {
  const key = id ?? '';
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = registerImportedThemes()
      .then(() => fetchPreview(id, 'javascript', SAMPLE))
      .then((r) => {
        cache.set(key, r);
        return r;
      });
    pending.set(key, p);
  }
  return p;
}

/** Cartão de um tema: cores reais, trecho de 4 linhas, linha numerada e barra lateral do tema. Carrega só quando fica visível. */
export function ThemeCard({
  id,
  label,
  dark,
  selected,
  onPick,
  onRemove,
}: {
  /** null = igual à interface */
  id: string | null;
  label: string;
  dark?: boolean;
  selected: boolean;
  onPick: () => void;
  onRemove?: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [pv, setPv] = useState<Preview | null>(() => cache.get(id ?? '') ?? null);

  useEffect(() => {
    if (pv) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        void load(id).then(setPv);
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, pv]);

  const colors = pv?.data ? previewColors(pv.data) : null;
  const system = id === null;

  return (
    <li ref={ref} className="ks-themecard-wrap">
      <button type="button" className="ks-themecard" aria-pressed={selected} onClick={onPick}>
        <span
          className={`ks-themecard__preview${system ? ' is-system' : ''}`}
          style={colors ? { background: colors.bg, color: colors.fg } : undefined}
          data-ready={pv ? 'true' : 'false'}
        >
          <span className="ks-themecard__side" style={colors ? { background: colors.side } : undefined} aria-hidden="true" />
          <span className="ks-themecard__code">
            {(pv?.lines ?? SAMPLE.split(String.fromCharCode(10)).map((t): Tok[] => [{ t }])).map((line, i) => (
              <span key={i} className="ks-themecard__line" style={colors && i === 1 ? { background: colors.line } : undefined}>
                <span className="ks-themecard__no" style={colors ? { color: colors.gutter } : undefined}>{i + 1}</span>
                <span>
                  {line.map((t, k) => (
                    <span key={k} className={t.c} style={t.k || t.f ? { color: t.k, fontStyle: t.f && t.f & 1 ? 'italic' : undefined, fontWeight: t.f && t.f & 2 ? 700 : undefined } : undefined}>
                      {t.t}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </span>
        </span>
        <span className="ks-themecard__name">
          {label}
          {dark !== undefined && <span className="ks-themecard__kind">{dark ? 'escuro' : 'claro'}</span>}
        </span>
      </button>
      {onRemove && (
        <button type="button" className="ks-icon-btn ks-themecard__remove" aria-label={`Remover o tema ${label}`} data-tip="Remover tema importado" onClick={onRemove}>
          <Icon name="x" />
        </button>
      )}
    </li>
  );
}
