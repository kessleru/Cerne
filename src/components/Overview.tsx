// Visão geral de um repositório: a página de introdução antes do código.
// Dados do repositório, o README renderizado, a estrutura do projeto e, quando há, o guia de estudo.
import { useEffect, useMemo, useState } from 'react';
import { entradaDe, extDaLinguagem, termoDe, type Entrada } from '../data/catalogo';
import type { Guia } from '../data/catalogo/tipos';
import type { RepoInfo, RepoSource, TreeEntry } from '../data/types';
import { FileIcon } from '../icons/FileIcon';
import { langOf } from '../lib/lang';
import { milhar, relativo } from '../lib/tempo';
import type { IconPack } from '../state/prefs';
import { estudados, passosVistos } from '../state/estudo';
import { MarkdownView } from '../viewers/data';
import { OwnerAvatar } from './Explore';
import { Icon, type IconName } from './Icon';
import { CommitLoader } from './CommitLoader';

type Props = {
  owner: string;
  repo: string;
  refName: string;
  info: RepoInfo | null;
  entries: TreeEntry[] | null;
  source: RepoSource;
  pack: IconPack;
  editorTheme: string | null;
  /** abre um arquivo (ou revela uma pasta) */
  onPath: (path: string) => void;
  onStep: (i: number) => void;
  onOpenRepo?: (slug: string) => void;
};

/** README da pasta (README.md, readme.md, README, README.rst...). */
export function findReadme(paths: string[], dir: string): string | null {
  const prefix = dir ? dir + '/' : '';
  const nomes = paths.filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'));
  for (const o of ['readme.md', 'readme.markdown', 'readme', 'readme.txt', 'readme.rst']) {
    const achado = nomes.find((p) => p.slice(prefix.length).toLowerCase() === o);
    if (achado) return achado;
  }
  return nomes.find((p) => /^readme\./i.test(p.slice(prefix.length))) ?? null;
}

export function Overview(p: Props) {
  const entrada = entradaDe(p.owner, p.repo);
  const guia = entrada?.guia ?? null;
  const readme = useMemo(() => (p.entries ? findReadme(p.entries.map((e) => e.path), '') : null), [p.entries]);
  const [texto, setTexto] = useState<{ path: string; text: string | null } | null>(null);

  useEffect(() => {
    if (!readme || !p.refName) return;
    let vivo = true;
    p.source.getFile(p.refName, readme).then(
      (f) => vivo && setTexto({ path: readme, text: f.text ?? null }),
      () => vivo && setTexto({ path: readme, text: null }),
    );
    return () => {
      vivo = false;
    };
  }, [readme, p.refName, p.source]);

  const dir = readme?.includes('/') ? readme.slice(0, readme.lastIndexOf('/')) : '';
  return (
    <div className="ks-ov">
      <Hero {...p} entrada={entrada} guia={guia} readme={readme} />
      <div className={`ks-ov__grid${guia ? ' has-guide' : ''}`}>
        <article className="ks-ov__readme" aria-label="README">
          <header className="ks-ov__cardhead">
            <Icon name="bookOpen" size={14} />
            <span>{readme ?? 'README'}</span>
            {readme && (
              <button type="button" className="ks-linkbtn ks-ov__raw" onClick={() => p.onPath(readme)}>
                ver o arquivo
              </button>
            )}
          </header>
          {!p.entries || (readme && !texto) ? (
            <div className="ks-ov__loading"><CommitLoader size="sm" label="Carregando o README" /></div>
          ) : !readme || !texto?.text ? (
            <p className="ks-ov__empty">Este repositório não tem README. A estrutura ao lado mostra por onde começar.</p>
          ) : (
            <MarkdownView
              text={texto.text}
              className="ks-ov__md"
              ctx={{ owner: p.owner, repo: p.repo, ref: p.refName, dir, theme: p.editorTheme, onPath: p.onPath }}
            />
          )}
        </article>
        <aside className="ks-ov__side">
          {guia && entrada && <GuidePanel guia={guia} entrada={entrada} onStep={p.onStep} onPath={p.onPath} onOpenRepo={p.onOpenRepo} pack={p.pack} />}
          {p.entries && <Estrutura entries={p.entries} pack={p.pack} onPath={p.onPath} />}
        </aside>
      </div>
    </div>
  );
}

// ---------- topo ----------
function Hero({ owner, repo, info, entrada, guia, readme, pack, onStep, onPath }: Props & { entrada: Entrada | null; guia: Guia | null; readme: string | null }) {
  const feitos = estudados.use();
  const slug = `${owner}/${repo}`;
  const feito = feitos.has(entrada?.repo ?? slug);
  const lang = info?.language ?? entrada?.lang ?? null;
  const stats: { icon: IconName; texto: string; tip: string }[] = [];
  if (info?.stars !== undefined) stats.push({ icon: 'star', texto: milhar(info.stars), tip: 'Estrelas' });
  if (info?.forks !== undefined) stats.push({ icon: 'fork', texto: milhar(info.forks), tip: 'Forks' });
  if (info?.license) stats.push({ icon: 'scale', texto: info.license, tip: 'Licença' });
  if (info?.pushedAt) stats.push({ icon: 'history', texto: relativo(info.pushedAt), tip: 'Último envio' });
  const inicio = entrada?.start ?? readme;
  return (
    <header className="ks-ov__hero">
      {info?.avatar ? (
        <img className="ks-ov__avatar" src={`${info.avatar}${info.avatar.includes('?') ? '&' : '?'}s=144`} alt="" width={72} height={72} />
      ) : (
        <OwnerAvatar repo={slug} size={72} />
      )}
      <div className="ks-ov__id">
        <p className="ks-ov__owner">{owner} /</p>
        <h1 className="ks-ov__name">{repo}</h1>
        {(info?.description || entrada?.nota) && <p className="ks-ov__desc">{info?.description || entrada?.nota}</p>}
        <ul className="ks-ov__stats">
          {lang && (
            <li>
              <FileIcon pack={pack} path={`x.${extDaLinguagem(lang)}`} className="ks-chip__icon" />
              {lang}
            </li>
          )}
          {stats.map((s) => (
            <li key={s.tip} data-tip={s.tip}><Icon name={s.icon} size={14} />{s.texto}</li>
          ))}
          {entrada && <li className={`ks-ov__nivel is-${entrada.nivel === 'iniciante' ? 'a' : entrada.nivel === 'intermediário' ? 'b' : 'c'}`}>{entrada.nivel}</li>}
          {info?.archived && <li className="ks-ov__arch">arquivado</li>}
        </ul>
        {info?.topics && info.topics.length > 0 && (
          <div className="ks-ov__topics">{info.topics.slice(0, 8).map((t) => <span key={t}>{t}</span>)}</div>
        )}
      </div>
      <div className="ks-ov__actions">
        {guia ? (
          <button type="button" className="key key--accent" onClick={() => onStep(0)}><Icon name="play" size={14} /> Começar o guia</button>
        ) : inicio ? (
          <button type="button" className="key key--accent" onClick={() => onPath(inicio)}><Icon name="file" size={14} /> Abrir {inicio.split('/').pop()}</button>
        ) : null}
        <div className="ks-ov__minor">
          {entrada && (
            <button type="button" className={`ks-icon-btn${feito ? ' is-on' : ''}`} aria-pressed={feito} aria-label={feito ? 'Desmarcar estudado' : 'Marcar como estudado'} data-tip={feito ? 'Estudado' : 'Marcar como estudado'} onClick={() => estudados.alternar(entrada.repo)}>
              <Icon name="check" />
            </button>
          )}
          {info?.homepage && (
            <a className="ks-icon-btn" href={info.homepage} target="_blank" rel="noopener noreferrer" aria-label="Site do projeto" data-tip="Site do projeto"><Icon name="globe" /></a>
          )}
          <a className="ks-icon-btn" href={`https://github.com/${slug}`} target="_blank" rel="noopener noreferrer" aria-label="No GitHub" data-tip="No GitHub"><Icon name="external" /></a>
        </div>
      </div>
    </header>
  );
}

// ---------- guia ----------
function GuidePanel({ guia, entrada, onStep, onOpenRepo, pack }: { guia: Guia; entrada: Entrada; onStep: (i: number) => void; onPath: (p: string) => void; onOpenRepo?: (slug: string) => void; pack: IconPack }) {
  const vistos = passosVistos.use();
  const depois = guia.depois ? entradaDe(...(guia.depois.split('/') as [string, string])) : null;
  const termos = guia.conceitos.map((c) => termoDe(c)).filter((t): t is NonNullable<typeof t> => !!t);
  const feitos = guia.passos.filter((_, i) => vistos.has(`${entrada.repo}#${i}`)).length;
  return (
    <section className="ks-guide2" aria-labelledby="guia-titulo">
      <header className="ks-guide2__head">
        <span className="ks-guide2__badge"><Icon name="graduation" size={16} /></span>
        <div>
          <h2 id="guia-titulo">Guia de estudo</h2>
          <p>{guia.passos.length} passos · {guia.tempo}</p>
        </div>
        {feitos > 0 && <span className="ks-guide2__prog" data-tip="Passos já abertos">{feitos}/{guia.passos.length}</span>}
      </header>

      <div className="ks-guide2__block">
        <h3>O que é</h3>
        <p>{guia.sobre}</p>
      </div>
      <div className="ks-guide2__block">
        <h3>Por que ler</h3>
        <p>{guia.porque}</p>
      </div>
      <div className="ks-guide2__block">
        <h3>Antes de começar</h3>
        <ul className="ks-guide2__antes">
          {guia.antes.map((a) => <li key={a}><Icon name="check" size={12} />{a}</li>)}
        </ul>
      </div>
      <div className="ks-guide2__tip">
        <Icon name="lightbulb" size={16} />
        <div>
          <h3>Como ler</h3>
          <p>{guia.comoLer}</p>
        </div>
      </div>

      <div className="ks-guide2__block">
        <h3>Roteiro de leitura</h3>
        <ol className="ks-guide2__steps">
          {guia.passos.map((s, i) => {
            const visto = vistos.has(`${entrada.repo}#${i}`);
            return (
              <li key={i}>
                <button type="button" className={`ks-guide2__step${visto ? ' is-seen' : ''}`} onClick={() => onStep(i)}>
                  <span className="ks-guide2__n">{visto ? <Icon name="check" size={12} /> : i + 1}</span>
                  <span className="ks-guide2__sbody">
                    <strong>{s.titulo}</strong>
                    <span className="ks-guide2__file"><FileIcon pack={pack} path={s.arquivo} className="ks-chip__icon" />{s.arquivo.split('/').pop()}{s.ancora && <code>{s.ancora.length > 28 ? s.ancora.slice(0, 28) + '…' : s.ancora}</code>}</span>
                    <span className="ks-guide2__foco">{s.foco}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {termos.length > 0 && (
        <div className="ks-guide2__block">
          <h3>Conceitos</h3>
          <dl className="ks-guide2__terms">
            {termos.map((t) => (
              <details key={t.termo}>
                <summary><Icon name="chevronRight" size={12} />{t.termo}</summary>
                <dd>{t.explicacao}</dd>
              </details>
            ))}
          </dl>
        </div>
      )}

      {depois && guia.depois && (
        <div className="ks-guide2__block">
          <h3>Depois deste</h3>
          <button type="button" className="ks-guide2__next" onClick={() => onOpenRepo?.(guia.depois!)} disabled={!onOpenRepo}>
            <OwnerAvatar repo={depois.repo} size={32} />
            <span><strong>{depois.repo}</strong><span>{depois.nota}</span></span>
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      )}
    </section>
  );
}

// ---------- estrutura ----------
const CORES = ['blue', 'yellow', 'green', 'mauve', 'peach', 'teal', 'pink'];
const CHAVE = /^(package\.json|go\.mod|Cargo\.toml|pyproject\.toml|requirements\.txt|setup\.py|pom\.xml|build\.gradle(\.kts)?|Gemfile|composer\.json|Makefile|CMakeLists\.txt|Dockerfile|docker-compose\.ya?ml|tsconfig\.json|vite\.config\.\w+|\.github\/workflows\/[^/]+)$/;

function Estrutura({ entries, pack, onPath }: { entries: TreeEntry[]; pack: IconPack; onPath: (p: string) => void }) {
  const { langs, pastas, chaves, total } = useMemo(() => {
    const porLang = new Map<string, number>();
    const porPasta = new Map<string, number>();
    const chaves: string[] = [];
    for (const e of entries) {
      const l = langOf(e.path).label;
      if (!['Texto', 'Ignore', 'Licença', 'Git', 'Lockfile'].includes(l)) porLang.set(l, (porLang.get(l) ?? 0) + 1);
      const i = e.path.indexOf('/');
      if (i > 0) porPasta.set(e.path.slice(0, i), (porPasta.get(e.path.slice(0, i)) ?? 0) + 1);
      if (CHAVE.test(e.path)) chaves.push(e.path);
    }
    const soma = [...porLang.values()].reduce((a, b) => a + b, 0) || 1;
    const langs = [...porLang].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nome, n], k) => ({ nome, pct: (n / soma) * 100, cor: CORES[k % CORES.length]! }));
    const pastas = [...porPasta].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { langs, pastas, chaves: chaves.slice(0, 8), total: entries.length };
  }, [entries]);
  return (
    <section className="ks-struct" aria-label="Estrutura">
      <header className="ks-ov__cardhead"><Icon name="folder" size={14} /><span>Estrutura · {milhar(total)} arquivos</span></header>
      {langs.length > 0 && (
        <div className="ks-struct__langs">
          <div className="ks-struct__bar" aria-hidden="true">
            {langs.map((l) => <span key={l.nome} style={{ width: `${l.pct}%`, background: `var(--ctp-${l.cor})` }} />)}
          </div>
          <ul>
            {langs.map((l) => (
              <li key={l.nome}><i style={{ background: `var(--ctp-${l.cor})` }} />{l.nome}<span>{l.pct < 1 ? '<1' : Math.round(l.pct)}%</span></li>
            ))}
          </ul>
        </div>
      )}
      {pastas.length > 0 && (
        <ul className="ks-struct__list">
          {pastas.map(([nome, n]) => (
            <li key={nome}>
              <button type="button" onClick={() => onPath(nome)}>
                <FileIcon pack={pack} path={nome} dir className="ks-chip__icon" />
                <span>{nome}</span>
                <span className="ks-struct__n">{milhar(n)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {chaves.length > 0 && (
        <>
          <p className="ks-struct__label">Arquivos-chave</p>
          <ul className="ks-struct__list">
            {chaves.map((c) => (
              <li key={c}>
                <button type="button" onClick={() => onPath(c)}>
                  <FileIcon pack={pack} path={c} className="ks-chip__icon" />
                  <span>{c}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ---------- barra do guia (enquanto lê o código) ----------
export function GuideBar({ guia, passo, onStep, onOverview, onClose }: { guia: Guia; passo: number; onStep: (i: number) => void; onOverview: () => void; onClose: () => void }) {
  const s = guia.passos[passo];
  const [aberta, setAberta] = useState(true);
  if (!s) return null;
  return (
    <div className={`ks-guidebar${aberta ? ' is-open' : ''}`} role="region" aria-label="Passo do guia">
      <div className="ks-guidebar__row">
        <span className="ks-guidebar__n">{passo + 1}/{guia.passos.length}</span>
        <button type="button" className="ks-guidebar__title" aria-expanded={aberta} onClick={() => setAberta((v) => !v)}>
          <strong>{s.titulo}</strong>
          <Icon name="chevronDown" size={14} />
        </button>
        <div className="ks-guidebar__nav">
          <button type="button" className="ks-icon-btn" aria-label="Passo anterior" data-tip="Anterior" disabled={passo === 0} onClick={() => onStep(passo - 1)}><Icon name="chevronLeft" /></button>
          <button type="button" className="ks-icon-btn" aria-label="Próximo passo" data-tip="Próximo" disabled={passo === guia.passos.length - 1} onClick={() => onStep(passo + 1)}><Icon name="chevronRight" /></button>
          <button type="button" className="ks-icon-btn" aria-label="Ver o guia inteiro" data-tip="Guia" onClick={onOverview}><Icon name="graduation" /></button>
          <button type="button" className="ks-icon-btn" aria-label="Fechar o guia" data-tip="Fechar" onClick={onClose}><Icon name="x" /></button>
        </div>
      </div>
      {aberta && <p className="ks-guidebar__foco"><Icon name="lightbulb" size={14} />{s.foco}</p>}
    </div>
  );
}
