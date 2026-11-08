// Aplica as preferências ao documento: tema da página, acento, alto contraste e movimento.
// Chamado de forma síncrona a cada mudança (a troca de tema por View Transition precisa do DOM já atualizado).
import { prefsStore, reducedMotion, type Prefs } from './prefs';

export function applyToDocument(p: Prefs) {
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.style.setProperty('--ctp-accent', `var(--ctp-${p.accent})`);
  if (p.contrast) root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
  root.dataset.motion = reducedMotion(p) ? 'reduce' : 'full';
}

export function startPrefsSync() {
  applyToDocument(prefsStore.get());
  const off = prefsStore.subscribe(() => applyToDocument(prefsStore.get()));
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => applyToDocument(prefsStore.get());
  mq.addEventListener('change', onMq);
  return () => {
    off();
    mq.removeEventListener('change', onMq);
  };
}
