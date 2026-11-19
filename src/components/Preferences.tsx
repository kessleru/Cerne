import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { withThemeTransition } from '../anim/motion';
import { PACK_LABELS } from '../icons/packs';
import {
  ACCENTS, APPEARANCE_LABELS, DARK_THEMES, DEFAULT_PREFS, FONT_LABELS, SCOPE_LABELS, effectiveTheme, prefsStore, reducedMotion, usePrefs,
  type AccentId, type Appearance, type Density, type EditorScope, type Guides, type FontId, type IconPack, type Prefs, type ThemeId,
} from '../state/prefs';
import { clearToken } from '../state/token';
import { sair, useConta } from '../state/account';
import { Avatar } from './Avatar';
import { importThemeJson, importedStore, removeImportedTheme, useEditorThemes } from '../state/themes';
import { source } from '../data/source';
import { Icon, type IconName } from './Icon';
import { Select } from './Select';
import { ThemeCard } from './ThemeCard';
import { trapTab, toast, useOrigin } from './parts';

const ACCENT_LABELS: Record<AccentId, string> = {
  rosewater: 'Rosewater', flamingo: 'Flamingo', pink: 'Pink', mauve: 'Mauve', red: 'Red', maroon: 'Maroon', peach: 'Peach',
  yellow: 'Yellow', green: 'Green', teal: 'Teal', sky: 'Sky', sapphire: 'Sapphire', blue: 'Blue', lavender: 'Lavender',
};

function Setting({ label, hint, tip, children, stacked = false }: { label: string; hint?: string; tip?: string; children?: ReactNode; stacked?: boolean }) {
  return (
    <div className={`ks-setting${stacked ? ' is-stacked' : ''}`}>
      <div className="ks-setting__label">
        <strong>
          {label}
          {tip && (
            <span className="ks-setting__tip" data-tip={tip} tabIndex={0} aria-label={tip}>
              <Icon name="info" size={13} />
            </span>
          )}
        </strong>
        {hint && <span>{hint}</span>}
      </div>
      {children && <div className="ks-setting__control">{children}</div>}
    </div>
  );
}

const SECOES: { id: string; label: string; icon: IconName }[] = [
  { id: 'aparencia', label: 'Aparência', icon: 'sun' },
  { id: 'codigo', label: 'Código', icon: 'code' },
  { id: 'arvore', label: 'Árvore', icon: 'panelLeft' },
  { id: 'acessibilidade', label: 'Acessibilidade', icon: 'eye' },
  { id: 'token', label: 'Conta', icon: 'user' },
  { id: 'dados', label: 'Dados', icon: 'file' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="ks-prefs__sec" id={`pf-${id}`} aria-labelledby={`pf-${id}-t`}>
      <h3 id={`pf-${id}-t`} className="ks-prefs__section" tabIndex={-1}>{title}</h3>
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

export function Preferences({ onClose, origin, section, onAccount }: { onClose: () => void; origin?: { x: number; y: number } | null; section?: string; onAccount?: () => void }) {
  const p = usePrefs();
  const themes = useEditorThemes();
  const set = (patch: Partial<Prefs>) => prefsStore.set(patch);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  useOrigin(panel, origin);

  const conta = useConta();
  const perfil = conta.status === 'anonimo' ? null : conta.conta;

  const bodyRef = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(section ?? 'aparencia');
  const irPara = (id: string) => {
    const el = bodyRef.current?.querySelector<HTMLElement>(`#pf-${id}`);
    if (!el || !bodyRef.current) return;
    bodyRef.current.scrollTo({ top: el.offsetTop - bodyRef.current.offsetTop, behavior: reducedMotion(prefsStore.get()) ? 'auto' : 'smooth' });
    setAtual(id);
    el.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
  };
  // seção atual: a última cujo título já passou do topo do painel
  const onBodyScroll = () => {
    const b = bodyRef.current;
    if (!b) return;
    if (b.scrollTop + b.clientHeight >= b.scrollHeight - 4) return setAtual(SECOES[SECOES.length - 1]!.id);
    let id = SECOES[0]!.id;
    for (const x of SECOES) {
      const el = b.querySelector<HTMLElement>(`#pf-${x.id}`);
      if (el && el.offsetTop - b.offsetTop - b.scrollTop <= 48) id = x.id;
    }
    setAtual(id);
  };

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
    void source.apagarCache();
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
        <div className="ks-prefs__main">
        <nav className="ks-prefs__nav" aria-label="Seções das preferências">
          {SECOES.map((x) => (
            <button key={x.id} type="button" aria-current={atual === x.id ? 'true' : undefined} onClick={() => irPara(x.id)}>
              <Icon name={x.icon} size={16} />
              {x.label}
            </button>
          ))}
        </nav>
        <div className="ks-prefs__body" ref={bodyRef} onScroll={onBodyScroll}>
          <Section id="aparencia" title="Aparência">
            <Setting label="Claro ou escuro" hint={covering ? 'Coberto pelo tema do editor' : p.appearance === 'system' ? `Agora: ${effectiveTheme(p) === 'latte' ? 'claro' : 'escuro'}` : undefined}>
              <div className="ks-segmented ks-appearance" role="group" aria-label="Claro ou escuro">
                {(['system', 'light', 'dark'] as Appearance[]).map((a) => (
                  <button key={a} type="button" aria-pressed={p.appearance === a} disabled={covering} onClick={() => withThemeTransition(() => set({ appearance: a }))}>
                    <Icon name={a === 'system' ? 'monitor' : a === 'light' ? 'sun' : 'moon'} size={14} />
                    {APPEARANCE_LABELS[a]}
                  </button>
                ))}
              </div>
            </Setting>
            <Setting label="Sabor do escuro" tip="O claro é sempre o Latte">
              <div className="ks-theme">
                <div className="ks-theme__themes is-three" role="group" aria-label="Sabor do escuro">
                  {DARK_THEMES.map((t) => (
                    <button key={t.id} type="button" className="key" aria-pressed={p.theme === t.id} disabled={covering} onClick={() => withThemeTransition(() => set({ theme: t.id as ThemeId }))}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </Setting>
            <Setting label="Cor de destaque" tip="Aba ativa, linha selecionada, trecho achado" stacked>
              <div className="ks-theme">
                <div className="ks-theme__accents" role="group" aria-label="Cor de destaque">
                  {ACCENTS.map((a) => (
                    <button key={a} type="button" aria-pressed={p.accent === a} aria-label={ACCENT_LABELS[a]} data-tip={ACCENT_LABELS[a]} style={{ background: `var(--ctp-${a})`, color: `var(--ctp-${a})` }} onClick={() => set({ accent: a })} />
                  ))}
                </div>
              </div>
            </Setting>
            <Setting label="Tema do editor" hint="Temas do VS Code" stacked>
              <ul className="ks-themecards" aria-label="Tema do editor">
                <ThemeCard id={null} label="Igual à interface" selected={p.editorTheme === null} onPick={() => set({ editorTheme: null })} />
                {cards.map((t) => (
                  <ThemeCard key={t.id} id={t.id} label={t.label} dark={t.dark} selected={p.editorTheme === t.id} onPick={() => set({ editorTheme: t.id })} onRemove={t.imported ? () => { if (p.editorTheme === t.id) set({ editorTheme: null }); removeImportedTheme(t.id); } : undefined} />
                ))}
              </ul>
            </Setting>
            {p.editorTheme !== null && (
              <Setting label="Alcance do tema do editor" tip="Só o código; a área de trabalho; ou tudo, inclusive barras e menus">
                <Segmented<EditorScope> label="Alcance do tema do editor" value={p.editorScope} onChange={(v) => set({ editorScope: v })} options={(Object.keys(SCOPE_LABELS) as EditorScope[]).map((id) => ({ id, label: SCOPE_LABELS[id] }))} />
              </Setting>
            )}
            <Setting label="Importar tema" hint=".json do VS Code">
              <button type="button" className="key" onClick={() => fileInput.current?.click()}>Importar .json</button>
              <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onFile(f); }} />
            </Setting>
            {importMsg && <p className="ks-prefs__error" role="alert">{importMsg}</p>}
          </Section>

          <Section id="codigo" title="Código">
            <Setting label="Fonte">
              <Select ariaLabel="Fonte do código" value={p.font} onChange={(v) => set({ font: v as FontId })} options={(Object.keys(FONT_LABELS) as FontId[]).map((k) => ({ value: k, label: FONT_LABELS[k] }))} />
            </Setting>
            <Setting label="Tamanho">
              <input className="ks-range" type="range" min={11} max={20} step={1} value={p.size} aria-label="Tamanho da fonte" onChange={(e) => set({ size: Number(e.target.value) })} />
              <span className="ks-setting__value">{p.size}px</span>
            </Setting>
            <Setting label="Altura da linha">
              <input className="ks-range" type="range" min={1.3} max={2} step={0.05} value={p.lineHeight ?? 1.6} aria-label="Altura da linha" onChange={(e) => set({ lineHeight: Number(e.target.value) })} />
              <span className="ks-setting__value">{p.lineHeight ?? 'auto'}</span>
              {p.lineHeight !== null && <button type="button" className="key" onClick={() => set({ lineHeight: null })}>Automática</button>}
            </Setting>
            <Setting label="Ligaduras" hint="=> e !== num só desenho">
              <Switch checked={p.ligatures} onChange={(v) => set({ ligatures: v })} label="Ligaduras" />
            </Setting>
            <Setting label="Largura do tab">
              <Select ariaLabel="Largura do tab" value={String(p.tab)} onChange={(v) => set({ tab: Number(v) })} options={[2, 3, 4, 6, 8].map((n) => ({ value: String(n), label: String(n) }))} />
            </Setting>
            <Setting label="Quebra de linha">
              <Switch checked={p.wrap} onChange={(v) => set({ wrap: v })} label="Quebra de linha" />
            </Setting>
          </Section>

          <Section id="arvore" title="Árvore">
            <Setting label="Pacote de ícones">
              <Select ariaLabel="Pacote de ícones" value={p.icons} onChange={(v) => set({ icons: v as IconPack })} options={(Object.keys(PACK_LABELS) as IconPack[]).map((k) => ({ value: k, label: PACK_LABELS[k] }))} />
            </Setting>
            <Setting label="Densidade" tip="Altura das linhas da árvore e do código">
              <Segmented<Density> label="Densidade" value={p.density} onChange={(v) => set({ density: v })} options={[{ id: 'compact', label: 'Compacta' }, { id: 'normal', label: 'Normal' }, { id: 'comfortable', label: 'Confortável' }]} />
            </Setting>
            <Setting label="Linhas de indentação" tip="Na árvore e no código. A do bloco atual fica mais forte.">
              <Segmented<Guides> label="Linhas de indentação" value={p.guides} onChange={(v) => set({ guides: v })} options={[{ id: 'always', label: 'Sempre' }, { id: 'hover', label: 'Ao passar o mouse' }, { id: 'none', label: 'Nunca' }]} />
            </Setting>
          </Section>

          <Section id="acessibilidade" title="Acessibilidade">
            <Setting label="Alto contraste" tip="Liga sozinho com prefers-contrast do sistema">
              <Switch checked={p.contrast} onChange={(v) => set({ contrast: v })} label="Alto contraste" />
            </Setting>
            <Setting label="Movimento" tip="Reduzido: só esmaece. Automático: segue o sistema.">
              <Segmented label="Movimento" value={p.motion} onChange={(v) => set({ motion: v })} options={[{ id: 'auto', label: 'Automático' }, { id: 'reduced', label: 'Reduzido' }, { id: 'full', label: 'Completo' }]} />
            </Setting>
          </Section>

          <Section id="token" title="Conta do GitHub">
            <Setting
              label={perfil ? (perfil.nome ?? perfil.login) : 'Sem conta'}
              hint={conta.status === 'anonimo' ? '60 chamadas/h · só públicos' : conta.status === 'invalido' ? 'Token expirado' : `@${perfil?.login ?? ''} · ${conta.status === 'ok' && conta.lembrado ? 'neste navegador' : 'nesta aba'}`}
            >
              <Avatar conta={perfil} size={32} />
              <button type="button" className={`key${conta.status === 'anonimo' ? ' key--accent' : ''}`} onClick={onAccount}>{conta.status === 'anonimo' ? 'Entrar' : 'Gerenciar conta'}</button>
              {conta.status !== 'anonimo' && <button type="button" className="key" onClick={() => { sair(); toast('Você saiu.'); }}>Sair</button>}
            </Setting>
          </Section>

          <Section id="dados" title="Dados">
            <Setting label="Exportar preferências" tip="Um .json com tudo, inclusive temas importados">
              <button type="button" className="key" onClick={exportPrefs}>Exportar</button>
            </Setting>
            <Setting label="Importar preferências" hint=".json do Cerne ou tema do VS Code">
              <button type="button" className="key" onClick={() => fileInput.current?.click()}>Importar</button>
            </Setting>
            <Setting label="Restaurar padrões" hint="Recentes e token ficam">
              <button type="button" className="key" onClick={() => withThemeTransition(() => prefsStore.set(DEFAULT_PREFS))}>Restaurar</button>
            </Setting>
            <Setting label="Apagar dados deste navegador" hint="Recentes, token, temas e preferências">
              <button type="button" className="key" onClick={clearAll}>Apagar</button>
            </Setting>
          </Section>
        </div>
        </div>
      </div>
    </div>
  );
}

/** Tira o BOM do começo de um arquivo de texto. */
function stripBom(t: string): string {
  return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t;
}
