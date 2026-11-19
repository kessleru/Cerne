// Vitrine da página inicial: carrossel de repositórios, números do catálogo, leitor de código que troca
// de linguagem sozinho e os temas de estudo. Animações param com movimento reduzido.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGO, NUMEROS, TRILHAS, type Entrada, type Trilha } from '../data/catalogo';
import { FileIcon } from '../icons/FileIcon';
import { milhar } from '../lib/tempo';
import { effectiveEditorTheme, prefsStore, reducedMotion, usePrefs } from '../state/prefs';
import { CodeBlock } from '../viewers/codeblock';
import { OwnerAvatar } from './Explore';
import { Icon } from './Icon';

const semMovimento = () => reducedMotion(prefsStore.get());

// ---------- carrossel ----------
export function Marquee({ onOpen }: { onOpen: (slug: string) => void }) {
  // famosos primeiro, depois o resto; duas faixas em sentidos opostos
  const [a, b] = useMemo(() => {
    const ordem = [...CATALOGO.filter((e) => e.famoso), ...CATALOGO.filter((e) => !e.famoso)];
    const meio = Math.ceil(ordem.length / 2);
    return [ordem.slice(0, meio), ordem.slice(meio)];
  }, []);
  return (
    <section className="ks-marquee" aria-label="Repositórios no catálogo">
      <Faixa itens={a} onOpen={onOpen} />
      <Faixa itens={b} onOpen={onOpen} reversa />
    </section>
  );
}

function Faixa({ itens, onOpen, reversa = false }: { itens: Entrada[]; onOpen: (slug: string) => void; reversa?: boolean }) {
  const { icons } = usePrefs();
  const lista = (dup: boolean) =>
    itens.map((e) => (
      <li key={(dup ? 'd' : '') + e.repo} aria-hidden={dup || undefined}>
        <button type="button" className="ks-marquee__item" tabIndex={dup ? -1 : 0} onClick={() => onOpen(e.repo)} data-tip={e.nota}>
          <OwnerAvatar repo={e.repo} size={22} />
          <span>{e.repo}</span>
          <FileIcon pack={icons} path={`x.${TRILHAS.find((t) => t.titulo === e.lang)?.ext ?? 'txt'}`} className="ks-chip__icon" />
        </button>
      </li>
    ));
  return (
    <div className={`ks-marquee__track${reversa ? ' is-reverse' : ''}`}>
      <ul style={{ '--n': itens.length } as React.CSSProperties}>
        {lista(false)}
        {lista(true)}
      </ul>
    </div>
  );
}

// ---------- números ----------
export function Numeros() {
  const ref = useRef<HTMLDListElement>(null);
  const [t, setT] = useState(0); // 0 a 1
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (semMovimento()) return setT(1);
    let raf = 0;
    const io = new IntersectionObserver(([en]) => {
      if (!en?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const passo = (agora: number) => {
        const x = Math.min(1, (agora - t0) / 1100);
        setT(1 - Math.pow(1 - x, 3)); // desacelera no fim
        if (x < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  const itens = [
    { n: NUMEROS.repos, r: 'repositórios' },
    { n: NUMEROS.guias, r: 'guias de estudo' },
    { n: NUMEROS.passos, r: 'passos de leitura' },
    { n: NUMEROS.trilhas, r: 'trilhas' },
    { n: 146, r: 'linguagens com cores' },
  ];
  return (
    <dl className="ks-numeros" ref={ref}>
      {itens.map((i) => (
        <div key={i.r}>
          <dt>{milhar(Math.round(i.n * t))}</dt>
          <dd>{i.r}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------- leitor que troca de linguagem ----------
const AMOSTRAS: { repo: string; arquivo: string; ext: string; lang: string; code: string }[] = [
  { repo: 'karpathy/micrograd', arquivo: 'engine.py', ext: 'py', lang: 'python', code: "def __add__(self, other):\n    other = other if isinstance(other, Value) else Value(other)\n    out = Value(self.data + other.data, (self, other), '+')\n\n    def _backward():\n        self.grad += out.grad\n        other.grad += out.grad\n    out._backward = _backward\n\n    return out" },
  { repo: 'golang/go', arquivo: 'server.go', ext: 'go', lang: 'go', code: 'type Handler interface {\n\tServeHTTP(ResponseWriter, *Request)\n}\n\ntype HandlerFunc func(ResponseWriter, *Request)\n\nfunc (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {\n\tf(w, r)\n}' },
  { repo: 'rust-lang/rust', arquivo: 'option.rs', ext: 'rs', lang: 'rust', code: 'pub enum Option<T> {\n    None,\n    Some(T),\n}\n\nimpl<T> Option<T> {\n    pub fn map<U, F: FnOnce(T) -> U>(self, f: F) -> Option<U> {\n        match self {\n            Some(x) => Some(f(x)),\n            None => None,\n        }\n    }\n}' },
  { repo: 'pmndrs/zustand', arquivo: 'vanilla.ts', ext: 'ts', lang: 'typescript', code: 'const setState = (partial, replace) => {\n  const nextState = typeof partial === "function" ? partial(state) : partial\n  if (!Object.is(nextState, state)) {\n    const previousState = state\n    state = replace ? nextState : Object.assign({}, state, nextState)\n    listeners.forEach((listener) => listener(state, previousState))\n  }\n}' },
  { repo: 'antirez/kilo', arquivo: 'kilo.c', ext: 'c', lang: 'c', code: 'int enableRawMode(int fd) {\n    struct termios raw;\n    if (tcgetattr(fd, &orig_termios) == -1) goto fatal;\n    raw = orig_termios;\n    raw.c_lflag &= ~(ECHO | ICANON | IEXTEN | ISIG);\n    raw.c_cc[VMIN] = 0;\n    raw.c_cc[VTIME] = 1;\n    return tcsetattr(fd, TCSAFLUSH, &raw);\n}' },
];

export function Leitor({ onOpen }: { onOpen: (slug: string) => void }) {
  const prefs = usePrefs();
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  useEffect(() => {
    if (pausa || semMovimento()) return;
    const id = setInterval(() => setI((x) => (x + 1) % AMOSTRAS.length), 4200);
    return () => clearInterval(id);
  }, [pausa]);
  const a = AMOSTRAS[i]!;
  return (
    <section className="ks-leitor" aria-label="Exemplo de leitura de código" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
      <div className="ks-leitor__bar">
        <span className="ks-leitor__dots" aria-hidden="true"><i /><i /><i /></span>
        <div className="ks-leitor__tabs" role="tablist" aria-label="Linguagem">
          {AMOSTRAS.map((x, k) => (
            <button key={x.ext} type="button" role="tab" aria-selected={k === i} className="ks-leitor__tab" onClick={() => setI(k)}>
              <FileIcon pack={prefs.icons} path={x.arquivo} className="ks-chip__icon" />
              <span>{x.arquivo}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ks-leitor__body" key={i}>
        <CodeBlock code={a.code} lang={a.lang} theme={effectiveEditorTheme(prefs)} className="ks-leitor__code" />
      </div>
      <button type="button" className="ks-leitor__foot" onClick={() => onOpen(a.repo)}>
        <OwnerAvatar repo={a.repo} size={18} />
        <span>{a.repo}</span>
        <Icon name="arrowRight" size={12} />
      </button>
      <span className="ks-leitor__prog" aria-hidden="true" key={`p${i}${pausa}`} data-pausa={pausa || undefined} />
    </section>
  );
}

// ---------- temas ----------
export function Temas({ onTrilha }: { onTrilha: (id: string) => void }) {
  const { icons } = usePrefs();
  const temas = TRILHAS.filter((t) => t.grupo === 'Temas');
  return (
    <section className="ks-temas" aria-label="Temas de estudo">
      {temas.map((t: Trilha, k) => (
        <button key={t.id} type="button" className="ks-tema" style={{ '--c': `var(--ctp-${t.cor})`, '--i': k } as React.CSSProperties} onClick={() => onTrilha(t.id)}>
          <span className="ks-tema__icon">{t.ext ? <FileIcon pack={icons} path={`x.${t.ext}`} className="ks-chip__icon" /> : <Icon name={t.icone ?? 'code'} size={18} />}</span>
          <strong>{t.titulo}</strong>
          <span className="ks-tema__n">{t.repos.length} repositórios</span>
          <span className="ks-tema__faces" aria-hidden="true">
            {t.repos.slice(0, 4).map((e) => <OwnerAvatar key={e.repo} repo={e.repo} size={20} />)}
          </span>
        </button>
      ))}
    </section>
  );
}
