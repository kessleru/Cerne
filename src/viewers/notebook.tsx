// Notebook Jupyter (.ipynb): células de Markdown, código colorido pelo mesmo Shiki do CodeView e saídas
// (texto, imagens PNG/JPEG/SVG em data:, erros). HTML das saídas nunca é injetado: vira texto.
import { useEffect, useMemo, useState } from 'react';
import { fetchPreview } from '../code/client';
import type { Tok } from '../code/protocol';
import { Icon } from '../components/Icon';
import { MarkdownView } from './data';

type Saida =
  | { tipo: 'texto'; texto: string; erro?: boolean }
  | { tipo: 'imagem'; src: string };
type Celula = { tipo: 'markdown' | 'code' | 'raw'; fonte: string; n: number | null; saidas: Saida[] };

const junta = (v: unknown) => (Array.isArray(v) ? v.join('') : typeof v === 'string' ? v : '');
/** tira as cores ANSI dos tracebacks */
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
const semAnsi = (t: string) => t.replace(ANSI, '');

function lerNotebook(text: string): { celulas: Celula[]; linguagem: string } | { erro: string } {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { erro: 'Este notebook não é um JSON válido.' };
  }
  const meta = (j.metadata ?? {}) as { kernelspec?: { language?: string }; language_info?: { name?: string } };
  const linguagem = (meta.language_info?.name ?? meta.kernelspec?.language ?? 'python').toLowerCase();
  const brutas = Array.isArray(j.cells) ? (j.cells as Record<string, unknown>[]) : [];
  const celulas = brutas.map((c): Celula => {
    const saidas: Saida[] = [];
    for (const o of Array.isArray(c.outputs) ? (c.outputs as Record<string, unknown>[]) : []) {
      if (o.output_type === 'stream') saidas.push({ tipo: 'texto', texto: junta(o.text) });
      else if (o.output_type === 'error') saidas.push({ tipo: 'texto', texto: semAnsi(Array.isArray(o.traceback) ? (o.traceback as string[]).join('\n') : `${o.ename}: ${o.evalue}`), erro: true });
      else {
        const d = (o.data ?? {}) as Record<string, unknown>;
        if (typeof d['image/png'] === 'string') saidas.push({ tipo: 'imagem', src: `data:image/png;base64,${(d['image/png'] as string).replace(/\s/g, '')}` });
        else if (typeof d['image/jpeg'] === 'string') saidas.push({ tipo: 'imagem', src: `data:image/jpeg;base64,${(d['image/jpeg'] as string).replace(/\s/g, '')}` });
        else if (d['image/svg+xml']) saidas.push({ tipo: 'imagem', src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(junta(d['image/svg+xml']))}` });
        else if (d['text/plain']) saidas.push({ tipo: 'texto', texto: junta(d['text/plain']) });
      }
    }
    const tipo = c.cell_type === 'markdown' ? 'markdown' : c.cell_type === 'code' ? 'code' : 'raw';
    return { tipo, fonte: junta(c.source), n: typeof c.execution_count === 'number' ? c.execution_count : null, saidas };
  });
  return { celulas, linguagem };
}

const SHIKI: Record<string, string> = { python: 'python', python3: 'python', r: 'r', julia: 'julia', javascript: 'javascript', typescript: 'typescript', scala: 'scala', 'c++': 'cpp', bash: 'shellscript', sql: 'sql' };

export function NotebookView({ text, editorTheme }: { text: string; editorTheme: string | null }) {
  const nb = useMemo(() => lerNotebook(text), [text]);
  if ('erro' in nb) return <p className="ks-media__note"><Icon name="alert" size={14} /> {nb.erro}</p>;
  const lang = SHIKI[nb.linguagem] ?? null;
  const codigo = nb.celulas.filter((c) => c.tipo === 'code').length;
  return (
    <div className="ks-nb">
      <p className="ks-nb__meta"><Icon name="notebook" size={14} /> {nb.celulas.length} células · {codigo} de código · {nb.linguagem}</p>
      {nb.celulas.map((c, i) => (
        <section key={i} className={`ks-nb__cell is-${c.tipo}`}>
          {c.tipo === 'markdown' ? (
            <MarkdownView text={c.fonte} />
          ) : (
            <>
              <div className="ks-nb__in">
                <span className="ks-nb__n" aria-label={c.n ? `Execução ${c.n}` : 'Não executada'}>[{c.n ?? ' '}]</span>
                <Bloco code={c.fonte} lang={c.tipo === 'code' ? lang : null} theme={editorTheme} />
              </div>
              {c.saidas.map((o, k) =>
                o.tipo === 'imagem' ? (
                  <div key={k} className="ks-nb__out is-img"><img src={o.src} alt={`Saída da célula ${i + 1}`} /></div>
                ) : (
                  <pre key={k} className={`ks-nb__out${o.erro ? ' is-error' : ''}`}>{o.texto.length > 20000 ? o.texto.slice(0, 20000) + '\n…' : o.texto}</pre>
                ),
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}

/** Trecho de código colorido (sem virtualização: células são curtas). */
function Bloco({ code, lang, theme }: { code: string; lang: string | null; theme: string | null }) {
  const [linhas, setLinhas] = useState<Tok[][] | null>(null);
  const [fundo, setFundo] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void fetchPreview(theme, lang, code).then((r) => {
      if (!vivo) return;
      setLinhas(r.lines);
      setFundo(r.data?.bg ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [code, lang, theme]);
  return (
    <pre className="ks-nb__code" style={fundo ? { background: fundo } : undefined}>
      {linhas
        ? linhas.map((l, i) => (
            <div key={i}>
              {l.length ? l.map((t, k) => <span key={k} className={t.c} style={t.k || t.f ? { color: t.k, fontStyle: t.f && t.f & 1 ? 'italic' : undefined, fontWeight: t.f && t.f & 2 ? 700 : undefined } : undefined}>{t.t}</span>) : ' '}
            </div>
          ))
        : code}
    </pre>
  );
}
