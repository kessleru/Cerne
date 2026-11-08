// Animações do Cerne (ver "Plano de animação"): anéis de crescimento. O conteúdo nunca espera a animação e
// qualquer tecla ou clique a encerra. CSS e View Transitions no dia a dia; GSAP só nos destaques,
// carregado por importação dinâmica depois da primeira tela.
import { flushSync } from 'react-dom';
import { prefsStore, reducedMotion } from '../state/prefs';

export const motionOK = () => !reducedMotion(prefsStore.get());

type Gsap = typeof import('gsap').gsap;
/** O que runStage precisa de uma timeline ou tween do GSAP. */
type Anim = { progress: (n: number) => unknown; eventCallback: (type: 'onComplete', cb: () => void) => unknown };

// O GSAP só é pedido depois da primeira pintura: a entrada, ou as primeiras linhas do código.
let screenDone: () => void = () => {};
const screenReady = new Promise<void>((resolve) => {
  screenDone = resolve;
});
/** Chamar quando a primeira tela foi pintada (a entrada ou as primeiras linhas do código). */
export function markScreenReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => screenDone()));
}
// sem primeira tela marcada (estado inesperado), libera depois de 5 s
setTimeout(() => screenDone(), 5000);

let gsapPromise: Promise<Gsap> | null = null;
export function loadGsap(): Promise<Gsap> {
  gsapPromise ??= screenReady.then(() => import('gsap')).then((m) => m.gsap);
  return gsapPromise;
}

/** Depois da primeira tela e quando o navegador estiver ocioso. */
export function preloadGsapWhenIdle() {
  void screenReady.then(() => {
    const go = () => void loadGsap();
    if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2500 });
    else setTimeout(go, 400);
  });
}

/** Roda uma coreografia; qualquer tecla ou clique a termina na hora (vai para o estado final). */
export async function runStage(build: (gsap: Gsap) => Anim | null): Promise<void> {
  if (!motionOK()) return;
  const gsap = await loadGsap();
  const tl = build(gsap);
  if (!tl) return;
  const finish = () => {
    tl.progress(1);
    cleanup();
  };
  const cleanup = () => {
    window.removeEventListener('keydown', finish, true);
    window.removeEventListener('pointerdown', finish, true);
  };
  window.addEventListener('keydown', finish, true);
  window.addEventListener('pointerdown', finish, true);
  tl.eventCallback('onComplete', cleanup);
}

type VT = { ready: Promise<void>; finished: Promise<void> };
type VTDocument = Document & { startViewTransition?: (cb: () => void) => VT };

/** Troca de tema: fade único de 160 ms na raiz (View Transition), sem deslocamento. Sem movimento: troca direta.
 *  O acento não passa por aqui: ele só anima cor, em --dur-fast (registrado com @property no CSS). */
export function withThemeTransition(apply: () => void) {
  const doc = document as VTDocument;
  if (!doc.startViewTransition || !motionOK()) {
    apply();
    return;
  }
  const root = document.documentElement;
  root.dataset.vt = 'tema';
  const vt = doc.startViewTransition(() => flushSync(apply));
  const done = () => {
    delete root.dataset.vt;
  };
  vt.finished.then(done, done);
}

/** Abrir repositório: a caixa da entrada vira a barra de cima (View Transition), os painéis entram e as primeiras linhas da árvore aparecem em cascata. */
export function withOpenTransition(apply: () => void) {
  const doc = document as VTDocument;
  if (!doc.startViewTransition || !motionOK()) {
    apply();
    return;
  }
  const root = document.documentElement;
  root.dataset.vt = 'open';
  const vt = doc.startViewTransition(() => flushSync(apply));
  const done = () => {
    delete root.dataset.vt;
  };
  vt.finished.then(done, done);
  const skip = () => {
    try {
      (vt as unknown as { skipTransition?: () => void }).skipTransition?.();
    } catch {
      /* já terminou */
    }
  };
  window.addEventListener('keydown', skip, { once: true, capture: true });
  window.addEventListener('pointerdown', skip, { once: true, capture: true });
  vt.finished.then(() => {
    window.removeEventListener('keydown', skip, true);
    window.removeEventListener('pointerdown', skip, true);
  }, () => {});
}

export function cascadeTree(rows: Element[]) {
  void runStage((gsap) =>
    gsap.fromTo(rows.slice(0, 30), { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.2, ease: 'power3.out', stagger: 0.02, clearProps: 'opacity,transform' }),
  );
}

/** Copiar link das linhas: uma faixa de acento percorre as linhas selecionadas, uma vez (400 ms). */
export function sweepLines(el: HTMLElement) {
  void runStage((gsap) => {
    gsap.set(el, { display: 'block', transformOrigin: 'left center' });
    return gsap
      .timeline({ onComplete: () => void gsap.set(el, { display: 'none' }) })
      .fromTo(el, { scaleX: 0, opacity: 0.9 }, { scaleX: 1, duration: 0.25, ease: 'power3.out' })
      .to(el, { opacity: 0, duration: 0.15, ease: 'power1.out' });
  });
}

/** Primeira abertura da sessão: uma linha de leitura desce uma vez (300 ms). */
export function readline(el: HTMLElement, distance: number) {
  void runStage((gsap) => {
    gsap.set(el, { display: 'block' });
    return gsap
      .timeline({ onComplete: () => void gsap.set(el, { display: 'none' }) })
      .fromTo(el, { y: 0, opacity: 0.8 }, { y: distance, duration: 0.3, ease: 'power3.out' })
      .to(el, { opacity: 0, duration: 0.1 }, '>-0.05');
  });
}

export async function mouseOrigin(e: { clientX: number; clientY: number; currentTarget?: unknown }): Promise<{ x: number; y: number }> {
  const el = e.currentTarget as HTMLElement | undefined;
  if (el && typeof el.getBoundingClientRect === 'function' && (e.clientX === 0 && e.clientY === 0)) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: e.clientX, y: e.clientY };
}
