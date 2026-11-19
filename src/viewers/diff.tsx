import { useMemo, useState } from 'react';
import type { Commit } from '../data/types';
import { Icon } from '../components/Icon';
import { diffLines, stats, toHunks, type DiffLine } from '../lib/diff';
import { relativo, rotuloDoDia } from '../lib/tempo';

type Mode = 'unified' | 'split';

const SIGN = { add: '+', del: '-', ctx: ' ' } as const;
const KIND_LABEL = { add: 'adicionada', del: 'removida', ctx: 'sem mudança' } as const;

/** Pareia blocos de remoções com adições para a visão em duas colunas. */
function toSplit(lines: DiffLine[]): { l?: DiffLine; r?: DiffLine }[] {
  const out: { l?: DiffLine; r?: DiffLine }[] = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i]!;
    if (ln.kind === 'ctx') {
      out.push({ l: ln, r: ln });
      i++;
      continue;
    }
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i]!.kind === 'del') dels.push(lines[i++]!);
    while (i < lines.length && lines[i]!.kind === 'add') adds.push(lines[i++]!);
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) out.push({ l: dels[k], r: adds[k] });
  }
  return out;
}

function Cell({ line, side }: { line?: DiffLine; side: 'a' | 'b' }) {
  if (!line) return <div className="ks-diff__cell is-empty" aria-hidden="true" />;
  const no = side === 'a' ? line.a : line.b;
  return (
    <div className={`ks-diff__cell is-${line.kind}`}>
      <span className="ks-diff__no">{no ?? ''}</span>
      <span className="ks-diff__sign" aria-label={KIND_LABEL[line.kind]}>{SIGN[line.kind]}</span>
      <span className="ks-diff__text">{line.text || ' '}</span>
    </div>
  );
}

export function DiffView({ before, after, commit, path }: { before: string; after: string; commit: Commit | null; path: string }) {
  const [mode, setMode] = useState<Mode>('unified');
  const all = useMemo(() => diffLines(before.split('\n'), after.split('\n')), [before, after]);
  const hunks = useMemo(() => toHunks(all), [all]);
  const { add, del } = useMemo(() => stats(all), [all]);

  return (
    <div className="ks-diffview">
      <div className="ks-diffview__bar">
        <span className="ks-diffview__title">
          {commit ? commit.message : 'Mudanças'} <span className="ks-diffview__sha">{commit?.sha.slice(0, 7)}</span>
        </span>
        <span className="ks-diffview__stat" aria-label={`${add} linhas adicionadas, ${del} removidas`}>
          <span className="is-add">+{add}</span> <span className="is-del">-{del}</span>
        </span>
        <div className="ks-segmented" role="group" aria-label="Modo do diff">
          <button type="button" aria-pressed={mode === 'unified'} onClick={() => setMode('unified')}>Unificado</button>
          <button type="button" aria-pressed={mode === 'split'} onClick={() => setMode('split')}>Duas colunas</button>
        </div>
      </div>
      <div className="ks-diff" role="region" aria-label={`Mudanças em ${path}`} tabIndex={0}>
        {hunks.length === 0 && <p className="ks-diff__none">Nenhuma diferença.</p>}
        {hunks.map((h, i) => (
          <section key={i} className={`ks-diff__hunk is-${mode}`}>
            <h4 className="ks-diff__head">
              <Icon name="diff" /> @@ -{h.aStart} +{h.bStart} @@
            </h4>
            {mode === 'unified'
              ? h.lines.map((l, k) => (
                  <div key={k} className={`ks-diff__cell is-${l.kind}`}>
                    <span className="ks-diff__no">{l.a ?? ''}</span>
                    <span className="ks-diff__no">{l.b ?? ''}</span>
                    <span className="ks-diff__sign" aria-label={KIND_LABEL[l.kind]}>{SIGN[l.kind]}</span>
                    <span className="ks-diff__text">{l.text || ' '}</span>
                  </div>
                ))
              : toSplit(h.lines).map((p, k) => (
                  <div key={k} className="ks-diff__pair">
                    <Cell line={p.l} side="a" />
                    <Cell line={p.r} side="b" />
                  </div>
                ))}
          </section>
        ))}
      </div>
    </div>
  );
}

// ---------- CommitList: histórico do arquivo ----------

/** Iniciais do autor para o selo redondo. */
function iniciaisAutor(nome: string): string {
  const partes = nome.trim().split(/[\s._-]+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '?') + (partes.length > 1 ? partes[partes.length - 1]![0] : '')).toUpperCase();
}

/** Cor do selo pelo nome: sempre a mesma para a mesma pessoa. */
const CORES_AUTOR = ['blue', 'mauve', 'peach', 'teal', 'pink', 'yellow', 'sapphire', 'green', 'lavender', 'maroon'];
function corAutor(nome: string): string {
  let h = 0;
  for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CORES_AUTOR[h % CORES_AUTOR.length]!;
}

export function CommitList({ commits, active, path, onPick }: { commits: Commit[]; active: string | null; path: string | null; onPick: (c: Commit) => void }) {
  // agrupa por dia, mantendo a ordem (do mais novo ao mais antigo)
  const grupos: { dia: string; itens: Commit[] }[] = [];
  for (const c of commits) {
    const dia = rotuloDoDia(c.date);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.itens.push(c);
    else grupos.push({ dia, itens: [c] });
  }
  return (
    <div className="ks-commits ks-timeline" aria-label={path ? `Histórico de ${path}` : 'Histórico do repositório'}>
      <p className="ks-timeline__head">
        <Icon name="history" size={14} />
        {path ? <>Histórico de <code>{path}</code></> : 'Histórico do repositório'}
        <span className="ks-timeline__count">{commits.length} {commits.length === 1 ? 'commit' : 'commits'}</span>
        <span className="ks-timeline__tip">Clique num commit para ver o que mudou</span>
      </p>
      {grupos.map((g) => (
        <section key={g.dia + g.itens[0]!.sha} className="ks-timeline__day">
          <h3 className="ks-timeline__date"><Icon name="commit" size={14} />{g.dia}</h3>
          <ol className="ks-timeline__list">
            {g.itens.map((c) => (
              <li key={c.sha}>
                <button type="button" className="ks-commits__item ks-timeline__item" aria-current={active === c.sha ? 'true' : undefined} onClick={() => onPick(c)}>
                  <span className="ks-timeline__avatar" style={{ background: `color-mix(in srgb, var(--ctp-${corAutor(c.author)}) 22%, var(--ctp-mantle))`, color: `var(--ctp-${corAutor(c.author)})` }} aria-hidden="true">{iniciaisAutor(c.author)}</span>
                  <span className="ks-timeline__main">
                    <span className="ks-commits__msg">{c.message.split('\n')[0]}</span>
                    <span className="ks-commits__meta">
                      <b>{c.author}</b> · <time dateTime={c.date} title={new Date(c.date).toLocaleString('pt-BR')}>{relativo(c.date)}</time>
                    </span>
                  </span>
                  <code className="ks-timeline__sha">{c.sha.slice(0, 7)}</code>
                  <Icon name="chevronRight" size={14} className="ks-timeline__go" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
