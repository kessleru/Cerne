// Service worker do Cerne, escrito à mão. O build (plugin em vite.config.ts) troca VERSAO e ARQUIVOS em dist/sw.js;
// em desenvolvimento a lista fica vazia e o registro nem acontece (src/pwa.ts).
const VERSAO = '__VERSAO__';
const ARQUIVOS = /*ARQUIVOS*/ [] /*FIM*/; // caminhos relativos ao escopo; '' é a própria raiz
const CACHE_APP = `cerne-app-${VERSAO}`;
const CACHE_RAW = 'cerne-raw-v1';
const BASE = new URL(self.registration.scope).pathname; // '/Cerne/'
const ESPERA_REDE = 4000;
const RAW_COM_SHA = /^\/[^/]+\/[^/]+\/[0-9a-f]{40}\//i;

const noCache = new Set(ARQUIVOS.map((a) => BASE + a));

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_APP);
      // 'reload' ignora o cache HTTP: o precache guarda o que o servidor tem agora
      await cache.addAll(ARQUIVOS.map((a) => new Request(BASE + a, { cache: 'reload' })));
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) {
        if (nome.startsWith('cerne-app-') && nome !== CACHE_APP) await caches.delete(nome);
      }
      await self.clients.claim();
    })(),
  );
});

// a página pede a troca depois que a pessoa aceita "Recarregar"
self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.tipo === 'ativar') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || req.headers.has('Authorization')) return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      if (url.pathname.startsWith(BASE)) evento.respondWith(navegacao(req));
      return;
    }
    if (noCache.has(url.pathname) || url.pathname.startsWith(BASE + 'assets/')) evento.respondWith(estatico(req));
    return;
  }

  // api.github.com e qualquer outro destino: direto na rede. Do raw, só o que tem SHA no caminho (conteúdo imutável).
  if (url.hostname === 'raw.githubusercontent.com' && RAW_COM_SHA.test(url.pathname)) evento.respondWith(imutavel(req));
});

/** Rede primeiro; sem rede (ou rede lenta demais), o index.html do cache. Vale para qualquer rota do app. */
async function navegacao(req) {
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), ESPERA_REDE);
  try {
    return await fetch(req, { signal: controle.signal });
  } catch {
    const guardado = await caches.match(BASE + 'index.html', { cacheName: CACHE_APP });
    if (guardado) return guardado;
    throw new Error('Sem rede e sem index.html guardado.');
  } finally {
    clearTimeout(tempo);
  }
}

/** Arquivos do app têm hash no nome: cache primeiro; o que escapou do precache entra na primeira leitura. */
async function estatico(req) {
  const cache = await caches.open(CACHE_APP);
  const guardado = await cache.match(req, { ignoreSearch: true });
  if (guardado) return guardado;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

/** raw com SHA de 40 caracteres: nunca muda, então cache primeiro. Só respostas 200 com CORS ou mesma origem. */
async function imutavel(req) {
  const cache = await caches.open(CACHE_RAW);
  const guardado = await cache.match(req);
  if (guardado) return guardado;
  const res = await fetch(req);
  if (res.ok && res.type !== 'opaque') await cache.put(req, res.clone());
  return res;
}
