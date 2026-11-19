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
          <h2 id="conta-titulo">{logado ? 'Perfil' : 'Entrar'}</h2>
          <button ref={closeRef} type="button" className="ks-icon-btn" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="ks-account__body">
          {logado && estado.status === 'ok' ? (
            <Perfil
              estado={estado}
              onTrocar={() => setTrocando(true)}
              onSair={() => { sair(); toast('Você saiu.'); }}
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
          <span>Sair apaga o token só daqui. No GitHub ele vale até vencer.</span>
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
        <p className="ks-repos__empty">{q ? 'Nenhum repositório combina.' : 'Nenhum repositório neste token.'}</p>
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
    ? ''
    : formato === 'fine-grained'
      ? 'Fine-grained'
      : formato === 'clássico'
        ? 'Clássico'
        : formato === 'outro'
          ? 'Token do GitHub'
          : 'Não parece um token. Copiou inteiro?';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || busy) return;
    setBusy(true);
    setErro(null);
    try {
      const conta = await entrar(texto, lembrar);
      setTexto('');
      toast(`Olá, ${conta.nome ?? conta.login}.`);
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
            <span><strong>Token expirado.</strong> {aviso}</span>
          </p>
        )}
        <div className="ks-login__hero">
          <span className="ks-login__mark"><Icon name="key" size={22} /></span>
          <div>
            <h3 id="login-titulo">{trocando ? 'Trocar o token' : 'Entre com um token do GitHub'}</h3>
            <p>Crie no GitHub e cole aqui. Leva 1 minuto.</p>
          </div>
        </div>

        <ul className="ks-login__perks" aria-label="O que o token libera">
          <Perk icon="zap" title="5 000/h" tip="Chamadas por hora (sem token: 60)" />
          <Perk icon="lock" title="Privados" tip="Os repositórios que você liberar no token" />
          <Perk icon="shield" title="Só aqui" tip="Sem servidor: o token fica neste navegador e só vai no cabeçalho para api.github.com" />
        </ul>

        <form className="ks-login__form" onSubmit={submit}>
          <label htmlFor="conta-token" className="ks-login__label">Token</label>
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
              <strong>Lembrar</strong>
              <span>{lembrar ? 'Neste navegador' : 'Só nesta aba'}</span>
            </span>
          </label>
          <div className="ks-login__buttons">
            {onCancelar && <button type="button" className="key" onClick={onCancelar}>Cancelar</button>}
            <button type="submit" className="key key--accent ks-login__submit" disabled={!texto.trim() || busy} aria-busy={busy}>
              {busy ? 'Conferindo…' : trocando ? 'Usar este token' : 'Entrar'}
            </button>
          </div>
        </form>

      </section>

      <Guide tipo={tipo} onTipo={setTipo} onIrAoCampo={() => { input.current?.focus(); input.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }} />
    </div>
  );
}

function Perk({ icon, title, tip }: { icon: IconName; title: string; tip: string }) {
  return (
    <li data-tip={tip} tabIndex={0} aria-label={`${title}: ${tip}`}>
      <Icon name={icon} size={14} />
      {title}
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
          <strong>Abrir o formulário pronto</strong>
          <span>{fine ? 'Nome, 90 dias e só leitura já marcados' : 'Nome e escopo repo já marcados'}</span>
        </span>
        <Icon name="external" size={16} />
      </a>
      <p className="ks-guide__or"><span>ou passo a passo</span></p>

      <ol className="ks-guide__steps">
        <Step n={1} title="Settings > Developer settings" text={<>Sua foto, no canto de cima.</>}>
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
          title="Generate new token"
          text={fine ? <>Em Personal access tokens &gt; <b>Fine-grained tokens</b>.</> : <>Em Personal access tokens &gt; <b>Tokens (classic)</b>.</>}
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

        <Step n={3} title="Nome e prazo" text={<><b>Cerne</b> e <b>90 days</b> servem.</>}>
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
          <Step n={4} title="Repositórios" text={<>Públicos já bastam. Para privados, <b>Only select repositories</b>.</>}>
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
          <Step n={4} title="Escopos" text={<>Públicos: nada. Privados: <b>repo</b> (lê e escreve em tudo; prefira o fine-grained).</>}>
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
          <Step n={5} title="Contents: Read-only" text={<>Em Permissions. O resto fica como está.</>}>
            <Shot url="github.com/settings/personal-access-tokens/new" caption="Permissions">
              <div className="ks-shot__form">
                <span className="ks-shot__label">Permissions <span className="ks-shot__btn is-small">+ Add permissions</span></span>
                <span className="ks-shot__perm is-hl"><span>Contents</span><span className="ks-shot__input is-select is-small">Read-only<Icon name="chevronDown" size={10} /></span><Cursor /></span>
                <span className="ks-shot__perm"><span>Metadata</span><span className="ks-shot__tag">Read-only · obrigatório</span></span>
              </div>
            </Shot>
          </Step>
        )}

        <Step n={fine ? 6 : 5} title="Gere e copie" text={<>Ele aparece <b>uma vez só</b>.</>}>
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
            <h4>Cole e entre</h4>
            <button type="button" className="key" onClick={onIrAoCampo}><Icon name="arrowDown" size={14} /> Ir para o campo</button>
          </div>
        </li>
      </ol>

      <div className="ks-guide__faq">
        <h4>Dúvidas</h4>
        <Faq q="É seguro?">
          O Cerne não tem servidor. O token fica neste navegador e só vai ao api.github.com, no cabeçalho. Use só leitura e prazo curto.
        </Faq>
        <Faq q="Preciso para públicos?">
          Não. Sem token são 60 chamadas por hora; com token, 5 000.
        </Faq>
        <Faq q="Repositório de organização">
          Escolha a organização em <b>Resource owner</b>. Algumas pedem aprovação ou SSO (<b>Configure SSO</b>).
        </Faq>
        <Faq q="Venceu ou deu erro">
          Gere outro e use <b>Trocar token</b>. Erro em privado: o repositório não está no <b>Repository access</b>.
        </Faq>
        <Faq q="Como apago?">
          Aqui: <b>Sair</b>. No GitHub: <b>Delete</b> na lista de tokens.
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
