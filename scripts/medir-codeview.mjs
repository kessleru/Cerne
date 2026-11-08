// Mede o CodeView no navegador com o arquivo de 50 000 linhas (sem dependências, Chrome por CDP).
// Uso: npm run build && node scripts/medir-codeview.mjs
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORTA_SITE = 4175;
const PORTA_CDP = 9344;
const BASE = `http://localhost:${PORTA_SITE}/Cerne`;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = [];
const matar = (p) => p?.pid && spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });

async function ate(fn, ms = 15000, passo = 100) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const v = await fn();
    if (v) return v;
    await esperar(passo);
  }
  throw new Error('tempo esgotado');
}

const perfil = mkdtempSync(join(tmpdir(), 'cerne-chrome-'));
try {
  const site = spawn('npx', ['vite', 'preview', '--port', String(PORTA_SITE), '--strictPort'], { shell: true, stdio: 'ignore', windowsHide: true });
  procs.push(site);
  await ate(async () => (await fetch(`${BASE}/`).catch(() => null))?.ok);

  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`, '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  procs.push(chrome);
  const abas = await ate(async () => (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/list`).then((r) => r.json()).catch(() => null)));
  const ws = new WebSocket(abas.find((a) => a.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pend = new Map();
  const erros = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) {
      const { res, rej } = pend.get(m.id);
      pend.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') erros.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url ?? ''));
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const avaliar = async (expressao) => {
    const r = await send('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  const resultado = {};

  // 1) entrada
  await send('Page.navigate', { url: `${BASE}/` });
  await ate(() => avaliar(`!!document.querySelector('.ks-entry__field')`));
  resultado.entradaOk = true;

  // 2) abre o repositório pelo link do arquivo de 50 000 linhas, direto pelo endereço
  const url = `${BASE}/kessleru/exemplo/blob/main/src%2Fgenerated%2Fenorme.ts`;
  await send('Page.navigate', { url: `${BASE}/kessleru/exemplo/blob/main/src/generated/enorme.ts` });
  await ate(() => avaliar(`document.querySelectorAll('.ks-line').length > 0`), 30000);
  await esperar(1500);
  resultado.primeiraTela = await avaliar(`(() => {
    const m = performance.getEntriesByName('cerne:primeira-tela')[0];
    const pintado = performance.getEntriesByName('cerne:pintado')[0];
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      abrirArquivoAtePintar_ms: m ? Math.round(m.duration) : null,
      navegacaoAtePintar_ms: pintado ? Math.round(pintado.startTime) : null,
      domContentLoaded_ms: Math.round(nav.domContentLoadedEventEnd),
    };
  })()`);
  const contar = `(() => {
    const box = document.querySelector('.ks-codeview');
    return { ksLine: document.querySelectorAll('.ks-line').length, linhasNoArquivo: Number(box.dataset.lines), colorido: document.querySelectorAll('.ks-line [class^="tok-"]').length };
  })()`;
  resultado.noInicio = await avaliar(contar);

  // 3) rola ao meio e ao fim
  const rolar = (frac) => avaliar(`(async () => {
    const box = document.querySelector('.ks-codeview');
    box.scrollTop = (box.scrollHeight - box.clientHeight) * ${frac};
    await new Promise((r) => setTimeout(r, 900));
    return ${contar.trim()}
  })()`);
  resultado.noMeio = await rolar(0.5);
  resultado.noFim = await rolar(1);
  resultado.rolagemRapida = await avaliar(`(async () => {
    const box = document.querySelector('.ks-codeview');
    let max = 0;
    for (let k = 0; k <= 20; k++) {
      box.scrollTop = (box.scrollHeight - box.clientHeight) * (k / 20);
      await new Promise((r) => requestAnimationFrame(r));
      max = Math.max(max, document.querySelectorAll('.ks-line').length);
    }
    return { maxKsLineDuranteARolagem: max };
  })()`);

  // 4) dobra: clica no primeiro chevron do topo e confere que o total de linhas visíveis diminui
  await avaliar(`document.querySelector('.ks-codeview').scrollTop = 0`);
  await esperar(500);
  resultado.dobra = await avaliar(`(async () => {
    const box = document.querySelector('.ks-codeview');
    const antes = box.scrollHeight;
    const ch = [...document.querySelectorAll('.ks-line__fold[aria-expanded="true"]')][0];
    if (!ch) return { achou: false };
    ch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 300));
    return { achou: true, alturaAntes: Math.round(antes), alturaDepois: Math.round(box.scrollHeight), ghost: !!document.querySelector('.ks-fold-ghost') };
  })()`);

  // 5) seleção por número e endereço
  resultado.selecao = await avaliar(`(async () => {
    const n = document.querySelector('.ks-line__no');
    n.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 200));
    return { hash: location.hash, selecionadas: document.querySelectorAll('.ks-line.is-selected').length };
  })()`);

  // 6) link com seleção e ir à linha (carregando direto; about:blank antes para recarregar de verdade)
  await send('Page.navigate', { url: 'about:blank' });
  await esperar(300);
  await send('Page.navigate', { url: `${BASE}/kessleru/exemplo/blob/main/src/generated/enorme.ts#L25000-L25004` });
  await ate(() => avaliar(`document.querySelectorAll('.ks-line.is-selected').length > 0`), 20000);
  await esperar(1200);
  resultado.linkComSelecao = await avaliar(`(() => {
    const sel = [...document.querySelectorAll('.ks-line.is-selected')].map((l) => l.dataset.line);
    const box = document.querySelector('.ks-codeview');
    const p = performance.getEntriesByName('cerne:pintado')[0];
    const g = performance.getEntriesByType('resource').find((r) => /gsap/.test(r.name));
    return { selecionadas: sel, ksLine: document.querySelectorAll('.ks-line').length, scrollTop: Math.round(box.scrollTop), primeiraPintura_ms: p ? Math.round(p.startTime) : null, gsapPedidoEm_ms: g ? Math.round(g.startTime) : null, gsapDepoisDaPintura: !!p && !!g && g.startTime >= p.startTime };
  })()`);

  // 6b) passeio pela interface: entrada, árvore, abas, visualizadores, paleta, preferências, busca, diff, histórico, estados
  const tecla = (key, extra = {}) => avaliar(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true, ...${JSON.stringify(extra)} }))`);
  const digitar = (sel, texto) => avaliar(`(() => { const i = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(texto)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  const clicar = (sel) => avaliar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const existe = (sel, ms = 5000) => ate(() => avaliar(`!!document.querySelector(${JSON.stringify(sel)})`), ms).then(() => true, () => false);
  const passeio = {};
  await send('Page.navigate', { url: 'about:blank' });
  await esperar(300);
  await send('Page.navigate', { url: `${BASE}/` });
  await existe('.ks-entry__item');
  await clicar('.ks-entry__item');
  passeio.arvore = await avaliar(`(async () => { await new Promise((r) => setTimeout(r, 1500)); return document.querySelectorAll('.ks-tree__row').length; })()`);
  await clicar('[data-path="README.md"]');
  passeio.markdown = await existe('.ks-markdown h1');
  passeio.markdownSemScript = await avaliar(`!document.querySelector('.ks-markdown script') && !document.querySelector('.ks-markdown a[href^="javascript"]')`);
  await tecla('k', { ctrlKey: true });
  passeio.paleta = await existe('.ks-palette');
  await digitar('.ks-palette input', 'cupons');
  await esperar(300);
  await avaliar(`document.querySelector('.ks-palette__input input')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
  passeio.csv = await existe('.ks-table tbody tr');
  await tecla('k', { ctrlKey: true });
  await digitar('.ks-palette input', 'package.json');
  await esperar(300);
  await avaliar(`document.querySelector('.ks-palette__input input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
  passeio.json = await existe('.ks-json [role=treeitem]');
  await tecla('k', { ctrlKey: true });
  await digitar('.ks-palette input', 'lib/api.ts');
  await esperar(300);
  await avaliar(`document.querySelector('.ks-palette__input input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
  passeio.codigo = await existe('.ks-line');
  await esperar(1000);
  passeio.destaque = await avaliar(`document.querySelectorAll('.ks-line [class^="tok-"]').length`);
  await tecla('f', { ctrlKey: true });
  passeio.busca = await existe('.ks-findbar');
  await digitar('.ks-findbar input', 'export');
  await esperar(300);
  passeio.achados = await avaliar(`document.querySelectorAll('.ks-find').length`);
  await avaliar(`document.querySelector('.ks-findbar input')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await avaliar(`document.querySelector('.ks-line__no')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`);
  passeio.aposBusca = await avaliar(`({ linhas: document.querySelectorAll('.ks-line').length, corpo: document.querySelector('.ks-pane__body')?.innerHTML.slice(0, 200), root: document.getElementById('root').children.length })`);
  await tecla('i', { altKey: true });
  passeio.trecho = await existe('.ks-snip');
  await clicar('.ks-snip__head button');
  await tecla('d', { altKey: true });
  passeio.diff = await existe('.ks-diff__cell.is-add');
  await tecla('h', { altKey: true });
  passeio.historico = await existe('.ks-commits__item');
  await tecla(String.fromCharCode(92), { ctrlKey: true });
  passeio.duasColunas = await existe('.ks-pane--second .ks-filepane, .ks-pane--second .ks-panestate');
  await tecla(String.fromCharCode(92), { ctrlKey: true });
  await tecla('l', { altKey: true });
  await esperar(500);
  passeio.copiarLink = await avaliar(`!!document.querySelector('.ks-toast')`);
  passeio.gsapDepoisDaPrimeiraTela = await avaliar(`(() => { const p = performance.getEntriesByName('cerne:pintado')[0]; const g = performance.getEntriesByType('resource').find((r) => /gsap/.test(r.name)); return { pintado_ms: p ? Math.round(p.startTime) : null, gsapRequisitadoEm_ms: g ? Math.round(g.startTime) : null }; })()`);
  await tecla(',', { ctrlKey: true });
  passeio.preferencias = await existe('.ks-prefs');
  await avaliar(`[...document.querySelectorAll('.ks-theme__themes button')].find((b) => b.textContent === 'Latte').click()`);
  await esperar(900);
  passeio.temaLatte = await avaliar(`document.documentElement.dataset.theme`);
  await avaliar(`[...document.querySelectorAll('.ks-theme__accents button')][6].click()`);
  await esperar(900);
  passeio.acento = await avaliar(`document.documentElement.style.getPropertyValue('--ctp-accent')`);
  await avaliar(`document.querySelector('.ks-prefs input[role=switch][aria-label="Alto contraste"]').click()`);
  passeio.altoContraste = await avaliar(`document.documentElement.dataset.contrast`);
  await avaliar(`document.querySelector('.ks-prefs__head button').click()`);
  await tecla('k', { ctrlKey: true });
  await digitar('.ks-palette input', '>Demonstrar estado: erro');
  await esperar(300);
  await avaliar(`document.querySelector('.ks-palette__input input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
  passeio.estadoErro = await existe('.ks-panestate.is-error');
  await send('Emulation.setDeviceMetricsOverride', { width: 600, height: 900, deviceScaleFactor: 1, mobile: true });
  await esperar(500);
  passeio.celularGaveta = await avaliar(`!!document.querySelector('.ks-pane--side.is-drawer') && !document.querySelector('.ks-splitter')`);
  resultado.passeio = passeio;

  // 7) fonte: nada de rede externa
  resultado.requisicoesExternas = await avaliar(`performance.getEntriesByType('resource').map((r) => r.name).filter((n) => !n.startsWith(location.origin))`);
  resultado.errosNoConsole = erros;

  console.log(JSON.stringify(resultado, null, 2));
  void url;
  ws.close();
} finally {
  for (const p of procs) matar(p);
  await esperar(800);
  try { rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* perfil temporário */ }
}
