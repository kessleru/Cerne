import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIAS, FAMOSOS, extDaLinguagem, useEstudo, type Entrada, type Trilha } from '../data/catalogo';
import { FileIcon } from '../icons/FileIcon';
import type { RepoLink } from '../lib/route';
import { lerAvatar } from '../data/github/conta';
import { getToken } from '../state/token';
import { usePrefs } from '../state/prefs';
import { estudados } from '../state/estudo';
import { Icon, type IconName } from './Icon';

// Explorar: "Para você" (recentes, seus repositórios), trilhas de estudo e repositórios famosos.

type Aba = 'voce' | 'estudar' | 'famosos';
const ABA_KEY = 'cerne:explorar';
const TRILHA_KEY = 'cerne:trilha';

const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento */
  }
};

const alternarFeito = (repo: string) => estudados.alternar(repo);
const useFeitos = () => estudados.use();

/** Abre a visão geral do repositório (topo e README), não o código direto. */
const abrir = (r: Entrada, onOpen: (l: RepoLink) => void) => {
  const [owner, repo] = r.repo.split('/') as [string, string];
  onOpen({ owner, repo });
};

type Campo = 'lang' | 'dominio' | 'api' | 'stack';
type Filtros = Partial<Record<Campo, string>>;
const valorDe = (e: Entrada, c: Campo): string[] => (c === 'lang' ? [e.lang] : c === 'dominio' ? (e.dominio ? [e.dominio] : []) : c === 'api' ? (e.api ?? []) : (e.stack ?? []));
const casa = (e: Entrada, f: Filtros) => (Object.keys(f) as Campo[]).every((c) => valorDe(e, c).includes(f[c]!));

/** Filtros para comparar dentro da lista: só aparecem quando há o que comparar. */
// Cada linha conta o que sobra com os outros filtros ligados; o valor escolhido continua visível.
function facetasDe(lista: Entrada[], grupo: Trilha['grupo'], filtros: Filtros): { titulo: string; campo: Campo; valores: [string, number][] }[] {
  const conta = (c: Campo, max: number) => {
    const { [c]: escolhido, ...outros } = filtros;
    const m = new Map<string, number>();
    for (const e of lista) if (casa(e, outros)) for (const v of valorDe(e, c)) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m].filter(([v, n]) => n >= 2 || v === escolhido).sort((a, b) => b[1] - a[1]).slice(0, max);
  };
  const out: { titulo: string; campo: Campo; valores: [string, number][] }[] = [];
  if (grupo === 'Temas') out.push({ titulo: 'Linguagem', campo: 'lang', valores: conta('lang', 16) });
  out.push({ titulo: 'Assunto', campo: 'dominio', valores: conta('dominio', 24) });
  out.push({ titulo: 'Stack', campo: 'stack', valores: conta('stack', 40) });
  out.push({ titulo: 'API', campo: 'api', valores: conta('api', 4) });
  return out.filter((f) => f.valores.length > 1 || filtros[f.campo]);
}

const POR_PAGINA = 24;
const VISIVEIS = 7; // chips por linha de filtro antes do +N

/** Deixa a próxima visita à página inicial já numa aba (usado pela paleta). */
export function abrirAbaExplorar(a: Aba) {
  gravar(ABA_KEY, a);
}

export function Explore({ paraVoce, onOpen, padrao = 'voce' }: { paraVoce: ReactNode; onOpen: (l: RepoLink) => void; padrao?: Aba }) {
  const [aba, setAba] = useState<Aba>(() => (ler(ABA_KEY) as Aba) || padrao);
  const escolher = (a: Aba) => {
    setAba(a);
    gravar(ABA_KEY, a);
  };
  const abas: { id: Aba; label: string; icon: IconName }[] = [
    { id: 'voce', label: 'Para você', icon: 'home' },
    { id: 'estudar', label: 'Estudar', icon: 'graduation' },
    { id: 'famosos', label: 'Famosos', icon: 'star' },
  ];
  return (
    <section className={`ks-explore is-${aba}`} aria-label="Explorar" id="explorar">
      <div className="ks-explore__tabs" role="tablist" aria-label="Explorar">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`ex-tab-${a.id}`}
            aria-selected={aba === a.id}
            aria-controls={`ex-painel-${a.id}`}
            className="ks-explore__tab"
            onClick={() => escolher(a.id)}
            onKeyDown={(e) => {
              const i = abas.findIndex((x) => x.id === aba);
              if (e.key === 'ArrowRight') escolher(abas[(i + 1) % abas.length]!.id);
              else if (e.key === 'ArrowLeft') escolher(abas[(i + abas.length - 1) % abas.length]!.id);
            }}
          >
            <Icon name={a.icon} size={15} />
            {a.label}
          </button>
        ))}
      </div>
      <div className="ks-explore__panel" role="tabpanel" id={`ex-painel-${aba}`} aria-labelledby={`ex-tab-${aba}`}>
        {aba === 'voce' ? paraVoce : aba === 'estudar' ? <Estudar onOpen={onOpen} /> : <Famosos onOpen={onOpen} />}
      </div>
    </section>
  );
}

// ---------- Estudar ----------
function Selo({ t, size = 36 }: { t: Pick<Trilha, 'ext' | 'icone' | 'cor'>; size?: number }) {
  const { icons } = usePrefs();
  return (
    <span className="ks-selo" style={{ width: size, height: size, '--c': `var(--ctp-${t.cor})` } as React.CSSProperties} aria-hidden="true">
      {t.ext ? <FileIcon pack={icons} path={`x.${t.ext}`} className="ks-selo__file" /> : <Icon name={t.icone ?? 'code'} size={Math.round(size * 0.5)} />}
    </span>
  );
}

function Estudar({ onOpen }: { onOpen: (l: RepoLink) => void }) {
  const [id, setId] = useState(() => ler(TRILHA_KEY) ?? 'apis');
  const [filtros, setFiltros] = useState<Filtros>({});
  const [q, setQ] = useState('');
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [abertas, setAbertas] = useState<Set<Campo>>(() => new Set());
  const iconPack = usePrefs().icons;
  const feitosAgora = useFeitos();
  const estudo = useEstudo();
  const TRILHAS = estudo?.trilhas ?? [];
  const t = TRILHAS.find((x) => x.id === id) ?? TRILHAS[0];
  const pick = (x: string) => {
    setId(x);
    setFiltros({});
    setQ('');
    setMostrar(POR_PAGINA);
    setAbertas(new Set());
    gravar(TRILHA_KEY, x);
  };
  const lista = useMemo(() => {
    if (!t) return [];
    const termo = q.trim().toLowerCase();
    return t.repos.filter((e) => casa(e, filtros) && (!termo || `${e.repo} ${e.nota} ${(e.stack ?? []).join(' ')} ${e.dominio ?? ''}`.toLowerCase().includes(termo)));
  }, [t, filtros, q]);
  const facetas = useMemo(() => (t ? facetasDe(t.repos, t.grupo, filtros) : []), [t, filtros]);
  if (!estudo) return <p className="ks-explore__vazio" aria-busy="true">Carregando a lista de estudo…</p>;
  if (!t) return <p className="ks-explore__vazio">A lista de estudo ainda está vazia. Rode node scripts/catalogo-estudo.mjs para montá-la.</p>;
  const grupos = ['Temas', 'Linguagens'] as const;
  const alternar = (c: Campo, v: string) => {
    setFiltros((f) => {
      const n = { ...f };
      if (n[c] === v) delete n[c];
      else n[c] = v;
      return n;
    });
    setMostrar(POR_PAGINA);
  };
  return (
    <div className="ks-study">
      <nav className="ks-study__topics" aria-label="Temas e linguagens">
        {grupos.map((g) => (
          <div key={g} className="ks-study__group">
            <p className="ks-study__glabel">{g}</p>
            {TRILHAS.filter((x) => x.grupo === g).map((x) => (
              <button key={x.id} type="button" className="ks-study__topic" aria-current={x.id === t.id ? 'true' : undefined} onClick={() => pick(x.id)}>
                <Selo t={x} size={26} />
                <span className="ks-study__tname">{x.titulo}</span>
                <span className="ks-study__tcount">{x.repos.length}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <section className="ks-trail" aria-labelledby="trilha-titulo" key={t.id}>
        <header className="ks-trail__head">
          <Selo t={t} size={48} />
          <div className="ks-trail__title">
            <h3 id="trilha-titulo">{t.titulo}</h3>
            <p>{t.resumo ?? `Projetos de pessoas em ${t.titulo}.`}</p>
          </div>
          <span className="ks-trail__count">{lista.length}</span>
        </header>
        <div className="ks-trail__tools">
          <span className="ks-trail__search">
            <Icon name="search" size={14} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setMostrar(POR_PAGINA); }} placeholder="Buscar por nome, assunto ou stack" aria-label="Buscar nesta lista" />
          </span>
          {Object.keys(filtros).length > 0 && (
            <button type="button" className="ks-linkbtn" onClick={() => setFiltros({})}>limpar filtros</button>
          )}
        </div>
        {facetas.length > 0 && (
          <div className="ks-facets" role="group" aria-label="Filtrar">
            {facetas.map((f) => (
              <div key={f.campo} className="ks-facets__row">
                <span className="ks-facets__label">{f.titulo}</span>
                {f.valores.filter(([v], i) => i < VISIVEIS || abertas.has(f.campo) || filtros[f.campo] === v).map(([v, n]) => {
                  const on = filtros[f.campo] === v;
                  return (
                    <button key={v} type="button" className="ks-famous__cat" aria-pressed={on} onClick={() => alternar(f.campo, v)}>
                      {f.campo === 'lang' && <FileIcon pack={iconPack} path={`x.${extDaLinguagem(v)}`} className="ks-chip__icon" />}
                      {v}
                      <span className="ks-facets__n">{n}</span>
                    </button>
                  );
                })}
                {f.valores.length > VISIVEIS && (
                  <button type="button" className="ks-facets__mais" aria-expanded={abertas.has(f.campo)} onClick={() => setAbertas((a) => new Set(a.has(f.campo) ? [...a].filter((x) => x !== f.campo) : [...a, f.campo]))}>
                    {abertas.has(f.campo) ? 'menos' : `+${f.valores.length - VISIVEIS}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {lista.length === 0 ? (
          <p className="ks-explore__vazio">Nada com esses filtros.</p>
        ) : (
          <ul className="ks-repogrid">
            {lista.slice(0, mostrar).map((r) => (
              <RepoCard key={r.repo} r={r} feito={feitosAgora.has(r.repo)} onOpen={onOpen} />
            ))}
          </ul>
        )}
        {lista.length > mostrar && (
          <button type="button" className="key ks-trail__more" onClick={() => setMostrar((m) => m + POR_PAGINA * 2)}>
            Mostrar mais ({lista.length - mostrar})
          </button>
        )}
      </section>
    </div>
  );
}

// ---------- fotos dos donos ----------
// O endereço pelo login às vezes devolve a foto padrão do GitHub (sempre 420x420, ignorando o tamanho pedido).
// Detectada ela, com token busca-se a foto certa uma vez e guarda neste navegador; sem token, um monograma.
const FOTOS_KEY = 'cerne:fotos';
let fotos: Record<string, string> = (() => {
  try {
    return JSON.parse(ler(FOTOS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
})();
const ouvintesFotos = new Set<() => void>();
const pedindo = new Set<string>();
function pedirFoto(dono: string) {
  const token = getToken().value;
  if (!token || pedindo.has(dono)) return;
  pedindo.add(dono);
  void lerAvatar(dono, token).then((url) => {
    if (!url) return;
    fotos = { ...fotos, [dono]: url };
    gravar(FOTOS_KEY, JSON.stringify(fotos));
    ouvintesFotos.forEach((f) => f());
  });
}
const useFotos = () =>
  useSyncExternalStore(
    (f) => {
      ouvintesFotos.add(f);
      return () => ouvintesFotos.delete(f);
    },
    () => fotos,
  );
const CORES = ['blue', 'mauve', 'peach', 'teal', 'pink', 'green', 'sapphire', 'yellow', 'lavender', 'red'];
const corDe = (t: string) => CORES[[...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % CORES.length]!;

export function OwnerAvatar({ repo, size = 36 }: { repo: string; size?: number }) {
  const dono = repo.split('/')[0]!;
  const mapa = useFotos();
  const [padrao, setPadrao] = useState(false);
  const px = size * 2;
  const certa = mapa[dono];
  const src = certa ? `${certa}${certa.includes('?') ? '&' : '?'}s=${px}` : `https://avatars.githubusercontent.com/${encodeURIComponent(dono)}?s=${px}`;
  const cor = corDe(dono);
  const monograma = padrao && !certa;
  return (
    <span className={`ks-ownerpic${monograma ? ' is-mono' : ''}`} style={{ width: size, height: size, '--c': `var(--ctp-${cor})` } as React.CSSProperties} aria-hidden="true">
      {monograma ? (
        dono.replace(/[^a-z0-9]/gi, '').slice(0, 2).replace(/^./, (c) => c.toUpperCase())
      ) : (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            if (!certa && e.currentTarget.naturalWidth > px * 1.5) {
              setPadrao(true);
              pedirFoto(dono);
            }
          }}
          onError={() => setPadrao(true)}
        />
      )}
    </span>
  );
}

function RepoCard({ r, feito, onOpen }: { r: Entrada; feito: boolean; onOpen: (l: RepoLink) => void }) {
  const { icons } = usePrefs();
  const [dono, nome] = r.repo.split('/');
  return (
    <li className={`ks-repocard${feito ? ' is-done' : ''}`}>
      <button type="button" className="ks-repocard__main" onClick={() => abrir(r, onOpen)} aria-label={`Abrir ${r.repo}`}>
        <OwnerAvatar repo={r.repo} size={36} />
        <span className="ks-repocard__body">
          <span className="ks-repocard__name"><span>{dono}/</span>{nome}</span>
          <span className="ks-repocard__nota">{r.nota}</span>
          <span className="ks-repocard__meta">
            <span className="ks-chip"><FileIcon pack={icons} path={`x.${extDaLinguagem(r.lang)}`} className="ks-chip__icon" />{r.lang}</span>
            {r.dominio && <span className="ks-chip ks-chip--dom">{r.dominio}</span>}
            {r.stack?.slice(0, 3).map((x) => <span key={x} className="ks-chip ks-chip--file">{x}</span>)}
            {r.estrelas !== undefined && <span className="ks-chip ks-chip--stars"><Icon name="star" size={11} />{r.estrelas}</span>}
          </span>
        </span>
      </button>
      <div className="ks-repocard__side">
        <button type="button" className={`ks-icon-btn ks-repocard__check${feito ? ' is-on' : ''}`} aria-pressed={feito} aria-label={feito ? 'Desmarcar estudado' : 'Marcar como estudado'} data-tip={feito ? 'Estudado' : 'Marcar como estudado'} onClick={() => alternarFeito(r.repo)}>
          <Icon name="check" size={15} />
        </button>
        <a className="ks-icon-btn" href={`https://github.com/${r.repo}`} target="_blank" rel="noopener noreferrer" aria-label={`${r.repo} no GitHub`} data-tip="No GitHub">
          <Icon name="external" size={14} />
        </a>
      </div>
    </li>
  );
}

// ---------- Famosos ----------
function Famosos({ onOpen }: { onOpen: (l: RepoLink) => void }) {
  const { icons } = usePrefs();
  const [cat, setCat] = useState<(typeof CATEGORIAS)[number]>('Todos');
  const lista = useMemo(() => (cat === 'Todos' ? FAMOSOS : FAMOSOS.filter((f) => f.famoso === cat)), [cat]);
  return (
    <div className="ks-famous">
      <div className="ks-famous__cats" role="group" aria-label="Categoria">
        {CATEGORIAS.map((c) => (
          <button key={c} type="button" className="ks-famous__cat" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <ul className="ks-famous__grid">
        {lista.map((f) => {
          const [dono, nome] = f.repo.split('/');
          return (
            <li key={f.repo}>
              <button type="button" className="ks-famous__card" onClick={() => abrir(f, onOpen)} aria-label={`Abrir ${f.repo}`}>
                <OwnerAvatar repo={f.repo} size={40} />
                <span className="ks-famous__body">
                  <span className="ks-repocard__name"><span>{dono}/</span>{nome}</span>
                  <span className="ks-repocard__nota">{f.nota}</span>
                </span>
                <span className="ks-famous__lang" data-tip={f.lang}><FileIcon pack={icons} path={`x.${extDaLinguagem(f.lang)}`} className="ks-chip__icon" /></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
