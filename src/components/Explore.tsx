import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIAS, FAMOSOS, extDaLinguagem, useEstudo, type Area, type Entrada, type Trilha } from '../data/catalogo';
import { FileIcon } from '../icons/FileIcon';
import type { RepoLink } from '../lib/route';
import { lerAvatar } from '../data/github/conta';
import { getToken } from '../state/token';
import { usePrefs } from '../state/prefs';
import { estudados } from '../state/estudo';
import { Icon, type IconName } from './Icon';
import { Select } from './Select';

// Explorar: "Para você" (recentes, seus repositórios), trilhas de estudo e repositórios famosos.

type Aba = 'voce' | 'estudar' | 'famosos';
const ABA_KEY = 'cerne:explorar';
const TRILHA_KEY = 'cerne:trilha';
const AREA_KEY = 'cerne:area';

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
type Filtros = Partial<Record<Campo, string[]>>;
const valorDe = (e: Entrada, c: Campo): string[] => (c === 'lang' ? [e.lang] : c === 'dominio' ? (e.dominio ? [e.dominio] : []) : c === 'api' ? (e.api ?? []) : (e.stack ?? []));
// Stack e API somam ("Express e Redis e MongoDB": o projeto tem todos); linguagem e assunto são alternativas ("TypeScript ou JavaScript").
const SOMA: Record<Campo, boolean> = { stack: true, api: true, lang: false, dominio: false };
const casaCampo = (e: Entrada, c: Campo, vs: string[]) => {
  const tem = valorDe(e, c);
  return SOMA[c] ? vs.every((v) => tem.includes(v)) : vs.some((v) => tem.includes(v));
};
const casa = (e: Entrada, f: Filtros, menos?: Campo) =>
  (Object.keys(f) as Campo[]).every((c) => c === menos || !f[c]?.length || casaCampo(e, c, f[c]!));
const qtdFiltros = (f: Filtros) => Object.values(f).reduce((n, vs) => n + (vs?.length ?? 0), 0);

type Faceta = { titulo: string; campo: Campo; dica: string; valores: [string, number][] };
/**
 * Filtros para comparar dentro da lista: só aparecem quando há o que comparar.
 * Em linguagem e assunto (alternativas), a contagem ignora o próprio campo; em stack e API (somam),
 * conta quantos sobrariam ao acrescentar aquele valor.
 */
function facetasDe(lista: Entrada[], grupo: Trilha['grupo'], filtros: Filtros): Faceta[] {
  const conta = (c: Campo, max: number) => {
    const escolhidos = filtros[c] ?? [];
    const m = new Map<string, number>();
    for (const e of lista) if (casa(e, filtros, SOMA[c] ? undefined : c)) for (const v of valorDe(e, c)) m.set(v, (m.get(v) ?? 0) + 1);
    for (const v of escolhidos) if (!m.has(v)) m.set(v, 0);
    const lista_ = [...m].filter(([v, n]) => n >= 2 || escolhidos.includes(v) || (SOMA[c] && n >= 1 && escolhidos.length > 0));
    return lista_.sort((a, b) => Number(escolhidos.includes(b[0])) - Number(escolhidos.includes(a[0])) || b[1] - a[1]).slice(0, max);
  };
  const out: Faceta[] = [];
  if (grupo !== 'Linguagens') out.push({ titulo: 'Linguagem', campo: 'lang', dica: 'uma ou outra', valores: conta('lang', 20) });
  out.push({ titulo: 'Assunto', campo: 'dominio', dica: 'um ou outro', valores: conta('dominio', 40) });
  out.push({ titulo: 'Stack', campo: 'stack', dica: 'todas juntas', valores: conta('stack', 60) });
  out.push({ titulo: 'API', campo: 'api', dica: 'todas juntas', valores: conta('api', 4) });
  return out.filter((f) => f.valores.length > 1 || filtros[f.campo]?.length);
}

// ---------- ordem ----------
type Ordem = 'misturar' | 'readme' | 'estrelas' | 'escondidos';
const ORDENS: { value: Ordem; label: string }[] = [
  { value: 'misturar', label: 'Misturado' },
  { value: 'readme', label: 'README mais completo' },
  { value: 'estrelas', label: 'Mais estrelas' },
  { value: 'escondidos', label: 'Menos conhecidos' },
];
const ESTRELAS = [0, 10, 50, 100, 500];

/** Gerador pseudoaleatório com semente: a mesma semente dá a mesma ordem (a lista não pula a cada clique). */
function sorteio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Mistura com peso: README mais completo tende a vir antes, mas cada abertura traz uma ordem nova. */
export function misturar(lista: Entrada[], semente: number) {
  const r = sorteio(semente);
  return lista
    .map((e) => ({ e, k: Math.pow(r(), 1 / Math.max(1, (e.readme ?? 14) - 8)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.e);
}
function ordenar(lista: Entrada[], ordem: Ordem, semente: number) {
  if (ordem === 'misturar') return misturar(lista, semente);
  const l = [...lista];
  if (ordem === 'readme') return l.sort((a, b) => (b.readme ?? 0) - (a.readme ?? 0) || (b.estrelas ?? 0) - (a.estrelas ?? 0));
  if (ordem === 'estrelas') return l.sort((a, b) => (b.estrelas ?? 0) - (a.estrelas ?? 0));
  return l.sort((a, b) => (a.estrelas ?? 0) - (b.estrelas ?? 0) || (b.readme ?? 0) - (a.readme ?? 0));
}
export const novaSemente = () => Math.floor(Math.random() * 2 ** 31);

const POR_PAGINA = 24;
const VISIVEIS = 8; // chips por linha de filtro antes do +N
const ORDEM_KEY = 'cerne:ordem';

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
  const [areaId, setAreaId] = useState<Area>(() => (ler(AREA_KEY) as Area) || 'backend');
  // a trilha lembrada é por área: voltar ao Front-end abre onde a pessoa estava
  const [trilhaPor, setTrilhaPor] = useState<Record<string, string>>(() => {
    try {
      const v = JSON.parse(ler(TRILHA_KEY) ?? '{}');
      return v && typeof v === 'object' ? (v as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [filtros, setFiltros] = useState<Filtros>({});
  const [q, setQ] = useState('');
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [abertas, setAbertas] = useState<Set<Campo>>(() => new Set());
  const [painel, setPainel] = useState(false);
  const [minEstrelas, setMinEstrelas] = useState(0);
  const [semFeitos, setSemFeitos] = useState(false);
  const [ordem, setOrdem] = useState<Ordem>(() => (ORDENS.some((o) => o.value === ler(ORDEM_KEY)) ? (ler(ORDEM_KEY) as Ordem) : 'misturar'));
  // uma semente nova a cada lista aberta: a mesma lista nunca começa igual
  const [semente, setSemente] = useState(novaSemente);
  const iconPack = usePrefs().icons;
  const feitosAgora = useFeitos();
  const estudo = useEstudo();
  const area = estudo?.areas.find((a) => a.id === areaId) ?? estudo?.areas[0];
  const TRILHAS = area?.trilhas ?? [];
  const padrao = area?.id === 'backend' ? 'apis' : 'tudo';
  const t = TRILHAS.find((x) => x.id === (trilhaPor[area?.id ?? ''] ?? padrao)) ?? TRILHAS[0];
  const limpar = () => {
    setFiltros({});
    setQ('');
    setMostrar(POR_PAGINA);
    setAbertas(new Set());
    setMinEstrelas(0);
    setSemente(novaSemente());
  };
  const pick = (x: string) => {
    limpar();
    if (!area) return;
    const n = { ...trilhaPor, [area.id]: x };
    setTrilhaPor(n);
    gravar(TRILHA_KEY, JSON.stringify(n));
  };
  const pickArea = (a: Area) => {
    limpar();
    setAreaId(a);
    gravar(AREA_KEY, a);
  };
  // base: o que a busca, as estrelas e "esconder estudados" deixam; os filtros de faceta vêm por cima
  const base = useMemo(() => {
    if (!t) return [];
    const termo = q.trim().toLowerCase();
    return t.repos.filter(
      (e) =>
        (e.estrelas ?? 0) >= minEstrelas &&
        !(semFeitos && feitosAgora.has(e.repo)) &&
        (!termo || `${e.repo} ${e.nota} ${(e.stack ?? []).join(' ')} ${e.dominio ?? ''}`.toLowerCase().includes(termo)),
    );
  }, [t, q, minEstrelas, semFeitos, feitosAgora]);
  const lista = useMemo(() => ordenar(base.filter((e) => casa(e, filtros)), ordem, semente), [base, filtros, ordem, semente]);
  const facetas = useMemo(() => (t ? facetasDe(base, t.grupo, filtros) : []), [t, base, filtros]);
  if (!estudo) return <p className="ks-explore__vazio" aria-busy="true">Carregando a lista de estudo…</p>;
  if (!area || !t) return <p className="ks-explore__vazio">A lista de estudo ainda está vazia. Rode node scripts/catalogo-estudo.mjs para montá-la.</p>;
  const grupos = ['Temas', 'Linguagens'] as const;
  const tudo = TRILHAS.find((x) => x.grupo === 'Tudo');
  const alternar = (c: Campo, v: string) => {
    setFiltros((f) => {
      const atual = f[c] ?? [];
      const prox = atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v];
      const n = { ...f, [c]: prox };
      if (!prox.length) delete n[c];
      return n;
    });
    setMostrar(POR_PAGINA);
  };
  const ativos = qtdFiltros(filtros) + (minEstrelas ? 1 : 0) + (semFeitos ? 1 : 0);
  const limparFiltros = () => {
    setFiltros({});
    setMinEstrelas(0);
    setSemFeitos(false);
    setMostrar(POR_PAGINA);
  };
  const escolhidos = (Object.keys(filtros) as Campo[]).flatMap((c) => (filtros[c] ?? []).map((v) => [c, v] as const));
  return (
    <div className="ks-studywrap">
      <div className="ks-areas" role="tablist" aria-label="Áreas">
        {estudo.areas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            className="ks-areas__item"
            aria-selected={a.id === area.id}
            onClick={() => pickArea(a.id)}
            onKeyDown={(e) => {
              const i = estudo.areas.findIndex((x) => x.id === area.id);
              const n = estudo.areas.length;
              if (e.key === 'ArrowRight') pickArea(estudo.areas[(i + 1) % n]!.id);
              else if (e.key === 'ArrowLeft') pickArea(estudo.areas[(i + n - 1) % n]!.id);
            }}
          >
            <Selo t={a} size={28} />
            <span className="ks-areas__name">{a.titulo}</span>
            <span className="ks-areas__n">{a.repos.length.toLocaleString('pt-BR')}</span>
          </button>
        ))}
      </div>
    <div className="ks-study">
      <nav className="ks-study__topics" aria-label={`Temas e linguagens de ${area.titulo}`}>
        {tudo && (
          <div className="ks-study__group">
            <button type="button" className="ks-study__topic" aria-current={tudo.id === t.id ? 'true' : undefined} onClick={() => pick(tudo.id)}>
              <Selo t={tudo} size={26} />
              <span className="ks-study__tname">Tudo</span>
              <span className="ks-study__tcount">{tudo.repos.length}</span>
            </button>
          </div>
        )}
        {grupos.map((g) => {
          const itens = TRILHAS.filter((x) => x.grupo === g);
          if (!itens.length) return null;
          return (
            <div key={g} className="ks-study__group">
              <p className="ks-study__glabel">{g}</p>
              {itens.map((x) => (
                <button key={x.id} type="button" className="ks-study__topic" aria-current={x.id === t.id ? 'true' : undefined} onClick={() => pick(x.id)}>
                  <Selo t={x} size={26} />
                  <span className="ks-study__tname">{x.titulo}</span>
                  <span className="ks-study__tcount">{x.repos.length}</span>
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <section className="ks-trail" aria-labelledby="trilha-titulo" key={`${area.id}/${t.id}`}>
        <header className="ks-trail__head">
          <Selo t={t} size={48} />
          <div className="ks-trail__title">
            <h3 id="trilha-titulo">{t.titulo}</h3>
            <p>{t.grupo === 'Linguagens' ? `${area.titulo} em ${t.titulo}: projetos de pessoas.` : t.resumo}</p>
          </div>
          <span className="ks-trail__count">{lista.length}</span>
        </header>
        <div className="ks-trail__tools">
          <span className="ks-trail__search">
            <Icon name="search" size={14} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setMostrar(POR_PAGINA); }} placeholder="Buscar por nome, assunto ou stack" aria-label="Buscar nesta lista" />
          </span>
          <div className="ks-trail__ordem">
            <Select
              ariaLabel="Ordem da lista"
              value={ordem}
              options={ORDENS}
              onChange={(v) => {
                setOrdem(v as Ordem);
                gravar(ORDEM_KEY, v);
                setMostrar(POR_PAGINA);
              }}
            />
            {ordem === 'misturar' && (
              <button type="button" className="ks-trail__icon" data-tip="Misturar de novo" aria-label="Misturar de novo" onClick={() => { setSemente(novaSemente()); setMostrar(POR_PAGINA); }}>
                <Icon name="refresh" size={15} />
              </button>
            )}
          </div>
          <button type="button" className="ks-trail__filtros" aria-expanded={painel} aria-controls="painel-filtros" onClick={() => setPainel((v) => !v)}>
            <Icon name="list" size={14} />
            Filtros
            {ativos > 0 && <span className="ks-trail__badge">{ativos}</span>}
            <Icon name="chevronRight" size={14} className="ks-trail__chev" />
          </button>
        </div>
        {!painel && ativos > 0 && (
          <div className="ks-ativos" aria-label="Filtros ligados">
            {minEstrelas > 0 && (
              <button type="button" className="ks-ativos__chip" onClick={() => setMinEstrelas(0)} aria-label={`Tirar filtro: ${minEstrelas}+ estrelas`}>
                <Icon name="star" size={12} />
                {minEstrelas}+
                <Icon name="x" size={12} />
              </button>
            )}
            {semFeitos && (
              <button type="button" className="ks-ativos__chip" onClick={() => setSemFeitos(false)} aria-label="Tirar filtro: sem os estudados">
                sem os estudados
                <Icon name="x" size={12} />
              </button>
            )}
            {escolhidos.map(([c, v]) => (
              <button key={c + v} type="button" className="ks-ativos__chip" onClick={() => alternar(c, v)} aria-label={`Tirar filtro: ${v}`}>
                {c === 'lang' && <FileIcon pack={iconPack} path={`x.${extDaLinguagem(v)}`} className="ks-chip__icon" />}
                {v}
                <Icon name="x" size={12} />
              </button>
            ))}
            <button type="button" className="ks-linkbtn" onClick={limparFiltros}>limpar</button>
          </div>
        )}
        {painel && (
          <div className="ks-facets" id="painel-filtros" role="group" aria-label="Filtrar">
            <div className="ks-facets__row">
              <span className="ks-facets__label">Estrelas</span>
              {ESTRELAS.map((n) => (
                <button key={n} type="button" className="ks-famous__cat" aria-pressed={minEstrelas === n} onClick={() => { setMinEstrelas(n); setMostrar(POR_PAGINA); }}>
                  {n === 0 ? 'qualquer' : `${n}+`}
                </button>
              ))}
              <label className="ks-facets__check">
                <input type="checkbox" checked={semFeitos} onChange={(e) => setSemFeitos(e.target.checked)} />
                esconder os que já estudei
              </label>
            </div>
            {facetas.map((f) => {
              const vs = filtros[f.campo] ?? [];
              return (
                <div key={f.campo} className="ks-facets__row">
                  <span className="ks-facets__label" data-tip={`Vários: ${f.dica}`}>{f.titulo}</span>
                  {f.valores.filter(([v], i) => i < VISIVEIS || abertas.has(f.campo) || vs.includes(v)).map(([v, n]) => {
                    const on = vs.includes(v);
                    return (
                      <button key={v} type="button" className="ks-famous__cat" aria-pressed={on} disabled={!on && n === 0} onClick={() => alternar(f.campo, v)}>
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
              );
            })}
            {ativos > 0 && (
              <div className="ks-facets__fim">
                <button type="button" className="ks-linkbtn" onClick={limparFiltros}>limpar filtros</button>
              </div>
            )}
          </div>
        )}
        {lista.length === 0 ? (
          <p className="ks-explore__vazio">
            Nada com esses filtros.{' '}
            {ativos > 0 && <button type="button" className="ks-linkbtn" onClick={limparFiltros}>limpar filtros</button>}
          </p>
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
  // ordem nova a cada visita e a cada categoria aberta
  const [semente, setSemente] = useState(novaSemente);
  const lista = useMemo(() => misturar(cat === 'Todos' ? FAMOSOS : FAMOSOS.filter((f) => f.famoso === cat), semente), [cat, semente]);
  return (
    <div className="ks-famous">
      <div className="ks-famous__cats" role="group" aria-label="Categoria">
        {CATEGORIAS.map((c) => (
          <button key={c} type="button" className="ks-famous__cat" aria-pressed={cat === c} onClick={() => { setCat(c); setSemente(novaSemente()); }}>{c}</button>
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
