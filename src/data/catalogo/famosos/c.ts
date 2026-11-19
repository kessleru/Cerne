// C, C++ e Assembly: editores, bancos, sistemas operacionais, compiladores e grandes projetos.
import { repos } from '../ajuda';

export default repos([
  {
    repo: 'antirez/kilo', famoso: 'Ferramentas', nota: 'Editor de texto em ~1 000 linhas', nivel: 'iniciante', lang: 'C', temas: ['cli'], tipo: 'aplicação', start: 'kilo.c',
  },
  {
    repo: 'nothings/stb', famoso: 'Ferramentas', nota: 'Bibliotecas de um arquivo só', nivel: 'intermediário', lang: 'C', temas: [], tipo: 'biblioteca', start: 'stb_image.h',
  },
  {
    repo: 'redis/redis', famoso: 'Dados', nota: 'C limpo de produção', nivel: 'avançado', lang: 'C', temas: ['bancos'], tipo: 'sistema', start: 'src/adlist.c',
  },
  {
    repo: 'curl/curl', famoso: 'Sistemas', nota: 'Rede portátil em C', nivel: 'avançado', lang: 'C', temas: ['apis'], tipo: 'ferramenta', api: ['REST'], start: 'lib/url.c',
  },
  {
    repo: 'sqlite/sqlite', famoso: 'Dados', nota: 'Um banco num arquivo, C exemplar', nivel: 'avançado', lang: 'C', temas: ['bancos'], tipo: 'sistema', start: 'src/btree.c',
  },
  {
    repo: 'cstack/db_tutorial', famoso: 'Aprender', nota: 'Um clone do SQLite, passo a passo', nivel: 'iniciante', lang: 'C', temas: ['bancos'], tipo: 'tutorial', start: 'db.c',
  },
  {
    repo: 'postgres/postgres', famoso: 'Dados', nota: 'Índices do PostgreSQL', nivel: 'avançado', lang: 'C', temas: ['bancos'], tipo: 'sistema', start: 'src/backend/access/nbtree/nbtree.c',
  },
  {
    repo: 'mit-pdos/xv6-riscv', famoso: 'Aprender', nota: 'O Unix das aulas do MIT', nivel: 'intermediário', lang: 'C', temas: ['so'], tipo: 'tutorial', start: 'kernel/proc.c',
  },
  {
    repo: 'cfenollosa/os-tutorial', famoso: 'Aprender', nota: 'Um SO desde o boot', nivel: 'iniciante', lang: 'Assembly', temas: ['so'], tipo: 'tutorial', start: '01-bootsector-barebones/boot_sect_simple.asm',
  },
  {
    repo: 'torvalds/linux', famoso: 'Sistemas', nota: 'O kernel que roda o mundo', nivel: 'avançado', lang: 'C', temas: ['so'], tipo: 'sistema', start: 'kernel/sched/core.c',
  },
  {
    repo: 'karpathy/llm.c', famoso: 'Aprender', nota: 'Treinar o GPT-2 em C puro', nivel: 'avançado', lang: 'C', temas: ['ia'], tipo: 'tutorial', start: 'train_gpt2.c',
  },
  {
    repo: 'rui314/chibicc', famoso: 'Aprender', nota: 'Compilador C, commit a commit', nivel: 'avançado', lang: 'C', temas: ['compiladores'], tipo: 'tutorial', start: 'tokenize.c',
  },
  {
    repo: 'git/git', famoso: 'Sistemas', nota: 'O controle de versão de todos', nivel: 'avançado', lang: 'C', temas: [], tipo: 'ferramenta', start: 'read-cache.c',
  },
  {
    repo: 'nginx/nginx', famoso: 'Sistemas', nota: 'Servidor web e proxy', nivel: 'avançado', lang: 'C', temas: ['apis'], tipo: 'sistema', start: 'src/core/nginx.c',
  },
  {
    repo: 'FFmpeg/FFmpeg', famoso: 'Sistemas', nota: 'Áudio e vídeo em tudo', nivel: 'avançado', lang: 'C', temas: [], tipo: 'ferramenta', start: 'libavcodec/avcodec.c',
  },
  {
    repo: 'neovim/neovim', famoso: 'Ferramentas', nota: 'O Vim, renovado', nivel: 'avançado', lang: 'C', temas: ['cli'], tipo: 'aplicação', start: 'src/nvim/main.c',
  },
  {
    repo: 'ggml-org/llama.cpp', famoso: 'IA', nota: 'Inferência local em C++', nivel: 'avançado', lang: 'C++', temas: ['ia'], tipo: 'ferramenta', start: 'src/llama.cpp',
  },
  {
    repo: 'godotengine/godot', famoso: 'Ferramentas', nota: 'Motor de jogos livre', nivel: 'avançado', lang: 'C++', temas: [], tipo: 'aplicação', start: 'core/object/object.cpp',
  },
  {
    repo: 'bitcoin/bitcoin', famoso: 'Sistemas', nota: 'A primeira criptomoeda', nivel: 'avançado', lang: 'C++', temas: [], tipo: 'sistema', start: 'src/validation.cpp',
  },
]);
