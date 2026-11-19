// Go: testes, CLIs, HTTP, bancos, consenso e infraestrutura.
import { P, repos } from '../ajuda';

export default repos([
  {
    repo: 'quii/learn-go-with-tests', nota: 'Go aprendendo por testes', nivel: 'iniciante', lang: 'Go', temas: [], tipo: 'tutorial', start: 'hello-world/v1/hello.go',
    guia: {
      sobre: 'Um livro aberto que ensina Go escrevendo o teste primeiro, capítulo por capítulo, com o código de cada versão.',
      porque: 'Ensina a linguagem e o hábito de testar ao mesmo tempo. Cada pasta vN mostra o código evoluindo, um passo por vez.',
      antes: ['Lógica de programação em qualquer linguagem.', 'Go instalado para rodar go test.'],
      comoLer: 'Leia o capítulo em Markdown e compare as versões v1, v2, v3 da pasta correspondente: a diferença entre elas é a lição.',
      conceitos: ['tdd', 'testes', 'interfaces'],
      passos: [
        P('O capítulo', 'hello-world.md', undefined, 'Leia o texto primeiro: ele explica o ciclo teste, código, refatoração.'),
        P('A primeira versão', 'hello-world/v1/hello.go', 'func main', 'O programa mais simples possível.'),
        P('O primeiro teste', 'hello-world/v2/hello_test.go', 'func TestHello', 'O teste vem antes da função de verdade.'),
        P('Evoluindo', 'hello-world/v8/hello.go', 'func Hello', 'Oito versões depois: o mesmo código, com idiomas e constantes.'),
      ],
      tempo: 'um capítulo por dia', depois: 'spf13/cobra',
    },
  },
  {
    repo: 'spf13/cobra', nota: 'A base de CLIs como o kubectl', nivel: 'intermediário', lang: 'Go', temas: ['cli'], tipo: 'biblioteca', start: 'command.go',
    guia: {
      sobre: 'Biblioteca de linha de comando usada por kubectl, Hugo e GitHub CLI.',
      porque: 'Mostra como uma struct bem desenhada (Command) cobre subcomandos, flags, ajuda e autocompletar.',
      antes: ['Go básico: structs e métodos.'],
      comoLer: 'Compare com o Click do Python: a ideia é a mesma (comandos em árvore), mas sem decoradores, só structs.',
      conceitos: ['composicao', 'arvore-b', 'interfaces'],
      passos: [
        P('O comando', 'command.go', 'type Command struct', 'Os campos dizem tudo: Use, Short, Run, comandos filhos e flags.'),
        P('Executar', 'command.go', 'func (c *Command) Execute', 'O ponto de entrada de todo CLI feito com Cobra.'),
        P('Achar o subcomando', 'command.go', 'func (c *Command) Find', 'Percorre a árvore pelos argumentos.'),
        P('Validar argumentos', 'args.go', 'func ExactArgs', 'Validadores são só funções.'),
      ],
      tempo: '1 a 2 horas', depois: 'charmbracelet/bubbletea',
    },
  },
  {
    repo: 'go-chi/chi', nota: 'Roteador idiomático, sem mágica', nivel: 'intermediário', lang: 'Go', temas: ['apis'], tipo: 'biblioteca', api: ['REST'], stack: ['net/http'], start: 'mux.go',
    guia: {
      sobre: 'Roteador HTTP leve, 100% compatível com o net/http da biblioteca padrão.',
      porque: 'Mostra como estender a stdlib sem substituí-la: tudo é http.Handler, inclusive os middlewares.',
      antes: ['Go básico.', 'O que é http.Handler (vale ler a interface na stdlib).'],
      comoLer: 'Leia junto do net/http da stdlib: chi só organiza handlers numa árvore de rotas.',
      conceitos: ['roteamento', 'middleware', 'interfaces'],
      passos: [
        P('O roteador', 'mux.go', 'type Mux struct', 'Um http.Handler que guarda a árvore e os middlewares.'),
        P('Atender', 'mux.go', 'func (mx *Mux) ServeHTTP', 'Monta a pilha de middlewares e procura a rota.'),
        P('A árvore', 'tree.go', 'type node struct', 'Uma árvore de prefixos com parâmetros e curingas.'),
        P('Um middleware', 'middleware/logger.go', 'func Logger', 'Um middleware é func(http.Handler) http.Handler.'),
      ],
      tempo: '2 horas', depois: 'gin-gonic/gin',
    },
  },
  {
    repo: 'gin-gonic/gin', nota: 'HTTP rápido e direto', nivel: 'intermediário', lang: 'Go', temas: ['apis'], tipo: 'framework', api: ['REST'], stack: ['net/http'], start: 'gin.go',
    guia: {
      sobre: 'Framework web em Go focado em desempenho.',
      porque: 'Compare com o chi: aqui há um Context próprio e reaproveitado entre requisições para gastar menos memória.',
      antes: ['Go básico.', 'Ter lido o chi ajuda a ver as escolhas diferentes.'],
      comoLer: 'Siga uma requisição: ServeHTTP pega um Context do pool, procura a rota e roda os handlers em sequência com Next.',
      conceitos: ['roteamento', 'middleware', 'rest'],
      passos: [
        P('O motor', 'gin.go', 'type Engine struct', 'Rotas, middlewares globais e um pool de Contexts.'),
        P('Atender', 'gin.go', 'func (engine *Engine) ServeHTTP', 'Pega um Context reaproveitado e despacha.'),
        P('A cadeia', 'context.go', 'func (c *Context) Next', 'Middlewares em fila, controlados por um índice.'),
        P('Responder JSON', 'context.go', 'func (c *Context) JSON', 'Uma resposta é um "render" com tipo de conteúdo.'),
      ],
      tempo: '2 horas', depois: 'tokio-rs/axum',
    },
  },
  {
    repo: 'charmbracelet/bubbletea', nota: 'Interfaces de terminal no estilo Elm', nivel: 'intermediário', lang: 'Go', temas: ['cli'], tipo: 'framework', start: 'tea.go',
    guia: {
      sobre: 'Framework para interfaces de terminal (TUIs) na arquitetura Elm: modelo, atualização e visão.',
      porque: 'Ensina uma arquitetura que serve para qualquer interface: estado imutável, mensagens e uma função que desenha.',
      antes: ['Go básico.', 'Interfaces em Go.'],
      comoLer: 'Rode um exemplo da pasta examples e leia o código dele primeiro. Depois veja em tea.go como o laço de eventos entrega mensagens ao seu Update.',
      conceitos: ['event-loop', 'imutabilidade', 'interfaces'],
      passos: [
        P('O contrato', 'tea.go', 'type Model interface', 'Init, Update e View: o seu programa inteiro são essas três funções.'),
        P('Rodar', 'tea.go', 'func (p *Program) Run', 'Prepara o terminal e começa o laço.'),
        P('O laço de eventos', 'tea.go', 'func (p *Program) eventLoop', 'Mensagens chegam, Update devolve o novo modelo, View redesenha.'),
      ],
      tempo: '1 a 2 horas',
    },
  },
  {
    repo: 'golang/go', nota: 'A stdlib, o Go mais bem escrito', nivel: 'avançado', lang: 'Go', temas: ['apis'], tipo: 'linguagem', api: ['REST'], start: 'src/net/http/server.go', famoso: 'Linguagens',
    guia: {
      sobre: 'A linguagem Go: compilador, runtime e biblioteca padrão, quase tudo em Go.',
      porque: 'A biblioteca padrão é considerada o melhor Go já escrito: bem comentada, simples e consistente.',
      antes: ['Go básico.'],
      comoLer: 'Fique na pasta src e escolha um pacote que você já usa. A documentação oficial (pkg.go.dev) tem link direto para cada função aqui.',
      conceitos: ['interfaces', 'goroutines', 'http'],
      passos: [
        P('Handler', 'src/net/http/server.go', 'type Handler interface', 'Uma interface de um método só sustenta toda a web em Go.'),
        P('Servir', 'src/net/http/server.go', 'func (s *Server) Serve(', 'Aceita conexões e cria uma goroutine para cada uma.'),
        P('O roteador da stdlib', 'src/net/http/server.go', 'func (mux *ServeMux) ServeHTTP', 'Desde o Go 1.22, com métodos e parâmetros no caminho.'),
        P('Mutex', 'src/sync/mutex.go', 'func (m *Mutex) Lock', 'O caminho rápido e o lento, e o modo de fome.'),
      ],
      tempo: '2 a 3 horas',
    },
  },
  {
    repo: 'etcd-io/bbolt', nota: 'Chave-valor com B+tree em Go', nivel: 'intermediário', lang: 'Go', temas: ['bancos'], tipo: 'biblioteca', start: 'db.go',
    guia: {
      sobre: 'Banco chave-valor embutido, num arquivo só, usado pelo etcd.',
      porque: 'Um banco completo e pequeno: páginas, árvore B+, transações e mapeamento do arquivo na memória.',
      antes: ['Go intermediário.', 'A ideia de árvore B.'],
      comoLer: 'Comece pelo README (os exemplos de uso) e depois leia db.go, tx.go e bucket.go nessa ordem.',
      conceitos: ['arvore-b', 'mvcc', 'cache'],
      passos: [
        P('Abrir', 'db.go', 'func Open', 'O arquivo é mapeado na memória (mmap).'),
        P('Transações', 'tx.go', 'func (tx *Tx) Commit', 'Grava páginas novas e troca o ponteiro raiz: nada é sobrescrito.'),
        P('Buckets', 'bucket.go', 'type Bucket struct', 'Uma árvore B+ por bucket.'),
        P('Cursor', 'cursor.go', 'type Cursor struct', 'Percorrer chaves em ordem.'),
      ],
      tempo: '3 horas', depois: 'cstack/db_tutorial',
    },
  },
  {
    repo: 'etcd-io/raft', nota: 'Consenso Raft legível', nivel: 'avançado', lang: 'Go', temas: ['infra'], tipo: 'biblioteca', start: 'raft.go',
    guia: {
      sobre: 'A biblioteca de consenso Raft do etcd, usada também por Kubernetes e CockroachDB.',
      porque: 'Raft é o algoritmo de consenso pensado para ser entendido; esta implementação é a mais usada e separa bem o algoritmo da rede e do disco.',
      antes: ['Ler o artigo "In Search of an Understandable Consensus Algorithm" (o do Raft).', 'Go intermediário.'],
      comoLer: 'Tenha o artigo do Raft aberto ao lado. Cada função aqui corresponde a uma regra do artigo (eleição, replicação do log, compromisso).',
      conceitos: ['consenso', 'grafo'],
      passos: [
        P('O estado', 'raft.go', 'type raft struct', 'Termo, voto, líder e o log.'),
        P('Mensagens', 'raft.go', 'func (r *raft) Step', 'Toda entrada passa por aqui; o comportamento muda conforme o papel.'),
        P('Virar líder', 'raft.go', 'func (r *raft) becomeLeader', 'O que muda ao ganhar uma eleição.'),
        P('O log', 'log.go', 'type raftLog struct', 'Entradas estáveis, instáveis e já aplicadas.'),
      ],
      tempo: '4 horas', depois: 'kubernetes/kubernetes',
    },
  },
  {
    repo: 'lizrice/containers-from-scratch', nota: 'Um container em ~100 linhas', nivel: 'iniciante', lang: 'Go', temas: ['infra', 'so'], tipo: 'tutorial', start: 'main.go',
    guia: {
      sobre: 'O código da palestra "Containers from scratch": um container feito à mão em Go.',
      porque: 'Desfaz o mistério: um container é um processo com namespaces, um sistema de arquivos próprio e limites.',
      antes: ['Linux na linha de comando.', 'Go básico.'],
      comoLer: 'Assista à palestra da Liz Rice (está no README) com o código aberto. Só roda em Linux, como root.',
      conceitos: ['namespaces', 'processo', 'chamada-sistema'],
      passos: [
        P('Rodar', 'main.go', 'func run', 'Cria um processo filho com novos namespaces.'),
        P('Os namespaces', 'main.go', 'syscall.CLONE_NEWUTS', 'Hostname, processos e montagens isolados.'),
        P('Dentro do container', 'main.go', 'func child', 'Troca a raiz, monta o /proc e executa o comando.'),
        P('Limites', 'main.go', 'func cg', 'cgroups limitam quantos processos o container pode criar.'),
      ],
      tempo: '1 hora', depois: 'etcd-io/raft',
    },
  },
  {
    repo: 'prometheus/prometheus', nota: 'Banco de séries temporais', nivel: 'avançado', lang: 'Go', temas: ['infra', 'bancos'], tipo: 'sistema', start: 'tsdb/head.go',
    guia: {
      sobre: 'Sistema de monitoramento que coleta métricas e guarda num banco de séries temporais próprio.',
      porque: 'Junta coleta, armazenamento e uma linguagem de consulta (PromQL) num projeto bem organizado.',
      antes: ['Go intermediário.', 'Ter usado Prometheus ou Grafana ajuda.'],
      comoLer: 'Escolha uma pergunta: como uma amostra chega e é guardada? Siga do scrape ao head do TSDB.',
      conceitos: ['series-temporais', 'cache'],
      passos: [
        P('Coleta', 'scrape/scrape.go', 'type scrapeLoop struct', 'O laço que busca métricas de cada alvo.'),
        P('A memória do banco', 'tsdb/head.go', 'type Head struct', 'As últimas horas ficam aqui antes de virar bloco no disco.'),
        P('Consultas', 'promql/engine.go', 'type Engine struct', 'Onde o PromQL é avaliado.'),
      ],
      tempo: '3 horas',
    },
  },
  {
    repo: 'kubernetes/kubernetes', nota: 'Como o Kubernetes escolhe o nó', nivel: 'avançado', lang: 'Go', temas: ['infra'], tipo: 'sistema', start: 'pkg/scheduler/schedule_one.go', famoso: 'Ferramentas',
    guia: {
      sobre: 'O orquestrador de containers mais usado.',
      porque: 'O agendador é uma parte isolada e bem documentada: filtra nós, pontua e escolhe, com plugins.',
      antes: ['Ter usado Kubernetes (pods, nós).', 'Go intermediário.'],
      comoLer: 'O repositório é gigante; fique em pkg/scheduler. A pergunta é: por que este pod foi parar neste nó?',
      conceitos: ['agendador', 'interfaces'],
      passos: [
        P('Um ciclo de agendamento', 'pkg/scheduler/schedule_one.go', 'func (sched *Scheduler) ScheduleOne', 'Pega o próximo pod da fila e tenta encaixá-lo.'),
        P('O ciclo de decisão', 'pkg/scheduler/schedule_one.go', 'func (sched *Scheduler) schedulingCycle(', 'Filtra os nós possíveis, pontua e reserva o escolhido; o vínculo acontece depois, no bindingCycle.'),
        P('O agendador', 'pkg/scheduler/scheduler.go', 'type Scheduler struct', 'Fila, cache de nós e perfis de plugins.'),
      ],
      tempo: '3 horas',
    },
  },
  {
    repo: 'ollama/ollama', nota: 'Modelos locais com uma linha', nivel: 'avançado', lang: 'Go', temas: ['ia', 'apis'], tipo: 'aplicação', api: ['REST'], start: 'server/routes.go', famoso: 'IA',
    guia: {
      sobre: 'Roda modelos de linguagem na sua máquina e oferece uma API HTTP para eles.',
      porque: 'Um servidor Go que orquestra inferência local: API, gerenciamento de modelos e streaming de respostas.',
      antes: ['Go intermediário.', 'Ter usado o ollama na linha de comando.'],
      comoLer: 'Siga uma chamada a /api/generate: a rota, a requisição tipada e o streaming da resposta.',
      conceitos: ['inferencia', 'rest', 'tokens'],
      passos: [
        P('A API', 'server/routes.go', 'func (s *Server) GenerateHandler', 'Recebe o pedido e devolve tokens conforme saem.'),
        P('O chat', 'server/routes.go', 'func (s *Server) ChatHandler', 'Mensagens viram um prompt com o template do modelo.'),
        P('Os tipos da API', 'api/types.go', 'type GenerateRequest struct', 'O contrato que clientes usam.'),
      ],
      tempo: '2 horas',
    },
  },
]);
