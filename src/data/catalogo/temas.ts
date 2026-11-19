// Temas com trilha própria. Um repositório entra em todos os temas que listar.
import type { Tema } from './tipos';

export const TEMAS: Tema[] = [
  { id: 'apis', titulo: 'APIs e back-end', icone: 'server', cor: 'green', resumo: 'A mesma ideia construída de vários jeitos: compare rotas, banco e autenticação.' },
  { id: 'frontend', titulo: 'Front-end', icone: 'layout', cor: 'sapphire', resumo: 'Virtual DOM, reatividade e cache no cliente.' },
  { id: 'algoritmos', titulo: 'Algoritmos', icone: 'branch', cor: 'teal', resumo: 'Estruturas de dados clássicas, com testes.' },
  { id: 'compiladores', titulo: 'Compiladores', icone: 'code', cor: 'pink', resumo: 'Do tokenizador ao gerador de código.' },
  { id: 'so', titulo: 'Sistemas operacionais', icone: 'cpu', cor: 'maroon', resumo: 'Do setor de boot ao agendador do Linux.' },
  { id: 'bancos', titulo: 'Bancos de dados', icone: 'database', cor: 'flamingo', resumo: 'B-trees, chave-valor e motores reais.' },
  { id: 'ia', titulo: 'IA e LLMs', icone: 'sparkles', cor: 'mauve', resumo: 'Redes neurais e GPTs, do zero ao real.' },
  { id: 'infra', titulo: 'Containers e infra', icone: 'box', cor: 'blue', resumo: 'Namespaces, consenso e orquestração.' },
  { id: 'cli', titulo: 'Linha de comando', icone: 'binary', cor: 'yellow', resumo: 'Parsing de argumentos, terminais e boas CLIs.' },
  { id: 'arquitetura', titulo: 'Arquitetura e padrões', icone: 'building', cor: 'peach', resumo: 'Camadas, padrões de projeto e apps de referência.' },
];
