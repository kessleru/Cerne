// Visão geral de um repositório: a página de introdução antes do código.
// Dados do repositório, o README renderizado (é ele que contextualiza o projeto) e a estrutura.
import { useEffect, useMemo, useState } from 'react';
import { arquivoDeEntrada } from '../lib/entrada';
import { AREAS, entradaDe, extDaLinguagem, useArea, type Area, type Entrada } from '../data/catalogo';
import type { RepoInfo, RepoSource, TreeEntry } from '../data/types';
import { FileIcon } from '../icons/FileIcon';
import { langOf } from '../lib/lang';
import { milhar, relativo } from '../lib/tempo';
import type { IconPack } from '../state/prefs';
import { estudados } from '../state/estudo';
import { MarkdownView } from '../viewers/data';
import { BotaoSalvar, OwnerAvatar } from './Explore';
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
  /** volta ao Estudar, nesta área, com um filtro ligado */
  onEstudar?: (area: Area, campo?: 'dominio' | 'stack', valor?: string) => void;
  /** abre outro repositório (projetos parecidos) */
  onAbrirRepo?: (slug: string) => void;
  /** a árvore não carregou: o README também não vai carregar */
  erroArvore?: string | null;
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
      <Hero {...p} entrada={entrada} readme={readme} />
      <div className="ks-ov__grid">
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
          {!p.entries && p.erroArvore ? (
            <p className="ks-ov__empty">Não deu para ler os arquivos agora. {p.erroArvore}</p>
          ) : !p.entries || (readme && !texto) ? (
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
          {entrada?.area && p.onAbrirRepo && <Parecidos entrada={entrada} pack={p.pack} onAbrir={p.onAbrirRepo} />}
          {p.entries && <Estrutura entries={p.entries} pack={p.pack} onPath={p.onPath} />}
        </aside>
      </div>
    </div>
  );
}

// ---------- etiquetas e projetos parecidos ----------
/** Etiqueta que, com onClick, vira um atalho para o Estudar filtrado. */
function Etiqueta({ texto, dica, onClick, fraca = false }: { texto: string; dica: string; onClick?: () => void; fraca?: boolean }) {
  const cls = `ks-ov__tag${fraca ? ' is-fraca' : ''}`;
  if (!onClick) return <span className={cls}>{texto}</span>;
  return (
    <button type="button" className={`${cls} is-link`} data-tip={dica} onClick={onClick}>
      {texto}
    </button>
  );
}

/** Outros projetos do Estudar para comparar: mesmo assunto, stack e temas parecidos. */
function Parecidos({ entrada, pack, onAbrir }: { entrada: Entrada; pack: IconPack; onAbrir: (slug: string) => void }) {
  const area = useArea(entrada.area ?? null);
  const lista = useMemo(() => {
    if (!area) return [];
    const stack = new Set(entrada.stack ?? []);
    const temas = new Set(entrada.temas);
    return area.repos
      .filter((e) => e.repo !== entrada.repo)
      .map((e) => {
        let p = 0;
        if (entrada.dominio && e.dominio === entrada.dominio) p += 5;
        for (const x of e.stack ?? []) if (stack.has(x)) p += 1.5;
        for (const x of e.temas) if (temas.has(x)) p += 1;
        if (e.lang === entrada.lang) p += 1;
        return { e, p: p + (e.readme ?? 0) / 40 };
      })
      .filter((x) => x.p >= 3)
      .sort((a, b) => b.p - a.p)
      .slice(0, 5)
      .map((x) => x.e);
  }, [area, entrada]);
  if (!lista.length) return null;
  return (
    <section className="ks-ov__card ks-ov__parecidos" aria-label="Parecidos para estudar">
      <header className="ks-ov__cardhead">
        <Icon name="graduation" size={14} />
        <span>Parecidos para estudar</span>
      </header>
      <ul>
        {lista.map((e) => {
          const [dono, nome] = e.repo.split('/');
          return (
            <li key={e.repo}>
              <button type="button" onClick={() => onAbrir(e.repo)}>
                <OwnerAvatar repo={e.repo} size={28} />
                <span className="ks-ov__pnome">
                  <span><em>{dono}/</em>{nome}</span>
                  <span className="ks-ov__pnota">{e.nota}</span>
                </span>
                <FileIcon pack={pack} path={`x.${extDaLinguagem(e.lang)}`} className="ks-chip__icon" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- topo ----------
function Hero({ owner, repo, info, entrada, readme, pack, onPath, entries, onEstudar }: Props & { entrada: Entrada | null; readme: string | null }) {
  const feitos = estudados.use();
  const slug = `${owner}/${repo}`;
  const feito = feitos.has(entrada?.repo ?? slug);
  const lang = info?.language ?? entrada?.lang ?? null;
  const stats: { icon: IconName; texto: string; tip: string }[] = [];
  if (info?.stars !== undefined) stats.push({ icon: 'star', texto: milhar(info.stars), tip: 'Estrelas' });
  if (info?.forks !== undefined) stats.push({ icon: 'fork', texto: milhar(info.forks), tip: 'Forks' });
  if (info?.license) stats.push({ icon: 'scale', texto: info.license, tip: 'Licença' });
  if (info?.pushedAt) stats.push({ icon: 'history', texto: relativo(info.pushedAt), tip: 'Último envio' });
  // começa pelo ponto de entrada do projeto; o README já está aqui embaixo, então é só o último recurso
  const entradaAchada = useMemo(() => (entries ? arquivoDeEntrada(entries.map((e) => e.path)) : null), [entries]);
  const inicio = entrada?.start ?? entradaAchada ?? readme;
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
          {entrada?.area && (
            <li>
              <Etiqueta texto={AREAS.find((a) => a.id === entrada.area)?.titulo ?? ''} dica="Ver projetos desta área" onClick={onEstudar && (() => onEstudar(entrada.area!))} />
            </li>
          )}
          {entrada?.area && entrada.dominio && (
            <li>
              <Etiqueta texto={entrada.dominio} dica={`Outros projetos de ${entrada.dominio}`} onClick={onEstudar && (() => onEstudar(entrada.area!, 'dominio', entrada.dominio))} />
            </li>
          )}
          {info?.archived && <li className="ks-ov__arch">arquivado</li>}
        </ul>
        {entrada?.area && (entrada.stack?.length ?? 0) > 0 && (
          <div className="ks-ov__stack" aria-label="Stack">
            {entrada.stack!.slice(0, 6).map((x) => (
              <Etiqueta key={x} texto={x} fraca dica={`Outros projetos com ${x}`} onClick={onEstudar && (() => onEstudar(entrada.area!, 'stack', x))} />
            ))}
          </div>
        )}
        {info?.topics && info.topics.length > 0 && (
          <div className="ks-ov__topics">{info.topics.slice(0, 8).map((t) => <span key={t}>{t}</span>)}</div>
        )}
      </div>
      <div className="ks-ov__actions">
        {inicio && (
          <button type="button" className="key key--accent" onClick={() => onPath(inicio)}><Icon name="code" size={14} /> Ver o código</button>
        )}
        <div className="ks-ov__minor">
          <BotaoSalvar repo={slug} nota={info?.description ?? entrada?.nota ?? undefined} lang={lang ?? undefined} grande />
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
