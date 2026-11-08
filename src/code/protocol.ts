// Mensagens entre o CodeView e o worker do Shiki.

/** Um trecho de linha já com cor: `c` é uma classe tok-* (tema do sistema), `k` uma cor do tema do editor. */
export type Tok = { t: string; c?: string; k?: string; f?: number };

export type ThemeInfo = {
  dark: boolean;
  bg: string;
  fg: string;
  gutter?: string;
  current?: string;
  selected?: string;
  guide?: string;
};

/** Cores de um tema do VS Code lidas do JSON (`colors`, só as chaves que o Cerne usa) mais fundo, texto e tipo. */
export type ThemeData = {
  id: string;
  dark: boolean;
  bg: string;
  fg: string;
  colors: Record<string, string>;
};

/** Chaves de `colors` que o Cerne lê. */
export const THEME_KEYS = [
  'editor.background',
  'editor.foreground',
  'sideBar.background',
  'sideBar.foreground',
  'sideBar.border',
  'activityBar.background',
  'titleBar.activeBackground',
  'statusBar.background',
  'tab.activeBackground',
  'tab.inactiveBackground',
  'tab.border',
  'editorGroupHeader.tabsBackground',
  'editorLineNumber.foreground',
  'editorLineNumber.activeForeground',
  'editor.lineHighlightBackground',
  'editor.selectionBackground',
  'editorIndentGuide.background1',
  'editorIndentGuide.background',
  'panel.border',
  'editorGroup.border',
  'focusBorder',
  'descriptionForeground',
  'input.background',
] as const;

export const CHUNK = 100;

export type ToWorker =
  | { type: 'open'; fileId: number; text: string; lang: string | null; theme: string | null }
  | { type: 'retheme'; fileId: number; theme: string | null }
  | { type: 'want'; fileId: number; theme: string | null; chunks: number[] }
  | { type: 'close'; fileId: number }
  | { type: 'registerTheme'; reqId: number; id: string; json: unknown }
  | { type: 'themeData'; reqId: number; theme: string }
  | { type: 'preview'; reqId: number; theme: string | null; lang: string | null; code: string };

export type FromWorker =
  | { type: 'ready'; fileId: number; theme: string | null; info: ThemeInfo | null; lang: string | null }
  | { type: 'chunk'; fileId: number; theme: string | null; chunk: number; lines: Tok[][] }
  | { type: 'error'; fileId: number; message: string }
  | { type: 'registered'; fileId: 0; reqId: number; ok: boolean }
  | { type: 'themeData'; fileId: 0; reqId: number; data: ThemeData | null }
  | { type: 'preview'; fileId: 0; reqId: number; data: ThemeData | null; lines: Tok[][] };
