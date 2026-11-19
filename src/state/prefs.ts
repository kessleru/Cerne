import { createStore, useStore } from './store';

export const THEMES = [
  { id: 'latte', label: 'Latte', dark: false },
  { id: 'frappe', label: 'Frappé', dark: true },
  { id: 'macchiato', label: 'Macchiato', dark: true },
  { id: 'mocha', label: 'Mocha', dark: true },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];
/** Sabores escuros (o claro é só o Latte). */
export const DARK_THEMES = THEMES.filter((t) => t.dark);
/** Claro ou escuro: igual ao sistema da pessoa, ou fixo. */
export type Appearance = 'system' | 'light' | 'dark';
export const APPEARANCE_LABELS: Record<Appearance, string> = { system: 'Sistema', light: 'Claro', dark: 'Escuro' };

export const ACCENTS = [
  'rosewater', 'flamingo', 'pink', 'mauve', 'red', 'maroon', 'peach',
  'yellow', 'green', 'teal', 'sky', 'sapphire', 'blue', 'lavender',
] as const;
export type AccentId = (typeof ACCENTS)[number];

/** Temas do editor (ids do Shiki). `dark` diz para que tema da página combinam. */
export const EDITOR_THEMES = [
  { id: 'catppuccin-mocha', label: 'Catppuccin Mocha', dark: true },
  { id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', dark: true },
  { id: 'catppuccin-frappe', label: 'Catppuccin Frappé', dark: true },
  { id: 'catppuccin-latte', label: 'Catppuccin Latte', dark: false },
  { id: 'github-dark', label: 'GitHub Dark', dark: true },
  { id: 'github-light', label: 'GitHub Light', dark: false },
  { id: 'dracula', label: 'Dracula', dark: true },
  { id: 'tokyo-night', label: 'Tokyo Night', dark: true },
  { id: 'one-dark-pro', label: 'One Dark Pro', dark: true },
  { id: 'nord', label: 'Nord', dark: true },
  { id: 'gruvbox-dark-medium', label: 'Gruvbox Dark', dark: true },
  { id: 'gruvbox-light-medium', label: 'Gruvbox Light', dark: false },
  { id: 'rose-pine', label: 'Rosé Pine', dark: true },
  { id: 'rose-pine-dawn', label: 'Rosé Pine Dawn', dark: false },
  { id: 'solarized-dark', label: 'Solarized Dark', dark: true },
  { id: 'solarized-light', label: 'Solarized Light', dark: false },
  { id: 'monokai', label: 'Monokai', dark: true },
  { id: 'night-owl', label: 'Night Owl', dark: true },
  { id: 'ayu-dark', label: 'Ayu Dark', dark: true },
  { id: 'material-theme', label: 'Material', dark: true },
] as const;

export type EditorScope = 'code' | 'workspace' | 'all';

export type IconPack = 'material' | 'catppuccin' | 'vscode';
export type FontId = 'jetbrains' | 'sistema' | 'roboto';
export type Density = 'compact' | 'normal' | 'comfortable';
/** linhas de indentação da árvore: sempre, só com o ponteiro sobre ela, ou nunca */
export type Guides = 'always' | 'hover' | 'none';

export type Prefs = {
  /** claro, escuro ou igual ao sistema */
  appearance: Appearance;
  /** sabor usado quando escuro (Frappé, Macchiato ou Mocha) */
  theme: ThemeId;
  accent: AccentId;
  /** id de um tema do VS Code; null = igual à interface */
  editorTheme: string | null;
  /** até onde o tema do editor vale */
  editorScope: EditorScope;
  icons: IconPack;
  font: FontId;
  size: number;
  /** null = o da densidade */
  lineHeight: number | null;
  ligatures: boolean;
  tab: number;
  density: Density;
  guides: Guides;
  contrast: boolean;
  motion: 'auto' | 'reduced' | 'full';
  wrap: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  appearance: 'system',
  theme: 'mocha',
  accent: 'green',
  editorTheme: null,
  editorScope: 'workspace',
  icons: 'material',
  font: 'jetbrains',
  size: 13,
  lineHeight: null,
  ligatures: true,
  tab: 2,
  density: 'normal',
  guides: 'always',
  contrast: false,
  motion: 'auto',
  wrap: false,
};

// versões antigas guardavam editorMode/editorFixed: converte antes de abrir o store
(function migrate() {
  try {
    const raw = localStorage.getItem('cerne:prefs');
    if (!raw) return;
    const old = JSON.parse(raw) as Record<string, unknown>;
    // antes de "Aparência", o Latte era escolhido como sabor: vira "Claro" fixo
    if (!('appearance' in old) && old.theme === 'latte') {
      old.appearance = 'light';
      old.theme = 'mocha';
      localStorage.setItem('cerne:prefs', JSON.stringify(old));
    }
    if (!('editorMode' in old)) return;
    if (old.editorMode === 'fixed' && typeof old.editorFixed === 'string') old.editorTheme = old.editorFixed;
    delete old.editorMode;
    localStorage.setItem('cerne:prefs', JSON.stringify(old));
  } catch {
    /* sem localStorage */
  }
})();

export const prefsStore = createStore<Prefs>(DEFAULT_PREFS, 'cerne:prefs');
export const usePrefs = () => useStore(prefsStore);

export const FONT_STACKS: Record<FontId, string> = {
  jetbrains: 'var(--font-mono)',
  sistema: 'ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace',
  roboto: 'var(--font-roboto)',
};

export const FONT_LABELS: Record<FontId, string> = {
  jetbrains: 'JetBrains Mono',
  sistema: 'Mono do sistema',
  roboto: 'Roboto',
};

const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null);
/** O sistema pede escuro? Sem informação, escuro. */
export function systemDark(): boolean {
  return darkQuery()?.matches ?? true;
}
/** Sabor que vale agora: Latte no claro; no escuro, o sabor escolhido. */
export function effectiveTheme(p: Prefs): ThemeId {
  const dark = p.appearance === 'dark' || (p.appearance === 'system' && systemDark());
  return dark ? (p.theme === 'latte' ? 'mocha' : p.theme) : 'latte';
}
/** Quando o sistema troca entre claro e escuro, avisa quem ouve as preferências. */
export function watchSystemScheme(): () => void {
  const q = darkQuery();
  if (!q) return () => {};
  const on = () => prefsStore.get().appearance === 'system' && prefsStore.set({});
  q.addEventListener('change', on);
  return () => q.removeEventListener('change', on);
}

/** Tema do editor efetivo. Null = igual à interface. */
export function effectiveEditorTheme(p: Prefs): string | null {
  return p.editorTheme;
}

export const SCOPE_LABELS: Record<EditorScope, string> = {
  code: 'Só o código',
  workspace: 'Área de trabalho',
  all: 'Tudo',
};

export function reducedMotion(p: Prefs): boolean {
  if (p.motion === 'reduced') return true;
  if (p.motion === 'full') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
