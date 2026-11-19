// Rust: exercícios, async, web, CLIs e a biblioteca padrão.
import { repos } from '../ajuda';

export default repos([
  {
    repo: 'rust-lang/rustlings', famoso: 'Aprender', nota: 'Exercícios curtos guiados pelo compilador', nivel: 'iniciante', lang: 'Rust', temas: [], tipo: 'tutorial', start: 'exercises/01_variables/variables1.rs',
  },
  {
    repo: 'tokio-rs/mini-redis', famoso: 'Aprender', nota: 'Tokio explicado num Redis de estudo', nivel: 'intermediário', lang: 'Rust', temas: ['bancos', 'apis'], tipo: 'tutorial', api: ['RPC'], stack: ['Tokio'], start: 'src/server.rs',
  },
  {
    repo: 'tokio-rs/axum', famoso: 'Back-end', nota: 'API web com exemplos prontos', nivel: 'intermediário', lang: 'Rust', temas: ['apis'], tipo: 'framework', api: ['REST', 'WebSocket'], stack: ['Tokio', 'Tower', 'Hyper'], start: 'examples/todos/src/main.rs',
  },
  {
    repo: 'sharkdp/bat', famoso: 'Ferramentas', nota: 'CLI bem organizada', nivel: 'intermediário', lang: 'Rust', temas: ['cli'], tipo: 'ferramenta', start: 'src/bin/bat/main.rs',
  },
  {
    repo: 'BurntSushi/ripgrep', famoso: 'Ferramentas', nota: 'Busca rápida, código exemplar', nivel: 'avançado', lang: 'Rust', temas: ['cli'], tipo: 'ferramenta', start: 'crates/core/main.rs',
  },
  {
    repo: 'rust-lang/rust', famoso: 'Linguagens', nota: 'Option e Result por dentro', nivel: 'avançado', lang: 'Rust', temas: ['algoritmos'], tipo: 'linguagem', start: 'library/core/src/option.rs',
  },
  {
    repo: 'denoland/deno', famoso: 'Linguagens', nota: 'Runtime JS e TS seguro', nivel: 'avançado', lang: 'Rust', temas: [], tipo: 'linguagem', start: 'cli/main.rs',
  },
]);
