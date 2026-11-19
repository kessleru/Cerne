import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { tipoDoToken, type RepoDaConta } from '../data/github/conta';
import { fuzzyMatch } from '../lib/fuzzy';
import { milhar, relativo } from '../lib/tempo';
import { carregarRepos, entrar, sair, useConta, useRepos } from '../state/account';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { toast, trapTab, useOrigin } from './parts';

// Janela "Conta do GitHub": entrar com um token (com guia ilustrado de como criar um) ou ver o perfil.

type Tipo = 'fine' | 'classic';

const DESCRICAO = 'Leitura de repositórios no Cerne (kessleru.github.io/Cerne)';
/** Formulário do GitHub já preenchido: nome, descrição, 90 dias e Contents só leitura. */
const URL_FINE = `https://github.com/settings/personal-access-tokens/new?name=Cerne&description=${encodeURIComponent(DESCRICAO)}&expires_in=90&contents=read`;
const URL_CLASSIC = `https://github.com/settings/tokens/new?description=Cerne&scopes=repo`;
const URL_TOKENS = 'https://github.com/settings/personal-access-tokens';

export function Account({ onClose, origin, onOpenRepo }: { onClose: () => void; origin?: { x: number; y: number } | null; onOpenRepo?: (slug: string) => void }) {
  const estado = useConta();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [trocando, setTrocando] = useState(false);
  useOrigin(panel, origin);

  const logado = estado.status === 'ok' && !trocando;

  useEffect(() => {
    if (logado) closeRef.current?.focus();
  }, [logado]);

  return (
    <div className="ks-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        className={`ks-account${logado ? ' is-profile' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conta-titulo"
        onKeyDown={(e) => {
          trapTab(e);
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header className="ks-prefs__head">
          <h2 id="conta-titulo">{logado ? 'Seu perfil no GitHub' : 'Entrar no GitHub'}</h2>
          <button ref={closeRef} type="button" className="ks-icon-btn" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="ks-account__body">
          {logado && estado.status === 'ok' ? (
            <Perfil
              estado={estado}
              onTrocar={() => setTrocando(true)}
              onSair={() => { sair(); toast('Você saiu. O token foi apagado deste navegador.'); }}
              onOpenRepo={onOpenRepo ? (slug) => { onClose(); onOpenRepo(slug); } : undefined}
            />
          ) : (
            <Login
              aviso={estado.status === 'invalido' ? estado.erro : null}
              trocando={trocando}
              onCancelar={trocando ? () => setTrocando(false) : undefined}
              onEntrou={() => setTrocando(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Perfil ----------
type EstadoOk = Extract<ReturnType<typeof useConta>, { status: 'ok' }>;

function Perfil({ estado, onTrocar, onSair, onOpenRepo }: { estado: EstadoOk; onTrocar: () => void; onSair: () => void; onOpenRepo?: (slug: string) => void }) {
  const c = estado.conta;
  const tipo = c.tipo === 'fine-grained' ? 'Fine-grained' : c.tipo === 'clássico' ? 'Clássico' : 'Outro';
  const repos = c.reposPublicos !== undefined ? c.reposPublicos + (c.reposPrivados ?? 0) : undefined;
  const site = c.site ? c.site.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
  return (
    <div className="ks-profile">
      <section className="ks-profile__card" aria-label="Perfil">
        <a className="ks-profile__photo" href={c.perfil} target="_blank" rel="noopener noreferrer" aria-label={`Abrir o perfil de @${c.login} no GitHub`}>
          <Avatar conta={c} size={96} className="ks-profile__avatar" />
        </a>
        <div className="ks-profile__who">
          <strong>{c.nome ?? c.login}</strong>
          <span className="ks-profile__login">@{c.login}</span>
          {c.bio && <p className="ks-profile__bio">{c.bio}</p>}
          <ul className="ks-profile__meta">
            {c.empresa && <li><Icon name="building" size={14} />{c.empresa}</li>}
            {c.local && <li><Icon name="mapPin" size={14} />{c.local}</li>}
            {site && c.site && <li><Icon name="link" size={14} /><a href={c.site} target="_blank" rel="noopener noreferrer nofollow">{site}</a></li>}
            {c.desde && <li><Icon name="calendar" size={14} />No GitHub desde {new Date(c.desde).getFullYear()}</li>}
          </ul>
          <ul className="ks-profile__stats">
            {c.seguidores !== undefined && <li><b>{milhar(c.seguidores)}</b> {c.seguidores === 1 ? 'seguidor' : 'seguidores'}</li>}
            {c.seguindo !== undefined && <li><b>{milhar(c.seguindo)}</b> seguindo</li>}
            {repos !== undefined && <li><b>{milhar(repos)}</b> {repos === 1 ? 'repositório' : 'repositórios'}</li>}
          </ul>
          <a className="key key--accent ks-profile__gh" href={c.perfil} target="_blank" rel="noopener noreferrer">
            Ver perfil no GitHub <Icon name="external" size={14} />
          </a>
        </div>
      </section>

      <RepoList onOpenRepo={onOpenRepo} />

      <details className="ks-profile__token">
        <summary>
          <Icon name="chevronRight" size={14} />
          <Icon name="key" size={14} />
          <span>Token e sessão</span>
          <span className="ks-badge is-ok"><Icon name="check" size={12} /> {milhar(c.limite ?? 5000)} chamadas por hora</span>
        </summary>
        <dl className="ks-profile__facts">
          <div><dt>Tipo do token</dt><dd>{tipo}</dd></div>
          <div><dt>Guardado</dt><dd>{estado.lembrado ? 'Neste navegador, até você sair' : 'Só nesta aba, some ao fechar'}</dd></div>
          {c.escopos && <div><dt>Escopos</dt><dd>{c.escopos.length ? c.escopos.join(', ') : 'nenhum (só repositórios públicos)'}</dd></div>}
        </dl>
        <div className="ks-profile__actions">
          <button type="button" className="key" onClick={onTrocar}><Icon name="refresh" size={14} /> Trocar token</button>
          <a className="key" href={URL_TOKENS} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> Tokens no GitHub</a>
          <button type="button" className="key ks-profile__out" onClick={onSair}><Icon name="logOut" size={14} /> Sair</button>
        </div>
        <p className="ks-account__fine">
          <Icon name="shield" size={14} />
          <span>Sair apaga o token deste navegador. No GitHub ele continua valendo até vencer ou ser apagado em Tokens no GitHub.</span>
        </p>
      </details>
    </div>
  );
}

/** Cor da bolinha da linguagem (só tokens do Catppuccin). */
const COR_LINGUAGEM: Record<string, string> = {
  TypeScript: 'blue', JavaScript: 'yellow', Python: 'sapphire', Go: 'sky', Rust: 'peach', Java: 'maroon', 'C#': 'mauve',
  'C++': 'pink', C: 'overlay-2', HTML: 'red', CSS: 'lavender', SCSS: 'pink', Shell: 'green', PowerShell: 'blue', Lua: 'blue',
  Ruby: 'red', PHP: 'lavender', Kotlin: 'mauve', Swift: 'peach', Dart: 'teal', Vue: 'green', Svelte: 'peach', 'Jupyter Notebook': 'peach',
};

function RepoList({ onOpenRepo }: { onOpenRepo?: (slug: string) => void }) {
  const r = useRepos();
  const [q, setQ] = useState('');
  const lista = useMemo(() => (q.trim() ? r.lista.filter((x) => fuzzyMatch(q.trim(), x.nome)) : r.lista), [q, r.lista]);
  return (
    <section className="ks-repos" aria-labelledby="repos-titulo">
      <div className="ks-repos__head">
        <h3 id="repos-titulo">Seus repositórios {r.status === 'ok' && <span className="ks-repos__count">{r.lista.length}</span>}</h3>
        <input className="ks-input ks-repos__filter" placeholder="Filtrar repositórios" aria-label="Filtrar repositórios" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {r.status === 'carregando' && !r.lista.length ? (
        <ul className="ks-repos__list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <li key={i} className="ks-repos__skel"><span /><span /></li>)}
        </ul>
      ) : r.status === 'erro' ? (
        <p className="ks-repos__empty">
          Não deu para ler os repositórios: {r.erro} <button type="button" className="ks-linkbtn" onClick={() => carregarRepos(true)}>Tentar de novo</button>
        </p>
      ) : lista.length === 0 ? (
        <p className="ks-repos__empty">{q ? 'Nenhum repositório combina.' : 'Nenhum repositório que este token enxergue. Confira o Repository access do token.'}</p>
      ) : (
        <ul className="ks-repos__list">
          {lista.map((x) => <RepoRow key={x.nome} repo={x} onOpen={onOpenRepo} />)}
        </ul>
      )}
    </section>
  );
}

function RepoRow({ repo, onOpen }: { repo: RepoDaConta; onOpen?: (slug: string) => void }) {
  const [dono, nome] = repo.nome.split('/');
  const corpo = (
    <>
      <Icon name={repo.privado ? 'lock' : 'book'} size={16} className="ks-repos__icon" />
      <span className="ks-repos__main">
        <span className="ks-repos__name"><span className="ks-repos__owner">{dono}/</span>{nome}</span>
        {repo.descricao && <span className="ks-repos__desc">{repo.descricao}</span>}
        <span className="ks-repos__meta">
          {repo.privado && <span className="ks-repos__tag">privado</span>}
          {repo.fork && <span className="ks-repos__tag">fork</span>}
          {repo.linguagem && <span><i className="ks-repos__lang" style={{ background: `var(--ctp-${COR_LINGUAGEM[repo.linguagem] ?? 'overlay-1'})` }} />{repo.linguagem}</span>}
          {repo.estrelas > 0 && <span><Icon name="star" size={12} />{milhar(repo.estrelas)}</span>}
          {repo.atualizado && <span>{relativo(repo.atualizado)}</span>}
        </span>
      </span>
    </>
  );
  return (
    <li className="ks-repos__row">
      {onOpen ? (
        <button type="button" className="ks-repos__item" onClick={() => onOpen(repo.nome)}>
          {corpo}
          <span className="ks-repos__go">Abrir no Cerne <Icon name="arrowRight" size={14} /></span>
        </button>
      ) : (
        <div className="ks-repos__item">{corpo}</div>
      )}
      <a className="ks-icon-btn ks-repos__ext" href={`https://github.com/${repo.nome}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${repo.nome} no GitHub`} data-tip="Abrir no GitHub">
        <Icon name="external" size={14} />
      </a>
    </li>
  );
}

// ---------- Entrar ----------
function Login({ aviso, trocando, onCancelar, onEntrou }: { aviso: string | null; trocando: boolean; onCancelar?: () => void; onEntrou: () => void }) {
  const [texto, setTexto] = useState('');
  const [ver, setVer] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<Tipo>('fine');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  const formato = tipoDoToken(texto);
  const dica = !texto.trim()
    ? 'Começa com github_pat_ (fine-grained) ou ghp_ (clássico).'
    : formato === 'fine-grained'
      ? 'Formato de token fine-grained. Agora é só entrar.'
      : formato === 'clássico'
        ? 'Formato de token clássico. Agora é só entrar.'
        : formato === 'outro'
          ? 'Parece um token do GitHub. Vou conferir ao entrar.'
          : 'Isso não parece um token do GitHub. Confira se copiou ele inteiro.';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || busy) return;
    setBusy(true);
    setErro(null);
    try {
      const conta = await entrar(texto, lembrar);
      setTexto('');
      toast(`Olá, ${conta.nome ?? conta.login}. Agora são ${milhar(conta.limite ?? 5000)} chamadas por hora.`);
      onEntrou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível conferir o token.');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ks-login">
      <section className="ks-login__card" aria-labelledby="login-titulo">
        {aviso && (
          <p className="ks-account__warn" role="alert">
            <Icon name="alert" size={16} />
            <span><strong>O token guardado parou de funcionar.</strong> {aviso}</span>
          </p>
        )}
        <div className="ks-login__hero">
          <span className="ks-login__mark"><Icon name="key" size={22} /></span>
          <div>
            <h3 id="login-titulo">{trocando ? 'Trocar o token' : 'Entre com um token do GitHub'}</h3>
            <p>Sem senha nem cadastro: você cria um token pessoal no GitHub (leva 1 minuto) e cola aqui.</p>
          </div>
        </div>

        <ul className="ks-login__perks">
          <Perk icon="zap" title="5 000 chamadas por hora">Sem token são só 60, e cada pasta aberta gasta algumas.</Perk>
          <Perk icon="lock" title="Repositórios privados">Só os que você liberar ao criar o token.</Perk>
          <Perk icon="shield" title="Só leitura, só aqui">O Cerne não tem servidor: o token fica neste navegador.</Perk>
        </ul>

        <form className="ks-login__form" onSubmit={submit}>
          <label htmlFor="conta-token" className="ks-login__label">Token de acesso pessoal</label>
          <div className={`ks-login__field${erro ? ' is-error' : ''}`}>
            <Icon name="key" />
            <input
              ref={input}
              id="conta-token"
              className="ks-login__input"
              type={ver ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              placeholder="github_pat_… ou ghp_…"
              value={texto}
              aria-describedby="conta-dica"
              aria-invalid={!!erro || undefined}
              onChange={(e) => { setTexto(e.target.value); setErro(null); }}
            />
            <button type="button" className="ks-icon-btn" aria-label={ver ? 'Esconder o token' : 'Mostrar o token'} aria-pressed={ver} onClick={() => setVer((v) => !v)}>
              <Icon name={ver ? 'eyeOff' : 'eye'} />
            </button>
          </div>
          <p id="conta-dica" className={`ks-login__hint${formato === null && texto.trim() ? ' is-warn' : formato ? ' is-ok' : ''}`} aria-live="polite">
            {formato && <Icon name="check" size={12} />} {dica}
          </p>
          {erro && (
            <p className="ks-login__error" role="alert">
              <Icon name="alert" size={14} /> {erro}
            </p>
          )}
          <label className="ks-login__remember">
            <input className="ks-switch" type="checkbox" role="switch" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            <span>
              <strong>Lembrar neste navegador</strong>
              <span>{lembrar ? 'Você continua conectado ao voltar. Desligue em computador compartilhado.' : 'O token some ao fechar a aba.'}</span>
            </span>
          </label>
          <div className="ks-login__buttons">
            {onCancelar && <button type="button" className="key" onClick={onCancelar}>Cancelar</button>}
            <button type="submit" className="key key--accent ks-login__submit" disabled={!texto.trim() || busy} aria-busy={busy}>
              {busy ? 'Conferindo no GitHub…' : trocando ? 'Usar este token' : 'Entrar'}
            </button>
          </div>
        </form>

        <p className="ks-account__fine">
          <Icon name="shield" size={14} />
          <span>O token só vai no cabeçalho das chamadas para api.github.com. Nunca entra em links, histórico, logs nem no cache offline.</span>
        </p>
      </section>

      <Guide tipo={tipo} onTipo={setTipo} onIrAoCampo={() => { input.current?.focus(); input.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }} />
    </div>
  );
}

function Perk({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <li>
      <span className="ks-login__perkicon"><Icon name={icon} size={16} /></span>
      <span><strong>{title}</strong><span>{children}</span></span>
    </li>
  );
}

// ---------- Guia: como criar o token ----------
function Guide({ tipo, onTipo, onIrAoCampo }: { tipo: Tipo; onTipo: (t: Tipo) => void; onIrAoCampo: () => void }) {
  const fine = tipo === 'fine';
  return (
    <section className="ks-guide" aria-labelledby="guia-titulo">
      <div className="ks-guide__head">
        <h3 id="guia-titulo">Como criar o token</h3>
        <div className="ks-segmented" role="group" aria-label="Tipo de token">
          <button type="button" aria-pressed={fine} onClick={() => onTipo('fine')}>Fine-grained <span className="ks-guide__rec">recomendado</span></button>
          <button type="button" aria-pressed={!fine} onClick={() => onTipo('classic')}>Clássico</button>
        </div>
      </div>

      <a className="ks-guide__cta" href={fine ? URL_FINE : URL_CLASSIC} target="_blank" rel="noopener noreferrer">
        <span className="ks-guide__ctaicon"><Icon name="zap" size={18} /></span>
        <span>
          <strong>Atalho: abrir o GitHub com o formulário pronto</strong>
          <span>{fine ? 'Nome, prazo de 90 dias e leitura de conteúdo já marcados. Confira, escolha os repositórios e gere.' : 'Nome e o escopo repo já marcados. Confira o prazo e gere.'}</span>
        </span>
        <Icon name="external" size={16} />
      </a>
      <p className="ks-guide__or"><span>ou siga o passo a passo</span></p>

      <ol className="ks-guide__steps">
        <Step n={1} title="Abra as configurações de desenvolvedor" text={<>No GitHub, clique na <b>sua foto</b> no canto de cima, depois em <b>Settings</b>. No fim do menu da esquerda, entre em <b>Developer settings</b>.</>}>
          <Shot url="github.com" caption="Foto > Settings">
            <div className="ks-shot__top">
              <span className="ks-shot__logo" />
              <span className="ks-shot__line is-w20" />
              <span className="ks-shot__grow" />
              <span className="ks-shot__avatar is-hl"><Icon name="user" size={12} /></span>
            </div>
            <div className="ks-shot__menu">
              <span className="ks-shot__menuitem">Your profile</span>
              <span className="ks-shot__menuitem">Your repositories</span>
              <span className="ks-shot__menuitem is-hl">Settings<Cursor /></span>
              <span className="ks-shot__menuitem">Sign out</span>
            </div>
          </Shot>
        </Step>

        <Step
          n={2}
          title={fine ? 'Fine-grained tokens > Generate new token' : 'Tokens (classic) > Generate new token'}
          text={fine
            ? <>No menu da esquerda, abra <b>Personal access tokens</b>, escolha <b>Fine-grained tokens</b> e clique em <b>Generate new token</b>.</>
            : <>Abra <b>Personal access tokens</b>, escolha <b>Tokens (classic)</b>, clique em <b>Generate new token</b> e depois em <b>Generate new token (classic)</b>.</>}
        >
          <Shot url={fine ? 'github.com/settings/personal-access-tokens' : 'github.com/settings/tokens'} caption="Developer settings">
            <div className="ks-shot__split">
              <div className="ks-shot__side">
                <span className="ks-shot__sideitem">GitHub Apps</span>
                <span className="ks-shot__sideitem">OAuth Apps</span>
                <span className="ks-shot__sideitem is-open">Personal access tokens</span>
                <span className={`ks-shot__sideitem is-sub${fine ? ' is-hl' : ''}`}>Fine-grained tokens</span>
                <span className={`ks-shot__sideitem is-sub${fine ? '' : ' is-hl'}`}>Tokens (classic)</span>
              </div>
              <div className="ks-shot__main">
                <div className="ks-shot__row">
                  <span className="ks-shot__title">{fine ? 'Fine-grained personal access tokens' : 'Personal access tokens (classic)'}</span>
                  <span className="ks-shot__btn is-primary is-hl">Generate new token<Cursor /></span>
                </div>
                <span className="ks-shot__line is-w80" />
                <span className="ks-shot__line is-w60" />
              </div>
            </div>
          </Shot>
        </Step>

        <Step n={3} title="Dê um nome e um prazo" text={<>{fine ? <>Em <b>Token name</b></> : <>Em <b>Note</b></>} escreva <b>Cerne</b> (qualquer nome serve). Em <b>Expiration</b>, 90 dias é um bom meio-termo: quando vencer, é só gerar outro.</>}>
          <Shot url={fine ? 'github.com/settings/personal-access-tokens/new' : 'github.com/settings/tokens/new'} caption="Nome e prazo">
            <div className="ks-shot__form">
              <span className="ks-shot__label">{fine ? 'Token name' : 'Note'}</span>
              <span className="ks-shot__input is-hl">Cerne<span className="ks-shot__caret" /></span>
              <span className="ks-shot__label">Expiration</span>
              <span className="ks-shot__input is-select">90 days<Icon name="chevronDown" size={12} /></span>
              {fine && <><span className="ks-shot__label">Description</span><span className="ks-shot__input is-muted">Leitura de repositórios no Cerne</span></>}
            </div>
          </Shot>
        </Step>

        {fine ? (
          <Step n={4} title="Escolha os repositórios" text={<>Em <b>Repository access</b>: <b>Public repositories</b> já basta para subir a cota. Para ler <b>privados</b>, marque <b>All repositories</b> ou <b>Only select repositories</b> e escolha quais.</>}>
            <Shot url="github.com/settings/personal-access-tokens/new" caption="Repository access">
              <div className="ks-shot__form">
                <span className="ks-shot__label">Repository access</span>
                <span className="ks-shot__radio">Public repositories <em>só públicos</em></span>
                <span className="ks-shot__radio">All repositories</span>
                <span className="ks-shot__radio is-on is-hl">Only select repositories<Cursor /></span>
                <span className="ks-shot__input is-select is-indent">Select repositories<Icon name="chevronDown" size={12} /></span>
              </div>
            </Shot>
          </Step>
        ) : (
          <Step n={4} title="Marque os escopos" text={<>Só repositórios <b>públicos</b>? Não marque nada. Para <b>privados</b>, marque <b>repo</b>. Atenção: no clássico, repo dá leitura <b>e escrita</b> em todos os seus repositórios. Por isso o fine-grained é mais seguro.</>}>
            <Shot url="github.com/settings/tokens/new" caption="Select scopes">
              <div className="ks-shot__form">
                <span className="ks-shot__label">Select scopes</span>
                <span className="ks-shot__check is-on is-hl">repo <em>repositórios privados</em><Cursor /></span>
                <span className="ks-shot__check is-sub is-on">repo:status</span>
                <span className="ks-shot__check is-sub is-on">public_repo</span>
                <span className="ks-shot__check">workflow</span>
                <span className="ks-shot__check">admin:org</span>
              </div>
            </Shot>
          </Step>
        )}

        {fine && (
          <Step n={5} title="Permissão: Contents, só leitura" text={<>Em <b>Permissions</b>, clique em <b>Add permissions</b>, escolha <b>Contents</b> e deixe em <b>Read-only</b>. <b>Metadata</b> entra sozinho. Não precisa de mais nada (o atalho acima já faz isso).</>}>
            <Shot url="github.com/settings/personal-access-tokens/new" caption="Permissions">
              <div className="ks-shot__form">
                <span className="ks-shot__label">Permissions <span className="ks-shot__btn is-small">+ Add permissions</span></span>
                <span className="ks-shot__perm is-hl"><span>Contents</span><span className="ks-shot__input is-select is-small">Read-only<Icon name="chevronDown" size={10} /></span><Cursor /></span>
                <span className="ks-shot__perm"><span>Metadata</span><span className="ks-shot__tag">Read-only · obrigatório</span></span>
              </div>
            </Shot>
          </Step>
        )}

        <Step n={fine ? 6 : 5} title="Gere e copie o token" text={<>Clique em <b>Generate token</b> no fim da página. O GitHub mostra o token <b>uma única vez</b>: copie na hora. Se perder, é só gerar outro.</>}>
          <Shot url={fine ? 'github.com/settings/personal-access-tokens' : 'github.com/settings/tokens'} caption="Token gerado">
            <div className="ks-shot__form">
              <span className="ks-shot__notice"><Icon name="check" size={12} /> Make sure to copy your token now.</span>
              <span className="ks-shot__token">
                <code>{fine ? 'github_pat_11ABCDE…' : 'ghp_a1B2c3D4e5…'}</code>
                <span className="ks-shot__copy is-hl"><Icon name="copy" size={12} /><Cursor /></span>
              </span>
            </div>
          </Shot>
        </Step>

        <li className="ks-step is-last">
          <span className="ks-step__n">{fine ? 7 : 6}</span>
          <div className="ks-step__text">
            <h4>Cole aqui e entre</h4>
            <p>Cole no campo <b>Token de acesso pessoal</b> e clique em <b>Entrar</b>. O Cerne confere com o GitHub e mostra sua foto.</p>
            <button type="button" className="key" onClick={onIrAoCampo}><Icon name="arrowDown" size={14} /> Ir para o campo</button>
          </div>
        </li>
      </ol>

      <div className="ks-guide__faq">
        <h4>Dúvidas comuns</h4>
        <Faq q="É seguro colar meu token aqui?">
          O Cerne é um site estático, sem servidor. O token fica no armazenamento do seu navegador e só é enviado ao api.github.com, no cabeçalho. Para ficar ainda mais tranquilo, use só leitura e um prazo curto.
        </Faq>
        <Faq q="Preciso de token para repositórios públicos?">
          Não. Sem token tudo funciona, mas o GitHub libera só 60 chamadas por hora (abrir pastas, arquivos e histórico gasta algumas). Com token, são 5 000.
        </Faq>
        <Faq q="O repositório é de uma organização">
          Ao criar o fine-grained, escolha a organização em <b>Resource owner</b>. Algumas organizações precisam aprovar o token antes. No clássico, se a organização usa SSO, clique em <b>Configure SSO</b> ao lado do token e autorize.
        </Faq>
        <Faq q="O token venceu ou apareceu erro">
          Gere outro no GitHub (o mesmo token não aparece de novo) e use <b>Trocar token</b> aqui. Erro de acesso a um repositório privado quase sempre é o token sem esse repositório em <b>Repository access</b>.
        </Faq>
        <Faq q="Como apago o token de vez?">
          Aqui, <b>Sair</b> apaga do navegador. No GitHub, em Settings &gt; Developer settings &gt; Personal access tokens, clique em <b>Delete</b> ao lado dele.
        </Faq>
      </div>
    </section>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: ReactNode; children: ReactNode }) {
  return (
    <li className="ks-step">
      <span className="ks-step__n">{n}</span>
      <div className="ks-step__text">
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
      {children}
    </li>
  );
}

/** Ilustração esquemática de uma tela do GitHub, numa janela de navegador. O destaque mostra onde clicar. */
function Shot({ url, caption, children }: { url: string; caption: string; children: ReactNode }) {
  return (
    <figure className="ks-shot" aria-label={`Ilustração: ${caption}`}>
      <div className="ks-shot__bar" aria-hidden="true">
        <span className="ks-shot__dots"><i /><i /><i /></span>
        <span className="ks-shot__url"><Icon name="lock" size={10} />{url}</span>
      </div>
      <div className="ks-shot__page" aria-hidden="true">{children}</div>
    </figure>
  );
}

function Cursor() {
  return <Icon name="pointer" size={16} className="ks-shot__cursor" />;
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="ks-faq">
      <summary><Icon name="chevronRight" size={14} />{q}</summary>
      <p>{children}</p>
    </details>
  );
}
