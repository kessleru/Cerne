import { useMemo, useState } from 'react';
import type { Commit } from '../data/types';
import { Icon } from '../components/Icon';
import { diffLines, stats, toHunks, type DiffLine } from '../lib/diff';

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
function rel(date: string): string {
  const d = new Date(date);
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (days < 1) return 'hoje';
  if (days < 30) return `há ${days} dias`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  return d.toLocaleDateString('pt-BR');
}

export function CommitList({ commits, active, path, onPick }: { commits: Commit[]; active: string | null; path: string | null; onPick: (c: Commit) => void }) {
  return (
    <ol className="ks-commits" aria-label={path ? `Histórico de ${path}` : 'Histórico do repositório'}>
      {commits.map((c) => (
        <li key={c.sha}>
          <button type="button" className="ks-commits__item" aria-current={active === c.sha ? 'true' : undefined} onClick={() => onPick(c)}>
            <span className="ks-commits__msg">{c.message}</span>
            <span className="ks-commits__meta">
              {c.author} · <time dateTime={c.date}>{rel(c.date)}</time> · <code>{c.sha.slice(0, 7)}</code>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
