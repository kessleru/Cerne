// Áreas do Estudar: o primeiro nível da navegação. Cada projeto está em uma área.
import type { AreaInfo } from './tipos';

export const AREAS: AreaInfo[] = [
  { id: 'backend', titulo: 'Back-end', icone: 'server', cor: 'green', resumo: 'APIs, bancos de dados, filas e arquitetura.' },
  { id: 'frontend', titulo: 'Front-end', icone: 'layout', cor: 'blue', resumo: 'Sites e apps web com React, Vue, Angular e Svelte.' },
  { id: 'mobile', titulo: 'Mobile', icone: 'smartphone', cor: 'pink', resumo: 'Apps Android, iOS, Flutter e React Native.' },
  { id: 'dados', titulo: 'Dados e IA', icone: 'sparkles', cor: 'mauve', resumo: 'Análise de dados, machine learning e IA generativa.' },
  { id: 'devops', titulo: 'DevOps', icone: 'cloud', cor: 'sapphire', resumo: 'Infraestrutura como código, containers, CI/CD e monitoramento.' },
  { id: 'jogos', titulo: 'Jogos', icone: 'gamepad', cor: 'red', resumo: 'Jogos 2D e 3D, engines e clássicos refeitos.' },
  { id: 'ferramentas', titulo: 'Ferramentas', icone: 'terminal', cor: 'yellow', resumo: 'CLIs, bots, automações e extensões.' },
  { id: 'sistemas', titulo: 'Sistemas', icone: 'cpu', cor: 'peach', resumo: 'Compiladores, emuladores, sistemas operacionais e redes.' },
];
