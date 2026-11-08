import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { markScreenReady } from '../anim/motion';
import { formatLineHash } from '../lib/hash';
import { parseRepoLink, type RepoLink } from '../lib/route';
import { source } from '../data/source';
import { getToken, subscribeToken } from '../state/token';
import { Icon, type IconName } from './Icon';
import { Preferences } from './Preferences';
import { Kbd, Meter, Presence, Rings, ToastHost } from './parts';
import { Tooltip } from './Tooltip';
import type { Quota } from '../data/types';

const RECENT_KEY = 'cerne:recentes';

export function loadRecents(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}
export function saveRecent(slug: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([slug, ...loadRecents().filter((r) => r !== slug)].slice(0, 6)));
  } catch {
    /* sem localStorage */
  }
}

const INTRO_KEY = 'cerne:intro';
const introPlayed = () => {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return true;
  }
};

type Item = { id: string; label: string; value: string; icon: IconName; hint?: string };

const EXAMPLES: Item[] = [
  { id: 'ex1', label: 'kessleru/exemplo', value: 'github.com/kessleru/exemplo', icon: 'book', hint: 'repositório de demonstração' },
  { id: 'ex2', label: 'arquivo de 50 000 linhas', value: 'github.com/kessleru/exemplo/blob/main/src/generated/enorme.ts#L25000-L25004', icon: 'file', hint: 'src/generated/enorme.ts' },
  { id: 'ex3', label: 'tabela CSV', value: 'github.com/kessleru/exemplo/blob/main/data/cupons.csv', icon: 'file', hint: 'data/cupons.csv' },
];

/** Como o link foi entendido, em pedaços curtos. */
function reading(l: RepoLink): { k: string; v: string }[] {
  const out = [{ k: 'repositório', v: `${l.owner}/${l.repo}` }];
  out.push({ k: 'ramo', v: l.ref ?? 'main' });
  if (l.path) out.push({ k: 'arquivo', v: l.path });
  if (l.lines) out.push({ k: 'linhas', v: formatLineHash(l.lines).replace('#', '').replace(/L/g, '') });
  return out;
}

const tokenLabel = () => {
  const t = getToken();
  return t.value ? (t.remembered ? 'Token lembrado' : 'Token na sessão') : 'Sem token';
};

export function Entry({ onOpen }: { onOpen: (l: RepoLink) => void }) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [intro] = useState(() => !introPlayed());
  const [skipped, setSkipped] = useState(false);
  const [prefs, setPrefs] = useState<{ section?: string } | null>(null);
  const [quota, setQuota] = useState<Quota>(source.quota());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const token = useSyncExternalStore(subscribeToken, tokenLabel);

  const recents = useMemo(() => loadRecents(), []);
  const items: Item[] = useMemo(
    () => (recents.length ? recents.map((r, i) => ({ id: 'r' + i, label: r, value: r, icon: 'history' as const })) : EXAMPLES),
    [recents],
  );

  const link = useMemo(() => (value.trim() ? parseRepoLink(value) : null), [value]);
  const invalid = touched && value.trim() !== '' && !link;

  useEffect(() => source.subscribeQuota(setQuota), []);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* ignora */
    }
    markScreenReady();
    if (!intro) return;
    // qualquer tecla ou clique encerra o destaque
    const end = () => setSkipped(true);
    window.addEventListener('keydown', end, { once: true, capture: true });
    window.addEventListener('pointerdown', end, { once: true, capture: true });
    return () => {
      window.removeEventListener('keydown', end, true);
      window.removeEventListener('pointerdown', end, true);
    };
  }, [intro]);

  const submit = useCallback(
    (text: string) => {
      const l = parseRepoLink(text);
      if (!l) {
        setTouched(true);
        setValue(text);
        inputRef.current?.focus();
        return;
      }
      onOpen(l);
    },
    [onOpen],
  );

  // Ctrl K foca o campo; Alt+1..9 abre o item da lista
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.altKey && /^[1-9]$/.test(e.key)) {
        const it = items[Number(e.key) - 1];
        if (it) {
          e.preventDefault();
          submit(it.value);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [items, submit]);

  const buttons = () => [...(listRef.current?.querySelectorAll<HTMLButtonElement>('.ks-entry__item') ?? [])];

  const onFieldKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      buttons()[0]?.focus();
      e.preventDefault();
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = buttons();
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') list[Math.min(list.length - 1, i + 1)]?.focus();
    else if (e.key === 'ArrowUp') {
      if (i <= 0) inputRef.current?.focus();
      else list[i - 1]?.focus();
    } else if (/^[1-9]$/.test(e.key)) {
      const it = items[Number(e.key) - 1];
      if (!it) return;
      submit(it.value);
    } else return;
    e.preventDefault();
  };

  const read = link ? reading(link) : null;

  return (
    <main className={`ks-entry${intro && !skipped ? ' is-intro' : ''}`}>
      <Rings className="ks-entry__bg" />
      <div className="ks-entry__col">
        <div className="ks-entry__brand">
          <Rings className="ks-entry__logo" />
          <span>cerne</span>
        </div>

        <form
          className="ks-entry__box ks-entry__field"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            submit(value);
          }}
        >
          <Icon name="search" />
          <input
            ref={inputRef}
            className="ks-entry__input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(false);
            }}
            onKeyDown={onFieldKey}
            onBlur={() => setTouched(true)}
            placeholder="dono/repo ou link do GitHub"
            aria-label="Link ou nome do repositório"
            aria-describedby="entrada-leitura"
            aria-invalid={invalid || undefined}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          <button type="submit" className="ks-kbd ks-entry__enter" aria-label="Abrir repositório">Enter</button>
        </form>

        <p id="entrada-leitura" className={`ks-entry__read${invalid ? ' is-error' : ''}`} aria-live="polite">
          {invalid ? (
            <>
              <Icon name="alert" /> Não entendi esse link. Tente github.com/dono/repo ou dono/repo.
            </>
          ) : read ? (
            read.map((r) => (
              <span key={r.k} className="ks-entry__pill">
                <span className="ks-entry__pillk">{r.k}</span> {r.v}
              </span>
            ))
          ) : (
            <span className="ks-entry__hint">Cole um link ou escreva dono/repo.</span>
          )}
        </p>

        <div className="ks-entry__list" ref={listRef} onKeyDown={onListKey} role="group" aria-label={recents.length ? 'Repositórios recentes' : 'Exemplos'}>
          <p className="ks-entry__listhead">{recents.length ? 'Recentes' : 'Exemplos'}</p>
          {items.map((it, i) => (
            <button key={it.id} type="button" className="ks-entry__item" onClick={() => submit(it.value)}>
              <Icon name={it.icon} />
              <span className="ks-entry__itemname">{it.label}</span>
              {it.hint && <span className="ks-entry__itemhint">{it.hint}</span>}
              <Kbd>{i + 1}</Kbd>
            </button>
          ))}
        </div>
      </div>

      <footer className="ks-entry__footer">
        <div>
          <Meter quota={quota} />
          <button type="button" className="ks-entry__link" onClick={() => setPrefs({ section: 'token' })}>{token}</button>
          <button type="button" className="ks-entry__link" onClick={() => setPrefs({})}>Preferências</button>
        </div>
        <div className="ks-entry__keys">
          <span><Kbd>Ctrl</Kbd><Kbd>K</Kbd> campo</span>
          <span><Kbd>Alt</Kbd><Kbd>1</Kbd> abrir o primeiro</span>
        </div>
      </footer>

      <Presence open={!!prefs}>{prefs && <Preferences section={prefs.section} onClose={() => setPrefs(null)} />}</Presence>
      <ToastHost />
      <Tooltip />
    </main>
  );
}
