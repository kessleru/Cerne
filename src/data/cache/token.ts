// Separa o cache por token: o prefixo vem de parte do SHA-256 do token, nunca do token em si.
import type { Armazenamento } from './armazenamento';

export const PREFIXO_ANONIMO = 'anon';

const memo = new Map<string, string>();

function fnv8(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** `anon` sem token; com token, `t` + 8 primeiros caracteres hexadecimais do SHA-256. */
export async function prefixoDoToken(token: string | null): Promise<string> {
  if (!token) return PREFIXO_ANONIMO;
  const hit = memo.get(token);
  if (hit) return hit;
  let hex: string;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    hex = [...new Uint8Array(buf).slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    hex = fnv8(token); // contexto sem crypto.subtle: só um rótulo de separação
  }
  const p = 't' + hex;
  memo.clear(); // guarda só o token atual
  memo.set(token, p);
  return p;
}

/** Quando o token sai ou muda, apaga o cache do prefixo antigo. Devolve a função que desliga a vigia. */
export function vigiarToken(
  store: Armazenamento,
  lerToken: () => string | null,
  assinar: (fn: () => void) => () => void,
  aoMudar?: () => void,
): () => void {
  let ultimo: Promise<string> = prefixoDoToken(lerToken());
  return assinar(() => {
    const anterior = ultimo;
    const agora = prefixoDoToken(lerToken());
    ultimo = agora;
    void Promise.all([anterior, agora]).then(([a, b]) => {
      if (a !== b && a !== PREFIXO_ANONIMO) void store.clearPrefix(a + '|');
      if (a !== b) aoMudar?.();
    });
  });
}
