import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import fontBold from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2?url';
import fontRegular from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import { fetchPreview } from '../code/client';
import type { ThemeData, Tok } from '../code/protocol';
import type { LineRange } from '../lib/hash';
import { baseName, langOf } from '../lib/lang';
import { buildLines, buildPalette, buildScene, cssToHex, drawScene, embeddedFontCss, resolveColor, sceneToSvg, type SnippetBg, type SnippetOptions } from '../lib/snippet';
import { previewColors } from '../lib/themeVars';
import { FONT_LABELS, usePrefs } from '../state/prefs';
import { registerImportedThemes, useEditorThemes } from '../state/themes';
import { Icon } from './Icon';
import { Select } from './Select';
import { toast, trapTab, useOrigin } from './parts';

const FAMILY: Record<string, string> = {
  jetbrains: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
  sistema: 'ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace',
  roboto: 'Roboto, ui-sans-serif, system-ui, sans-serif',
};

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ks-segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const MAX_LINES = 40;

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function SnippetDialog({ path, lines, range, onClose, origin }: { path: string; lines: string[]; range: LineRange; onClose: () => void; origin?: { x: number; y: number } | null }) {
  const prefs = usePrefs();
  const themes = useEditorThemes();
  const panel = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [opts, setOpts] = useState<SnippetOptions>({ background: 'theme', margin: 24, frame: true, numbers: true });
  // null = tema atual do editor (ou o da interface); outro id = tema escolhido aqui
  const [theme, setTheme] = useState<string>('__atual');
  const [data, setData] = useState<{ theme: ThemeData | null; lines: Tok[][] } | null>(null);
  const [busy, setBusy] = useState(false);
  useOrigin(panel, origin);

  const slice = useMemo(() => lines.slice(range.from - 1, Math.min(range.to, range.from - 1 + MAX_LINES)), [lines, range]);
  const clipped = range.to - range.from + 1 > MAX_LINES;
  const effectiveTheme = theme === '__atual' ? prefs.editorTheme : theme === '__sistema' ? null : theme;
  const lang = langOf(path);
  const family = FAMILY[prefs.font] ?? FAMILY.jetbrains!;

  // devolve o foco a quem abriu
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    return () => {
      if (prev && document.contains(prev)) prev.focus();
    };
  }, []);

  // as cores vêm do mesmo Shiki da prévia dos temas e do CodeView
  useEffect(() => {
    let off = false;
    void registerImportedThemes()
      .then(() => fetchPreview(effectiveTheme, lang.shiki, slice.join(String.fromCharCode(10))))
      .then((r) => !off && setData({ theme: r.data, lines: r.lines }));
    return () => {
      off = true;
    };
  }, [effectiveTheme, lang.shiki, slice]);

  const render = useCallback(async () => {
    const host = panel.current;
    const cv = canvas.current;
    if (!host || !cv || !data) return null;
    await document.fonts.load(`400 ${prefs.size}px ${family}`);
    await document.fonts.load(`700 ${prefs.size}px ${family}`);
    const pc = data.theme ? previewColors(data.theme) : null;
    const pal = buildPalette(host, pc && data.theme ? { bg: pc.bg, fg: pc.fg, gutter: pc.gutter, dark: data.theme.dark } : null);
    const cache = new Map<string, string>();
    const color = (t: Tok) => {
      if (t.k) return cssToHex(t.k);
      if (t.c) {
        let v = cache.get(t.c);
        if (!v) cache.set(t.c, (v = resolveColor(host, '', t.c)));
        return v;
      }
      return pal.fg;
    };
    const toks = data.lines.length ? data.lines : slice.map((t): Tok[] => [{ t }]);
    const model = {
      title: `${baseName(path)}:${range.from === range.to ? range.from : `${range.from}-${range.to}`}`,
      lines: buildLines(toks, range.from, prefs.tab, color),
      font: { family, size: prefs.size, lineHeight: Math.round(prefs.size * (prefs.lineHeight ?? 1.6) * 10) / 10 },
      palette: pal,
    };
    const scene = buildScene(model, opts);
    drawScene(cv, scene, 2);
    return scene;
  }, [data, opts, prefs.size, prefs.tab, prefs.lineHeight, family, path, range, slice]);

  useEffect(() => {
    void render();
  }, [render]);

  const fileName = (ext: string) => `cerne-${baseName(path).replace(/\.[^.]+$/, '')}-L${range.from}${range.to !== range.from ? '-' + range.to : ''}.${ext}`;
  const toPng = () => new Promise<Blob | null>((resolve) => canvas.current?.toBlob((b) => resolve(b), 'image/png'));

  const copyPng = async () => {
    setBusy(true);
    try {
      await render();
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('sem área de transferência');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng().then((b) => b ?? Promise.reject(new Error('sem imagem'))) })]);
      toast('PNG copiado.');
    } catch {
      toast('O navegador não deixou copiar a imagem. Use Baixar PNG.', { error: true });
    } finally {
      setBusy(false);
    }
  };
  const downloadPng = async () => {
    await render();
    const b = await toPng();
    if (!b) return toast('Não foi possível gerar o PNG.', { error: true });
    save(fileName('png'), b);
    toast(`PNG baixado: ${fileName('png')}`);
  };
  const downloadSvg = async () => {
    const scene = await render();
    if (!scene) return;
    const css = prefs.font === 'jetbrains' ? await embeddedFontCss({ regular: fontRegular, bold: fontBold }).catch(() => '') : '';
    save(fileName('svg'), new Blob([sceneToSvg(scene, css)], { type: 'image/svg+xml' }));
    toast(`SVG baixado: ${fileName('svg')}`);
  };

  const themeOptions = [
    { value: '__atual', label: prefs.editorTheme ? 'Tema do editor atual' : 'Igual à interface' },
    ...(prefs.editorTheme ? [{ value: '__sistema', label: 'Igual à interface' }] : []),
    ...themes.map((t) => ({ value: t.id, label: t.label })),
  ];
  const set = <K extends keyof SnippetOptions>(k: K, v: SnippetOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  return (
    <div className="ks-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        className="ks-snip"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snip-titulo"
        onKeyDown={(e) => {
          trapTab(e);
          if (e.key === 'Escape' && !(e.target as HTMLElement).closest('[role=listbox]')) {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header className="ks-snip__head">
          <div>
            <h2 id="snip-titulo">Imagem do trecho</h2>
            <p className="ks-snip__file">{path} <span>{range.from === range.to ? `linha ${range.from}` : `linhas ${range.from} a ${range.to}`}</span></p>
          </div>
          <button ref={closeBtn} type="button" className="ks-icon-btn" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="ks-snip__body">
          <div className="ks-snip__preview" data-bg={opts.background}>
            <canvas ref={canvas} className="ks-snip__canvas" aria-label={`Prévia da imagem de ${baseName(path)}`} role="img" />
          </div>
          <div className="ks-snip__options">
            <div className="ks-snip__opt">
              <span className="ks-snip__label" id="snip-fundo">Fundo</span>
              <Seg<SnippetBg> label="Fundo" value={opts.background} onChange={(v) => set('background', v)} options={[{ id: 'transparent', label: 'Transparente' }, { id: 'theme', label: 'Tema' }, { id: 'accent', label: 'Acento suave' }]} />
            </div>
            <div className="ks-snip__opt">
              <span className="ks-snip__label">Margem</span>
              <Seg<number> label="Margem" value={opts.margin} onChange={(v) => set('margin', v)} options={[{ id: 0, label: '0' }, { id: 24, label: '24' }, { id: 48, label: '48' }]} />
            </div>
            <label className="ks-snip__opt is-row">
              <span className="ks-snip__label">Moldura de janela</span>
              <input className="ks-switch" type="checkbox" role="switch" checked={opts.frame} onChange={(e) => set('frame', e.target.checked)} />
            </label>
            <label className="ks-snip__opt is-row">
              <span className="ks-snip__label">Números de linha</span>
              <input className="ks-switch" type="checkbox" role="switch" checked={opts.numbers} onChange={(e) => set('numbers', e.target.checked)} />
            </label>
            <div className="ks-snip__opt">
              <span className="ks-snip__label">Tema</span>
              <Select ariaLabel="Tema da imagem" value={theme} options={themeOptions} onChange={setTheme} />
            </div>
            {clipped && <p className="ks-snip__note">Mostrando as primeiras {MAX_LINES} das {range.to - range.from + 1} linhas.</p>}
            <p className="ks-snip__note">
              Fonte: {FONT_LABELS[prefs.font]}, {prefs.size}px.{prefs.font === 'jetbrains' ? ' O SVG leva a fonte dentro do arquivo.' : ''}
            </p>
            <div className="ks-snip__actions">
              <button type="button" className="key key--accent" disabled={!data || busy} onClick={() => void copyPng()}>Copiar PNG</button>
              <button type="button" className="key" disabled={!data} onClick={() => void downloadPng()}>Baixar PNG</button>
              <button type="button" className="key" disabled={!data} onClick={() => void downloadSvg()}>Baixar SVG</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
