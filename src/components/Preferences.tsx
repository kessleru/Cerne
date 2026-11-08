import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { withThemeTransition } from '../anim/motion';
import { PACK_LABELS } from '../icons/packs';
import {
  ACCENTS, DEFAULT_PREFS, FONT_LABELS, SCOPE_LABELS, THEMES, prefsStore, usePrefs,
  type AccentId, type Density, type EditorScope, type FontId, type IconPack, type Prefs, type ThemeId,
} from '../state/prefs';
import { clearToken, getToken, saveToken, subscribeToken } from '../state/token';
import { importThemeJson, importedStore, removeImportedTheme, useEditorThemes } from '../state/themes';
import { Icon } from './Icon';
import { Select } from './Select';
import { ThemeCard } from './ThemeCard';
import { trapTab, toast, useOrigin } from './parts';

const ACCENT_LABELS: Record<AccentId, string> = {
  rosewater: 'Rosewater', flamingo: 'Flamingo', pink: 'Pink', mauve: 'Mauve', red: 'Red', maroon: 'Maroon', peach: 'Peach',
  yellow: 'Yellow', green: 'Green', teal: 'Teal', sky: 'Sky', sapphire: 'Sapphire', blue: 'Blue', lavender: 'Lavender',
};

function Setting({ label, hint, children, stacked = false }: { label: string; hint?: string; children?: ReactNode; stacked?: boolean }) {
  return (
    <div className={`ks-setting${stacked ? ' is-stacked' : ''}`}>
      <div className="ks-setting__label">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </div>
      {children && <div className="ks-setting__control">{children}</div>}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="ks-prefs__sec" id={`pf-${id}`} aria-labelledby={`pf-${id}-t`}>
      <h3 id={`pf-${id}-t`} className="ks-prefs__section">{title}</h3>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ks-segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input className="ks-switch" type="checkbox" role="switch" checked={checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />;
}

function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const tokenSnapshot = () => {
  const t = getToken();
  return t.value ? (t.remembered ? 'lembrado' : 'sessao') : 'nenhum';
};

export function Preferences({ onClose, origin, section }: { onClose: () => void; origin?: { x: number; y: number } | null; section?: string }) {
  const p = usePrefs();
  const themes = useEditorThemes();
  const set = (patch: Partial<Prefs>) => prefsStore.set(patch);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [tokenText, setTokenText] = useState('');
  const [remember, setRemember] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  useOrigin(panel, origin);

  const tokenState = useSyncExternalStore(subscribeToken, tokenSnapshot);

  useEffect(() => {
    if (section) panel.current?.querySelector(`#pf-${section}`)?.scrollIntoView({ block: 'start' });
    else closeRef.current?.focus();
  }, [section]);

  const covering = p.editorTheme !== null && p.editorScope === 'all';
  const cards = useMemo(() => themes, [themes]);

  const onFile = async (file: File) => {
    setImportMsg(null);
    const text = await file.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(stripBom(text)) as Record<string, unknown>;
    } catch {
      /* tratado abaixo */
    }
    if (json && json.cerne === 1 && typeof json.prefs === 'object' && json.prefs) {
      // arquivo de preferências exportado pelo Cerne
      const list = Array.isArray(json.temasImportados) ? (json.temasImportados as { id: string; label: string; json: unknown }[]) : [];
      for (const t of list) await importThemeJson(JSON.stringify(t.json), t.label);
      withThemeTransition(() => prefsStore.set({ ...DEFAULT_PREFS, ...(json!.prefs as Partial<Prefs>) }));
      toast('Preferências importadas.');
      return;
    }
    const r = await importThemeJson(text, file.name);
    if ('error' in r) {
      setImportMsg(r.error);
      toast(r.error, { error: true });
      return;
    }
    toast('Tema importado.');
    set({ editorTheme: r.id });
  };

  const exportPrefs = () => {
    const body = { cerne: 1, prefs: prefsStore.get(), temasImportados: importedStore.get().list };
    download('cerne-preferencias.json', JSON.stringify(body, null, 2));
    toast('Preferências exportadas, com o alcance do tema do editor.');
  };

  const clearAll = () => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('cerne:')) localStorage.removeItem(k);
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('cerne:')) sessionStorage.removeItem(k);
    } catch {
      /* ignora */
    }
    clearToken();
    prefsStore.set(DEFAULT_PREFS);
    importedStore.set({ list: [] });
    toast('Dados locais apagados: recentes, token, temas importados e preferências.');
  };

  return (
    <div className="ks-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        className="ks-prefs"
        role="dialog"
        aria-modal="true"
        aria-label="Preferências"
        onKeyDown={(e) => {
          trapTab(e);
          if (e.key === 'Escape' && !(e.target as HTMLElement).closest('[role=listbox]')) {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header className="ks-prefs__head">
          <h2>Preferências</h2>
          <button ref={closeRef} type="button" className="ks-icon-btn" aria-label="Fechar preferências" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="ks-prefs__body">
          <Section id="aparencia" title="Aparência">
            <Setting label="Sabor da interface" hint={covering ? 'O tema do editor está cobrindo a interface.' : 'Os quatro sabores do Catppuccin. Vale para tudo por padrão.'}>
              <div className="ks-theme">
                <div className="ks-theme__themes" role="group" aria-label="Sabor da interface">
                  {THEMES.map((t) => (
                    <button key={t.id} type="button" className="key" aria-pressed={p.theme === t.id} disabled={covering} onClick={() => withThemeTransition(() => set({ theme: t.id as ThemeId }))}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </Setting>
            <Setting label="Cor de destaque" hint="Uma só, sempre da interface: aba ativa, linha selecionada, trecho achado." stacked>
              <div className="ks-theme">
                <div className="ks-theme__accents" role="group" aria-label="Cor de destaque">
                  {ACCENTS.map((a) => (
                    <button key={a} type="button" aria-pressed={p.accent === a} aria-label={ACCENT_LABELS[a]} data-tip={ACCENT_LABELS[a]} style={{ background: `var(--ctp-${a})`, color: `var(--ctp-${a})` }} onClick={() => set({ accent: a })} />
                  ))}
                </div>
              </div>
            </Setting>
            <Setting label="Tema do editor" hint="Igual à interface, ou um tema do VS Code por cima dela." stacked>
              <ul className="ks-themecards" aria-label="Tema do editor">
                <ThemeCard id={null} label="Igual à interface" selected={p.editorTheme === null} onPick={() => set({ editorTheme: null })} />
                {cards.map((t) => (
                  <ThemeCard key={t.id} id={t.id} label={t.label} dark={t.dark} selected={p.editorTheme === t.id} onPick={() => set({ editorTheme: t.id })} onRemove={t.imported ? () => { if (p.editorTheme === t.id) set({ editorTheme: null }); removeImportedTheme(t.id); } : undefined} />
                ))}
              </ul>
            </Setting>
            {p.editorTheme !== null && (
              <Setting label="Alcance do tema do editor" hint="Só o código; a área de trabalho (árvore, abas, caminho, código, divisores); ou tudo (barras, paleta, menus e preferências).">
                <Segmented<EditorScope> label="Alcance do tema do editor" value={p.editorScope} onChange={(v) => set({ editorScope: v })} options={(Object.keys(SCOPE_LABELS) as EditorScope[]).map((id) => ({ id, label: SCOPE_LABELS[id] }))} />
              </Setting>
            )}
            <Setting label="Importar tema" hint="Um arquivo .json de tema do VS Code. Ele entra na lista acima e vale como os outros.">
              <button type="button" className="key" onClick={() => fileInput.current?.click()}>Importar .json</button>
              <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onFile(f); }} />
            </Setting>
            {importMsg && <p className="ks-prefs__error" role="alert">{importMsg}</p>}
          </Section>

          <Section id="codigo" title="Código">
            <Setting label="Fonte">
              <Select ariaLabel="Fonte do código" value={p.font} onChange={(v) => set({ font: v as FontId })} options={(Object.keys(FONT_LABELS) as FontId[]).map((k) => ({ value: k, label: FONT_LABELS[k] }))} />
            </Setting>
            <Setting label="Tamanho" hint="De 11 a 20 px.">
              <input className="ks-range" type="range" min={11} max={20} step={1} value={p.size} aria-label="Tamanho da fonte" onChange={(e) => set({ size: Number(e.target.value) })} />
              <span className="ks-setting__value">{p.size}px</span>
            </Setting>
            <Setting label="Altura da linha" hint="Automática segue a densidade.">
              <input className="ks-range" type="range" min={1.3} max={2} step={0.05} value={p.lineHeight ?? 1.6} aria-label="Altura da linha" onChange={(e) => set({ lineHeight: Number(e.target.value) })} />
              <span className="ks-setting__value">{p.lineHeight ?? 'auto'}</span>
              {p.lineHeight !== null && <button type="button" className="key" onClick={() => set({ lineHeight: null })}>Automática</button>}
            </Setting>
            <Setting label="Ligaduras" hint="Junta símbolos como => e !== em um só desenho.">
              <Switch checked={p.ligatures} onChange={(v) => set({ ligatures: v })} label="Ligaduras" />
            </Setting>
            <Setting label="Largura do tab">
              <Select ariaLabel="Largura do tab" value={String(p.tab)} onChange={(v) => set({ tab: Number(v) })} options={[2, 3, 4, 6, 8].map((n) => ({ value: String(n), label: String(n) }))} />
            </Setting>
            <Setting label="Quebra de linha" hint="Sem ela, o código rola na horizontal.">
              <Switch checked={p.wrap} onChange={(v) => set({ wrap: v })} label="Quebra de linha" />
            </Setting>
          </Section>

          <Section id="arvore" title="Árvore">
            <Setting label="Pacote de ícones" hint="Carregado só quando escolhido.">
              <Select ariaLabel="Pacote de ícones" value={p.icons} onChange={(v) => set({ icons: v as IconPack })} options={(Object.keys(PACK_LABELS) as IconPack[]).map((k) => ({ value: k, label: PACK_LABELS[k] }))} />
            </Setting>
            <Setting label="Densidade" hint="Altura das linhas da árvore e do código.">
              <Segmented<Density> label="Densidade" value={p.density} onChange={(v) => set({ density: v })} options={[{ id: 'compact', label: 'Compacta' }, { id: 'normal', label: 'Normal' }, { id: 'comfortable', label: 'Confortável' }]} />
            </Setting>
          </Section>

          <Section id="acessibilidade" title="Acessibilidade">
            <Setting label="Alto contraste" hint="Texto e bordas no máximo de contraste. Também liga sozinho com prefers-contrast.">
              <Switch checked={p.contrast} onChange={(v) => set({ contrast: v })} label="Alto contraste" />
            </Setting>
            <Setting label="Movimento" hint="Reduzido: sem deslocamento, só esmaece. Automático segue o sistema.">
              <Segmented label="Movimento" value={p.motion} onChange={(v) => set({ motion: v })} options={[{ id: 'auto', label: 'Automático' }, { id: 'reduced', label: 'Reduzido' }, { id: 'full', label: 'Completo' }]} />
            </Setting>
          </Section>

          <Section id="token" title="Token">
            <Setting label="Token do GitHub" hint={tokenState === 'nenhum' ? 'Sem token são 60 chamadas por hora. Com um token, 5 000.' : tokenState === 'lembrado' ? 'Token guardado neste navegador.' : 'Token guardado só nesta sessão.'} stacked>
              <div className="ks-token">
                <input className="ks-input" type="password" autoComplete="off" spellCheck={false} placeholder="Cole o token aqui" aria-label="Token do GitHub" value={tokenText} onChange={(e) => setTokenText(e.target.value)} />
                <button type="button" className="key key--accent" disabled={!tokenText.trim()} onClick={() => { saveToken(tokenText.trim(), remember); setTokenText(''); toast(remember ? 'Token guardado neste navegador.' : 'Token guardado nesta sessão.'); }}>Salvar</button>
                {tokenState !== 'nenhum' && <button type="button" className="key" onClick={() => { clearToken(); toast('Token removido.'); }}>Remover</button>}
              </div>
            </Setting>
            <Setting label="Lembrar neste navegador" hint="Sem marcar, o token some ao fechar a aba.">
              <Switch checked={remember} onChange={setRemember} label="Lembrar neste navegador" />
            </Setting>
          </Section>

          <Section id="dados" title="Dados">
            <Setting label="Exportar preferências" hint="Um .json com tudo, inclusive o alcance do tema do editor e os temas importados.">
              <button type="button" className="key" onClick={exportPrefs}>Exportar</button>
            </Setting>
            <Setting label="Importar preferências" hint="Um .json exportado pelo Cerne (um tema do VS Code também entra).">
              <button type="button" className="key" onClick={() => fileInput.current?.click()}>Importar</button>
            </Setting>
            <Setting label="Restaurar padrões" hint="Volta as preferências ao início. Recentes e token ficam.">
              <button type="button" className="key" onClick={() => withThemeTransition(() => prefsStore.set(DEFAULT_PREFS))}>Restaurar</button>
            </Setting>
            <Setting label="Apagar dados deste navegador" hint="Recentes, token, temas importados e preferências.">
              <button type="button" className="key" onClick={clearAll}>Apagar</button>
            </Setting>
          </Section>
        </div>
      </div>
    </div>
  );
}

/** Tira o BOM do começo de um arquivo de texto. */
function stripBom(t: string): string {
  return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t;
}
