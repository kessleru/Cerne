import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIAS, FAMOSOS, TRILHAS, type Indicado, type Nivel, type Trilha } from '../data/explorar';
import { FileIcon } from '../icons/FileIcon';
import type { RepoLink } from '../lib/route';
import { lerAvatar } from '../data/github/conta';
import { getToken } from '../state/token';
import { usePrefs } from '../state/prefs';
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

// ---------- progresso: repositórios marcados como estudados (só neste navegador) ----------
const FEITO_KEY = 'cerne:estudados';
let feitos: ReadonlySet<string> = new Set(JSON.parse(ler(FEITO_KEY) ?? '[]') as string[]);
const ouvintes = new Set<() => void>();
function alternarFeito(repo: string) {
  const n = new Set(feitos);
  if (n.has(repo)) n.delete(repo);
  else n.add(repo);
  feitos = n;
  gravar(FEITO_KEY, JSON.stringify([...n]));
  ouvintes.forEach((f) => f());
}
const useFeitos = () =>
  useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => feitos,
  );

const abrir = (r: Indicado, onOpen: (l: RepoLink) => void) => {
  const [owner, repo] = r.repo.split('/') as [string, string];
  onOpen({ owner, repo, path: r.start });
};

const NIVEL_COR: Record<Nivel, string> = { iniciante: 'green', intermediário: 'yellow', avançado: 'peach' };

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
    <section className={`ks-explore is-${aba}`} aria-label="Explorar">
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
  const [id, setId] = useState(() => ler(TRILHA_KEY) ?? 'python');
  const feitosAgora = useFeitos();
  const t = TRILHAS.find((x) => x.id === id) ?? TRILHAS[0]!;
  const pick = (x: string) => {
    setId(x);
    gravar(TRILHA_KEY, x);
  };
  const grupos = ['Linguagens', 'Temas'] as const;
  const feitosNa = (tr: Trilha) => tr.repos.filter((r) => feitosAgora.has(r.repo)).length;
  const n = feitosNa(t);
  return (
    <div className="ks-study">
      <nav className="ks-study__topics" aria-label="Trilhas">
        {grupos.map((g) => (
          <div key={g} className="ks-study__group">
            <p className="ks-study__glabel">{g}</p>
            {TRILHAS.filter((x) => x.grupo === g).map((x) => {
              const f = feitosNa(x);
              return (
                <button key={x.id} type="button" className="ks-study__topic" aria-current={x.id === t.id ? 'true' : undefined} onClick={() => pick(x.id)}>
                  <Selo t={x} size={26} />
                  <span className="ks-study__tname">{x.titulo}</span>
                  <span className={`ks-study__tcount${f === x.repos.length ? ' is-done' : ''}`}>{f ? `${f}/${x.repos.length}` : x.repos.length}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <section className="ks-trail" aria-labelledby="trilha-titulo" key={t.id}>
        <header className="ks-trail__head">
          <Selo t={t} size={48} />
          <div className="ks-trail__title">
            <h3 id="trilha-titulo">{t.titulo}</h3>
            <p>{t.resumo}</p>
          </div>
          <div className="ks-trail__progress" aria-label={`${n} de ${t.repos.length} estudados`} data-tip="Marque o que já estudou">
            <span className="ks-trail__bar"><span style={{ width: `${(n / t.repos.length) * 100}%` }} /></span>
            <span>{n}/{t.repos.length}</span>
          </div>
        </header>
        <ol className="ks-trail__steps">
          {t.repos.map((r, i) => (
            <Etapa key={r.repo + i} n={i + 1} r={r} feito={feitosAgora.has(r.repo)} onOpen={onOpen} />
          ))}
        </ol>
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

function Avatar({ repo, size = 36 }: { repo: string; size?: number }) {
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

function Etapa({ n, r, feito, onOpen }: { n: number; r: Indicado; feito: boolean; onOpen: (l: RepoLink) => void }) {
  const { icons } = usePrefs();
  const [dono, nome] = r.repo.split('/');
  const arquivo = r.start?.split('/').pop();
  return (
    <li className={`ks-step2${feito ? ' is-done' : ''}`}>
      <span className="ks-step2__n" aria-hidden="true">{feito ? <Icon name="check" size={14} /> : n}</span>
      <div className="ks-repocard">
        <button type="button" className="ks-repocard__main" onClick={() => abrir(r, onOpen)} aria-label={`Abrir ${r.repo}${arquivo ? ` em ${arquivo}` : ''}`}>
          <Avatar repo={r.repo} />
          <span className="ks-repocard__body">
            <span className="ks-repocard__name"><span>{dono}/</span>{nome}</span>
            <span className="ks-repocard__nota">{r.nota}</span>
            <span className="ks-repocard__meta">
              <span className="ks-chip"><FileIcon pack={icons} path={`x.${r.ext}`} className="ks-chip__icon" />{r.lang}</span>
              <span className="ks-chip ks-nivel" style={{ '--c': `var(--ctp-${NIVEL_COR[r.nivel]})` } as React.CSSProperties}>{r.nivel}</span>
              {arquivo && <span className="ks-chip ks-chip--file" data-tip={r.start}><Icon name="file" size={12} />{arquivo}</span>}
            </span>
          </span>
          <Icon name="arrowRight" size={16} className="ks-repocard__go" />
        </button>
        <div className="ks-repocard__side">
          <button type="button" className={`ks-icon-btn ks-repocard__check${feito ? ' is-on' : ''}`} aria-pressed={feito} aria-label={feito ? 'Desmarcar estudado' : 'Marcar como estudado'} data-tip={feito ? 'Estudado' : 'Marcar como estudado'} onClick={() => alternarFeito(r.repo)}>
            <Icon name="check" size={15} />
          </button>
          <a className="ks-icon-btn" href={`https://github.com/${r.repo}`} target="_blank" rel="noopener noreferrer" aria-label={`${r.repo} no GitHub`} data-tip="No GitHub">
            <Icon name="external" size={14} />
          </a>
        </div>
      </div>
    </li>
  );
}

// ---------- Famosos ----------
function Famosos({ onOpen }: { onOpen: (l: RepoLink) => void }) {
  const { icons } = usePrefs();
  const [cat, setCat] = useState<(typeof CATEGORIAS)[number]>('Todos');
  const lista = useMemo(() => (cat === 'Todos' ? FAMOSOS : FAMOSOS.filter((f) => f.categoria === cat)), [cat]);
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
                <Avatar repo={f.repo} size={40} />
                <span className="ks-famous__body">
                  <span className="ks-repocard__name"><span>{dono}/</span>{nome}</span>
                  <span className="ks-repocard__nota">{f.nota}</span>
                </span>
                <span className="ks-famous__lang" data-tip={f.lang}><FileIcon pack={icons} path={`x.${f.ext}`} className="ks-chip__icon" /></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
