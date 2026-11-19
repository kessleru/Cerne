import { withThemeTransition } from '../anim/motion';
import { APPEARANCE_LABELS, effectiveTheme, prefsStore, usePrefs, type Appearance } from '../state/prefs';
import { Icon, type IconName } from './Icon';

const ICONE: Record<Appearance, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
const PROXIMO: Record<Appearance, Appearance> = { system: 'light', light: 'dark', dark: 'system' };

/** Troca rápida entre Sistema, Claro e Escuro (um clique por vez, nessa ordem). */
export function ThemeToggle() {
  const p = usePrefs();
  const agora = effectiveTheme(p) === 'latte' ? 'claro' : 'escuro';
  const tip = `Tema: ${APPEARANCE_LABELS[p.appearance]}${p.appearance === 'system' ? ` (${agora} agora)` : ''}. Clique para ${APPEARANCE_LABELS[PROXIMO[p.appearance]].toLowerCase()}.`;
  return (
    <button
      type="button"
      className="ks-icon-btn"
      aria-label={tip}
      data-tip={tip}
      onClick={() => withThemeTransition(() => prefsStore.set({ appearance: PROXIMO[p.appearance] }))}
    >
      <Icon name={ICONE[p.appearance]} />
    </button>
  );
}
