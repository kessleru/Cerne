// Aplica as preferências ao documento: tema da página, acento, alto contraste, movimento e guias da árvore.
// Chamado de forma síncrona a cada mudança (a troca de tema por View Transition precisa do DOM já atualizado).
import { effectiveTheme, prefsStore, reducedMotion, watchSystemScheme, type Prefs } from './prefs';

export function applyToDocument(p: Prefs) {
  const root = document.documentElement;
  const theme = effectiveTheme(p);
  root.dataset.theme = theme;
  root.dataset.appearance = p.appearance;
  root.style.colorScheme = theme === 'latte' ? 'light' : 'dark';
  root.style.setProperty('--ctp-accent', `var(--ctp-${p.accent})`);
  if (p.contrast) root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
  root.dataset.motion = reducedMotion(p) ? 'reduce' : 'full';
  root.dataset.guides = p.guides;
  // barra do navegador no celular com a cor do fundo
  const base = getComputedStyle(root).getPropertyValue('--ctp-base').trim();
  if (base) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', base);
}

export function startPrefsSync() {
  applyToDocument(prefsStore.get());
  const off = prefsStore.subscribe(() => applyToDocument(prefsStore.get()));
  const offScheme = watchSystemScheme();
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => applyToDocument(prefsStore.get());
  mq.addEventListener('change', onMq);
  return () => {
    off();
    offScheme();
    mq.removeEventListener('change', onMq);
  };
}
