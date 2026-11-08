// Registro do service worker (public/sw.js) e aviso de versão nova.
// Versão nova instala em segundo plano e fica esperando; só troca quando a pessoa aceita ("Recarregar").

export type Recarregar = () => void;

const ouvintes = new Set<(recarregar: Recarregar) => void>();
let esperando: ServiceWorker | null = null;
let recarregando = false;

function recarregar() {
  if (!esperando) return;
  // a página só recarrega quando o worker novo assume, para nunca misturar HTML novo com worker velho
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregando) return;
    recarregando = true;
    window.location.reload();
  });
  esperando.postMessage({ tipo: 'ativar' });
}

function avisar(worker: ServiceWorker) {
  esperando = worker;
  for (const cb of ouvintes) cb(recarregar);
}

/** Chama `cb` quando há versão nova pronta (inclusive uma que já esperava). `cb` recebe a função que recarrega. Devolve o cancelamento. */
export function aoAtualizar(cb: (recarregar: Recarregar) => void): () => void {
  ouvintes.add(cb);
  if (esperando) cb(recarregar);
  return () => void ouvintes.delete(cb);
}

/** Registra o worker. Só no build: em desenvolvimento ele atrapalharia o HMR. */
export function registrarPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  const iniciar = async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
      // sem controller é a primeira instalação: nada a avisar
      if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const novo = reg.installing;
        novo?.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) avisar(novo);
        });
      });
      // aba aberta por dias: confere ao voltar a ela
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
      });
    } catch {
      /* sem service worker o app funciona igual, só não abre offline */
    }
  };
  if (document.readyState === 'complete') void iniciar();
  else window.addEventListener('load', () => void iniciar(), { once: true });
}
