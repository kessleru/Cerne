// Temas do VS Code importados pela pessoa (.json). Entram na mesma lista dos temas embutidos.
import { registerTheme } from '../code/client';
import { EDITOR_THEMES } from './prefs';
import { createStore, useStore } from './store';

export type ThemeMeta = { id: string; label: string; dark: boolean; imported?: boolean };
type Imported = { id: string; label: string; dark: boolean; json: unknown };

export const importedStore = createStore<{ list: Imported[] }>({ list: [] }, 'cerne:temas-importados');

let registering: Promise<void> | null = null;
/** Registra no worker os temas importados guardados (uma vez por visita). */
export function registerImportedThemes(): Promise<void> {
  registering ??= Promise.all(importedStore.get().list.map((t) => registerTheme(t.id, t.json))).then(() => undefined);
  return registering;
}

export function allEditorThemes(list = importedStore.get().list): ThemeMeta[] {
  return [...EDITOR_THEMES.map((t) => ({ id: t.id as string, label: t.label as string, dark: t.dark })), ...list.map((t) => ({ id: t.id, label: t.label, dark: t.dark, imported: true }))];
}

export function useEditorThemes(): ThemeMeta[] {
  const s = useStore(importedStore);
  return allEditorThemes(s.list);
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tema';

/** Lê um .json de tema do VS Code, registra e guarda. Devolve o id, ou o motivo da recusa. */
export async function importThemeJson(text: string, fileName: string): Promise<{ id: string } | { error: string }> {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(stripBom(text)) as Record<string, unknown>;
  } catch {
    return { error: 'O arquivo não é um JSON válido. Temas com comentários ou vírgula sobrando não são aceitos.' };
  }
  if (!json || typeof json !== 'object' || (typeof json.colors !== 'object' && !Array.isArray(json.tokenColors))) {
    return { error: 'Não parece um tema do VS Code: faltam "colors" e "tokenColors".' };
  }
  const label = typeof json.name === 'string' && json.name ? json.name : fileName.replace(/\.json$/i, '');
  const id = 'importado-' + slug(label);
  const dark = json.type !== 'light' && json.type !== 'hc-light';
  const ok = await registerTheme(id, { ...json, type: dark ? 'dark' : 'light' });
  if (!ok) return { error: 'O Shiki não conseguiu ler este tema.' };
  const rest = importedStore.get().list.filter((t) => t.id !== id);
  importedStore.set({ list: [...rest, { id, label, dark, json }] });
  return { id };
}

export function removeImportedTheme(id: string) {
  importedStore.set({ list: importedStore.get().list.filter((t) => t.id !== id) });
}

/** Tira o BOM do começo de um arquivo de texto. */
function stripBom(t: string): string {
  return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t;
}
