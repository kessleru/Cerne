// Tema do editor com alcance. A interface tem um tema (sabor + acento); o tema do VS Code pode cobri-la em três alcances:
// só o código, a área de trabalho (.ks-panes) ou tudo (a raiz). As variáveis só mudam quando as novas chegam (sem piscar).
import { withThemeTransition } from '../anim/motion';
import { fetchThemeData } from '../code/client';
import type { ThemeData } from '../code/protocol';
import { buildThemeVars } from '../lib/themeVars';
import { registerImportedThemes } from './themes';
import { prefsStore, type EditorScope } from './prefs';
import { createStore, useStore } from './store';

export type EditorVars = { scope: EditorScope; vars: Record<string, string> | null; themeId: string | null };

export const editorVarsStore = createStore<EditorVars>({ scope: 'workspace', vars: null, themeId: null });
export const useEditorVars = () => useStore(editorVarsStore);

const CACHE_KEY = 'cerne:tema-cache';
const cache = new Map<string, ThemeData>();
try {
  const raw = localStorage.getItem(CACHE_KEY);
  if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, ThemeData>)) cache.set(k, v);
} catch {
  /* sem cache */
}
function saveCache() {
  try {
    // guarda só os 6 últimos
    const entries = [...cache.entries()].slice(-6);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignora */
  }
}

const readVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || null;

let currentData: ThemeData | null = null;

function publish(animate = false) {
  const apply = () => publishNow();
  if (animate) withThemeTransition(apply);
  else apply();
}

function publishNow() {
  const p = prefsStore.get();
  const root = document.documentElement;
  const vars = currentData && p.editorTheme
    ? buildThemeVars(currentData, { contrast: p.contrast, accent: readVar(`--ctp-${p.accent}`), red: readVar('--ctp-red') })
    : null;
  // alcance "Tudo": direto na raiz; "Área de trabalho": o Workspace aplica em .ks-panes
  for (const k of appliedToRoot) root.style.removeProperty(k);
  appliedToRoot = [];
  if (vars && p.editorScope === 'all') {
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
      appliedToRoot.push(k);
    }
  }
  if (vars && p.editorScope !== 'code') root.dataset.editorScope = p.editorScope;
  else delete root.dataset.editorScope;
  editorVarsStore.set({ scope: p.editorScope, vars: p.editorScope === 'code' ? null : vars, themeId: p.editorTheme });
}
let appliedToRoot: string[] = [];

let loading = 0;
async function load(id: string | null) {
  if (!id) {
    currentData = null;
    publish(true);
    return;
  }
  const hit = cache.get(id);
  if (hit && currentData?.id !== id) {
    currentData = hit;
    publish(true);
  }
  const mine = ++loading;
  await registerImportedThemes();
  const data = await fetchThemeData(id);
  if (mine !== loading || !data) return;
  cache.set(id, data);
  saveCache();
  const changed = currentData?.id !== data.id;
  currentData = data;
  publish(changed);
}

/** Liga o tema do editor: aplica o que já está guardado na hora e atualiza quando o tema novo chega. */
export function startEditorThemeSync() {
  let lastTheme: string | null = null;
  let last = '';
  const seed = prefsStore.get().editorTheme;
  if (seed && cache.has(seed)) currentData = cache.get(seed)!;
  publish();
  lastTheme = seed;
  if (seed) void load(seed);
  return prefsStore.subscribe(() => {
    const p = prefsStore.get();
    const key = [p.theme, p.accent, p.contrast, p.editorScope].join('|');
    if (p.editorTheme !== lastTheme) {
      lastTheme = p.editorTheme;
      void load(p.editorTheme);
    } else if (key !== last) publish();
    last = key;
  });
}

/** Estilo React para o elemento do alcance (color-scheme vira colorScheme). */
export function varsToStyle(vars: Record<string, string> | null): React.CSSProperties | undefined {
  if (!vars) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) out[k === 'color-scheme' ? 'colorScheme' : k] = v;
  return out as React.CSSProperties;
}
