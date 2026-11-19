// Escolhe claro ou escuro antes do app carregar, para não piscar o tema errado.
// Mesma regra de effectiveTheme (src/state/prefs.ts): Latte no claro; no escuro, o sabor escolhido.
(function () {
  var p = {};
  try {
    p = JSON.parse(localStorage.getItem('cerne:prefs') || '{}') || {};
  } catch (e) {
    p = {};
  }
  var ap = p.appearance || (p.theme === 'latte' ? 'light' : 'system');
  var sabor = p.theme && p.theme !== 'latte' ? p.theme : 'mocha';
  var escuro = ap === 'dark' || (ap === 'system' && !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches));
  var raiz = document.documentElement;
  raiz.setAttribute('data-theme', escuro ? sabor : 'latte');
  raiz.style.colorScheme = escuro ? 'dark' : 'light';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', escuro ? 'rgb(30 30 46)' : 'rgb(245 243 238)');
})();
