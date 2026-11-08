import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { cascadeTree, markScreenReady, withThemeTransition } from '../anim/motion';
import { type CodeViewHandle, type FindMatch } from '../code/CodeView';
import type { ThemeInfo } from '../code/protocol';
import type { Commit, FileContent, Quota, Ref, TreeEntry } from '../data/types';
import { PACK_LABELS } from '../icons/packs';
import { formatLineHash, parseLineHash, type LineRange } from '../lib/hash';
import { baseName, langOf } from '../lib/lang';
import { buildPath } from '../lib/route';
import { source } from '../data/source';
import { ACCENTS, SCOPE_LABELS, THEMES, prefsStore, reducedMotion, usePrefs, type Density, type EditorScope, type IconPack } from '../state/prefs';
import { useEditorVars, varsToStyle } from '../state/editorTheme';
import { useEditorThemes } from '../state/themes';
import { CommitList, DiffView } from '../viewers/diff';
import { CommandPalette, type Command, type PaletteOpen } from './CommandPalette';
import { saveRecent } from './Entry';
import { FilePane, codeStyle } from './FilePane';
import { Icon } from './Icon';
import { Preferences } from './Preferences';
import { Kbd, Meter, PaneState, Presence, Splitter, ToastHost, toast, useLoadingGate } from './parts';
import { SnippetDialog } from './SnippetDialog';
import { Select } from './Select';
import { Breadcrumb, Tabs, type Tab } from './Tabs';
import { FindBar, RefPicker } from './tools';
import { Tooltip } from './Tooltip';
import { Tree } from './Tree';

export type Session = { owner: string; repo: string; ref: string | null; path: string | null; lines: LineRange | null };
type View = 'file' | 'history' | 'diff';
type Demo = null | 'carregando' | 'erro' | 'cota';

function useOnline() {
  const [on, setOn] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return on;
}

function useMedia(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

const READ_KEY = 'cerne:leitura';

export function Workspace({ session, onExit }: { session: Session; onExit: () => void }) {
  const prefs = usePrefs();
  const narrow = useMedia('(max-width: 719px)');
  // '' = ramo ainda não resolvido (link sem ramo): vira o padrão do repositório quando getRepo responde
  const [refName, setRefName] = useState(session.ref ?? '');
  // o endereço só leva o ramo quando o link o pediu ou a pessoa escolheu outro
  const [refPedido, setRefPedido] = useState(session.ref !== null);
  const online = useOnline();
  const [refs, setRefs] = useState<Ref[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [entries, setEntries] = useState<TreeEntry[] | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [quota, setQuota] = useState<Quota>(source.quota());

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [split, setSplit] = useState<string | null>(null);
  const [sels, setSels] = useState<Record<string, LineRange | null>>({});
  const [view, setView] = useState<View>('file');
  const [history, setHistory] = useState<{ path: string | null; commits: Commit[] } | null>(null);
  const [historyError, setHistoryError] = useState<{ path: string | null; message: string } | null>(null);
  const [diff, setDiff] = useState<{ commit: Commit; path: string; before: string; after: string } | null>(null);
  const [diffError, setDiffError] = useState<{ commit: Commit; path: string; message: string } | null>(null);
  const [activeFile, setActiveFile] = useState<{ file: FileContent; lines: string[] | null } | null>(null);
  const [edInfo, setEdInfo] = useState<ThemeInfo | null>(null);

  const [palette, setPalette] = useState<PaletteOpen | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [find, setFind] = useState<{ matches: FindMatch[]; current: number } | null>(null);
  const [snippet, setSnippet] = useState(false);
  const [snipOrigin, setSnipOrigin] = useState<{ x: number; y: number } | null>(null);
  const [prefsOrigin, setPrefsOrigin] = useState<{ x: number; y: number } | null>(null);
  const editorThemes = useEditorThemes();
  const editorVars = useEditorVars();
  const [demo, setDemo] = useState<Demo>(null);
  const [retry, setRetry] = useState(0);
  const [sideOpen, setSideOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [sideW, setSideW] = useState(() => {
    try {
      return Number(localStorage.getItem('cerne:lateral')) || 280;
    } catch {
      return 280;
    }
  });
  const [reveal, setReveal] = useState<{ path: string; nonce: number } | null>(null);

  const code = useRef<CodeViewHandle>(null);
  const findInput = useRef<HTMLInputElement>(null);
  const filterInput = useRef<HTMLInputElement>(null);
  const treeAnimated = useRef(false);
  const initialGo = useRef<{ path: string; line: number } | null>(session.path && session.lines ? { path: session.path, line: session.lines.from } : null);
  const lastUrlPath = useRef<string | null>(null);
  const readlineDone = useRef<boolean>((() => { try { return sessionStorage.getItem(READ_KEY) === '1'; } catch { return true; } })());

  // ---------- dados ----------
  useEffect(() => source.subscribeQuota(setQuota), []);

  useEffect(() => {
    let off = false;
    setEntries(null);
    setTreeError(null);
    setCommitsError(null);
    if (!refName) {
      source
        .getRepo(session.owner, session.repo)
        .then((info) => !off && setRefName(info.defaultBranch))
        .catch((e: unknown) => !off && setTreeError(mensagem(e)));
      return () => {
        off = true;
      };
    }
    Promise.all([source.getRepo(session.owner, session.repo), source.listRefs(), source.getTree(refName)])
      .then(([, r, t]) => {
        if (off) return;
        setRefs(r);
        setEntries(t);
        saveRecent(`${session.owner}/${session.repo}`);
      })
      .catch((e: unknown) => !off && setTreeError(mensagem(e)));
    void source.getCommits(refName).then((c) => !off && setCommits(c)).catch((e: unknown) => !off && setCommitsError(mensagem(e)));
    return () => {
      off = true;
    };
  }, [refName, reload, session.owner, session.repo]);

  // abre o arquivo do link quando a árvore chega
  const opened = useRef(false);
  useEffect(() => {
    if (!entries || opened.current) return;
    opened.current = true;
    if (session.path && entries.some((e) => e.path === session.path)) {
      setTabs([{ path: session.path, preview: false, pinned: false }]);
      setActive(session.path);
      if (session.lines) setSels({ [session.path]: session.lines });
      performance.mark('cerne:abrir');
    }
  }, [entries, session.path, session.lines]);

  // anima a árvore em cascata na primeira vez
  useEffect(() => {
    if (!entries || treeAnimated.current) return;
    treeAnimated.current = true;
    requestAnimationFrame(() => cascadeTree([...document.querySelectorAll('.ks-tree__row')]));
  }, [entries]);

  // ---------- abas ----------
  const openFile = useCallback((path: string, mode: 'preview' | 'pin' = 'preview') => {
    performance.clearMarks('cerne:abrir');
    performance.mark('cerne:abrir');
    setView('file');
    setDemo(null);
    setDrawer(false);
    setFindOpen(false);
    setTabs((prev) => {
      const hit = prev.find((t) => t.path === path);
      if (hit) return prev.map((t) => (t.path === path && mode === 'pin' ? { ...t, preview: false } : t));
      const base = mode === 'preview' ? prev.filter((t) => !t.preview) : prev;
      return [...base, { path, preview: mode === 'preview', pinned: false }];
    });
    setActive(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const i = prev.findIndex((t) => t.path === path);
      const next = prev.filter((t) => t.path !== path);
      setActive((a) => (a === path ? next[Math.min(i, next.length - 1)]?.path ?? null : a));
      return next;
    });
    setSplit((s) => (s === path ? null : s));
  }, []);

  const pinTab = useCallback((path: string) => {
    setTabs((prev) => {
      const t = prev.find((x) => x.path === path);
      if (!t) return prev;
      if (t.preview) return prev.map((x) => (x.path === path ? { ...x, preview: false } : x));
      const toggled = prev.map((x) => (x.path === path ? { ...x, pinned: !x.pinned } : x));
      return [...toggled.filter((x) => x.pinned), ...toggled.filter((x) => !x.pinned)];
    });
  }, []);

  // ---------- endereço ----------
  const selection = (active && sels[active]) || null;
  useEffect(() => {
    if (!refName) return;
    const url = buildPath({ owner: session.owner, repo: session.repo, ref: refPedido || active ? refName : null, path: active, lines: selection });
    const same = lastUrlPath.current === (active ?? '') + '|' + refName;
    lastUrlPath.current = (active ?? '') + '|' + refName;
    if (location.pathname + location.hash === url) return;
    if (same) history_replace(url);
    else history_push(url);
  }, [active, refName, refPedido, selection, session.owner, session.repo]);

  const setSelection = useCallback(
    (r: LineRange | null) => {
      if (active) setSels((s) => ({ ...s, [active]: r }));
    },
    [active],
  );

  // vai à linha do link na primeira abertura
  useEffect(() => {
    const go = initialGo.current;
    if (!go || go.path !== active || !activeFile || activeFile.file.path !== active) return;
    initialGo.current = null;
    const id = setTimeout(() => code.current?.scrollToLine(go.line), 120);
    return () => clearTimeout(id);
  }, [active, activeFile]);

  // mudar só o #L3-L5 do endereço (colar outro link) seleciona e vai até as linhas
  useEffect(() => {
    const on = () => {
      const r = parseLineHash(location.hash);
      if (!r || !active) return;
      setSels((s) => ({ ...s, [active]: r }));
      setTimeout(() => code.current?.scrollToLine(r.from), 50);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, [active]);

  // ---------- ações ----------
  const lines = activeFile?.lines ?? null;

  const gotoLine = useCallback((n: number) => code.current?.scrollToLine(n, true), []);

  const copyLink = useCallback(() => {
    if (!active) return toast('Abra um arquivo primeiro.', { error: true });
    const url = location.origin + buildPath({ owner: session.owner, repo: session.repo, ref: refName, path: active, lines: selection });
    const done = () => {
      code.current?.sweep();
      toast(selection ? `Link copiado com ${formatLineHash(selection)}` : 'Link copiado');
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => toast(url));
    else toast(url);
  }, [active, refName, selection, session.owner, session.repo]);

  const openHistory = useCallback(
    (path: string | null) => {
      setView('history');
      setHistory(null);
      setHistoryError(null);
      setCommitsError(null);
      void source.getCommits(refName, path ?? undefined).then((c) => setHistory({ path, commits: c })).catch((e: unknown) => setHistoryError({ path, message: mensagem(e) }));
    },
    [refName],
  );

  const openDiff = useCallback(
    (c: Commit, path: string) => {
      setView('diff');
      setDiff(null);
      setDiffError(null);
      void source.getChange(c.sha, path).then((ch) => setDiff({ commit: c, path, ...ch })).catch((e: unknown) => setDiffError({ commit: c, path, message: mensagem(e) }));
    },
    [],
  );

  const openSnippet = useCallback(() => {
    if (!lines || !selection) return toast('Selecione linhas clicando nos números do código.', { error: true });
    setSnippet(true);
  }, [lines, selection]);

  const runDemo = useCallback((d: Exclude<Demo, null>) => {
    setDemo(d);
    if (d === 'cota') source.setRemaining(0);
    if (d === 'carregando') setTimeout(() => setDemo((cur) => (cur === 'carregando' ? null : cur)), 3000);
  }, []);
  const clearDemo = useCallback(() => {
    setDemo((cur) => {
      if (cur === 'cota') source.setRemaining(44);
      return null;
    });
  }, []);

  const files = useMemo(() => (entries ?? []).map((e) => e.path), [entries]);

  // sabor da interface: fade de 160 ms; acento: só cor, em --dur-fast (sem View Transition)
  const setPref = useCallback((patch: Parameters<typeof prefsStore.set>[0]) => {
    if ('theme' in patch) withThemeTransition(() => prefsStore.set(patch));
    else prefsStore.set(patch);
  }, []);

  // ---------- comandos ----------
  const commands: Command[] = useMemo(() => {
    const c: Command[] = [];
    const add = (id: string, group: string, label: string, run: () => void, keys?: string[]) => c.push({ id, group, label, run, keys });
    add('prefs', 'Aplicativo', 'Abrir preferências', () => setPrefsOpen(true), ['Ctrl', ',']);
    add('side', 'Aplicativo', 'Mostrar ou esconder a árvore', () => (narrow ? setDrawer((d) => !d) : setSideOpen((s) => !s)), ['Ctrl', 'B']);
    add('split', 'Aplicativo', 'Abrir em duas colunas', () => setSplit((s) => (s ? null : tabs.find((t) => t.path !== active)?.path ?? active)), ['Ctrl', '\\']);
    add('find', 'Arquivo', 'Buscar no arquivo', () => lines && setFindOpen(true), ['Ctrl', 'F']);
    add('goto', 'Arquivo', 'Ir para a linha...', () => setPalette({ initial: ':', origin: null }), ['Ctrl', 'G']);
    add('wrap', 'Arquivo', prefs.wrap ? 'Desligar quebra de linha' : 'Ligar quebra de linha', () => prefsStore.set({ wrap: !prefs.wrap }), ['Alt', 'Z']);
    add('fold', 'Arquivo', 'Dobrar o bloco atual', () => code.current?.foldCurrent(true), ['Ctrl', 'Shift', '[']);
    add('unfold', 'Arquivo', 'Desdobrar o bloco atual', () => code.current?.foldCurrent(false), ['Ctrl', 'Shift', ']']);
    add('copy', 'Arquivo', 'Copiar link das linhas', copyLink, ['Alt', 'L']);
    add('snippet', 'Arquivo', 'Imagem do trecho', openSnippet, ['Alt', 'I']);
    add('history', 'Arquivo', 'Histórico do arquivo', () => openHistory(active), ['Alt', 'H']);
    add('diff', 'Arquivo', 'Ver mudanças do último commit', () => active && openDiff(commits[0]!, active), ['Alt', 'D']);
    add('pin', 'Arquivo', 'Fixar ou soltar a aba atual', () => active && pinTab(active));
    add('close', 'Arquivo', 'Fechar a aba atual', () => active && closeTab(active), ['Ctrl', 'W']);
    add('ref', 'Repositório', 'Trocar ramo, tag ou commit...', () => setRefOpen(true));
    add('exit', 'Repositório', 'Voltar ao início', onExit, ['Alt', 'Home']);
    for (const t of THEMES) add('tema-' + t.id, 'Tema', `Tema da página: ${t.label}`, () => setPref({ theme: t.id }));
    for (const a of ACCENTS) add('acento-' + a, 'Tema', `Cor de destaque: ${a}`, () => setPref({ accent: a }));
    add('ed-sys', 'Tema do editor', 'Tema do editor: igual à interface', () => prefsStore.set({ editorTheme: null }));
    for (const t of editorThemes) add('ed-' + t.id, 'Tema do editor', `Tema do editor: ${t.label}`, () => prefsStore.set({ editorTheme: t.id }));
    for (const sc of Object.keys(SCOPE_LABELS) as EditorScope[]) add('esc-' + sc, 'Tema do editor', `Alcance do tema do editor: ${SCOPE_LABELS[sc]}`, () => prefsStore.set({ editorScope: sc }));
    for (const k of Object.keys(PACK_LABELS) as IconPack[]) add('ico-' + k, 'Ícones', `Pacote de ícones: ${PACK_LABELS[k]}`, () => prefsStore.set({ icons: k }));
    for (const d of ['compact', 'normal', 'comfortable'] as Density[]) add('dens-' + d, 'Interface', `Densidade: ${{ compact: 'compacta', normal: 'normal', comfortable: 'confortável' }[d]}`, () => prefsStore.set({ density: d }));
    add('contraste', 'Interface', prefs.contrast ? 'Desligar alto contraste' : 'Ligar alto contraste', () => prefsStore.set({ contrast: !prefs.contrast }));
    add('movimento', 'Interface', reducedMotion(prefs) ? 'Desligar movimento reduzido' : 'Ligar movimento reduzido', () => prefsStore.set({ motion: reducedMotion(prefs) ? 'full' : 'reduced' }));
    add('lig', 'Interface', prefs.ligatures ? 'Desligar ligaduras' : 'Ligar ligaduras', () => prefsStore.set({ ligatures: !prefs.ligatures }));
    add('demo-load', 'Demonstrar estado', 'Demonstrar estado: carregando', () => runDemo('carregando'));
    add('demo-erro', 'Demonstrar estado', 'Demonstrar estado: erro', () => runDemo('erro'));
    add('demo-cota', 'Demonstrar estado', 'Demonstrar estado: cota esgotada', () => runDemo('cota'));
    return c;
  }, [prefs, narrow, tabs, active, lines, commits, editorThemes, copyLink, openSnippet, openHistory, openDiff, pinTab, closeTab, onExit, setPref, runDemo]);

  // ---------- teclado ----------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && !e.shiftKey && !e.altKey && (k === 'k' || k === 'p')) setPalette({ initial: '', origin: null });
      else if (ctrl && e.shiftKey && k === 'p') setPalette({ initial: '>', origin: null });
      else if (ctrl && k === 'g') setPalette({ initial: ':', origin: null });
      else if (ctrl && k === 'f' && lines && view === 'file') {
        setFindOpen(true);
        requestAnimationFrame(() => findInput.current?.focus());
      } else if (ctrl && k === 'b') {
        if (narrow) setDrawer((d) => !d);
        else setSideOpen((s) => !s);
      }
      else if (ctrl && e.key === '\\') setSplit((s) => (s ? null : tabs.find((t) => t.path !== active)?.path ?? active));
      else if (ctrl && e.key === ',') setPrefsOpen(true);
      else if (ctrl && k === 'w' && active) closeTab(active);
      else if (ctrl && e.shiftKey && e.key === '[') code.current?.foldCurrent(true);
      else if (ctrl && e.shiftKey && e.key === ']') code.current?.foldCurrent(false);
      else if (e.altKey && k === 'z') prefsStore.set({ wrap: !prefs.wrap });
      else if (e.altKey && k === 'l') copyLink();
      else if (e.altKey && k === 'i') openSnippet();
      else if (e.altKey && k === 'h') openHistory(active);
      else if (e.altKey && k === 'd' && active && commits[0]) openDiff(commits[0], active);
      else if (e.altKey && k === 'home') onExit();
      else if (e.key === 'Escape' && demo) clearDemo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, lines, view, tabs, narrow, prefs.wrap, commits, demo, copyLink, openSnippet, openHistory, openDiff, closeTab, clearDemo, onExit]);

  const onFile = useCallback((f: { file: FileContent; lines: string[] | null } | null) => setActiveFile(f), []);
  const onFirstReadline = readlineDone.current ? false : true;

  const lang = active ? langOf(active) : null;
  const themeLabel = prefs.editorTheme ? `${editorThemes.find((t) => t.id === prefs.editorTheme)?.label ?? ''} · ${SCOPE_LABELS[prefs.editorScope]}` : 'Igual à interface';
  const treeGate = useLoadingGate(!entries && !treeError);
  const viewGate = useLoadingGate((view === 'history' && !history) || (view === 'diff' && !diff));

  const sideStyle = { '--side-w': `${sideW}px` } as CSSProperties;
  const sidebar = (
    <aside className={`ks-pane ks-pane--side${narrow ? ' is-drawer' : ''}${narrow && drawer ? ' is-open' : ''}`} style={sideStyle} aria-label="Painel de arquivos">
      <div className="ks-pane__head">
        <span>arquivos</span>
        <span className="ks-pane__count">{entries ? `${entries.length} arquivos` : ''}</span>
      </div>
      {treeError ? (
        <PaneState kind="error" title="Não foi possível ler a árvore" actions={<button type="button" className="key" onClick={() => setReload((n) => n + 1)}>Tentar de novo</button>}>{treeError}</PaneState>
      ) : !entries ? (
        treeGate ? <PaneState kind="loading" title="Carregando a árvore" /> : null
      ) : (
        <Tree entries={entries} active={active} pack={prefs.icons} onOpen={openFile} filterRef={filterInput} focusPath={reveal} />
      )}
    </aside>
  );

  // ---------- corpo do painel principal ----------
  let body: React.ReactNode;
  if (demo === 'carregando') body = <PaneState kind="loading" title="Carregando (demonstração)" />;
  else if (demo === 'erro')
    body = (
      <PaneState kind="error" title="Algo deu errado (demonstração)" actions={<button type="button" className="key" onClick={clearDemo}>Tentar de novo</button>}>
        Não consegui falar com o GitHub. Verifique sua conexão e tente de novo.
      </PaneState>
    );
  else if (demo === 'cota')
    body = (
      <PaneState
        kind="quota"
        title="Cota da API esgotada (demonstração)"
        actions={
          <>
            <button type="button" className="key key--accent" onClick={() => toast('Demonstração: o token entra na v1.')}>Usar um token</button>
            <button type="button" className="key" onClick={clearDemo}>Voltar</button>
          </>
        }
      >
        Sem token, o GitHub libera 60 chamadas por hora. A cota volta às {new Date(quota.resetAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Com um token são 5 000 por hora.
      </PaneState>
    );
  else if (view === 'history') {
    const erro = historyError?.message ?? (history ? null : commitsError);
    body = erro ? (
      <PaneState
        kind="error"
        title="Não foi possível ler o histórico"
        actions={
          <button type="button" className="key" onClick={() => (historyError ? openHistory(historyError.path) : setReload((n) => n + 1))}>
            Tentar de novo
          </button>
        }
      >
        {erro}
      </PaneState>
    ) : !history ? (
      viewGate ? <PaneState kind="loading" title="Carregando o histórico" /> : null
    ) : (
      <CommitList commits={history.commits} active={null} path={history.path} onPick={(c) => openDiff(c, history.path ?? active ?? 'README.md')} />
    );
  } else if (view === 'diff') {
    body = diffError ? (
      <PaneState
        kind="error"
        title="Não foi possível ler as mudanças"
        actions={
          <button type="button" className="key" onClick={() => openDiff(diffError.commit, diffError.path)}>
            Tentar de novo
          </button>
        }
      >
        {diffError.message}
      </PaneState>
    ) : !diff ? (
      viewGate ? <PaneState kind="loading" title="Carregando as mudanças" /> : null
    ) : (
      <DiffView before={diff.before} after={diff.after} commit={diff.commit} path={diff.path} />
    );
  } else if (active)
    body = (
      <>
        <FilePane
          source={source}
          refName={refName}
          path={active}
          prefs={prefs}
          primary
          selection={selection}
          onSelect={setSelection}
          find={findOpen ? find : null}
          handleRef={code}
          onFile={onFile}
          onInfo={setEdInfo}
          readline={onFirstReadline}
          onFirstPaint={markScreenReady}
          retry={retry}
          onRetry={() => setRetry((n) => n + 1)}
        />
        {findOpen && lines && (
          <FindBar
            ref={findInput}
            lines={lines}
            onChange={setFind}
            onJump={(l) => code.current?.scrollToLine(l)}
            onClose={() => {
              setFindOpen(false);
              code.current?.focus();
            }}
          />
        )}
      </>
    );
  else
    body = (
      <EmptyPane
        onPalette={() => setPalette({ initial: '', origin: null })}
        onTree={() => (narrow ? setDrawer(true) : setSideOpen(true))}
        onPrefs={() => {
          setPrefsOrigin(null);
          setPrefsOpen(true);
        }}
      />
    );

  useEffect(() => {
    if (!readlineDone.current && activeFile?.lines) {
      readlineDone.current = true;
      try {
        sessionStorage.setItem(READ_KEY, '1');
      } catch {
        /* ignora */
      }
    }
  }, [activeFile]);

  // sem arquivo no link, a primeira tela é a árvore: libera o GSAP depois dela
  useEffect(() => {
    if (entries && !session.path) markScreenReady();
  }, [entries, session.path]);

  const splitPath = !narrow && split;

  return (
    <div className="ks-app" data-density={prefs.density} style={codeStyle(prefs) as CSSProperties}>
      <header className="ks-appbar">
        <button type="button" className="ks-icon-btn ks-appbar__home" aria-label="Voltar ao início" data-tip="Voltar ao início" data-tip-key="Alt Home" onClick={onExit}>
          <Icon name="home" />
        </button>
        {narrow && (
          <button type="button" className="ks-icon-btn" aria-label="Arquivos" aria-expanded={drawer} data-tip="Arquivos" onClick={() => setDrawer((d) => !d)}>
            <Icon name="panelLeft" />
          </button>
        )}
        <div className="ks-appbar__repo">
          <Icon name="book" />
          <span>{session.owner}/{session.repo}</span>
          <span className="ks-appbar__refwrap">
            <button type="button" className="ks-appbar__ref" aria-haspopup="menu" aria-expanded={refOpen} onClick={() => setRefOpen((o) => !o)}>
              <Icon name="branch" size={12} />
              {refName}
            </button>
            <Presence open={refOpen}>
              {refOpen && <RefPicker refs={refs} commits={commits} current={refName} onPick={(n) => { setRefName(n); setRefPedido(true); setTabs([]); setActive(null); setSplit(null); }} onClose={() => setRefOpen(false)} />}
            </Presence>
          </span>
        </div>
        <button
          type="button"
          className="ks-appbar__search"
          aria-label="Buscar arquivo ou comando"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setPalette({ initial: '', origin: e.detail === 0 ? null : { x: r.left + r.width / 2, y: r.bottom } });
          }}
        >
          <Icon name="search" />
          <span>Buscar arquivo ou comando</span>
          <kbd className="ks-kbd">Ctrl</kbd>
          <kbd className="ks-kbd">K</kbd>
        </button>
        <div className="ks-appbar__actions">
          <button type="button" className="ks-icon-btn" aria-label="Copiar link das linhas" data-tip="Copiar link das linhas" data-tip-key="Alt+L" onClick={copyLink}><Icon name="link" /></button>
          <button type="button" className="ks-icon-btn" aria-label="Imagem do trecho" data-tip="Imagem do trecho" data-tip-key="Alt+I" onClick={(e) => { setSnipOrigin(centerOf(e)); openSnippet(); }}><Icon name="image" /></button>
          {!narrow && <button type="button" className="ks-icon-btn" aria-label="Duas colunas" aria-pressed={!!split} data-tip="Duas colunas" data-tip-key="Ctrl+\\" onClick={() => setSplit((s) => (s ? null : tabs.find((t) => t.path !== active)?.path ?? active))}><Icon name="columns" /></button>}
          <button type="button" className="ks-icon-btn" aria-label="Preferências" data-tip="Preferências" data-tip-key="Ctrl+," onClick={(e) => { setPrefsOrigin(centerOf(e)); setPrefsOpen(true); }}><Icon name="settings" /></button>
        </div>
      </header>

      <div className="ks-panes" data-scoped={editorVars.scope === 'workspace' && editorVars.vars ? '' : undefined} style={editorVars.scope === 'workspace' ? varsToStyle(editorVars.vars) : undefined}>
        {(!narrow && sideOpen) || narrow ? sidebar : null}
        {narrow && drawer && <div className="ks-drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
        {!narrow && sideOpen && <Splitter value={sideW} onChange={(v) => { setSideW(v); try { localStorage.setItem('cerne:lateral', String(v)); } catch { /* ignora */ } }} max={() => innerWidth * 0.5} label="Redimensionar a árvore" />}
        <main className="ks-pane ks-pane--main" aria-label="Arquivo">
          {tabs.length > 1 && (
            <Tabs tabs={tabs} active={active} pack={prefs.icons} onSelect={(p) => openFile(p, 'pin')} onClose={closeTab} onPin={pinTab} />
          )}
          <div className="ks-pane__head">
            {active ? <Breadcrumb path={active} onCrumb={(f) => { setSideOpen(true); setReveal({ path: f, nonce: Date.now() }); }} /> : <span>sem arquivo</span>}
            <div className="ks-pane__tools">
              <button type="button" className="ks-icon-btn" aria-pressed={view === 'file'} aria-label="Ver o arquivo" data-tip="Ver o arquivo" onClick={() => setView('file')} disabled={!active}><Icon name="file" /></button>
              <button type="button" className="ks-icon-btn" aria-pressed={view === 'history'} aria-label="Histórico do arquivo" data-tip="Histórico do arquivo" data-tip-key="Alt+H" onClick={() => openHistory(active)}><Icon name="history" /></button>
              <button type="button" className="ks-icon-btn" aria-pressed={view === 'diff'} aria-label="Mudanças do último commit" data-tip="Mudanças do último commit" data-tip-key="Alt+D" disabled={!active || !commits[0]} onClick={() => active && commits[0] && openDiff(commits[0], active)}><Icon name="diff" /></button>
            </div>
          </div>
          <div className={`ks-pane__body${demo ? ' is-demo' : ''}`} key={demo ?? view}>{body}</div>
        </main>
        {splitPath && (
          <>
            <div className="ks-splitter-gap" aria-hidden="true" />
            <section className="ks-pane ks-pane--second" aria-label="Segunda coluna">
              <div className="ks-pane__head">
                <Select
                  ariaLabel="Arquivo da segunda coluna"
                  value={splitPath}
                  options={[
                    ...tabs.map((t) => ({ value: t.path, label: baseName(t.path) })),
                    ...(tabs.some((t) => t.path === splitPath) ? [] : [{ value: splitPath, label: baseName(splitPath) }]),
                  ]}
                  onChange={setSplit}
                />
                <button type="button" className="ks-icon-btn" aria-label="Fechar segunda coluna" data-tip="Fechar segunda coluna" onClick={() => setSplit(null)}><Icon name="x" /></button>
              </div>
              <div className="ks-pane__body">
                <FilePane source={source} refName={refName} path={splitPath} prefs={prefs} primary={false} selection={null} onSelect={() => {}} find={null} onFile={() => {}} readline={false} retry={retry} onRetry={() => setRetry((n) => n + 1)} />
              </div>
            </section>
          </>
        )}
      </div>

      <footer className="ks-appstatus">
        <div>
          <span><Icon name="branch" />{refName}</span>
          {!online && <span role="status">Sem conexão: mostrando o que já foi lido</span>}
          {lang && <span>{lang.label}</span>}
          {lines && <span>{lines.length.toLocaleString('pt-BR')} linhas</span>}
          {selection && <span>{selection.from === selection.to ? `Linha ${selection.from}` : `Linhas ${selection.from}-${selection.to}`}</span>}
        </div>
        <div>
          <Meter quota={quota} />
          <span title="Tema do editor">{themeLabel}{edInfo ? '' : ''}</span>
          <span>UTF-8 LF</span>
        </div>
      </footer>

      <Presence open={!!palette}>
        {palette && (
          <CommandPalette
            open={palette}
            files={files}
            commands={commands}
            lineCount={lines ? lines.length : null}
            onOpenFile={(p) => { openFile(p, 'pin'); setReveal({ path: p, nonce: Date.now() }); }}
            onGoToLine={gotoLine}
            onClose={() => setPalette(null)}
          />
        )}
      </Presence>
      <Presence open={prefsOpen}>{prefsOpen && <Preferences origin={prefsOrigin} onClose={() => setPrefsOpen(false)} />}</Presence>
      <Presence open={snippet}>
        {snippet && active && lines && selection && <SnippetDialog path={active} lines={lines} range={selection} origin={snipOrigin} onClose={() => setSnippet(false)} />}
      </Presence>
      <ToastHost />
      <Tooltip />
    </div>
  );
}

function history_push(url: string) {
  history.pushState(null, '', url);
}

function history_replace(url: string) {
  history.replaceState(null, '', url);
}

/** Mensagem de erro legível para o painel afetado. */
const mensagem = (e: unknown) => String(e instanceof Error ? e.message : e);

function centerOf(e: { currentTarget: Element; detail?: number }): { x: number; y: number } | null {
  if (e.detail === 0) return null; // acionado pelo teclado
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Painel sem arquivo: os três atalhos que levam a algum lugar. */
function EmptyPane({ onPalette, onTree, onPrefs }: { onPalette: () => void; onTree: () => void; onPrefs: () => void }) {
  const rows: { label: string; hint: string; keys: string[]; run: () => void }[] = [
    { label: 'Buscar arquivo ou comando', hint: 'Digite parte do nome', keys: ['Ctrl', 'K'], run: onPalette },
    { label: 'Mostrar a árvore de arquivos', hint: 'Navegue pelas pastas', keys: ['Ctrl', 'B'], run: onTree },
    { label: 'Abrir as preferências', hint: 'Tema, código e dados', keys: ['Ctrl', ','], run: onPrefs },
  ];
  return (
    <div className="ks-emptypane">
      <div className="ks-emptypane__body">
        <p className="ks-emptypane__title">Nenhum arquivo aberto</p>
        <ul className="ks-emptypane__list">
          {rows.map((r) => (
            <li key={r.label}>
              <button type="button" className="ks-emptypane__item" onClick={r.run}>
                <span className="ks-emptypane__label">{r.label}</span>
                <span className="ks-emptypane__hint">{r.hint}</span>
                <span className="ks-emptypane__keys">
                  {r.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
