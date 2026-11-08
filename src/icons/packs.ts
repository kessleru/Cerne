// Pacotes de ícones de arquivo (Iconify): carregados só quando escolhidos. O mapa de extensões e pastas é daqui.
// Os JSON em src/icons/ são gerados por scripts/gerar-icones.mjs com só os ícones deste mapa.
import type { IconPack } from '../state/prefs';
import mapas from './mapas.json';

type IconData = { body: string; width?: number; height?: number };
export type IconSet = { icons: Record<string, IconData>; aliases?: Record<string, { parent: string } & Partial<IconData>>; width?: number; height?: number };

const LOADERS: Record<IconPack, () => Promise<{ default: IconSet }>> = {
  material: () => import('./icons-material.json') as unknown as Promise<{ default: IconSet }>,
  catppuccin: () => import('./icons-catppuccin.json') as unknown as Promise<{ default: IconSet }>,
  vscode: () => import('./icons-vscode.json') as unknown as Promise<{ default: IconSet }>,
};

const loaded = new Map<IconPack, IconSet>();
const pending = new Map<IconPack, Promise<void>>();
const listeners = new Set<() => void>();

export function loadPack(pack: IconPack): Promise<void> {
  if (loaded.has(pack)) return Promise.resolve();
  let p = pending.get(pack);
  if (!p) {
    p = LOADERS[pack]().then((m) => {
      loaded.set(pack, m.default);
      listeners.forEach((fn) => fn());
    });
    pending.set(pack, p);
  }
  return p;
}

export const subscribePacks = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const packVersion = () => loaded.size + (loaded.has('material') ? 10 : 0) + (loaded.has('catppuccin') ? 100 : 0) + (loaded.has('vscode') ? 1000 : 0);

type Names = {
  ext: Record<string, string>;
  file: Record<string, string>;
  defaultFile: string;
  folder: Record<string, string>;
  defaultFolder: string;
  /** como se escreve a variante aberta de uma pasta */
  open: (name: string) => string;
};

type PackMap = Omit<Names, 'open'> & { openSuffix: string; openDefault?: string };

const MAPAS = mapas as unknown as Record<IconPack, PackMap>;

function toNames(m: PackMap): Names {
  return {
    ext: m.ext,
    file: m.file,
    defaultFile: m.defaultFile,
    folder: m.folder,
    defaultFolder: m.defaultFolder,
    open: (n) => (m.openDefault && n === m.defaultFolder ? m.openDefault : `${n}${m.openSuffix}`),
  };
}

const NAMES: Record<IconPack, Names> = {
  material: toNames(MAPAS.material),
  catppuccin: toNames(MAPAS.catppuccin),
  vscode: toNames(MAPAS.vscode),
};

function pick(set: IconSet, ...names: string[]): IconData | null {
  for (const n of names) {
    const hit = set.icons[n];
    if (hit) return hit;
    const al = set.aliases?.[n];
    if (al && set.icons[al.parent]) return { ...set.icons[al.parent]!, ...al };
  }
  return null;
}

/** Ícone de um arquivo ou pasta. Devolve null enquanto o pacote não carregou. */
export function resolveIcon(pack: IconPack, path: string, isDir: boolean, open = false): { body: string; w: number; h: number } | null {
  const set = loaded.get(pack);
  if (!set) return null;
  const nm = NAMES[pack];
  const base = path.slice(path.lastIndexOf('/') + 1);
  let hit: IconData | null;
  if (isDir) {
    const name = nm.folder[base];
    hit = open ? pick(set, ...(name ? [nm.open(name)] : []), nm.open(nm.defaultFolder), nm.defaultFolder) : pick(set, ...(name ? [name] : []), nm.defaultFolder);
  } else {
    const dot = base.lastIndexOf('.');
    const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
    const name = nm.file[base] ?? nm.ext[ext];
    hit = pick(set, ...(name ? [name] : []), nm.defaultFile);
  }
  if (!hit) return null;
  return { body: hit.body, w: hit.width ?? set.width ?? 16, h: hit.height ?? set.height ?? 16 };
}

export const PACK_LABELS: Record<IconPack, string> = {
  material: 'Material Icon Theme',
  catppuccin: 'Catppuccin Icons',
  vscode: 'vscode-icons',
};
