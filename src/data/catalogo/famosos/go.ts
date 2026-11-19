// Go: testes, CLIs, HTTP, bancos, consenso e infraestrutura.
import { repos } from '../ajuda';

export default repos([
  {
    repo: 'quii/learn-go-with-tests', famoso: 'Aprender', nota: 'Go aprendendo por testes', nivel: 'iniciante', lang: 'Go', temas: [], tipo: 'tutorial', start: 'hello-world/v1/hello.go',
  },
  {
    repo: 'spf13/cobra', famoso: 'Ferramentas', nota: 'A base de CLIs como o kubectl', nivel: 'intermediário', lang: 'Go', temas: ['cli'], tipo: 'biblioteca', start: 'command.go',
  },
  {
    repo: 'go-chi/chi', famoso: 'Back-end', nota: 'Roteador idiomático, sem mágica', nivel: 'intermediário', lang: 'Go', temas: ['apis'], tipo: 'biblioteca', api: ['REST'], stack: ['net/http'], start: 'mux.go',
  },
  {
    repo: 'gin-gonic/gin', famoso: 'Back-end', nota: 'HTTP rápido e direto', nivel: 'intermediário', lang: 'Go', temas: ['apis'], tipo: 'framework', api: ['REST'], stack: ['net/http'], start: 'gin.go',
  },
  {
    repo: 'charmbracelet/bubbletea', famoso: 'Ferramentas', nota: 'Interfaces de terminal no estilo Elm', nivel: 'intermediário', lang: 'Go', temas: ['cli'], tipo: 'framework', start: 'tea.go',
  },
  {
    repo: 'golang/go', famoso: 'Linguagens', nota: 'A stdlib, o Go mais bem escrito', nivel: 'avançado', lang: 'Go', temas: ['apis'], tipo: 'linguagem', api: ['REST'], start: 'src/net/http/server.go',
  },
  {
    repo: 'etcd-io/bbolt', famoso: 'Dados', nota: 'Chave-valor com B+tree em Go', nivel: 'intermediário', lang: 'Go', temas: ['bancos'], tipo: 'biblioteca', start: 'db.go',
  },
  {
    repo: 'etcd-io/raft', famoso: 'Sistemas', nota: 'Consenso Raft legível', nivel: 'avançado', lang: 'Go', temas: ['infra'], tipo: 'biblioteca', start: 'raft.go',
  },
  {
    repo: 'lizrice/containers-from-scratch', famoso: 'Aprender', nota: 'Um container em ~100 linhas', nivel: 'iniciante', lang: 'Go', temas: ['infra', 'so'], tipo: 'tutorial', start: 'main.go',
  },
  {
    repo: 'prometheus/prometheus', famoso: 'Dados', nota: 'Banco de séries temporais', nivel: 'avançado', lang: 'Go', temas: ['infra', 'bancos'], tipo: 'sistema', start: 'tsdb/head.go',
  },
  {
    repo: 'kubernetes/kubernetes', famoso: 'Sistemas', nota: 'Como o Kubernetes escolhe o nó', nivel: 'avançado', lang: 'Go', temas: ['infra'], tipo: 'sistema', start: 'pkg/scheduler/schedule_one.go',
  },
  {
    repo: 'ollama/ollama', famoso: 'IA', nota: 'Modelos locais com uma linha', nivel: 'avançado', lang: 'Go', temas: ['ia', 'apis'], tipo: 'aplicação', api: ['REST'], start: 'server/routes.go',
  },
]);
