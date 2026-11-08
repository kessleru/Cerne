// Geradores de conteúdo falso. Tudo determinístico: o mesmo caminho dá sempre o mesmo texto.

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fakeSha(seed: string): string {
  let out = '';
  let h = hashStr(seed);
  while (out.length < 40) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = (h + 0x9e3779b9) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, 40);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function tsModule(name: string): string {
  const C = cap(name);
  return `// ${name}.ts: funções de apoio do ${name}.
import type { Item } from './format';

export interface ${C}Options {
  limite: number;
  ordem: 'asc' | 'desc';
  /** chave usada para agrupar */
  chave?: string;
}

const PADRAO: ${C}Options = { limite: 50, ordem: 'asc' };

/** Normaliza as opções, preenchendo o que faltar. */
export function opcoes${C}(parcial: Partial<${C}Options> = {}): ${C}Options {
  return { ...PADRAO, ...parcial, limite: Math.max(1, parcial.limite ?? PADRAO.limite) };
}

export function aplicar${C}(itens: Item[], parcial?: Partial<${C}Options>): Item[] {
  const op = opcoes${C}(parcial);
  const copia = [...itens];
  copia.sort((a, b) => {
    if (a.nome === b.nome) return 0;
    const cmp = a.nome < b.nome ? -1 : 1;
    return op.ordem === 'asc' ? cmp : -cmp;
  });
  if (op.chave) {
    const grupos = new Map<string, Item[]>();
    for (const item of copia) {
      const k = String(item[op.chave as keyof Item] ?? 'sem chave');
      const lista = grupos.get(k) ?? [];
      lista.push(item);
      grupos.set(k, lista);
    }
    return [...grupos.values()].flat().slice(0, op.limite);
  }
  return copia.slice(0, op.limite);
}

export function resumo${C}(itens: Item[]): string {
  const total = itens.length;
  if (total === 0) return 'nenhum item';
  const nomes = itens.slice(0, 3).map((i) => i.nome).join(', ');
  return total > 3 ? \`\${nomes} e mais \${total - 3}\` : nomes;
}
`;
}

export function reactComponent(name: string): string {
  return `import { useState } from 'react';
import type { ReactNode } from 'react';

type ${name}Props = {
  titulo: string;
  aberto?: boolean;
  children?: ReactNode;
  onMudar?: (aberto: boolean) => void;
};

export function ${name}({ titulo, aberto = false, children, onMudar }: ${name}Props) {
  const [ativo, setAtivo] = useState(aberto);

  const alternar = () => {
    setAtivo((valor) => {
      onMudar?.(!valor);
      return !valor;
    });
  };

  return (
    <section className="${name.toLowerCase()}" data-aberto={ativo}>
      <header>
        <h2>{titulo}</h2>
        <button type="button" onClick={alternar} aria-expanded={ativo}>
          {ativo ? 'Fechar' : 'Abrir'}
        </button>
      </header>
      {ativo && <div className="corpo">{children}</div>}
    </section>
  );
}
`;
}

export function pageComponent(name: string): string {
  return `import { ${name === 'Home' ? 'Card' : 'List'} } from '../components';

export default function ${name}() {
  return (
    <main>
      <h1>${name}</h1>
      <p>Esta página existe só para o protótipo do Cerne.</p>
      <${name === 'Home' ? 'Card' : 'List'} titulo="${name}" />
    </main>
  );
}
`;
}

export function cssFile(name: string): string {
  return `/* ${name}.css */
:root {
  --cor-fundo: var(--ctp-base);
  --cor-texto: var(--ctp-text);
  --raio: 8px;
}

.${name} {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: var(--raio);
  background: var(--cor-fundo);
  color: var(--cor-texto);
}

.${name} > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.${name} button:hover {
  opacity: 0.85;
}

@media (max-width: 720px) {
  .${name} {
    padding: 8px;
  }
}
`;
}

export function pyModule(name: string): string {
  return `"""${name}: utilidades de apoio."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass
class Item:
    nome: str
    valor: float = 0.0


def somar(itens: Iterable[Item]) -> float:
    """Soma o valor de todos os itens."""
    total = 0.0
    for item in itens:
        total += item.valor
    return round(total, 2)


def maiores(itens: Iterable[Item], n: int = 3) -> list[Item]:
    ordenados = sorted(itens, key=lambda i: i.valor, reverse=True)
    return ordenados[:n]


if __name__ == "__main__":
    demo = [Item("a", 1.5), Item("b", 3), Item("c", 2.25)]
    print(somar(demo), [i.nome for i in maiores(demo, 2)])
`;
}

export function testFile(name: string): string {
  return `import { describe, expect, it } from 'vitest';
import { ${name} } from '../src/lib/${name}';

describe('${name}', () => {
  it('devolve o valor padrão', () => {
    expect(${name}()).toBeDefined();
  });

  it('aceita opções', () => {
    expect(${name}({ limite: 2 })).toBeTruthy();
  });
});
`;
}

/** CSV de cupons com 200 linhas. */
export function couponsCsv(): string {
  const lines = ['codigo,descricao,desconto_percentual,valido_ate,usos,ativo'];
  const nomes = ['Boas-vindas', 'Frete', 'Black', 'Aniversário', 'Volta às aulas', 'Parceiro', 'Fidelidade'];
  for (let i = 1; i <= 200; i++) {
    const h = hashStr('cupom' + i);
    const nome = nomes[h % nomes.length]!;
    const pct = 5 + (h % 8) * 5;
    const mes = 1 + (h % 12);
    const dia = 1 + (h % 28);
    const desc = h % 9 === 0 ? `"${nome}, edição ${i}"` : `${nome} ${i}`;
    lines.push(
      `CUP${String(i).padStart(4, '0')},${desc},${pct},2027-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')},${h % 500},${h % 5 === 0 ? 'não' : 'sim'}`,
    );
  }
  return lines.join('\n') + '\n';
}

export function rankingCsv(): string {
  const lines = ['posicao;nome;pontos;partidas'];
  for (let i = 1; i <= 40; i++) {
    const h = hashStr('rank' + i);
    lines.push(`${i};Jogador ${String.fromCharCode(64 + ((h % 26) + 1))}${i};${3000 - i * 37 - (h % 20)};${40 + (h % 60)}`);
  }
  return lines.join('\n') + '\n';
}

/**
 * Arquivo de 50 000 linhas para testar o CodeView. Blocos de 10 linhas com comentário, interface,
 * função com condicional e chaves aninhadas, para exercitar dobra e destaque.
 */
export const HUGE_LINES = 50000;

export function hugeFile(): string {
  const out: string[] = [];
  let n = 1;
  while (out.length < HUGE_LINES) {
    const id = String(n).padStart(4, '0');
    out.push(`/** Registro ${id}: valores de apoio para o cálculo número ${n}. */`);
    out.push(`export interface Registro${id} {`);
    out.push(`  id: number;`);
    out.push(`  nome: string;`);
    out.push(`}`);
    out.push(``);
    out.push(`export function calcular${id}(entrada: Registro${id}): number {`);
    if (n % 3 === 0) {
      out.push(`  if (entrada.nome === 'especial-${n}') {`);
      out.push(`    return entrada.id * ${n % 97};`);
      out.push(`  }`);
      out.push(`  return entrada.id;`);
      out.push(`}`);
      out.push(``);
    } else {
      out.push(`  const base = entrada.id * 17 + entrada.nome.length;`);
      out.push(`  return base % 97 === 0 ? 0 : base; // ${n}`);
      out.push(`}`);
      out.push(``);
    }
    n++;
  }
  out.length = HUGE_LINES;
  return out.join('\n') + '\n';
}

/** Versão anterior fabricada de um texto: tira, troca e acrescenta algumas linhas (determinístico por seed). */
export function previousVersion(text: string, seed: string): string {
  const lines = text.split('\n');
  const h = hashStr(seed);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const r = (h + i * 2654435761) >>> 0;
    if (lines.length > 6 && r % 23 === 0 && line.trim()) continue; // linha adicionada depois
    if (lines.length > 6 && r % 29 === 0 && line.trim()) {
      out.push(line.replace(/(\w+)(\W*)$/, 'antigo$2'));
      continue;
    }
    out.push(line);
    if (lines.length > 6 && r % 37 === 0) out.push('  // removido depois');
  }
  return out.join('\n');
}
