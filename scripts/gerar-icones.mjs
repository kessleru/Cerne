// Gera src/icons/<pacote>.json com só os ícones que o mapa de extensões (src/icons/mapas.json) usa.
// Cada pacote do Iconify traz centenas de ícones; a árvore usa algumas dezenas.
// Uso: node scripts/gerar-icones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src', 'icons');

const PACOTES = [
  { id: 'material', fonte: 'material-icon-theme' },
  { id: 'catppuccin', fonte: 'catppuccin' },
  { id: 'vscode', fonte: 'vscode-icons' },
];

const mapas = JSON.parse(fs.readFileSync(path.join(DIR, 'mapas.json'), 'utf8'));

/** Nomes que resolveIcon pode procurar: extensões, arquivos por nome, pastas e as variantes abertas. */
function nomesUsados(m) {
  const nomes = new Set();
  for (const n of Object.values(m.ext)) nomes.add(n);
  for (const n of Object.values(m.file)) nomes.add(n);
  nomes.add(m.defaultFile);
  for (const n of Object.values(m.folder)) {
    nomes.add(n);
    nomes.add(`${n}${m.openSuffix}`);
  }
  nomes.add(m.defaultFolder);
  nomes.add(m.openDefault ?? `${m.defaultFolder}${m.openSuffix}`);
  return [...nomes];
}

/** Mesma regra do pick(): ícone direto ou alias resolvido (inclusive alias de alias). */
function achar(set, nome, vistos = new Set()) {
  const icone = set.icons?.[nome];
  if (icone) return icone;
  if (vistos.has(nome)) return null;
  vistos.add(nome);
  const alias = set.aliases?.[nome];
  if (!alias) return null;
  const pai = achar(set, alias.parent, vistos);
  return pai ? { ...pai, ...alias } : null;
}

function enxuto(icone) {
  const out = { body: icone.body };
  if (icone.width) out.width = icone.width;
  if (icone.height) out.height = icone.height;
  return out;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

for (const pacote of PACOTES) {
  const fonte = path.join(ROOT, 'node_modules', '@iconify-json', pacote.fonte, 'icons.json');
  const bruto = fs.statSync(fonte).size;
  const set = JSON.parse(fs.readFileSync(fonte, 'utf8'));
  const icons = {};
  const faltando = [];

  for (const nome of nomesUsados(mapas[pacote.id])) {
    const icone = achar(set, nome);
    if (!icone?.body) {
      faltando.push(nome);
      continue;
    }
    icons[nome] = enxuto(icone);
  }

  const saida = { width: set.width, height: set.height, icons };
  const texto = `${JSON.stringify(saida)}\n`;
  const destino = path.join(DIR, `icons-${pacote.id}.json`);
  fs.writeFileSync(destino, texto);

  const usados = Object.keys(icons).length;
  console.log(`icons-${pacote.id}.json: ${usados} ícones, ${kb(Buffer.byteLength(texto))} (pacote inteiro: ${kb(bruto)})`);
  if (faltando.length) console.log(`  sem ícone no pacote: ${faltando.join(', ')}`);
}
