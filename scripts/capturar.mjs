// Capturas de tela do Cerne a 1440x900 em %TEMP%/cerne-shots (sem dependências, Chrome por CDP).
// Uso: npm run build && node scripts/capturar.mjs [nome ...]   (sem nomes, faz todas)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA_SITE = 4177;
const PORTA_CDP = 9366;
const BASE = `http://localhost:${PORTA_SITE}/Cerne`;
const SAIDA = join(tmpdir(), 'cerne-shots');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = [];
const matar = (p) => p?.pid && spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
const querem = new Set(process.argv.slice(2));
const quer = (n) => querem.size === 0 || querem.has(n);

mkdirSync(SAIDA, { recursive: true });
const perfil = mkdtempSync(join(tmpdir(), 'cerne-cap-'));

async function ate(fn, ms = 15000, passo = 100) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const v = await fn();
    if (v) return v;
    await esperar(passo);
  }
  throw new Error('tempo esgotado');
}

try {
  const site = spawn('npx', ['vite', 'preview', '--port', String(PORTA_SITE), '--strictPort'], { shell: true, stdio: 'ignore', windowsHide: true });
  procs.push(site);
  await ate(async () => (await fetch(`${BASE}/`).catch(() => null))?.ok);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`, '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  procs.push(chrome);
  const versao = await ate(() => fetch(`http://127.0.0.1:${PORTA_CDP}/json/version`).then((r) => r.json()).catch(() => null));
  const abas = await fetch(`http://127.0.0.1:${PORTA_CDP}/json/list`).then((r) => r.json());
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
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expressao) => {
    const r = await send('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const existe = (sel, ms = 8000) => ate(() => ev(`!!document.querySelector(${JSON.stringify(sel)})`), ms).then(() => true, () => false);
  const tecla = (key, extra = {}) => ev(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true, ...${JSON.stringify(extra)} }))`);
  const digitar = (sel, texto) => ev(`(() => { const i = document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(texto)}); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const clicar = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const shot = async (nome) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SAIDA, nome + '.png'), Buffer.from(r.data, 'base64'));
    console.log('capturada', nome);
  };
  const ir = async (url, prefs) => {
    await send('Page.navigate', { url: 'about:blank' });
    await esperar(200);
    // preferências e abas são lidas do localStorage antes do app subir
    await send('Page.navigate', { url: `${BASE}/` });
    await existe('#root *');
    await ev(`localStorage.clear(); sessionStorage.clear(); ${prefs ? `localStorage.setItem('cerne:prefs', ${JSON.stringify(JSON.stringify(prefs))});` : ''} sessionStorage.setItem('cerne:intro', '1'); sessionStorage.setItem('cerne:leitura', '1'); true`);
    await send('Page.navigate', { url: 'about:blank' });
    await esperar(200);
    await send('Page.navigate', { url });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  if (quer('entrada') || quer('entrada-digitando')) {
    await send('Page.navigate', { url: 'about:blank' });
    await esperar(200);
    await send('Page.navigate', { url: `${BASE}/` });
    await existe('.ks-entry__input');
    await ev(`localStorage.clear(); sessionStorage.clear(); true`);
    await send('Page.navigate', { url: 'about:blank' });
    await esperar(200);
    await send('Page.navigate', { url: `${BASE}/` });
    await existe('.ks-entry__input');
    await esperar(1500);
    if (quer('entrada')) await shot('entrada');
    if (quer('entrada-digitando')) {
      await digitar('.ks-entry__input', 'github.com/kessleru/exemplo/blob/main/src/pages/Home.tsx#L3-L5');
      await esperar(400);
      await shot('entrada-digitando');
    }
  }

  const ARQ = `${BASE}/kessleru/exemplo/blob/main/src/pages/Home.tsx#L3-L5`;
  if (quer('app') || quer('carregando') || quer('prefs') || quer('trecho') || quer('menu') || quer('tooltip') || quer('trecho-exportado')) {
    await ir(ARQ);
    await existe('.ks-line');
    await esperar(1800);
    if (quer('app')) await shot('app');
    if (quer('tooltip')) {
      const box = await ev(`(() => { const r = document.querySelector('.ks-appbar__actions .ks-icon-btn[aria-label="Imagem do trecho"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x - 20, y: box.y });
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      await esperar(900);
      await shot('tooltip');
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 500 });
    }
    if (quer('menu')) {
      await clicar('.ks-appbar__ref');
      await existe('.ks-refpicker');
      await esperar(400);
      await shot('menu');
      await tecla('Escape');
      await ev(`document.querySelector('.ks-refpicker')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await esperar(300);
    }
    if (quer('carregando')) {
      await tecla('k', { ctrlKey: true });
      await existe('.ks-palette');
      await digitar('.ks-palette input', '>Demonstrar estado: carregando');
      await esperar(300);
      await ev(`document.querySelector('.ks-palette__input input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
      await existe('.ks-commitloader');
      await esperar(700);
      await shot('carregando');
      await esperar(2600);
    }
    if (quer('prefs')) {
      await tecla(',', { ctrlKey: true });
      await existe('.ks-prefs');
      await esperar(900);
      await shot('prefs');
      await ev(`document.querySelector('.ks-prefs__head button').click()`);
      await esperar(300);
    }
    if (quer('trecho') || quer('trecho-exportado')) {
      await ev(`document.querySelector('.ks-line.is-selected') ? true : (document.querySelector('.ks-line__no').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })), true)`);
      await tecla('i', { altKey: true });
      await existe('.ks-snip');
      await ate(() => ev(`!document.querySelector('.ks-snip__actions button').disabled`), 8000);
      await esperar(900);
      if (quer('trecho')) await shot('trecho');
      if (quer('trecho-exportado')) {
        const antes = new Set(readdirSync(SAIDA));
        await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: SAIDA }).catch(() => send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: SAIDA }));
        await ev(`[...document.querySelectorAll('.ks-snip__actions button')].find((b) => b.textContent === 'Baixar PNG').click()`);
        const novo = await ate(() => readdirSync(SAIDA).find((f) => !antes.has(f) && f.endsWith('.png')), 8000);
        const destino = join(SAIDA, 'trecho-exportado.png');
        if (existsSync(destino)) rmSync(destino);
        await esperar(300);
        renameSync(join(SAIDA, novo), destino);
        console.log('exportada', destino);
        await ev(`[...document.querySelectorAll('.ks-snip__actions button')].find((b) => b.textContent === 'Baixar SVG').click()`);
        await esperar(800);
      }
    }
  }

  for (const [nome, scope, theme] of [['tema-claro-area', 'workspace', 'github-light'], ['tema-claro-tudo', 'all', 'github-light']]) {
    if (!quer(nome)) continue;
    await ir(ARQ, { theme: 'mocha', accent: 'green', editorTheme: theme, editorScope: scope });
    await existe('.ks-line');
    await esperar(2200);
    await shot(nome);
  }

  if (quer('vazio')) {
    await ir(`${BASE}/kessleru/exemplo`);
    await existe('.ks-emptypane');
    await esperar(1200);
    await shot('vazio');
  }

  if (quer('entrada-celular')) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
    await ir(`${BASE}/`);
    await existe('.ks-entry__input');
    await esperar(1200);
    await shot('entrada-celular');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  }

  // a prévia do cartão e o resultado aplicado vêm das mesmas cores: confere
  if (quer('conferir-tema')) {
    const resultados = [];
    for (const [theme, scope] of [['github-light', 'workspace'], ['dracula', 'workspace'], ['catppuccin-latte', 'all']]) {
      await ir(ARQ, { theme: 'mocha', accent: 'green', editorTheme: theme, editorScope: scope });
      await existe('.ks-line');
      await esperar(1800);
      await tecla(',', { ctrlKey: true });
      await existe('.ks-themecard[aria-pressed="true"]');
      await esperar(1200);
      resultados.push({ theme, scope, ...(await ev(`(() => {
        const card = document.querySelector('.ks-themecard[aria-pressed="true"] .ks-themecard__preview');
        const cs = (el, p) => getComputedStyle(el)[p];
        const code = document.querySelector('.ks-codeview');
        const scopeEl = ${JSON.stringify(scope)} === 'all' ? document.documentElement : document.querySelector('.ks-panes');
        const mantle = getComputedStyle(scopeEl).getPropertyValue('--ctp-mantle').trim();
        const probe = document.createElement('i'); probe.style.color = mantle; document.body.appendChild(probe);
        const mantleRgb = getComputedStyle(probe).color; probe.remove();
        const kw = [...document.querySelectorAll('.ks-line span')].find((e) => e.style.color);
        const cardKw = [...card.querySelectorAll('span')].find((e) => e.style.color && e.textContent === 'const');
        const codeKw = [...document.querySelectorAll('.ks-line span')].find((e) => e.textContent === 'export');
        return {
          fundoDoCartao: cs(card, 'backgroundColor'),
          fundoDoCodigo: cs(code, 'backgroundColor'),
          ctpMantleNoEscopo: mantleRgb,
          iguais: cs(card, 'backgroundColor') === cs(code, 'backgroundColor') && cs(code, 'backgroundColor') === mantleRgb,
          corKeywordCartao: cardKw ? cardKw.style.color : null,
          corKeywordCodigo: codeKw ? codeKw.style.color : (kw ? kw.style.color : null),
        };
      })()`)) });
    }
    console.log(JSON.stringify(resultados, null, 1));
  }

  // importar um tema .json, exportar as preferências e guardar um token
  if (quer('importar')) {
    const arq = join(perfil, 'meu-tema.json');
    writeFileSync(arq, JSON.stringify({ name: 'Meu Tema', type: 'dark', colors: { 'editor.background': '#101820', 'editor.foreground': '#e0e6ee', 'sideBar.background': '#0b1118', 'editorLineNumber.foreground': '#5b6b7b' }, tokenColors: [{ scope: ['keyword'], settings: { foreground: '#ff7a59' } }, { scope: ['string'], settings: { foreground: '#8bd49c' } }] }));
    await ir(ARQ);
    await existe('.ks-line');
    await esperar(1200);
    await tecla(',', { ctrlKey: true });
    await existe('.ks-prefs');
    const obj = await send('Runtime.evaluate', { expression: `document.querySelector('.ks-prefs input[type=file]')` });
    await send('DOM.enable');
    await send('DOM.setFileInputFiles', { files: [arq], objectId: obj.result.objectId });
    await existe('.ks-themecard[aria-pressed="true"]');
    await esperar(1800);
    const imp = await ev(`(() => ({
      cartaoImportado: [...document.querySelectorAll('.ks-themecard__name')].some((n) => n.textContent.startsWith('Meu Tema')),
      temaAtual: JSON.parse(localStorage.getItem('cerne:prefs')).editorTheme,
      fundoAplicado: getComputedStyle(document.querySelector('.ks-panes')).getPropertyValue('--ctp-mantle').trim(),
      fundoDoCodigo: getComputedStyle(document.querySelector('.ks-codeview')).backgroundColor,
    }))()`);
    await shot('importado');
    // exportar
    const antes = new Set(readdirSync(SAIDA));
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: SAIDA }).catch(() => send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: SAIDA }));
    await ev(`[...document.querySelectorAll('.ks-prefs button')].find((b) => b.textContent === 'Exportar').click()`);
    const novo = await ate(() => readdirSync(SAIDA).find((f) => !antes.has(f) && f.endsWith('.json')), 8000);
    const conteudo = JSON.parse((await import('node:fs')).readFileSync(join(SAIDA, novo), 'utf8'));
    const exp = { arquivo: novo, cerne: conteudo.cerne, editorScope: conteudo.prefs.editorScope, editorTheme: conteudo.prefs.editorTheme, temasImportados: conteudo.temasImportados.length };
    rmSync(join(SAIDA, novo));
    // token: sessão
    await digitar('.ks-token input', 'ghp_exemplo_falso_123');
    await ev(`[...document.querySelectorAll('.ks-prefs button')].find((b) => b.textContent === 'Salvar').click()`);
    await esperar(300);
    const tok = await ev(`({ sessao: !!sessionStorage.getItem('cerne:token'), local: !!localStorage.getItem('cerne:token'), naExportacao: JSON.stringify(localStorage).includes('ghp_') && !!localStorage.getItem('cerne:token') })`);
    console.log(JSON.stringify({ imp, exp, tok }, null, 1));
  }

  console.log(JSON.stringify({ errosNoConsole: erros }));
  ws.close();
  void versao;
} finally {
  for (const p of procs) matar(p);
  await esperar(800);
  try { rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* perfil temporário */ }
}
