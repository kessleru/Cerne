// Linguagens com trilha própria. Uma trilha aparece sozinha quando há repositórios dela no catálogo.
import type { Linguagem } from './tipos';

export const LINGUAGENS: Linguagem[] = [
  { nome: 'Python', ext: 'py', cor: 'yellow', resumo: 'Do autograd de 100 linhas à biblioteca padrão.' },
  { nome: 'JavaScript', ext: 'js', cor: 'yellow', resumo: 'Compilador comentado, frameworks e o Node por dentro.' },
  { nome: 'TypeScript', ext: 'ts', cor: 'blue', resumo: 'Bibliotecas pequenas e tipadas até um editor gigante.' },
  { nome: 'Go', ext: 'go', cor: 'sky', resumo: 'Testes primeiro, CLIs, HTTP e a biblioteca padrão.' },
  { nome: 'Rust', ext: 'rs', cor: 'peach', resumo: 'Exercícios, async com Tokio e CLIs de referência.' },
  { nome: 'C', ext: 'c', cor: 'lavender', resumo: 'Programas pequenos e completos até C de produção.' },
  { nome: 'C++', ext: 'cpp', cor: 'blue', resumo: 'Motores, inferência e sistemas grandes.' },
  { nome: 'Java', ext: 'java', cor: 'red', resumo: 'Algoritmos, padrões de projeto e Spring.' },
  { nome: 'Kotlin', ext: 'kt', cor: 'mauve', resumo: 'JVM moderna, Android e back-end.' },
  { nome: 'C#', ext: 'cs', cor: 'mauve', resumo: 'Arquitetura limpa e o .NET por dentro.' },
  { nome: 'PHP', ext: 'php', cor: 'lavender', resumo: 'Frameworks web e aplicações reais.' },
  { nome: 'Ruby', ext: 'rb', cor: 'red', resumo: 'Rails e bibliotecas expressivas.' },
  { nome: 'Dart', ext: 'dart', cor: 'sky', resumo: 'Flutter e apps multiplataforma.' },
  { nome: 'Elixir', ext: 'ex', cor: 'mauve', resumo: 'Concorrência com processos leves.' },
  { nome: 'Assembly', ext: 'asm', cor: 'overlay-2', resumo: 'O que a máquina executa.' },
];
