// Rust: exercícios, async, web, CLIs e a biblioteca padrão.
import { P, repos } from '../ajuda';

export default repos([
  {
    repo: 'rust-lang/rustlings', nota: 'Exercícios curtos guiados pelo compilador', nivel: 'iniciante', lang: 'Rust', temas: [], tipo: 'tutorial', start: 'exercises/01_variables/variables1.rs',
    guia: {
      sobre: 'Exercícios pequenos, um conceito de Rust por vez; você conserta o código até o compilador aceitar.',
      porque: 'O compilador do Rust é professor: as mensagens de erro ensinam. Aqui você aprende lendo e corrigindo.',
      antes: ['Rust instalado (rustup).', 'Ler os capítulos indicados do "The Rust Programming Language".'],
      comoLer: 'Instale com cargo install rustlings e rode rustlings no terminal. Use o Cerne para ler os exercícios e as dicas antes de resolver.',
      conceitos: ['ownership-rust', 'option-result', 'traits'],
      passos: [
        P('Variáveis', 'exercises/01_variables/variables1.rs', 'fn main', 'O primeiro erro: let e mutabilidade.'),
        P('Posse', 'exercises/06_move_semantics/move_semantics1.rs', 'fn main', 'O conceito que diferencia o Rust: quem é o dono do valor.'),
        P('Erros', 'exercises/13_error_handling/errors1.rs', 'fn generate_nametag_text', 'Result em vez de exceções.'),
      ],
      tempo: '20 minutos por exercício', depois: 'tokio-rs/mini-redis',
    },
  },
  {
    repo: 'tokio-rs/mini-redis', nota: 'Tokio explicado num Redis de estudo', nivel: 'intermediário', lang: 'Rust', temas: ['bancos', 'apis'], tipo: 'tutorial', api: ['RPC'], stack: ['Tokio'], start: 'src/server.rs',
    guia: {
      sobre: 'Uma implementação incompleta do Redis feita de propósito para ensinar Tokio (async em Rust).',
      porque: 'Código pensado para estudo, muito comentado: servidor, protocolo, estado compartilhado e desligamento elegante.',
      antes: ['Rust básico (rustlings ajuda).', 'async/await.'],
      comoLer: 'O tutorial oficial do Tokio constrói este projeto passo a passo; leia os dois juntos.',
      conceitos: ['async', 'hash', 'event-loop', 'ownership-rust'],
      passos: [
        P('Aceitar conexões', 'src/server.rs', 'pub async fn run', 'Uma tarefa por conexão e um limite de conexões.'),
        P('Uma conexão', 'src/server.rs', 'struct Handler', 'Lê comandos, executa e responde.'),
        P('O protocolo', 'src/frame.rs', 'pub enum Frame', 'O formato do Redis (RESP) como um enum.'),
        P('Ler do socket', 'src/connection.rs', 'pub async fn read_frame', 'Buffer, parse parcial e espera por mais bytes.'),
        P('Um comando', 'src/cmd/get.rs', 'pub struct Get', 'Parse, execução e resposta de um comando.'),
      ],
      tempo: '3 horas', depois: 'tokio-rs/axum',
    },
  },
  {
    repo: 'tokio-rs/axum', nota: 'API web com exemplos prontos', nivel: 'intermediário', lang: 'Rust', temas: ['apis'], tipo: 'framework', api: ['REST', 'WebSocket'], stack: ['Tokio', 'Tower', 'Hyper'], start: 'examples/todos/src/main.rs',
    guia: {
      sobre: 'Framework web do time do Tokio, construído sobre Tower e Hyper.',
      porque: 'A pasta examples é um curso: cada exemplo resolve um problema (banco, autenticação, WebSocket). E os extratores mostram traits a serviço de uma API agradável.',
      antes: ['Rust intermediário: traits e async.'],
      comoLer: 'Comece por um exemplo inteiro (todos). Depois descubra como um parâmetro de função como Json<T> vira dado: isso é o trait de extração.',
      conceitos: ['traits', 'middleware', 'roteamento', 'async'],
      passos: [
        P('Um app completo', 'examples/todos/src/main.rs', 'async fn todos_index', 'Rotas, estado compartilhado e JSON em poucas linhas.'),
        P('O roteador', 'axum/src/routing/mod.rs', 'pub struct Router', 'Rotas e serviços do Tower.'),
        P('Handlers', 'axum/src/handler/mod.rs', 'pub trait Handler', 'Como qualquer função async vira um handler.'),
        P('Extratores', 'axum-core/src/extract/mod.rs', 'pub trait FromRequestParts', 'Json, Path e State são implementações deste trait.'),
      ],
      tempo: '2 a 3 horas',
    },
  },
  {
    repo: 'sharkdp/bat', nota: 'CLI bem organizada', nivel: 'intermediário', lang: 'Rust', temas: ['cli'], tipo: 'ferramenta', start: 'src/bin/bat/main.rs',
    guia: {
      sobre: 'Um cat com destaque de sintaxe, números de linha e integração com o Git.',
      porque: 'Exemplo de CLI de produção em Rust: binário fino, biblioteca reutilizável e configuração em camadas.',
      antes: ['Rust básico.'],
      comoLer: 'Repare na separação: src/bin é só a casca (argumentos), e a lógica está na biblioteca em src.',
      conceitos: ['traits', 'composicao'],
      passos: [
        P('A casca', 'src/bin/bat/main.rs', 'fn main', 'Lê argumentos e configuração e chama a biblioteca.'),
        P('O controlador', 'src/controller.rs', 'pub struct Controller', 'Percorre as entradas e escolhe a impressora.'),
        P('Imprimir', 'src/printer.rs', 'pub(crate) struct InteractivePrinter', 'Destaque, números de linha e decorações.'),
      ],
      tempo: '2 horas', depois: 'BurntSushi/ripgrep',
    },
  },
  {
    repo: 'BurntSushi/ripgrep', nota: 'Busca rápida, código exemplar', nivel: 'avançado', lang: 'Rust', temas: ['cli'], tipo: 'ferramenta', start: 'crates/core/main.rs',
    guia: {
      sobre: 'Ferramenta de busca em arquivos, mais rápida que o grep, que respeita o .gitignore.',
      porque: 'Código de referência em Rust: dividido em crates reutilizáveis (busca, ignore, regex), cada uma bem documentada.',
      antes: ['Rust intermediário.'],
      comoLer: 'Veja primeiro a lista de crates na pasta crates: cada uma é uma biblioteca independente. main.rs só as conecta.',
      conceitos: ['traits', 'composicao', 'cache'],
      passos: [
        P('O começo', 'crates/core/main.rs', 'fn main', 'Lê argumentos e decide entre buscar em um ou vários threads.'),
        P('Buscar', 'crates/searcher/src/searcher/mod.rs', 'pub struct Searcher', 'Lê arquivos em blocos e acha as linhas.'),
        P('Andar pelas pastas', 'crates/ignore/src/walk.rs', 'pub struct WalkBuilder', 'Respeita .gitignore e anda em paralelo.'),
      ],
      tempo: '3 horas',
    },
  },
  {
    repo: 'rust-lang/rust', nota: 'Option e Result por dentro', nivel: 'avançado', lang: 'Rust', temas: ['algoritmos'], tipo: 'linguagem', start: 'library/core/src/option.rs', famoso: 'Linguagens',
    guia: {
      sobre: 'O compilador e a biblioteca padrão do Rust.',
      porque: 'A biblioteca padrão é uma das bases de código mais bem documentadas que existem: os comentários viram a documentação oficial.',
      antes: ['Rust básico.'],
      comoLer: 'Fique em library. Escolha um tipo que você usa (Option, Vec, Iterator) e leia a implementação junto dos exemplos dos comentários.',
      conceitos: ['option-result', 'traits', 'memoria-manual'],
      passos: [
        P('Option', 'library/core/src/option.rs', 'pub enum Option', 'Um enum de duas variantes e dezenas de métodos úteis.'),
        P('Result', 'library/core/src/result.rs', 'pub enum Result', 'Como o operador ? funciona por baixo.'),
        P('Vec', 'library/alloc/src/vec/mod.rs', 'pub struct Vec', 'Ponteiro, capacidade e tamanho: como um vetor cresce.'),
        P('Iterator', 'library/core/src/iter/traits/iterator.rs', 'trait Iterator {', 'Um método obrigatório (next) e o resto de graça.'),
      ],
      tempo: '2 a 3 horas',
    },
  },
  {
    repo: 'denoland/deno', nota: 'Runtime JS e TS seguro', nivel: 'avançado', lang: 'Rust', temas: [], tipo: 'linguagem', start: 'cli/main.rs', famoso: 'Linguagens',
    guia: {
      sobre: 'Runtime para JavaScript e TypeScript com permissões explícitas, escrito em Rust sobre o V8.',
      porque: 'Mostra como um runtime liga um motor de JS (V8) ao sistema por meio de "ops" em Rust.',
      antes: ['Rust intermediário.', 'Ter usado Node ou Deno.'],
      comoLer: 'Comece pelo binário (cli/main.rs) e siga até o ponto em que um script é executado.',
      conceitos: ['event-loop', 'async'],
      passos: [
        P('O binário', 'cli/main.rs', 'fn main', 'Lê o subcomando e escolhe o que fazer.'),
        P('Rodar um módulo', 'cli/tools/run/mod.rs', 'pub async fn run_script', 'Prepara o worker e executa o arquivo.'),
      ],
      tempo: '2 horas',
    },
  },
]);
