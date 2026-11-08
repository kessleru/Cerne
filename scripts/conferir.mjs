import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const EXCLUDED = new Set([
  'src/kessleru/tokens.css',
  'src/kessleru/bundle.css',
]);

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const TRANSITION_ALL_RE = /transition\s*:\s*all\b/i;
const EASE_IN_RE = /ease-in(?!-out)/i;
const SCALE_ZERO_RE = /scale\(\s*0\s*\)/i;
const EMOJI_RE = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|[\u{1F1E6}-\u{1F1FF}]|[0-9#*]\uFE0F?\u20E3)/u;

const findings = {
  hex: [],
  transitionAll: [],
  easeIn: [],
  scaleZero: [],
  emoji: [],
  dist: [],
};

function walk(dir, exts, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, exts, out);
    } else if (!exts || exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
}

function rel(full) {
  return path.relative(ROOT, full).replace(/\\/g, '/');
}

const srcFiles = [];
walk(SRC, new Set(['.css', '.tsx', '.ts']), srcFiles);

for (const full of srcFiles) {
  const file = rel(full);
  const ext = path.extname(full);
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);

  if (!EXCLUDED.has(file) && (ext === '.css' || ext === '.tsx')) {
    lines.forEach((line, i) => {
      for (const match of line.matchAll(HEX_RE)) {
        findings.hex.push({ file, line: i + 1, detail: match[0] });
      }
      if (TRANSITION_ALL_RE.test(line)) {
        findings.transitionAll.push({ file, line: i + 1, detail: 'transition: all' });
      }
      if (EASE_IN_RE.test(line)) {
        findings.easeIn.push({ file, line: i + 1, detail: 'ease-in' });
      }
      if (SCALE_ZERO_RE.test(line)) {
        findings.scaleZero.push({ file, line: i + 1, detail: 'scale(0)' });
      }
    });
  }

  if (ext === '.tsx' || ext === '.ts') {
    lines.forEach((line, i) => {
      if (EMOJI_RE.test(line)) {
        findings.emoji.push({ file, line: i + 1, detail: line.match(EMOJI_RE)[0] });
      }
    });
  }
}

if (fs.existsSync(DIST)) {
  const distFiles = [];
  walk(DIST, null, distFiles);
  const hosts = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs'];
  for (const full of distFiles) {
    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const host of hosts) {
        if (line.includes(host)) {
          findings.dist.push({ file: rel(full), line: i + 1, detail: host });
        }
      }
    });
  }
}

function report(label, items) {
  if (items.length === 0) {
    console.log(`[OK] ${label}: 0 ocorrências`);
    return;
  }
  for (const item of items) {
    console.log(`[ERRO] ${label} ${item.file}:${item.line}: ${item.detail}`);
  }
}

report('hex', findings.hex);
report('transition: all', findings.transitionAll);
report('ease-in', findings.easeIn);
report('scale(0)', findings.scaleZero);
report('emoji', findings.emoji);

if (!fs.existsSync(DIST)) {
  console.log('[OK] dist: não existe');
} else {
  report('dist', findings.dist);
}

const total =
  findings.hex.length +
  findings.transitionAll.length +
  findings.easeIn.length +
  findings.scaleZero.length +
  findings.emoji.length +
  findings.dist.length;

console.log(
  `Resumo: hex=${findings.hex.length} transition-all=${findings.transitionAll.length} ` +
    `ease-in=${findings.easeIn.length} scale0=${findings.scaleZero.length} ` +
    `emoji=${findings.emoji.length} dist=${findings.dist.length} total=${total}`
);

if (total > 0) process.exitCode = 1;
