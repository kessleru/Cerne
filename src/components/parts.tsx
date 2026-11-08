import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import type { Quota } from '../data/types';
import { CommitLoader } from './CommitLoader';
import { Icon } from './Icon';

// ---------- Kbd ----------
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="ks-kbd">{children}</kbd>;
}

// ---------- Meter (cota da API) ----------
export function Meter({ quota }: { quota: Quota }) {
  const p = quota.limit ? quota.remaining / quota.limit : 0;
  const low = p < 0.2;
  const reset = new Date(quota.resetAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <span className={`ks-meter${low ? ' is-low' : ''}`} title={`Volta às ${reset}`} role="status" aria-label={`Cota: ${quota.remaining} de ${quota.limit} chamadas`}>
      <Icon name="meter" />
      <span className="ks-meter__bar" style={{ marginLeft: 6 }}>
        <span style={{ '--value': `${Math.round(p * 100)}%`, '--p': p } as React.CSSProperties} />
      </span>
      <span style={{ marginLeft: 6 }}>
        {quota.remaining} / {quota.limit}
      </span>
    </span>
  );
}

// ---------- Splitter ----------
export function Splitter({ value, onChange, min = 180, max, label = 'Redimensionar painel' }: { value: number; onChange: (px: number) => void; min?: number; max: () => number; label?: string }) {
  const [drag, setDrag] = useState(false);
  const start = useRef<{ x: number; v: number } | null>(null);
  const clamp = useCallback((n: number) => Math.max(min, Math.min(max(), n)), [min, max]);

  // o ponteiro pode soltar fora da janela: sem isso o is-dragging ficaria aceso em repouso
  useEffect(() => {
    if (!drag) return;
    const end = () => {
      start.current = null;
      setDrag(false);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
    };
  }, [drag]);

  return (
    <div
      className={`ks-splitter${drag ? ' is-dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      tabIndex={0}
      onPointerDown={(e) => {
        // sem foco no clique: o :focus-visible acendia a linha ao arrastar com o mouse
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, v: value };
        setDrag(true);
      }}
      onPointerMove={(e) => {
        if (start.current) onChange(clamp(start.current.v + e.clientX - start.current.x));
      }}
      onPointerUp={() => {
        start.current = null;
        setDrag(false);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 48 : 16;
        if (e.key === 'ArrowLeft') onChange(clamp(value - step));
        else if (e.key === 'ArrowRight') onChange(clamp(value + step));
        else if (e.key === 'Home') onChange(min);
        else if (e.key === 'End') onChange(max());
        else return;
        e.preventDefault();
      }}
    />
  );
}

// ---------- Toast ----------
export type ToastItem = { id: number; text: string; error?: boolean; action?: { label: string; run: () => void } };
let toastId = 1;
const toastListeners = new Set<(t: ToastItem) => void>();
export function toast(text: string, opts: Partial<Omit<ToastItem, 'id' | 'text'>> = {}) {
  const t: ToastItem = { id: toastId++, text, ...opts };
  toastListeners.forEach((fn) => fn(t));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const fn = (t: ToastItem) => {
      setItems((prev) => [...prev.slice(-2), t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), t.error ? 6000 : 3500);
    };
    toastListeners.add(fn);
    return () => {
      toastListeners.delete(fn);
    };
  }, []);
  return (
    <div className="ks-toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`ks-toast${t.error ? ' ks-toast--error' : ''}`}>
          <Icon name={t.error ? 'alert' : 'check'} />
          <span>{t.text}</span>
          {t.action && (
            <button type="button" className="ks-toast__action" onClick={t.action.run}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- PaneState: vazio, erro, aviso, carregando, cota ----------
export type PaneStateKind = 'empty' | 'error' | 'warning' | 'loading' | 'quota';

export function Rings({ className = '' }: { className?: string }) {
  return (
    <svg className={`ks-rings ${className}`.trim()} viewBox="0 0 120 120" aria-hidden="true">
      <circle className="ks-ring" cx="60" cy="60" r="52" />
      <circle className="ks-ring" cx="60" cy="60" r="38" />
      <circle className="ks-ring" cx="60" cy="60" r="24" />
      <circle className="ks-ring-core" cx="60" cy="60" r="6" />
    </svg>
  );
}

export function PaneState({ kind, title, children, actions }: { kind: PaneStateKind; title: string; children?: ReactNode; actions?: ReactNode }) {
  if (kind === 'loading') {
    return (
      <div className="ks-panestate is-loading">
        <CommitLoader size="md" label={title} />
        <p className="ks-panestate__title">{title}</p>
      </div>
    );
  }
  return (
    <div className={`ks-panestate is-${kind}`} role={kind === 'error' || kind === 'quota' ? 'alert' : 'status'}>
      <div className="ks-panestate__body">
        {kind === 'empty' ? <Rings /> : <Icon name={kind === 'warning' ? 'file' : 'alert'} className="ks-panestate__icon" />}
        <p className="ks-panestate__title">{title}</p>
        {children && <div className="ks-panestate__text">{children}</div>}
        {actions && <div className="ks-panestate__actions">{actions}</div>}
      </div>
    </div>
  );
}

// ---------- Popover: abre ancorado, fecha com Esc ou clique fora ----------
export function useDismiss(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [ref, onClose, active]);
}

/** Mantém o Tab dentro de um diálogo. */
export function trapTab(e: ReactKeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return;
  const root = e.currentTarget;
  const f = [...root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
  if (!f.length) return;
  const first = f[0]!;
  const last = f[f.length - 1]!;
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
}

// ---------- Carregamento sem piscar ----------
/** O indicador só aparece depois de `delay` ms de espera e, se aparecer, fica pelo menos `min` ms. */
export function useLoadingGate(loading: boolean, delay = 150, min = 400): boolean {
  const [visible, setVisible] = useState(false);
  const since = useRef(0);
  useEffect(() => {
    if (loading) {
      if (visible) return;
      const t = setTimeout(() => {
        since.current = performance.now();
        setVisible(true);
      }, delay);
      return () => clearTimeout(t);
    }
    if (!visible) return;
    const left = Math.max(0, min - (performance.now() - since.current));
    const t = setTimeout(() => setVisible(false), left);
    return () => clearTimeout(t);
  }, [loading, visible, delay, min]);
  return visible;
}

// ---------- Camadas: nascem do gatilho e saem mais rápido do que entram ----------
/** Mantém o filho montado por `exitMs` depois de fechar, para a saída (100 ms) poder animar. */
export function Presence({ open, children, exitMs = 100 }: { open: boolean; children: ReactNode; exitMs?: number }) {
  const [mounted, setMounted] = useState(open);
  const last = useRef<ReactNode>(children);
  if (open) last.current = children;
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  if (!open && !mounted) return null;
  return (
    <div className="ks-layer" data-state={open ? 'open' : 'closed'}>
      {open ? children : last.current}
    </div>
  );
}

/** Define de onde a camada nasce (transform-origin) a partir do ponto do gatilho, antes de pintar. */
export function useOrigin(ref: RefObject<HTMLElement | null>, origin: { x: number; y: number } | null | undefined) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!origin) {
      el.style.removeProperty('--ox');
      el.style.removeProperty('--oy');
      return;
    }
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ox', `${Math.max(0, Math.min(r.width, origin.x - r.left))}px`);
    el.style.setProperty('--oy', `${Math.max(0, Math.min(r.height, origin.y - r.top))}px`);
  }, [ref, origin]);
}
