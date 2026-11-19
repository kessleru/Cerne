// Arquivo por onde começar a ler um projeto: o ponto de entrada mais provável (main, index, Application...).
// Usado pelo "Ver o código" da visão geral quando o catálogo não indica um.

// Em ordem de preferência. Cada padrão casa com o caminho inteiro; entre vários, ganha o mais raso.
const PADROES: RegExp[] = [
  // servidores e apps de linha de comando
  /(^|\/)cmd\/[^/]+\/main\.go$/,
  /(^|\/)main\.go$/,
  /(^|\/)src\/main\.rs$/,
  /(^|\/)src\/main\/(java|kotlin)\/.+Application\.(java|kt)$/,
  /(^|\/)src\/main\/(java|kotlin)\/.+\/Main\.(java|kt)$/,
  /(^|\/)Program\.cs$/,
  /(^|\/)src\/(main|server|index|app)\.(ts|js|mjs)$/,
  /(^|\/)(server|app|index|main)\.(ts|js|mjs)$/,
  /(^|\/)app\/main\.py$/,
  /(^|\/)(main|app|run|server)\.py$/,
  /(^|\/)manage\.py$/,
  /(^|\/)routes\/(api|web)\.php$/,
  /(^|\/)public\/index\.php$/,
  /(^|\/)config\/routes\.rb$/,
  /(^|\/)lib\/[^/]+_web\/router\.ex$/,
  // telas
  /(^|\/)lib\/main\.dart$/,
  /(^|\/)src\/App\.(tsx|jsx|vue|svelte)$/,
  /(^|\/)app\/(page|layout)\.(tsx|jsx)$/,
  /(^|\/)src\/app\/(page|layout)\.(tsx|jsx)$/,
  /(^|\/)pages\/index\.(tsx|jsx|vue)$/,
  /(^|\/)src\/main\.(tsx|jsx)$/,
  /(^|\/)src\/app\/app\.component\.ts$/,
  /(^|\/)App\.(tsx|jsx)$/,
  /(^|\/)app\/src\/main\/java\/.+MainActivity\.(kt|java)$/,
  /(^|\/)[^/]+App\.swift$/,
  // jogos, sistemas, dados
  /(^|\/)src\/main\.(c|cpp|cc|zig)$/,
  /(^|\/)main\.(c|cpp|cc|zig|lua|gd)$/,
  /(^|\/)project\.godot$/,
  /\.ipynb$/,
  /(^|\/)main\.tf$/,
];

const ignorar = /(^|\/)(node_modules|vendor|dist|build|target|\.next|test|tests|__tests__|examples?|docs?)\//;
const profundidade = (p: string) => p.split('/').length;

export function arquivoDeEntrada(paths: string[]): string | null {
  const candidatos = paths.filter((p) => !ignorar.test(p));
  for (const re of PADROES) {
    const achados = candidatos.filter((p) => re.test(p));
    if (achados.length) return achados.sort((a, b) => profundidade(a) - profundidade(b) || a.length - b.length)[0]!;
  }
  return null;
}
