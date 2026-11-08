import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Depois do build, escreve em dist/sw.js a lista de arquivos do app e a versão (hash do conteúdo de todos eles). */
function precacheSw(): Plugin {
  let outDir = '';
  return {
    name: 'cerne-precache-sw',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const alvo = path.join(outDir, 'sw.js');
      if (!fs.existsSync(alvo)) return;
      const todos: string[] = [];
      const percorrer = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const cheio = path.join(dir, e.name);
          if (e.isDirectory()) percorrer(cheio);
          else todos.push(path.relative(outDir, cheio).split(path.sep).join('/'));
        }
      };
      percorrer(outDir);
      const conjunto = new Set(todos);
      const arquivos = todos
        .filter((f) => f !== 'sw.js' && f !== '404.html' && !f.endsWith('.map'))
        // todo navegador que roda o app lê woff2; o woff é só reserva e dobraria o precache das fontes
        .filter((f) => !(f.endsWith('.woff') && conjunto.has(f.replace(/\.woff$/, '.woff2'))))
        .sort();
      const hash = createHash('sha256');
      for (const f of arquivos) hash.update(f).update(fs.readFileSync(path.join(outDir, f)));
      const versao = hash.digest('hex').slice(0, 12);
      // '' é a própria raiz do escopo (/Cerne/), que serve o index.html
      const lista = JSON.stringify(['', ...arquivos]);
      const fonte = fs
        .readFileSync(alvo, 'utf8')
        .replace('__VERSAO__', versao)
        .replace(/\/\*ARQUIVOS\*\/ \[\] \/\*FIM\*\//, () => lista);
      fs.writeFileSync(alvo, fonte);
    },
  };
}

/**
 * Só no `vite preview`: o Vite devolve o index.html para qualquer rota que não exista em disco, enquanto o GitHub
 * Pages devolve o 404.html. Aqui a rota profunda cai no 404.html do build, para o preview se comportar como produção.
 * O que é publicado não muda; o build só copia o 404.html de `public/`.
 */
function previewComoPages(): Plugin {
  return {
    name: 'cerne-preview-pages',
    configurePreviewServer(servidor) {
      const saida = path.resolve(servidor.config.root, servidor.config.build.outDir);
      servidor.middlewares.use((req, res, seguir) => {
        if (req.method !== 'GET') return seguir();
        const caminho = new URL(req.url ?? '/', 'http://local').pathname;
        if (!caminho.startsWith(servidor.config.base)) return seguir();
        const rel = caminho.slice(servidor.config.base.length);
        const arquivo = path.resolve(saida, rel);
        if (!arquivo.startsWith(saida)) return seguir();
        const existe = rel === '' || rel.endsWith('/') || (fs.existsSync(arquivo) && fs.statSync(arquivo).isFile());
        if (existe) return seguir();
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(fs.readFileSync(path.join(saida, '404.html')));
      });
    },
  };
}

// Publicado em kessleru.github.io/Cerne (o caminho diferencia maiúsculas).
export default defineConfig({
  base: '/Cerne/',
  plugins: [react(), precacheSw(), previewComoPages()],
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
