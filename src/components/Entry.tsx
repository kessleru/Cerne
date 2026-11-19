import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { markScreenReady } from '../anim/motion';
import { formatLineHash } from '../lib/hash';
import { parseRepoLink, type RepoLink } from '../lib/route';
import { source } from '../data/source';
import { Account } from './Account';
import { AccountButton } from './Avatar';
import { ThemeToggle } from './ThemeToggle';
import { Explore } from './Explore';
import { Marquee } from './Showcase';
import { Icon, type IconName } from './Icon';
import { Preferences } from './Preferences';
import { Kbd, Meter, Presence, Rings, ToastHost } from './parts';
import { Tooltip } from './Tooltip';
import type { Quota } from '../data/types';
import { useConta, useRepos } from '../state/account';
import { relativo } from '../lib/tempo';

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

type Item = { id: string; label: string; value: string; icon: IconName; hint?: string; tag?: string };

const EXAMPLES: Item[] = [
  { id: 'ex1', label: 'kessleru/exemplo', value: 'github.com/kessleru/exemplo', icon: 'book' },
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

export function Entry({ onOpen }: { onOpen: (l: RepoLink) => void }) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [intro] = useState(() => !introPlayed());
  const [skipped, setSkipped] = useState(false);
  const [prefs, setPrefs] = useState<{ section?: string } | null>(null);
  const [account, setAccount] = useState<{ x: number; y: number } | null | false>(false);
  const [quota, setQuota] = useState<Quota>(source.quota());
  const conta = useConta();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const recents = useMemo(() => loadRecents(), []);
  const repos = useRepos(conta.status === 'ok');
  const recentItems: Item[] = useMemo(() => recents.map((r, i) => ({ id: 'r' + i, label: r, value: r, icon: 'history' as const })), [recents]);
  const repoItems: Item[] = useMemo(
    () =>
      conta.status === 'ok'
        ? repos.lista.slice(0, 5).map((r) => ({ id: 'g' + r.nome, label: r.nome, value: r.nome, icon: r.privado ? ('lock' as const) : ('book' as const), hint: r.atualizado ? relativo(r.atualizado) : undefined, tag: r.privado ? 'privado' : undefined }))
        : [],
    [conta.status, repos.lista],
  );
  // ordem dos atalhos Alt+1..9: recentes, seus repositórios, exemplos
  const items: Item[] = useMemo(() => [...recentItems, ...repoItems, ...(recentItems.length ? [] : EXAMPLES)], [recentItems, repoItems]);
  const numero = (id: string) => items.findIndex((x) => x.id === id) + 1;

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

  const openAccount = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (!e || e.detail === 0) return setAccount(null);
    const r = e.currentTarget.getBoundingClientRect();
    setAccount({ x: r.left + r.width / 2, y: r.bottom });
  };

  const row = (it: Item) => {
    const n = numero(it.id);
    return (
      <button key={it.id} type="button" className="ks-entry__item" onClick={() => submit(it.value)}>
        <Icon name={it.icon} />
        <span className="ks-entry__itemname">{it.label}</span>
        {it.tag && <span className="ks-home__tag">{it.tag}</span>}
        {it.hint && <span className="ks-entry__itemhint">{it.hint}</span>}
        {n > 0 && n < 10 && <span className="ks-home__num"><Kbd>Alt</Kbd><Kbd>{n}</Kbd></span>}
      </button>
    );
  };

  const cards: { id: string; title: string; items: Item[]; action?: React.ReactNode; empty?: React.ReactNode }[] = [];
  if (recentItems.length) cards.push({ id: 'recentes', title: 'Recentes', items: recentItems });
  if (conta.status === 'ok')
    cards.push({
      id: 'seus',
      title: 'Seus repositórios',
      items: repoItems,
      action: <button type="button" className="ks-home__more" onClick={(e) => openAccount(e)}>Ver todos <Icon name="arrowRight" size={12} /></button>,
      empty: repos.status === 'carregando' || repos.status === 'ocioso' ? <span className="ks-home__loading">Carregando…</span> : repos.status === 'erro' ? <span className="ks-home__loading">Não deu para ler agora.</span> : <span className="ks-home__loading">Nenhum repositório neste token.</span>,
    });
  if (!recentItems.length) cards.push({ id: 'exemplos', title: 'Experimente', items: EXAMPLES });

  return (
    <main className={`ks-entry ks-home${intro && !skipped ? ' is-intro' : ''}`}>
      <header className="ks-home__nav">
        <span className="ks-home__brand">
          <Rings className="ks-entry__logo" />
          <span>cerne</span>
        </span>
        <div className="ks-home__navright">
          <ThemeToggle />
          <button type="button" className="ks-icon-btn" aria-label="Preferências" data-tip="Preferências" onClick={() => setPrefs({})}><Icon name="settings" /></button>
          <AccountButton onClick={openAccount} />
        </div>
      </header>

      <div className="ks-home__body">
        <section className="ks-home__hero" aria-labelledby="home-titulo">
          <h1 id="home-titulo" className="ks-home__title">Leia qualquer repositório{' '}<br />como no seu editor.</h1>
          <p className="ks-home__lead">Cole um link do GitHub. Sem instalar nada.</p>

          <form
            className="ks-entry__box ks-entry__field ks-home__field"
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
              placeholder="github.com/dono/repo ou dono/repo"
              aria-label="Link ou nome do repositório"
              aria-describedby="entrada-leitura"
              aria-invalid={invalid || undefined}
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            <button type="submit" className="key key--accent ks-home__go" aria-label="Abrir repositório" disabled={!value.trim()}>
              Abrir <Icon name="arrowRight" size={14} />
            </button>
          </form>

          <p id="entrada-leitura" className={`ks-entry__read ks-home__read${invalid ? ' is-error' : ''}`} aria-live="polite">
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
              <span className="ks-entry__hint" />
            )}
          </p>
        </section>

        <Marquee onOpen={(slug) => submit(slug)} />
        <Explore
          onOpen={onOpen}
          padrao={recentItems.length || conta.status === 'ok' ? 'voce' : 'estudar'}
          paraVoce={
          <div className={`ks-home__cards${cards.length > 1 ? ' is-two' : ''}`} ref={listRef} onKeyDown={onListKey}>
            {cards.map((c) => (
              <section key={c.id} className="ks-home__card" aria-labelledby={`home-${c.id}`}>
                <div className="ks-home__cardhead">
                  <h2 id={`home-${c.id}`}>{c.title}</h2>
                  {c.action}
                </div>
                <div className="ks-home__cardlist" role="group" aria-labelledby={`home-${c.id}`}>
                  {c.items.length ? c.items.map(row) : c.empty}
                </div>
              </section>
            ))}
          </div>
          }
        />
      </div>

      {/* rodapé só quando há algo a dizer: cota baixa ou token vencido */}
      {(quota.limit > 0 && quota.remaining / quota.limit < 0.2) || conta.status === 'invalido' ? (
        <footer className="ks-entry__footer ks-home__footer">
          <div>
            <Meter quota={quota} />
            {conta.status === 'invalido' ? (
              <button type="button" className="ks-entry__tokenhint" onClick={() => setAccount(null)}>
                <Icon name="alert" size={14} /> Token expirado. <b>Trocar</b>
              </button>
            ) : conta.status === 'anonimo' ? (
              <button type="button" className="ks-entry__tokenhint" onClick={() => setAccount(null)}>
                <b>Entrar para ter 5 000/h</b>
              </button>
            ) : null}
          </div>
        </footer>
      ) : null}

      <Presence open={!!prefs}>{prefs && <Preferences section={prefs.section} onClose={() => setPrefs(null)} onAccount={() => { setPrefs(null); setAccount(null); }} />}</Presence>
      <Presence open={account !== false}>{account !== false && <Account origin={account} onClose={() => setAccount(false)} onOpenRepo={(slug) => submit(slug)} />}</Presence>
      <ToastHost />
      <Tooltip />
    </main>
  );
}
