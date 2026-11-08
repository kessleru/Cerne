import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Icon } from './Icon';

export type SelectOption = { value: string; label: string };

/** Lista suspensa no lugar do <select> nativo: botão com a cara do ks-select e lista com o ks-menu. */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = options.findIndex((o) => o.value === value);
  const [active, setActive] = useState(selected >= 0 ? selected : 0);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const openList = (start = selected >= 0 ? selected : 0) => {
    setActive(start);
    setOpen(true);
  };

  const close = useCallback((focus = true) => {
    setOpen(false);
    if (focus) button.current?.focus();
  }, []);

  const pick = useCallback(
    (i: number) => {
      const opt = options[i];
      if (!opt) return;
      onChange(opt.value);
      close();
    },
    [options, onChange, close],
  );

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const down = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onListKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        setActive(0);
        break;
      case 'End':
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        pick(active);
        break;
      case 'Escape':
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div ref={wrap} className="ks-selectbox">
      <button
        ref={button}
        type="button"
        className="ks-select ks-select__btn"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList(e.key === 'ArrowUp' ? Math.max(0, selected) : selected >= 0 ? selected : 0);
          }
        }}
      >
        <span className="ks-select__value">{options[selected]?.label ?? value}</span>
      </button>
      {open && (
        <div
          ref={list}
          id={id}
          className="ks-menu ks-select__list"
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${id}-${active}`}
          tabIndex={-1}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              id={`${id}-${i}`}
              type="button"
              role="option"
              aria-selected={o.value === value}
              data-active={i === active}
              className="ks-menu__item ks-select__opt"
              tabIndex={-1}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              <span className="ks-select__label">{o.label}</span>
              <Icon name="check" className="ks-menu__check" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
