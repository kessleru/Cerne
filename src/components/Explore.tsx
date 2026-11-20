import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { AREAS, AREAS_ESTUDO, CATEGORIAS, FAMOSOS, extDaLinguagem, useArea, useTodasAreas, type Area, type Entrada, type Trilha } from '../data/catalogo';
import { TEMAS } from '../data/catalogo/temas';
import { casados, consulta, palavras, normalizar, pontuar, sugestoes, type Consulta, type Rotulos } from '../lib/buscaEstudo';
import { FileIcon } from '../icons/FileIcon';
import type { RepoLink } from '../lib/route';
import { lerAvatar } from '../data/github/conta';
import { getToken } from '../state/token';
import { usePrefs } from '../state/prefs';
import { estudados } from '../state/estudo';
import { Icon, type IconName } from './Icon';
import { Select } from './Select';

// Explorar: "Para você" (recentes, seus repositórios), trilhas de estudo e repositórios famosos.

type Aba = 'voce' | 'estudar' | 'famosos';
const ABA_KEY = 'cerne:explorar';
const TRILHA_KEY = 'cerne:trilha';
const AREA_KEY = 'cerne:area';

const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento */
  }
};

const alternarFeito = (repo: string) => estudados.alternar(repo);
const useFeitos = () => estudados.use();

/** Abre a visão geral do repositório (topo e README), não o código direto. */
const abrir = (r: Entrada, onOpen: (l: RepoLink) => void) => {
  const [owner, repo] = r.repo.split('/') as [string, string];
  onOpen({ owner, repo });
};

type Campo = 'area' | 'lang' | 'dominio' | 'tema' | 'api' | 'stack';
type Filtros = Partial<Record<Campo, string[]>>;
const valorDe = (e: Entrada, c: Campo): string[] =>
  c === 'lang' ? [e.lang] : c === 'dominio' ? (e.dominio ? [e.dominio] : []) : c === 'api' ? (e.api ?? []) : c === 'tema' ? e.temas : c === 'area' ? (e.area ? [e.area] : []) : (e.stack ?? []);
// Stack, tema e API somam ("Express e Redis e MongoDB": o projeto tem todos); área, linguagem e assunto são alternativas.
const SOMA: Record<Campo, boolean> = { stack: true, api: true, tema: true, lang: false, dominio: false, area: false };
const TEMA_TITULO: Record<string, string> = Object.fromEntries(TEMAS.map((t) => [t.id, t.titulo]));
const AREA_TITULO: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.id, a.titulo]));
const ROTULOS: Rotulos = { temas: TEMA_TITULO, areas: AREA_TITULO };
/** Como mostrar um valor de filtro (temas e áreas têm id interno). */
const rotuloDe = (c: Campo, v: string) => (c === 'tema' ? (TEMA_TITULO[v] ?? v) : c === 'area' ? (AREA_TITULO[v] ?? v) : v);
const casaCampo = (e: Entrada, c: Campo, vs: string[]) => {
  const tem = valorDe(e, c);
  return SOMA[c] ? vs.every((v) => tem.includes(v)) : vs.some((v) => tem.includes(v));
};
const casa = (e: Entrada, f: Filtros, menos?: Campo) =>
  (Object.keys(f) as Campo[]).every((c) => c === menos || !f[c]?.length || casaCampo(e, c, f[c]!));
const qtdFiltros = (f: Filtros) => Object.values(f).reduce((n, vs) => n + (vs?.length ?? 0), 0);

type Faceta = { titulo: string; campo: Campo; dica: string; valores: [string, number][] };
/**
 * Filtros para comparar dentro da lista: só aparecem quando há o que comparar.
 * Em linguagem e assunto (alternativas), a contagem ignora o próprio campo; em stack e API (somam),
 * conta quantos sobrariam ao acrescentar aquele valor.
 */
function facetasDe(lista: Entrada[], grupo: Trilha['grupo'], filtros: Filtros, todas = false, temaDaTrilha?: string): Faceta[] {
  const conta = (c: Campo, max: number) => {
    const escolhidos = filtros[c] ?? [];
    const m = new Map<string, number>();
    for (const e of lista) if (casa(e, filtros, SOMA[c] ? undefined : c)) for (const v of valorDe(e, c)) if (v !== temaDaTrilha) m.set(v, (m.get(v) ?? 0) + 1);
    for (const v of escolhidos) if (!m.has(v)) m.set(v, 0);
    const lista_ = [...m].filter(([v, n]) => n >= 2 || escolhidos.includes(v) || (SOMA[c] && n >= 1 && escolhidos.length > 0));
    return lista_.sort((a, b) => Number(escolhidos.includes(b[0])) - Number(escolhidos.includes(a[0])) || b[1] - a[1]).slice(0, max);
  };
  const out: Faceta[] = [];
  if (todas) out.push({ titulo: 'Área', campo: 'area', dica: 'uma ou outra', valores: conta('area', 8) });
  if (grupo !== 'Linguagens' || todas) out.push({ titulo: 'Linguagem', campo: 'lang', dica: 'uma ou outra', valores: conta('lang', 24) });
  out.push({ titulo: 'Assunto', campo: 'dominio', dica: 'um ou outro', valores: conta('dominio', 48) });
  out.push({ titulo: 'Tema', campo: 'tema', dica: 'todos juntos', valores: conta('tema', 30) });
  out.push({ titulo: 'Stack', campo: 'stack', dica: 'todas juntas', valores: conta('stack', 60) });
  out.push({ titulo: 'API', campo: 'api', dica: 'todas juntas', valores: conta('api', 4) });
  return out.filter((f) => f.valores.length > 1 || filtros[f.campo]?.length);
}

// ---------- ordem ----------
type Ordem = 'misturar' | 'relevancia' | 'readme' | 'estrelas' | 'escondidos';
const ORDENS: { value: Ordem; label: string }[] = [
  { value: 'relevancia', label: 'Mais relevante' },
  { value: 'misturar', label: 'Misturado' },
  { value: 'readme', label: 'README mais completo' },
  { value: 'estrelas', label: 'Mais estrelas' },
  { value: 'escondidos', label: 'Menos conhecidos' },
];
const ESTRELAS = [0, 10, 50, 100, 500];

/** Gerador pseudoaleatório com semente: a mesma semente dá a mesma ordem (a lista não pula a cada clique). */
function sorteio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Mistura com peso: README mais completo tende a vir antes, mas cada abertura traz uma ordem nova. */
export function misturar(lista: Entrada[], semente: number) {
  const r = sorteio(semente);
  return lista
    .map((e) => ({ e, k: Math.pow(r(), 1 / Math.max(1, (e.readme ?? 14) - 8)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.e);
}
function ordenar(lista: Entrada[], ordem: Ordem, semente: number, pontos?: Map<Entrada, number>) {
  if (ordem === 'relevancia' && pontos) return [...lista].sort((a, b) => (pontos.get(b) ?? 0) - (pontos.get(a) ?? 0));
  if (ordem === 'misturar' || ordem === 'relevancia') return misturar(lista, semente);
  const l = [...lista];
  if (ordem === 'readme') return l.sort((a, b) => (b.readme ?? 0) - (a.readme ?? 0) || (b.estrelas ?? 0) - (a.estrelas ?? 0));
  if (ordem === 'estrelas') return l.sort((a, b) => (b.estrelas ?? 0) - (a.estrelas ?? 0));
  return l.sort((a, b) => (a.estrelas ?? 0) - (b.estrelas ?? 0) || (b.readme ?? 0) - (a.readme ?? 0));
}
export const novaSemente = () => Math.floor(Math.random() * 2 ** 31);

const POR_PAGINA = 24;
const NOME_CAMPO: Record<Campo, string> = { area: 'Área', lang: 'Linguagem', dominio: 'Assunto', tema: 'Tema', stack: 'Stack', api: 'API' };
const VISIVEIS = 8; // chips por linha de filtro antes do +N
const ORDEM_KEY = 'cerne:ordem';

const FILTRO_KEY = 'cerne:estudar-filtro';
/** Deixa o Estudar pronto numa área, com um filtro ligado (usado pela visão geral: clicar numa etiqueta). */
export function abrirEstudarCom(area: Area, campo?: 'dominio' | 'stack' | 'lang' | 'tema', valor?: string) {
  gravar(ABA_KEY, 'estudar');
  gravar(AREA_KEY, area);
  let trilhas: Record<string, string> = {};
  try {
    trilhas = JSON.parse(ler(TRILHA_KEY) ?? '{}') ?? {};
  } catch {
    /* começa do zero */
  }
  gravar(TRILHA_KEY, JSON.stringify({ ...trilhas, [area]: 'tudo' }));
  gravar(FILTRO_KEY, JSON.stringify(campo && valor ? { [campo]: [valor] } : {}));
}

/** Deixa a próxima visita à página inicial já numa aba (usado pela paleta). */
export function abrirAbaExplorar(a: Aba) {
  gravar(ABA_KEY, a);
}

export function Explore({ paraVoce, onOpen, padrao = 'voce' }: { paraVoce: ReactNode; onOpen: (l: RepoLink) => void; padrao?: Aba }) {
  const [aba, setAba] = useState<Aba>(() => (ler(ABA_KEY) as Aba) || padrao);
  const escolher = (a: Aba) => {
    setAba(a);
    gravar(ABA_KEY, a);
  };
  const abas: { id: Aba; label: string; icon: IconName }[] = [
    { id: 'voce', label: 'Para você', icon: 'home' },
    { id: 'estudar', label: 'Estudar', icon: 'graduation' },
    { id: 'famosos', label: 'Famosos', icon: 'star' },
  ];
  return (
    <section className={`ks-explore is-${aba}`} aria-label="Explorar" id="explorar">
      <div className="ks-explore__tabs" role="tablist" aria-label="Explorar">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`ex-tab-${a.id}`}
            aria-selected={aba === a.id}
            aria-controls={`ex-painel-${a.id}`}
            className="ks-explore__tab"
            onClick={() => escolher(a.id)}
            onKeyDown={(e) => {
              const i = abas.findIndex((x) => x.id === aba);
              if (e.key === 'ArrowRight') escolher(abas[(i + 1) % abas.length]!.id);
              else if (e.key === 'ArrowLeft') escolher(abas[(i + abas.length - 1) % abas.length]!.id);
            }}
          >
            <Icon name={a.icon} size={15} />
            {a.label}
          </button>
        ))}
      </div>
      <div className="ks-explore__panel" role="tabpanel" id={`ex-painel-${aba}`} aria-labelledby={`ex-tab-${aba}`}>
        {aba === 'voce' ? paraVoce : aba === 'estudar' ? <Estudar onOpen={onOpen} /> : <Famosos onOpen={onOpen} />}
      </div>
    </section>
  );
}

// ---------- Estudar ----------
function Selo({ t, size = 36 }: { t: Pick<Trilha, 'ext' | 'icone' | 'cor'>; size?: number }) {
  const { icons } = usePrefs();
  return (
    <span className="ks-selo" style={{ width: size, height: size, '--c': `var(--ctp-${t.cor})` } as React.CSSProperties} aria-hidden="true">
      {t.ext ? <FileIcon pack={icons} path={`x.${t.ext}`} className="ks-selo__file" /> : <Icon name={t.icone ?? 'code'} size={Math.round(size * 0.5)} />}
    </span>
  );
}

function Estudar({ onOpen }: { onOpen: (l: RepoLink) => void }) {
  const [areaId, setAreaId] = useState<Area>(() => (ler(AREA_KEY) as Area) || 'backend');
  // a trilha lembrada é por área: voltar ao Front-end abre onde a pessoa estava
  const [trilhaPor, setTrilhaPor] = useState<Record<string, string>>(() => {
    try {
      const v = JSON.parse(ler(TRILHA_KEY) ?? '{}');
      return v && typeof v === 'object' ? (v as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  // filtro deixado pela visão geral (etiqueta clicada): vale uma vez
  const [filtros, setFiltros] = useState<Filtros>(() => {
    const v = ler(FILTRO_KEY);
    if (v === null) return {};
    try {
      localStorage.removeItem(FILTRO_KEY);
    } catch {
      /* sem armazenamento */
    }
    try {
      return (JSON.parse(v) as Filtros) ?? {};
    } catch {
      return {};
    }
  });
  const veioDaVisao = useRef(Object.keys(filtros).length > 0);
  useEffect(() => {
    if (!veioDaVisao.current) return;
    veioDaVisao.current = false;
    requestAnimationFrame(() => document.getElementById('explorar')?.scrollIntoView({ block: 'start' }));
  }, []);
  const [q, setQ] = useState('');
  // a busca roda um pouco atrás da digitação: a caixa nunca trava, mesmo em 13 mil projetos
  const qBusca = useDeferredValue(q);
  const [escopo, setEscopo] = useState<'lista' | 'tudo'>('lista');
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [abertas, setAbertas] = useState<Set<Campo>>(() => new Set());
  const [painel, setPainel] = useState(false);
  const [minEstrelas, setMinEstrelas] = useState(0);
  const [ordem, setOrdem] = useState<Ordem>(() => (ORDENS.some((o) => o.value === ler(ORDEM_KEY)) ? (ler(ORDEM_KEY) as Ordem) : 'misturar'));
  // uma semente nova a cada lista aberta: a mesma lista nunca começa igual
  const [semente, setSemente] = useState(novaSemente);
  const iconPack = usePrefs().icons;
  const feitosAgora = useFeitos();
  const escolhida = AREAS_ESTUDO.find((a) => a.id === areaId) ?? AREAS_ESTUDO[0];
  const area = useArea(escolhida?.id ?? null);
  const TRILHAS = area?.trilhas ?? [];
  const padrao = area?.id === 'backend' ? 'apis' : 'tudo';
  const t = TRILHAS.find((x) => x.id === (trilhaPor[area?.id ?? ''] ?? padrao)) ?? TRILHAS[0];
  const limpar = () => {
    setFiltros({});
    setQ('');
    setEscopo('lista');
    setMostrar(POR_PAGINA);
    setAbertas(new Set());
    setMinEstrelas(0);
    setSemente(novaSemente());
  };
  const pick = (x: string) => {
    limpar();
    if (!area) return;
    const n = { ...trilhaPor, [area.id]: x };
    setTrilhaPor(n);
    gravar(TRILHA_KEY, JSON.stringify(n));
  };
  const pickArea = (a: Area) => {
    limpar();
    setAreaId(a);
    gravar(AREA_KEY, a);
  };
  // busca: com 2 letras já procura; em "todas as áreas" carrega as outras áreas (uma vez)
  const c = useMemo(() => consulta(qBusca), [qBusca]);
  const buscando = c.termos.length > 0;
  const todas = useTodasAreas(buscando || escopo === 'tudo');
  const emTudo = escopo === 'tudo';
  const fonte = useMemo(() => (emTudo ? (todas ?? []) : (t?.repos ?? [])), [emTudo, todas, t]);
  // pontos de relevância (só quando há busca) e a base: o que a busca e as estrelas deixam
  const { base, pontos } = useMemo(() => {
    const pts = new Map<Entrada, number>();
    const b = fonte.filter((e) => {
      if ((e.estrelas ?? 0) < minEstrelas) return false;
      if (!buscando) return true;
      const p = pontuar(e, c, ROTULOS);
      if (p > 0) pts.set(e, p);
      return p > 0;
    });
    return { base: b, pontos: pts };
  }, [fonte, minEstrelas, buscando, c]);
  // quantos a mesma busca acha nas outras áreas (para oferecer a troca)
  const noTotal = useMemo(() => {
    if (!buscando || emTudo || !todas) return null;
    let n = 0;
    for (const e of todas) if ((e.estrelas ?? 0) >= minEstrelas && pontuar(e, c, ROTULOS) > 0 && casa(e, filtros)) n++;
    return n;
  }, [buscando, emTudo, todas, c, minEstrelas, filtros]);
  const ordemEfetiva: Ordem = buscando && ordem === 'misturar' ? 'relevancia' : !buscando && ordem === 'relevancia' ? 'misturar' : ordem;
  const lista = useMemo(() => ordenar(base.filter((e) => casa(e, filtros)), ordemEfetiva, semente, pontos), [base, filtros, ordemEfetiva, semente, pontos]);
  const facetas = useMemo(() => (t ? facetasDe(base, emTudo ? 'Tudo' : t.grupo, filtros, emTudo, !emTudo && t.grupo === 'Temas' ? t.id : undefined) : []), [t, base, filtros, emTudo]);
  // sugestões: valores de filtro que casam com o que foi digitado ("spring" -> Stack: Spring Boot)
  const sugeridas = useMemo(() => {
    if (!buscando) return [];
    const valores: { campo: Campo; valor: string; rotulo?: string }[] = [];
    const vistos = new Set<string>();
    const add = (campo: Campo, valor: string, rotulo?: string) => {
      const k = campo + ':' + valor;
      if (vistos.has(k) || filtros[campo]?.includes(valor)) return;
      vistos.add(k);
      valores.push({ campo, valor, rotulo });
    };
    for (const e of todas ?? fonte) {
      if (e.dominio) add('dominio', e.dominio);
      for (const x of e.stack ?? []) add('stack', x);
      add('lang', e.lang);
      for (const x of e.temas) add('tema', x, TEMA_TITULO[x]);
    }
    for (const a of AREAS_ESTUDO) add('area', a.id, a.titulo);
    return sugestoes(c, valores).slice(0, 6);
  }, [buscando, c, todas, fonte, filtros]);
  if (!escolhida) return <p className="ks-explore__vazio">A lista de estudo ainda está vazia. Rode node scripts/catalogo-estudo.mjs para montá-la.</p>;
  const barra = (
    <div className="ks-areas" role="tablist" aria-label="Áreas">
      {AREAS_ESTUDO.map((a) => (
        <button
          key={a.id}
          type="button"
          role="tab"
          className="ks-areas__item"
          aria-selected={a.id === escolhida.id}
          onClick={() => pickArea(a.id)}
          onKeyDown={(e) => {
            const i = AREAS_ESTUDO.findIndex((x) => x.id === escolhida.id);
            const n = AREAS_ESTUDO.length;
            if (e.key === 'ArrowRight') pickArea(AREAS_ESTUDO[(i + 1) % n]!.id);
            else if (e.key === 'ArrowLeft') pickArea(AREAS_ESTUDO[(i + n - 1) % n]!.id);
          }}
        >
          <Selo t={a} size={28} />
          <span className="ks-areas__name">{a.titulo}</span>
          <span className="ks-areas__n">{a.total.toLocaleString('pt-BR')}</span>
        </button>
      ))}
    </div>
  );
  if (!area || !t)
    return (
      <div className="ks-studywrap">
        {barra}
        <p className="ks-explore__vazio" aria-busy="true">Carregando {escolhida.titulo}…</p>
      </div>
    );
  const grupos = ['Temas', 'Linguagens'] as const;
  const tudo = TRILHAS.find((x) => x.grupo === 'Tudo');
  const alternar = (c: Campo, v: string) => {
    setFiltros((f) => {
      const atual = f[c] ?? [];
      const prox = atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v];
      const n = { ...f, [c]: prox };
      if (!prox.length) delete n[c];
      return n;
    });
    setMostrar(POR_PAGINA);
  };
  const ativos = qtdFiltros(filtros) + (minEstrelas ? 1 : 0);
  const usarSugestao = (campo: Campo, valor: string, termo: string) => {
    if (campo === 'area') setEscopo('tudo');
    setFiltros((f) => (f[campo]?.includes(valor) ? f : { ...f, [campo]: [...(f[campo] ?? []), valor] }));
    // tira da busca a palavra que virou filtro
    setQ((atual) => atual.split(/\s+/).filter((w) => !palavras(w).includes(termo)).join(' '));
    setMostrar(POR_PAGINA);
  };
  const limparFiltros = () => {
    setFiltros({});
    setMinEstrelas(0);
    setMostrar(POR_PAGINA);
  };
  const escolhidos = (Object.keys(filtros) as Campo[]).flatMap((c) => (filtros[c] ?? []).map((v) => [c, v] as const));
  return (
    <div className="ks-studywrap">
      {barra}
    <div className="ks-study">
      <nav className="ks-study__topics" aria-label={`Temas e linguagens de ${area.titulo}`}>
        {tudo && (
          <div className="ks-study__group">
            <button type="button" className="ks-study__topic" aria-current={tudo.id === t.id ? 'true' : undefined} onClick={() => pick(tudo.id)}>
              <Selo t={tudo} size={26} />
              <span className="ks-study__tname">Tudo</span>
              <span className="ks-study__tcount">{tudo.repos.length}</span>
            </button>
          </div>
        )}
        {grupos.map((g) => {
          const itens = TRILHAS.filter((x) => x.grupo === g);
          if (!itens.length) return null;
          return (
            <div key={g} className="ks-study__group">
              <p className="ks-study__glabel">{g}</p>
              {itens.map((x) => (
                <button key={x.id} type="button" className="ks-study__topic" aria-current={x.id === t.id ? 'true' : undefined} onClick={() => pick(x.id)}>
                  <Selo t={x} size={26} />
                  <span className="ks-study__tname">{x.titulo}</span>
                  <span className="ks-study__tcount">{x.repos.length}</span>
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <section className="ks-trail" aria-labelledby="trilha-titulo" key={`${area.id}/${t.id}`}>
        <header className="ks-trail__head">
          <Selo t={t} size={48} />
          <div className="ks-trail__title">
            <h3 id="trilha-titulo">{emTudo ? 'Todas as áreas' : t.titulo}</h3>
            <p>{emTudo ? 'A busca em todos os projetos do Estudar.' : t.grupo === 'Linguagens' ? `${area.titulo} em ${t.titulo}: projetos de pessoas.` : t.resumo}</p>
          </div>
          <span className="ks-trail__count">{lista.length.toLocaleString('pt-BR')}</span>
        </header>
        <div className="ks-trail__tools">
          <span className="ks-trail__search">
            <Icon name="search" size={14} />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setMostrar(POR_PAGINA); }}
              onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.preventDefault(); setQ(''); } }}
              placeholder="Buscar: livraria, jwt, clima react, chess..."
              aria-label="Buscar projetos"
            />
            {q && (
              <button type="button" className="ks-trail__limpa" aria-label="Limpar busca" onClick={() => setQ('')}>
                <Icon name="x" size={13} />
              </button>
            )}
          </span>
          <div className="ks-trail__ordem">
            <Select
              ariaLabel="Ordem da lista"
              value={ordemEfetiva}
              options={buscando ? ORDENS : ORDENS.filter((o) => o.value !== 'relevancia')}
              onChange={(v) => {
                setOrdem(v as Ordem);
                gravar(ORDEM_KEY, v);
                setMostrar(POR_PAGINA);
              }}
            />
            {ordemEfetiva === 'misturar' && (
              <button type="button" className="ks-trail__icon" data-tip="Misturar de novo" aria-label="Misturar de novo" onClick={() => { setSemente(novaSemente()); setMostrar(POR_PAGINA); }}>
                <Icon name="refresh" size={15} />
              </button>
            )}
          </div>
          <button type="button" className="ks-trail__filtros" aria-expanded={painel} aria-controls="painel-filtros" onClick={() => setPainel((v) => !v)}>
            <Icon name="list" size={14} />
            Filtros
            {ativos > 0 && <span className="ks-trail__badge">{ativos}</span>}
            <Icon name="chevronRight" size={14} className="ks-trail__chev" />
          </button>
        </div>
        {(buscando || emTudo) && (
          <div className="ks-busca">
            <div className="ks-busca__escopo" role="group" aria-label="Onde buscar">
              <button type="button" aria-pressed={!emTudo} onClick={() => { setEscopo('lista'); setFiltros((f) => { const n = { ...f }; delete n.area; return n; }); setMostrar(POR_PAGINA); }}>
                {t.grupo === 'Tudo' ? area.titulo : `${area.titulo} · ${t.titulo}`}
              </button>
              <button type="button" aria-pressed={emTudo} onClick={() => { setEscopo('tudo'); setMostrar(POR_PAGINA); }}>
                Todas as áreas{noTotal !== null && <span className="ks-facets__n">{noTotal.toLocaleString('pt-BR')}</span>}
                {buscando && !todas && <span className="ks-facets__n">…</span>}
              </button>
            </div>
            {sugeridas.length > 0 && (
              <div className="ks-busca__sug" aria-label="Usar como filtro">
                <span className="ks-busca__rot">Filtrar por</span>
                {sugeridas.map((x) => (
                  <button key={x.campo + x.valor} type="button" className="ks-busca__chip" onClick={() => usarSugestao(x.campo, x.valor, x.termo)}>
                    <span className="ks-busca__campo">{NOME_CAMPO[x.campo]}</span>
                    {x.campo === 'lang' && <FileIcon pack={iconPack} path={`x.${extDaLinguagem(x.valor)}`} className="ks-chip__icon" />}
                    {x.rotulo}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!painel && ativos > 0 && (
          <div className="ks-ativos" aria-label="Filtros ligados">
            {minEstrelas > 0 && (
              <button type="button" className="ks-ativos__chip" onClick={() => setMinEstrelas(0)} aria-label={`Tirar filtro: ${minEstrelas}+ estrelas`}>
                <Icon name="star" size={12} />
                {minEstrelas}+
                <Icon name="x" size={12} />
              </button>
            )}
            {escolhidos.map(([c, v]) => (
              <button key={c + v} type="button" className="ks-ativos__chip" onClick={() => alternar(c, v)} aria-label={`Tirar filtro: ${rotuloDe(c, v)}`}>
                {c === 'lang' && <FileIcon pack={iconPack} path={`x.${extDaLinguagem(v)}`} className="ks-chip__icon" />}
                {rotuloDe(c, v)}
                <Icon name="x" size={12} />
              </button>
            ))}
            <button type="button" className="ks-linkbtn" onClick={limparFiltros}>limpar</button>
          </div>
        )}
        {painel && (
          <div className="ks-facets" id="painel-filtros" role="group" aria-label="Filtrar">
            <div className="ks-facets__row">
              <span className="ks-facets__label">Estrelas</span>
              {ESTRELAS.map((n) => (
                <button key={n} type="button" className="ks-famous__cat" aria-pressed={minEstrelas === n} onClick={() => { setMinEstrelas(n); setMostrar(POR_PAGINA); }}>
                  {n === 0 ? 'qualquer' : `${n}+`}
                </button>
              ))}
            </div>
            {facetas.map((f) => {
              const vs = filtros[f.campo] ?? [];
              return (
                <div key={f.campo} className="ks-facets__row">
                  <span className="ks-facets__label" data-tip={`Vários: ${f.dica}`}>{f.titulo}</span>
                  {f.valores.filter(([v], i) => i < VISIVEIS || abertas.has(f.campo) || vs.includes(v)).map(([v, n]) => {
                    const on = vs.includes(v);
                    return (
                      <button key={v} type="button" className="ks-famous__cat" aria-pressed={on} disabled={!on && n === 0} onClick={() => alternar(f.campo, v)}>
                        {f.campo === 'lang' && <FileIcon pack={iconPack} path={`x.${extDaLinguagem(v)}`} className="ks-chip__icon" />}
                        {rotuloDe(f.campo, v)}
                        <span className="ks-facets__n">{n}</span>
                      </button>
                    );
                  })}
                  {f.valores.length > VISIVEIS && (
                    <button type="button" className="ks-facets__mais" aria-expanded={abertas.has(f.campo)} onClick={() => setAbertas((a) => new Set(a.has(f.campo) ? [...a].filter((x) => x !== f.campo) : [...a, f.campo]))}>
                      {abertas.has(f.campo) ? 'menos' : `+${f.valores.length - VISIVEIS}`}
                    </button>
                  )}
                </div>
              );
            })}
            {ativos > 0 && (
              <div className="ks-facets__fim">
                <button type="button" className="ks-linkbtn" onClick={limparFiltros}>limpar filtros</button>
              </div>
            )}
          </div>
        )}
        {emTudo && buscando && !todas ? (
          <p className="ks-explore__vazio" aria-busy="true">Carregando todas as áreas…</p>
        ) : lista.length === 0 ? (
          <div className="ks-explore__vazio ks-vazio">
            <p>{buscando ? `Nada encontrado para "${q.trim()}"${ativos ? ' com esses filtros' : ''}.` : 'Nada com esses filtros.'}</p>
            <div className="ks-vazio__acoes">
              {!emTudo && buscando && (noTotal ?? 0) > 0 && (
                <button type="button" className="key" onClick={() => setEscopo('tudo')}>Ver {noTotal} em todas as áreas</button>
              )}
              {ativos > 0 && <button type="button" className="key" onClick={limparFiltros}>Limpar filtros</button>}
              {buscando && <button type="button" className="ks-linkbtn" onClick={() => setQ('')}>limpar busca</button>}
            </div>
          </div>
        ) : (
          <ul className="ks-repogrid">
            {lista.slice(0, mostrar).map((r) => (
              <RepoCard key={r.repo} r={r} feito={feitosAgora.has(r.repo)} onOpen={onOpen} busca={buscando ? c : undefined} comArea={emTudo} />
            ))}
          </ul>
        )}
        {lista.length > mostrar && (
          <button type="button" className="key ks-trail__more" onClick={() => setMostrar((m) => m + POR_PAGINA * 2)}>
            Mostrar mais ({lista.length - mostrar})
          </button>
        )}
      </section>
    </div>
    </div>
  );
}

// ---------- fotos dos donos ----------
// O endereço pelo login às vezes devolve a foto padrão do GitHub (sempre 420x420, ignorando o tamanho pedido).
// Detectada ela, com token busca-se a foto certa uma vez e guarda neste navegador; sem token, um monograma.
const FOTOS_KEY = 'cerne:fotos';
let fotos: Record<string, string> = (() => {
  try {
    return JSON.parse(ler(FOTOS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
})();
const ouvintesFotos = new Set<() => void>();
const pedindo = new Set<string>();
function pedirFoto(dono: string) {
  const token = getToken().value;
  if (!token || pedindo.has(dono)) return;
  pedindo.add(dono);
  void lerAvatar(dono, token).then((url) => {
    if (!url) return;
    fotos = { ...fotos, [dono]: url };
    gravar(FOTOS_KEY, JSON.stringify(fotos));
    ouvintesFotos.forEach((f) => f());
  });
}
const useFotos = () =>
  useSyncExternalStore(
    (f) => {
      ouvintesFotos.add(f);
      return () => ouvintesFotos.delete(f);
    },
    () => fotos,
  );
const CORES = ['blue', 'mauve', 'peach', 'teal', 'pink', 'green', 'sapphire', 'yellow', 'lavender', 'red'];
const corDe = (t: string) => CORES[[...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % CORES.length]!;

export function OwnerAvatar({ repo, size = 36 }: { repo: string; size?: number }) {
  const dono = repo.split('/')[0]!;
  const mapa = useFotos();
  const [padrao, setPadrao] = useState(false);
  const px = size * 2;
  const certa = mapa[dono];
  const src = certa ? `${certa}${certa.includes('?') ? '&' : '?'}s=${px}` : `https://avatars.githubusercontent.com/${encodeURIComponent(dono)}?s=${px}`;
  const cor = corDe(dono);
  const monograma = padrao && !certa;
  return (
    <span className={`ks-ownerpic${monograma ? ' is-mono' : ''}`} style={{ width: size, height: size, '--c': `var(--ctp-${cor})` } as React.CSSProperties} aria-hidden="true">
      {monograma ? (
        dono.replace(/[^a-z0-9]/gi, '').slice(0, 2).replace(/^./, (c) => c.toUpperCase())
      ) : (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            if (!certa && e.currentTarget.naturalWidth > px * 1.5) {
              setPadrao(true);
              pedirFoto(dono);
            }
          }}
          onError={() => setPadrao(true)}
        />
      )}
    </span>
  );
}

/** Texto com as palavras que casaram com a busca destacadas. */
function Marcado({ texto, busca }: { texto: string; busca?: Consulta }) {
  if (!busca) return <>{texto}</>;
  const alvo = casados(texto, busca);
  if (!alvo.size) return <>{texto}</>;
  // quebra mantendo os separadores, para remontar o texto igual
  return (
    <>
      {texto.split(/([A-Za-zÀ-ÿ0-9+#]+)/).map((parte, i) => (alvo.has(normalizar(parte)) ? <mark key={i} className="ks-marca">{parte}</mark> : parte))}
    </>
  );
}

function RepoCard({ r, feito, onOpen, busca, comArea }: { r: Entrada; feito: boolean; onOpen: (l: RepoLink) => void; busca?: Consulta; comArea?: boolean }) {
  const { icons } = usePrefs();
  const [dono, nome] = r.repo.split('/') as [string, string];
  return (
    <li className={`ks-repocard${feito ? ' is-done' : ''}`}>
      <button type="button" className="ks-repocard__main" onClick={() => abrir(r, onOpen)} aria-label={`Abrir ${r.repo}`}>
        <OwnerAvatar repo={r.repo} size={36} />
        <span className="ks-repocard__body">
          <span className="ks-repocard__name"><span>{dono}/</span><Marcado texto={nome} busca={busca} /></span>
          <span className="ks-repocard__nota"><Marcado texto={r.nota} busca={busca} /></span>
          <span className="ks-repocard__meta">
            <span className="ks-chip"><FileIcon pack={icons} path={`x.${extDaLinguagem(r.lang)}`} className="ks-chip__icon" />{r.lang}</span>
            {comArea && r.area && <span className="ks-chip">{AREA_TITULO[r.area]}</span>}
            {r.dominio && <span className="ks-chip ks-chip--dom">{r.dominio}</span>}
            {r.stack?.slice(0, 3).map((x) => <span key={x} className="ks-chip ks-chip--file">{x}</span>)}
            {r.estrelas !== undefined && <span className="ks-chip ks-chip--stars"><Icon name="star" size={11} />{r.estrelas}</span>}
          </span>
        </span>
      </button>
      <div className="ks-repocard__side">
        <button type="button" className={`ks-icon-btn ks-repocard__check${feito ? ' is-on' : ''}`} aria-pressed={feito} aria-label={feito ? 'Desmarcar estudado' : 'Marcar como estudado'} data-tip={feito ? 'Estudado' : 'Marcar como estudado'} onClick={() => alternarFeito(r.repo)}>
          <Icon name="check" size={15} />
        </button>
        <a className="ks-icon-btn" href={`https://github.com/${r.repo}`} target="_blank" rel="noopener noreferrer" aria-label={`${r.repo} no GitHub`} data-tip="No GitHub">
          <Icon name="external" size={14} />
        </a>
      </div>
    </li>
  );
}

// ---------- Famosos ----------
function Famosos({ onOpen }: { onOpen: (l: RepoLink) => void }) {
  const { icons } = usePrefs();
  const [cat, setCat] = useState<(typeof CATEGORIAS)[number]>('Todos');
  // ordem nova a cada visita e a cada categoria aberta
  const [semente, setSemente] = useState(novaSemente);
  const lista = useMemo(() => misturar(cat === 'Todos' ? FAMOSOS : FAMOSOS.filter((f) => f.famoso === cat), semente), [cat, semente]);
  return (
    <div className="ks-famous">
      <div className="ks-famous__cats" role="group" aria-label="Categoria">
        {CATEGORIAS.map((c) => (
          <button key={c} type="button" className="ks-famous__cat" aria-pressed={cat === c} onClick={() => { setCat(c); setSemente(novaSemente()); }}>{c}</button>
        ))}
      </div>
      <ul className="ks-famous__grid">
        {lista.map((f) => {
          const [dono, nome] = f.repo.split('/');
          return (
            <li key={f.repo}>
              <button type="button" className="ks-famous__card" onClick={() => abrir(f, onOpen)} aria-label={`Abrir ${f.repo}`}>
                <OwnerAvatar repo={f.repo} size={40} />
                <span className="ks-famous__body">
                  <span className="ks-repocard__name"><span>{dono}/</span>{nome}</span>
                  <span className="ks-repocard__nota">{f.nota}</span>
                </span>
                <span className="ks-famous__lang" data-tip={f.lang}><FileIcon pack={icons} path={`x.${extDaLinguagem(f.lang)}`} className="ks-chip__icon" /></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
