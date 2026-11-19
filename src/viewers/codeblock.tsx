// Trecho de código colorido pelo mesmo Shiki do CodeView (README, notebooks, guias). Sem virtualização: trechos curtos.
import { useEffect, useState } from 'react';
import { fetchPreview } from '../code/client';
import type { Tok } from '../code/protocol';
import { langOf } from '../lib/lang';

const ALIAS: Record<string, string> = {
  rust: 'rs', python: 'py', python3: 'py', javascript: 'js', typescript: 'ts', shell: 'sh', console: 'sh', shellsession: 'sh', terminal: 'sh',
  golang: 'go', 'c++': 'cpp', csharp: 'cs', 'c#': 'cs', dockerfile: 'dockerfile', docker: 'dockerfile', yml: 'yaml', jsonc: 'jsonc', kotlin: 'kt',
  ruby: 'rb', markdown: 'md', powershell: 'ps1', ps: 'ps1', objc: 'm', protobuf: 'proto', terraform: 'tf', make: 'mk', makefile: 'mk',
};

/** id do Shiki para o nome da cerca (```js, ```python...). */
export function shikiDaCerca(nome: string): string | null {
  const n = nome.toLowerCase();
  if (!n || n === 'text' || n === 'txt' || n === 'plain') return null;
  if (n === 'dockerfile' || n === 'docker') return 'docker';
  if (n === 'makefile' || n === 'make') return 'makefile';
  return langOf(`x.${ALIAS[n] ?? n}`).shiki;
}

export function CodeBlock({ code, lang, theme, className = '' }: { code: string; lang: string | null; theme: string | null; className?: string }) {
  const [linhas, setLinhas] = useState<Tok[][] | null>(null);
  const [fundo, setFundo] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void fetchPreview(theme, lang, code).then((r) => {
      if (!vivo) return;
      setLinhas(r.lines.length ? r.lines : null);
      setFundo(r.data?.bg ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [code, lang, theme]);
  return (
    <pre className={className} style={fundo ? { background: fundo } : undefined}>
      <code>
        {linhas
          ? linhas.map((l, i) => (
              <div key={i}>
                {l.length
                  ? l.map((t, k) => (
                      <span key={k} className={t.c} style={t.k || t.f ? { color: t.k, fontStyle: t.f && t.f & 1 ? 'italic' : undefined, fontWeight: t.f && t.f & 2 ? 700 : undefined } : undefined}>
                        {t.t}
                      </span>
                    ))
                  : ' '}
              </div>
            ))
          : code}
      </code>
    </pre>
  );
}
