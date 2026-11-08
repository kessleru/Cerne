// Cliente do worker do Shiki: um worker só, vários arquivos (cada um com um id).
import type { FromWorker, ThemeData, Tok, ToWorker } from './protocol';

let worker: Worker | null = null;
let nextId = 1;
const handlers = new Map<number, (m: FromWorker) => void>();
const replies = new Map<number, (m: FromWorker) => void>();
let nextReq = 1;

function ask<T extends FromWorker>(build: (reqId: number) => ToWorker): Promise<T> {
  const w = ensureWorker();
  const reqId = nextReq++;
  return new Promise<T>((resolve) => {
    replies.set(reqId, (m) => resolve(m as T));
    w.postMessage(build(reqId));
  });
}

/** Cores de um tema do VS Code (para aplicar na interface). */
export async function fetchThemeData(theme: string): Promise<ThemeData | null> {
  const r = await ask<Extract<FromWorker, { type: 'themeData' }>>((reqId) => ({ type: 'themeData', reqId, theme }));
  return r.data;
}

/** Registra um tema importado (JSON do VS Code) pelo nome. */
export async function registerTheme(id: string, json: unknown): Promise<boolean> {
  const r = await ask<Extract<FromWorker, { type: 'registered' }>>((reqId) => ({ type: 'registerTheme', reqId, id, json }));
  return r.ok;
}

/** Trecho colorido pelo mesmo Shiki do CodeView, com as cores do tema (a prévia e o resultado vêm do mesmo lugar). */
export async function fetchPreview(theme: string | null, lang: string | null, code: string): Promise<{ data: ThemeData | null; lines: Tok[][] }> {
  const r = await ask<Extract<FromWorker, { type: 'preview' }>>((reqId) => ({ type: 'preview', reqId, theme, lang, code }));
  return { data: r.data, lines: r.lines };
}

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./highlight.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<FromWorker>) => {
      const m = ev.data;
      if (m.fileId === 0 && 'reqId' in m) {
        const r = replies.get(m.reqId);
        replies.delete(m.reqId);
        r?.(m);
      } else handlers.get(m.fileId)?.(m);
    };
  }
  return worker;
}

export type HighlightSession = {
  id: number;
  want: (theme: string | null, chunks: number[]) => void;
  retheme: (theme: string | null) => void;
  close: () => void;
};

export function openHighlight(
  text: string,
  lang: string | null,
  theme: string | null,
  onMessage: (m: FromWorker) => void,
): HighlightSession {
  const id = nextId++;
  const w = ensureWorker();
  handlers.set(id, onMessage);
  const send = (m: ToWorker) => w.postMessage(m);
  send({ type: 'open', fileId: id, text, lang, theme });
  return {
    id,
    want: (t, chunks) => send({ type: 'want', fileId: id, theme: t, chunks }),
    retheme: (t) => send({ type: 'retheme', fileId: id, theme: t }),
    close: () => {
      handlers.delete(id);
      send({ type: 'close', fileId: id });
    },
  };
}
