// Confere o catálogo do Explorar contra o código real: o arquivo inicial (start) e cada arquivo dos guias
// existem no ramo padrão, e cada âncora aparece no arquivo. Lê os .ts como texto (sem compilar).
// Rode depois de acrescentar ou mudar um repositório (veja docs/catalogo.md).
// Uso: node scripts/conferir-guias.mjs [dono/repo ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(ROOT, 'src', 'data', 'catalogo', 'repos');
const arquivos = fs.readdirSync(PASTA).filter((f) => f.endsWith('.ts')).map((f) => path.join(PASTA, f));
const so = new Set(process.argv.slice(2).map((s) => s.toLowerCase()));

// repo: '...' abre um guia; P('titulo', 'arquivo', 'ancora' | undefined, ...) é um passo
const str = String.raw`'((?:[^'\\]|\\.)*)'`;
const reRepo = new RegExp(String.raw`repo:\s*` + str, 'g');
const reStart = new RegExp(String.raw`start:\s*` + str);
const rePasso = new RegExp(String.raw`P\(\s*` + str + String.raw`\s*,\s*` + str + String.raw`\s*,\s*(?:` + str + String.raw`|undefined)`, 'g');
const des = (s) => s.replace(/\\(.)/g, '$1');

const guias = [];
for (const f of arquivos) {
  const t = fs.readFileSync(f, 'utf8');
  const marcas = [...t.matchAll(reRepo)].map((m) => ({ repo: des(m[1]), pos: m.index }));
  marcas.forEach((m, i) => {
    const fim = marcas[i + 1]?.pos ?? t.length;
    const trecho = t.slice(m.pos, fim);
    const passos = [...trecho.matchAll(rePasso)].map((p) => ({ arquivo: des(p[2]), ancora: p[3] === undefined ? null : des(p[3]) }));
    const start = reStart.exec(trecho);
    if (start) passos.unshift({ arquivo: des(start[1]), ancora: null });
    guias.push({ repo: m.repo, passos });
  });
}

const cache = new Map();
async function ler(repo, arquivo) {
  const k = `${repo}/${arquivo}`;
  if (!cache.has(k)) {
    cache.set(
      k,
      fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${arquivo.split('/').map(encodeURIComponent).join('/')}`).then(async (r) => (r.ok ? r.text() : null), () => null),
    );
  }
  return cache.get(k);
}

let erros = 0;
let total = 0;
const alvo = guias.filter((g) => !so.size || so.has(g.repo.toLowerCase()));
await Promise.all(
  alvo.map(async (g) => {
    for (const p of g.passos) {
      total++;
      const texto = await ler(g.repo, p.arquivo);
      if (texto === null) {
        erros++;
        console.log(`[ARQUIVO] ${g.repo}  ${p.arquivo}`);
      } else if (p.ancora && !texto.includes(p.ancora)) {
        erros++;
        console.log(`[ÂNCORA]  ${g.repo}  ${p.arquivo}  «${p.ancora}»`);
      }
    }
  }),
);
console.log(`Resumo: guias=${alvo.length} passos=${total} erros=${erros}`);
process.exitCode = erros ? 1 : 0;
