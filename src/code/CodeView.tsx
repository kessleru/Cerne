import { memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import { Icon } from '../components/Icon';
import { computeFolds } from '../lib/folds';
import type { LineRange } from '../lib/hash';
import { buildLayout, visibleIndexOf, windowFor } from '../lib/layout';
import { readline, sweepLines } from '../anim/motion';
import { openHighlight, type HighlightSession } from './client';
import { CHUNK, type ThemeInfo, type Tok } from './protocol';

export type FindMatch = { line: number; start: number; end: number };

export type CodeViewHandle = {
  scrollToLine: (line: number, select?: boolean) => void;
  foldCurrent: (fold: boolean) => void;
  focus: () => void;
  /** retângulo (relativo ao contêiner rolável) das linhas selecionadas, para animações */
  selectionBox: () => { top: number; height: number } | null;
  /** faixa de acento que percorre as linhas selecionadas (copiar link) */
  sweep: () => void;
};

type Props = {
  handleRef?: Ref<CodeViewHandle>;
  fileKey: string;
  lines: string[];
  lang: string | null;
  /** id do tema do Shiki; null = seguir o sistema (classes tok-*) */
  editorTheme: string | null;
  wrap: boolean;
  /** muda quando tamanho, fonte, altura de linha ou tab mudam: força nova medição */
  metricsKey: string;
  selection: LineRange | null;
  onSelect: (r: LineRange | null) => void;
  find?: { matches: FindMatch[]; current: number } | null;
  onFirstPaint?: () => void;
  onInfo?: (info: ThemeInfo | null) => void;
  /** primeira abertura da sessão: linha de leitura que desce uma vez */
  readline?: boolean;
  readOnlyLabel: string;
};

const OVERSCAN = 12;

function leading(text: string) {
  let i = 0;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++;
  return i;
}

type Seg = { t: string; c?: string; k?: string; f?: number; mark?: 0 | 1 | 2 };

/** Corta os tokens depois do recuo e parte nos trechos achados pela busca. */
function segments(text: string, toks: Tok[] | undefined, from: number, ranges: { start: number; end: number; cur: boolean }[]): Seg[] {
  const base: Tok[] = toks ?? [{ t: text }];
  const out: Seg[] = [];
  let pos = 0;
  for (const tk of base) {
    const len = tk.t.length;
    const a = Math.max(from - pos, 0);
    if (a < len) {
      let piece = tk.t.slice(a);
      let start = pos + a;
      // parte em fatias a cada limite de busca
      let guard = 0;
      while (piece && guard++ < 50) {
        const r = ranges.find((x) => x.end > start && x.start < start + piece.length);
        if (!r) {
          out.push({ ...tk, t: piece });
          break;
        }
        if (r.start > start) {
          const n = r.start - start;
          out.push({ ...tk, t: piece.slice(0, n) });
          piece = piece.slice(n);
          start += n;
          continue;
        }
        const n = Math.min(r.end - start, piece.length);
        out.push({ ...tk, t: piece.slice(0, n), mark: r.cur ? 2 : 1 });
        piece = piece.slice(n);
        start += n;
      }
    }
    pos += len;
  }
  return out;
}

type LineProps = {
  i: number;
  text: string;
  toks: Tok[] | undefined;
  unit: number;
  selected: boolean;
  current: boolean;
  foldable: boolean;
  folded: boolean;
  hidden: number;
  ranges: { start: number; end: number; cur: boolean }[];
  onNumber: (line: number, shift: boolean) => void;
  onFold: (line: number) => void;
};

const Line = memo(function Line({ i, text, toks, unit, selected, current, foldable, folded, hidden, ranges, onNumber, onFold }: LineProps) {
  const lead = leading(text);
  const segs = useMemo(() => segments(text, toks, lead, ranges), [text, toks, lead, ranges]);
  // guias de indentação: um nível a cada `unit` espaços (ou a cada tab)
  const guides: number[] = [];
  let spaces = 0;
  for (let k = 0; k < lead; k++) {
    if (text[k] === '	') guides.push(0);
    else if (++spaces % unit === 0) guides.push(1);
  }
  const rest = spaces % unit;
  return (
    <div
      className={`ks-line${selected ? ' is-selected' : ''}${current ? ' is-current' : ''}`}
      data-line={i + 1}
    >
      <span
        className="ks-line__no"
        onMouseDown={(e) => {
          e.preventDefault();
          onNumber(i + 1, e.shiftKey);
        }}
        aria-label={`Linha ${i + 1}`}
      >
        {i + 1}
      </span>
      <span
        className="ks-line__fold"
        role={foldable ? 'button' : undefined}
        aria-expanded={foldable ? !folded : undefined}
        aria-label={foldable ? (folded ? 'Desdobrar' : 'Dobrar') : undefined}
        onMouseDown={(e) => {
          if (!foldable) return;
          e.preventDefault();
          onFold(i);
        }}
      >
        {foldable && <Icon name="chevronRight" />}
      </span>
      <span className="ks-line__code">
        {guides.map((g, n) =>
          g ? <span key={n} className="ks-indent" style={{ width: `${unit}ch` }} /> : <span key={n} className="ks-indent" />,
        )}
        {rest > 0 && <span className="ks-ws">{' '.repeat(rest)}</span>}
        {segs.map((s, n) => {
          const cls = [s.c, s.mark ? (s.mark === 2 ? 'ks-find is-current' : 'ks-find') : ''].filter(Boolean).join(' ');
          const style: CSSProperties | undefined =
            s.k || s.f
              ? {
                  color: s.k,
                  fontStyle: s.f && s.f & 1 ? 'italic' : undefined,
                  fontWeight: s.f && s.f & 2 ? 700 : undefined,
                  textDecoration: s.f && s.f & 4 ? 'underline' : undefined,
                }
              : undefined;
          return (
            <span key={n} className={cls || undefined} style={style}>
              {s.t}
            </span>
          );
        })}
        {folded && (
          <button type="button" className="ks-fold-ghost" onMouseDown={(e) => { e.preventDefault(); onFold(i); }} aria-label={`${hidden} linhas dobradas, desdobrar`} tabIndex={-1}>
            …
          </button>
        )}
      </span>
    </div>
  );
});

export function CodeView(p: Props) {
  const { lines, fileKey, lang, editorTheme, wrap, selection, onSelect } = p;
  const boxRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState({ lineH: 20, ch: 8, width: 800 });
  const [view, setView] = useState({ top: 0, height: 600 });
  const [foldMap, setFoldMap] = useState<Map<number, number>>(() => new Map());
  const [folded, setFolded] = useState<ReadonlySet<number>>(() => new Set());
  const [cur, setCur] = useState<number | null>(null); // linha atual, 1-based
  const anchor = useRef<number | null>(null);
  const [, setTick] = useState(0); // novo bloco colorido chegou: só força o desenho
  const tokens = useRef(new Map<number, Tok[][]>());
  const session = useRef<HighlightSession | null>(null);
  const themeRef = useRef<string | null>(editorTheme);
  const [info, setInfo] = useState<ThemeInfo | null>(null);

  // --- medidas (altura de linha e largura do caractere) ---
  useLayoutEffect(() => {
    const box = boxRef.current;
    const probe = probeRef.current;
    if (!box || !probe) return;
    const cs = getComputedStyle(box);
    const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
    const ch = probe.getBoundingClientRect().width / 10 || 8;
    setMetrics((m) => (m.lineH === lineH && m.ch === ch ? m : { ...m, lineH, ch }));
  }, [p.metricsKey]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      setView((v) => (v.height === box.clientHeight ? v : { ...v, height: box.clientHeight }));
      setMetrics((m) => (m.width === box.clientWidth ? m : { ...m, width: box.clientWidth }));
    });
    ro.observe(box);
    setView((v) => ({ ...v, height: box.clientHeight }));
    setMetrics((m) => ({ ...m, width: box.clientWidth }));
    return () => ro.disconnect();
  }, []);

  const onScroll = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (onScroll.current != null) return;
    onScroll.current = requestAnimationFrame(() => {
      onScroll.current = null;
      const box = boxRef.current;
      if (box) setView((v) => (v.top === box.scrollTop ? v : { ...v, top: box.scrollTop }));
    });
  }, []);

  // --- novo arquivo: zera dobras, seleção e cache de cores ---
  useLayoutEffect(() => {
    setFolded(new Set());
    setFoldMap(new Map());
    setCur(null);
    anchor.current = null;
    tokens.current = new Map();
    setTick((t) => t + 1);
    const box = boxRef.current;
    if (box) {
      box.scrollTop = 0;
      box.scrollLeft = 0;
    }
    setView((v) => ({ ...v, top: 0 }));
  }, [fileKey]);

  // dobras: calculadas depois da primeira tela, para não atrasar a abertura
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      if (!cancelled) setFoldMap(computeFolds(lines));
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [lines]);

  // --- destaque no worker ---
  useEffect(() => {
    themeRef.current = editorTheme;
    const text = lines.join('\n');
    const s = openHighlight(text, lang, editorTheme, (m) => {
      if (m.type === 'ready') {
        setInfo(m.info);
        p.onInfo?.(m.info);
        wantRef.current();
      } else if (m.type === 'chunk') {
        if (m.theme !== themeRef.current) return;
        tokens.current.set(m.chunk, m.lines);
        // guarda só os blocos perto da tela: 60 blocos
        if (tokens.current.size > 60) {
          const first = tokens.current.keys().next().value;
          if (first !== undefined) tokens.current.delete(first);
        }
        setTick((t) => t + 1);
      }
    });
    session.current = s;
    return () => {
      s.close();
      session.current = null;
    };
    // o tema muda por retheme, sem reenviar o texto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, lang]);

  useEffect(() => {
    if (themeRef.current === editorTheme) return;
    themeRef.current = editorTheme;
    tokens.current = new Map();
    setTick((t) => t + 1);
    session.current?.retheme(editorTheme);
  }, [editorTheme]);

  // --- layout virtual ---
  const cols = Math.max(20, Math.floor((metrics.width - (String(lines.length).length + 4) * metrics.ch - 60) / metrics.ch));
  const layout = useMemo(
    () => buildLayout(lines.length, foldMap, folded, wrap ? (i) => Math.max(1, Math.ceil(lines[i]!.length / cols)) : undefined),
    [lines, foldMap, folded, wrap, cols],
  );
  const win = windowFor(layout, view.top, view.height, metrics.lineH, OVERSCAN);

  // pede o destaque dos blocos visíveis: o do centro primeiro, depois os vizinhos
  const wantRef = useRef(() => {});
  wantRef.current = () => {
    const s = session.current;
    if (!s || win.to <= win.from) return;
    const first = layout.visible[win.from]!;
    const last = layout.visible[win.to - 1]!;
    const mid = Math.floor((first + last) / 2 / CHUNK);
    const lo = Math.floor(first / CHUNK);
    const hi = Math.floor(last / CHUNK);
    const order: number[] = [];
    const push = (c: number) => {
      if (c >= 0 && c <= Math.floor((lines.length - 1) / CHUNK) && !order.includes(c) && !tokens.current.has(c)) order.push(c);
    };
    push(mid);
    for (let c = lo; c <= hi; c++) push(c);
    push(lo - 1);
    push(hi + 1);
    push(lo - 2);
    push(hi + 2);
    if (order.length) s.want(themeRef.current, order);
  };
  useEffect(() => {
    const id = setTimeout(() => wantRef.current(), 40);
    return () => clearTimeout(id);
  }, [win.from, win.to, layout]);

  // --- primeira tela ---
  const painted = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (painted.current === fileKey || win.to <= win.from) return;
    painted.current = fileKey;
    performance.mark('cerne:linhas');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        performance.mark('cerne:pintado');
        try {
          performance.measure('cerne:primeira-tela', 'cerne:abrir', 'cerne:pintado');
        } catch {
          /* sem marca de abertura */
        }
        p.onFirstPaint?.();
        if (p.readline && readRef.current && boxRef.current) readline(readRef.current, boxRef.current.clientHeight - 16);
      }),
    );
  });

  // --- seleção, linha atual, dobra ---
  const select = useCallback(
    (line: number, shift: boolean) => {
      setCur(line);
      if (shift && anchor.current != null) {
        const a = anchor.current;
        onSelect({ from: Math.min(a, line), to: Math.max(a, line) });
      } else {
        anchor.current = line;
        onSelect({ from: line, to: line });
      }
    },
    [onSelect],
  );

  const toggleFold = useCallback((start: number) => {
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });
  }, []);

  const scrollToLine = useCallback(
    (line: number, selectIt = false) => {
      const box = boxRef.current;
      if (!box) return;
      const idx0 = line - 1;
      // abre as dobras que escondem a linha
      let nextFolded = folded;
      for (const s of folded) {
        const end = foldMap.get(s);
        if (end !== undefined && idx0 > s && idx0 <= end) {
          if (nextFolded === folded) nextFolded = new Set(folded);
          (nextFolded as Set<number>).delete(s);
        }
      }
      if (nextFolded !== folded) setFolded(nextFolded);
      const lay = nextFolded === folded ? layout : buildLayout(lines.length, foldMap, nextFolded, wrap ? (i) => Math.max(1, Math.ceil(lines[i]!.length / cols)) : undefined);
      const vi = visibleIndexOf(lay.visible, idx0);
      const top = lay.tops[vi]! * metrics.lineH;
      box.scrollTop = Math.max(0, top - box.clientHeight / 2 + metrics.lineH);
      setView((v) => ({ ...v, top: box.scrollTop }));
      setCur(line);
      if (selectIt) {
        anchor.current = line;
        onSelect({ from: line, to: line });
      }
    },
    [folded, foldMap, layout, lines, wrap, cols, metrics.lineH, onSelect],
  );

  useImperativeHandle(
    p.handleRef,
    () => ({
      scrollToLine,
      focus: () => boxRef.current?.focus(),
      foldCurrent: (fold: boolean) => {
        const line = (cur ?? selection?.from ?? 1) - 1;
        // procura a dobra mais próxima que começa nesta linha ou a contém
        let start = foldMap.has(line) ? line : -1;
        if (start < 0) for (const [s, e] of foldMap) if (s < line && e >= line && s > start) start = s;
        if (start < 0) return;
        setFolded((prev) => {
          const next = new Set(prev);
          if (fold) next.add(start);
          else next.delete(start);
          return next;
        });
      },
      sweep: () => {
        const el = sweepRef.current;
        if (!el || !selection) return;
        const a = visibleIndexOf(layout.visible, selection.from - 1);
        const b = visibleIndexOf(layout.visible, selection.to - 1);
        el.style.top = `${layout.tops[a]! * metrics.lineH + 8}px`;
        el.style.height = `${(layout.tops[b + 1]! - layout.tops[a]!) * metrics.lineH}px`;
        sweepLines(el);
      },
      selectionBox: () => {
        if (!selection) return null;
        const a = visibleIndexOf(layout.visible, selection.from - 1);
        const b = visibleIndexOf(layout.visible, selection.to - 1);
        const top = layout.tops[a]! * metrics.lineH + 8; // 8 = padding do contêiner
        return { top, height: (layout.tops[b + 1]! - layout.tops[a]!) * metrics.lineH };
      },
    }),
    [scrollToLine, cur, selection, foldMap, layout, metrics.lineH],
  );

  // teclado dentro do código
  const onKeyDown = (e: React.KeyboardEvent) => {
    const here = cur ?? selection?.from ?? 0;
    const vi = here ? visibleIndexOf(layout.visible, here - 1) : -1;
    const move = (to: number) => {
      const idx = Math.max(0, Math.min(layout.visible.length - 1, to));
      const line = layout.visible[idx]! + 1;
      select(line, e.shiftKey);
      const box = boxRef.current!;
      const topPx = layout.tops[idx]! * metrics.lineH + 8;
      if (topPx < box.scrollTop) box.scrollTop = topPx - metrics.lineH;
      else if (topPx + metrics.lineH * 2 > box.scrollTop + box.clientHeight) box.scrollTop = topPx - box.clientHeight + metrics.lineH * 3;
      setView((v) => ({ ...v, top: box.scrollTop }));
      e.preventDefault();
    };
    const page = Math.max(1, Math.floor(view.height / metrics.lineH) - 1);
    switch (e.key) {
      case 'ArrowDown': return move(vi + 1);
      case 'ArrowUp': return move(vi < 0 ? 0 : vi - 1);
      case 'PageDown': return move(vi + page);
      case 'PageUp': return move(vi - page);
      case 'Home': if (e.ctrlKey) return move(0); break;
      case 'End': if (e.ctrlKey) return move(layout.visible.length - 1); break;
      case 'Enter':
        if (foldMap.has(here - 1)) {
          toggleFold(here - 1);
          e.preventDefault();
        }
        break;
      case 'Escape':
        if (selection) {
          onSelect(null);
          anchor.current = null;
        }
        break;
    }
  };

  // --- bloco de linhas visíveis ---
  const unit = useMemo(() => {
    // unidade de recuo do arquivo: o menor degrau de espaços entre linhas vizinhas (2 ou 4)
    let two = 0;
    let four = 0;
    for (let i = 0; i < Math.min(lines.length, 400); i++) {
      const n = leading(lines[i]!);
      if (n > 0 && lines[i]![0] === ' ') {
        if (n % 4 === 0) four++;
        if (n % 2 === 0 && n % 4 !== 0) two++;
      }
    }
    return two > 0 || four === 0 ? 2 : 4;
  }, [lines]);

  const matchesByLine = useMemo(() => {
    const m = new Map<number, { start: number; end: number; cur: boolean }[]>();
    if (p.find) {
      p.find.matches.forEach((x, k) => {
        const list = m.get(x.line) ?? [];
        list.push({ start: x.start, end: x.end, cur: k === p.find!.current });
        m.set(x.line, list);
      });
    }
    return m;
  }, [p.find]);

  const rows = [];
  const none: { start: number; end: number; cur: boolean }[] = useMemo(() => [], []);
  for (let k = win.from; k < win.to; k++) {
    const i = layout.visible[k]!;
    const chunk = tokens.current.get(Math.floor(i / CHUNK));
    const toks = chunk?.[i - Math.floor(i / CHUNK) * CHUNK];
    const end = foldMap.get(i);
    const isFolded = folded.has(i);
    rows.push(
      <Line
        key={i}
        i={i}
        text={lines[i]!}
        toks={toks}
        unit={unit}
        selected={!!selection && i + 1 >= selection.from && i + 1 <= selection.to}
        current={cur === i + 1}
        foldable={end !== undefined}
        folded={isFolded}
        hidden={end !== undefined ? end - i : 0}
        ranges={matchesByLine.get(i) ?? none}
        onNumber={select}
        onFold={toggleFold}
      />,
    );
  }

  const topPad = layout.tops[win.from]! * metrics.lineH;
  const botPad = (layout.total - layout.tops[win.to]!) * metrics.lineH;
  const edVars: CSSProperties | undefined = info
    ? ({
        '--ed-bg': info.bg,
        '--ed-fg': info.fg,
        '--ed-gutter': info.gutter,
        '--ed-current-line': info.current,
        '--ed-selected-line': info.selected,
        '--ed-sel-mix': info.selected ? '40%' : '14%',
        '--ed-guide': info.guide,
        '--gutter': String(Math.max(2, String(lines.length).length)),
      } as CSSProperties)
    : ({ '--gutter': String(Math.max(2, String(lines.length).length)) } as CSSProperties);

  return (
    <div
      ref={boxRef}
      className={`ks-codeview${wrap ? ' is-wrap' : ''}${p.readline ? ' has-readline' : ''}${info ? ' is-themed' : ''}`}
      style={edVars}
      tabIndex={0}
      role="region"
      aria-label={p.readOnlyLabel}
      onScroll={handleScroll}
      onKeyDown={onKeyDown}
      data-lines={lines.length}
      data-rendered={win.to - win.from}
    >
      <span ref={probeRef} className="ks-probe" aria-hidden="true">0000000000</span>
      <div ref={sweepRef} className="ks-sweep" aria-hidden="true" />
      <div ref={readRef} className="ks-readline" aria-hidden="true" />
      <div style={{ height: topPad }} aria-hidden="true" />
      {rows}
      <div style={{ height: botPad }} aria-hidden="true" />
    </div>
  );
}
