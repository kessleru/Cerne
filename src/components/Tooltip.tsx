import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Kbd } from './parts';

type Tip = { text: string; key?: string; x: number; top: number; bottom: number };

const MARGIN = 8;
const GAP = 6;

/** Dica única do app: lê [data-tip] (e [data-tip-key]) e segue o ponteiro ou o foco. */
export function Tooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const shown = useRef<HTMLElement | null>(null);
  const lit = useRef(false);
  const hiddenAt = useRef(0);

  useEffect(() => {
    const tipOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null;

    const clearTimer = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    };

    const hide = () => {
      clearTimer();
      shown.current = null;
      // a janela de 300 ms vale só depois que uma dica apareceu de fato
      if (lit.current) hiddenAt.current = performance.now();
      lit.current = false;
      setTip(null);
    };

    const show = (el: HTMLElement) => {
      const text = el.dataset.tip;
      if (!text) return;
      const r = el.getBoundingClientRect();
      shown.current = el;
      lit.current = true;
      setTip({ text, key: el.dataset.tipKey, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
    };

    const onOver = (e: PointerEvent) => {
      const el = tipOf(e.target);
      if (!el || el === shown.current) return;
      clearTimer();
      if (performance.now() - hiddenAt.current < 300) show(el);
      else {
        setTip(null);
        shown.current = el;
        timer.current = window.setTimeout(() => show(el), 400);
      }
    };

    const onOut = (e: PointerEvent) => {
      const el = tipOf(e.target);
      if (!el || el !== shown.current) return;
      if (tipOf(e.relatedTarget) === el) return;
      hide();
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = tipOf(e.target);
      if (!el || !el.matches(':focus-visible')) return;
      clearTimer();
      show(el);
    };

    const onFocusOut = (e: FocusEvent) => {
      const el = tipOf(e.target);
      if (el && el === shown.current) hide();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      clearTimer();
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !tip) return;
    const half = el.offsetWidth / 2;
    const x = Math.min(Math.max(tip.x, MARGIN + half), Math.max(MARGIN + half, innerWidth - MARGIN - half));
    let y = tip.bottom + GAP;
    if (y + el.offsetHeight > innerHeight - MARGIN) y = tip.top - GAP - el.offsetHeight;
    y = Math.min(Math.max(y, MARGIN), Math.max(MARGIN, innerHeight - MARGIN - el.offsetHeight));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      key={`${tip.text}|${Math.round(tip.x)}`}
      ref={box}
      className="ks-tooltip ks-tooltip--float"
      role="tooltip"
      style={{ left: tip.x, top: tip.bottom + GAP }}
    >
      <span>{tip.text}</span>
      {tip.key && <Kbd>{tip.key}</Kbd>}
    </div>
  );
}
