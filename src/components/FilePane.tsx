import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ref as RRef } from 'react';
import { CodeView, type CodeViewHandle, type FindMatch } from '../code/CodeView';
import type { ThemeInfo } from '../code/protocol';
import type { FileContent, RepoSource } from '../data/types';
import type { LineRange } from '../lib/hash';
import { formatSize, langOf } from '../lib/lang';
import { midiaDe } from '../data/github/arquivos';
import { effectiveEditorTheme, FONT_STACKS, type Prefs } from '../state/prefs';
import { CsvView, ImageView, JsonView, MarkdownView } from '../viewers/data';
import { ArchiveView, AudioView, FontView, HexView, PdfView, VideoView } from '../viewers/media';
import { NotebookView } from '../viewers/notebook';
import { Icon } from './Icon';
import { CommitLoader } from './CommitLoader';
import { PaneState, useLoadingGate } from './parts';

type Load = { status: 'loading' } | { status: 'ok'; file: FileContent } | { status: 'error'; message: string };

export function useFile(source: RepoSource, ref: string, path: string | null, nonce: number): Load {
  const [state, setState] = useState<{ key: string; load: Load }>({ key: '', load: { status: 'loading' } });
  const key = `${ref}|${path}|${nonce}`;
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    source
      .getFile(ref, path)
      .then((file) => !cancelled && setState({ key, load: { status: 'ok', file } }))
      .catch((e: unknown) => !cancelled && setState({ key, load: { status: 'error', message: String(e instanceof Error ? e.message : e) } }));
    return () => {
      cancelled = true;
    };
  }, [source, ref, path, key]);
  return state.key === key ? state.load : { status: 'loading' };
}

const RAW_KINDS = new Set(['markdown', 'csv', 'json', 'image', 'notebook']);
const RAW_LABEL: Record<string, [string, string]> = {
  markdown: ['Prévia', 'Código'],
  csv: ['Tabela', 'Texto'],
  json: ['Árvore', 'Texto'],
  image: ['Imagem', 'Código'],
  notebook: ['Notebook', 'JSON'],
};
const BYTE_KINDS = new Set(['pdf', 'audio', 'video', 'font', 'archive', 'binary']);

export type FilePaneProps = {
  source: RepoSource;
  refName: string;
  path: string;
  prefs: Prefs;
  primary: boolean;
  selection: LineRange | null;
  onSelect: (r: LineRange | null) => void;
  find: { matches: FindMatch[]; current: number } | null;
  handleRef?: RRef<CodeViewHandle>;
  /** ids para a barra de status e a busca */
  onFile: (f: { file: FileContent; lines: string[] | null } | null) => void;
  onInfo?: (info: ThemeInfo | null) => void;
  readline: boolean;
  onFirstPaint?: () => void;
  retry: number;
  onRetry: () => void;
  /** o arquivo no github.com (para o que o Cerne não mostra inteiro) */
  githubUrl?: string;
};

export function FilePane(p: FilePaneProps) {
  const current = useFile(p.source, p.refName, p.path, p.retry);
  // o conteúdo anterior fica na tela até o novo chegar
  const [shown, setShown] = useState<{ path: string; load: Exclude<Load, { status: 'loading' }> } | null>(null);
  useEffect(() => {
    if (current.status !== 'loading') setShown({ path: p.path, load: current });
  }, [current, p.path]);
  const loading = current.status === 'loading';
  const gate = useLoadingGate(loading);
  const display = loading ? shown : { path: p.path, load: current as Exclude<Load, { status: 'loading' }> };
  const path = display?.path ?? p.path;
  const load: Load = display?.load ?? { status: 'loading' };
  const [raw, setRaw] = useState<Set<string>>(() => new Set());
  const file = load.status === 'ok' ? load.file : null;
  const lines = useMemo(() => {
    if (!file?.text) return null;
    const l = file.text.split(String.fromCharCode(10));
    if (l.length > 1 && l[l.length - 1] === '') l.pop();
    return l;
  }, [file]);

  const { onFile, primary } = p;
  useEffect(() => {
    if (primary) onFile(file ? { file, lines } : null);
  }, [file, lines, primary, onFile]);

  const lang = langOf(path);
  const showRaw = raw.has(path);
  const canToggle = file && RAW_KINDS.has(file.kind) && file.text !== undefined;
  const editorTheme = effectiveEditorTheme(p.prefs);
  const metricsKey = [p.prefs.size, p.prefs.lineHeight, p.prefs.density, p.prefs.font, p.prefs.tab, p.prefs.ligatures].join('|');
  const wrapRef = useRef<HTMLDivElement>(null);

  if (load.status === 'loading') return gate ? <PaneState kind="loading" title={`Abrindo ${p.path}`} /> : <div className="ks-filepane" aria-busy="true" />;
  if (load.status === 'error')
    return (
      <PaneState kind="error" title="Não foi possível abrir o arquivo" actions={<button type="button" className="key" onClick={p.onRetry}>Tentar de novo</button>}>
        {load.message}
      </PaneState>
    );
  const f = load.file;

  const noGitHub = p.githubUrl ? (
    <a className="key" href={p.githubUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> Abrir no GitHub</a>
  ) : undefined;
  if (BYTE_KINDS.has(f.kind)) {
    const v = { path, bytes: f.bytes, mime: f.mime, size: f.size };
    return (
      <div className="ks-filepane" aria-busy={loading || undefined}>
        <div className="ks-filepane__body">
          {f.kind === 'pdf' ? <PdfView {...v} /> : f.kind === 'audio' ? <AudioView {...v} /> : f.kind === 'video' ? <VideoView {...v} /> : f.kind === 'font' ? <FontView {...v} /> : f.kind === 'archive' ? <ArchiveView {...v} /> : <HexView {...v} />}
        </div>
      </div>
    );
  }
  if (f.kind === 'large')
    return (
      <PaneState kind="warning" title={`Grande demais · ${formatSize(f.size)}`} actions={noGitHub}>
        Acima de {midiaDe(path) ? '25' : '1'} MB o Cerne não abre o arquivo.
      </PaneState>
    );
  if (f.kind === 'lfs')
    return (
      <PaneState kind="warning" title={`Git LFS · ${formatSize(f.lfs?.size ?? 0)}`} actions={noGitHub}>
        O repositório guarda só um ponteiro (<code>{f.lfs?.oid.slice(0, 12)}</code>).
      </PaneState>
    );

  const asCode = !RAW_KINDS.has(f.kind) || showRaw;
  const label = `${path}, ${lines?.length ?? 0} linhas`;

  return (
    <div className="ks-filepane" ref={wrapRef} aria-busy={loading || undefined}>
      {loading && gate && (
        <div className="ks-filepane__busy">
          <CommitLoader size="sm" label={`Abrindo ${p.path}`} />
        </div>
      )}
      {canToggle && (
        <div className="ks-filepane__bar">
          <div className="ks-segmented" role="group" aria-label="Modo de leitura">
            <button type="button" aria-pressed={!showRaw} onClick={() => setRaw((s) => { const n = new Set(s); n.delete(path); return n; })}>{RAW_LABEL[f.kind]![0]}</button>
            <button type="button" aria-pressed={showRaw} onClick={() => setRaw((s) => new Set(s).add(path))}>{RAW_LABEL[f.kind]![1]}</button>
          </div>
        </div>
      )}
      <div className="ks-filepane__body">
        {asCode && lines ? (
          <CodeView
            handleRef={p.handleRef}
            fileKey={`${p.refName}|${path}`}
            lines={lines}
            lang={lang.shiki}
            editorTheme={editorTheme}
            wrap={p.prefs.wrap}
            metricsKey={metricsKey}
            selection={p.selection}
            onSelect={p.onSelect}
            find={p.find}
            onInfo={p.onInfo}
            readline={p.readline}
            onFirstPaint={p.onFirstPaint}
            readOnlyLabel={label}
          />
        ) : f.kind === 'markdown' && f.text ? (
          <MarkdownView text={f.text} />
        ) : f.kind === 'csv' && f.text ? (
          <CsvView text={f.text} label={label} />
        ) : f.kind === 'json' && f.text ? (
          <JsonView text={f.text} label={label} />
        ) : f.kind === 'notebook' && f.text ? (
          <NotebookView text={f.text} editorTheme={editorTheme} />
        ) : f.kind === 'image' && (f.text !== undefined || f.src || f.blob) ? (
          <ImageView svg={f.text} src={f.src} blob={f.blob} alt={`Prévia de ${path}`} />
        ) : (
          <PaneState kind="empty" title="Arquivo vazio" />
        )}
      </div>
    </div>
  );
}

export function codeStyle(p: Prefs): Record<string, string> {
  const v: Record<string, string> = {
    '--code-font': FONT_STACKS[p.font],
    '--code-size': `${p.size}px`,
    '--code-tab': String(p.tab),
    '--code-ligatures': p.ligatures ? 'normal' : 'none',
  };
  if (p.lineHeight !== null) v['--code-line'] = String(p.lineHeight);
  return v;
}

export function IconTab({ name }: { name: 'history' | 'diff' }) {
  return <Icon name={name} />;
}
