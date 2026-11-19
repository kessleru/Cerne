// Temas do Estudar, com foco em back-end. Um repositório entra em todos os temas que tiver.
import type { Tema } from './tipos';

export const TEMAS: Tema[] = [
  { id: 'apis', titulo: 'APIs REST', icone: 'server', cor: 'green', resumo: 'Projetos de pessoas: a mesma ideia de API construída de vários jeitos.' },
  { id: 'arquitetura', titulo: 'Arquitetura limpa', icone: 'building', cor: 'peach', resumo: 'Clean Architecture, hexagonal, DDD e SOLID em projetos reais.' },
  { id: 'auth', titulo: 'Autenticação', icone: 'lock', cor: 'yellow', resumo: 'Login, JWT, OAuth e permissões.' },
  { id: 'desafios', titulo: 'Desafios de back-end', icone: 'star', cor: 'mauve', resumo: 'Desafios técnicos e a Rinha de Backend, resolvidos por pessoas.' },
  { id: 'microsservicos', titulo: 'Microsserviços', icone: 'box', cor: 'blue', resumo: 'Serviços separados que conversam entre si.' },
  { id: 'mensageria', titulo: 'Filas e eventos', icone: 'refresh', cor: 'teal', resumo: 'RabbitMQ, Kafka e arquitetura orientada a eventos.' },
  { id: 'graphql', titulo: 'GraphQL', icone: 'branch', cor: 'pink', resumo: 'APIs em que o cliente escolhe os campos.' },
  { id: 'tempo-real', titulo: 'Tempo real', icone: 'zap', cor: 'sapphire', resumo: 'WebSocket, chats e notificações ao vivo.' },
  { id: 'fullstack', titulo: 'Full-stack', icone: 'layout', cor: 'lavender', resumo: 'Back-end e front-end no mesmo projeto.' },
];
