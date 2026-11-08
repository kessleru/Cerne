// Desfaz a troca feita por 404.html: /Cerne/?/dono/repo/blob/main/x.ts volta a ser /Cerne/dono/repo/blob/main/x.ts.
// Arquivo à parte porque a CSP do index.html (script-src 'self') não aceita script inline.
(function (l) {
  if (l.search[1] === '/') {
    var decodificado = l.search
      .slice(1)
      .split('&')
      .map(function (s) {
        return s.replace(/~and~/g, '&');
      })
      .join('?');
    window.history.replaceState(null, '', l.pathname.slice(0, -1) + decodificado + l.hash);
  }
})(window.location);
