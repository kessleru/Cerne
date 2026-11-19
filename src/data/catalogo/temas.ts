// Temas do Estudar. Um repositório entra em todos os temas que tiver; cada área mostra só os temas com projetos nela.
import type { Tema } from './tipos';

export const TEMAS: Tema[] = [
  // back-end
  { id: 'apis', titulo: 'APIs REST', icone: 'server', cor: 'green', resumo: 'A mesma ideia de API construída de vários jeitos.' },
  { id: 'arquitetura', titulo: 'Arquitetura', icone: 'building', cor: 'peach', resumo: 'Clean Architecture, hexagonal, DDD, MVVM e SOLID em projetos reais.' },
  { id: 'auth', titulo: 'Autenticação', icone: 'lock', cor: 'yellow', resumo: 'Login, JWT, OAuth e permissões.' },
  { id: 'microsservicos', titulo: 'Microsserviços', icone: 'box', cor: 'blue', resumo: 'Serviços separados que conversam entre si.' },
  { id: 'mensageria', titulo: 'Filas e eventos', icone: 'refresh', cor: 'teal', resumo: 'RabbitMQ, Kafka e arquitetura orientada a eventos.' },
  { id: 'graphql', titulo: 'GraphQL', icone: 'branch', cor: 'pink', resumo: 'APIs em que o cliente escolhe os campos.' },
  { id: 'tempo-real', titulo: 'Tempo real', icone: 'zap', cor: 'sapphire', resumo: 'WebSocket, chats e notificações ao vivo.' },
  { id: 'fullstack', titulo: 'Full-stack', icone: 'layout', cor: 'lavender', resumo: 'Back-end e front-end no mesmo projeto.' },
  { id: 'desafios', titulo: 'Desafios técnicos', icone: 'star', cor: 'mauve', resumo: 'Desafios de processos seletivos, Rinha de Backend e Frontend Mentor.' },
  { id: 'testes', titulo: 'Testes', icone: 'check', cor: 'green', resumo: 'Testes unitários, de integração e de ponta a ponta.' },
  // front-end e mobile
  { id: 'estado', titulo: 'Estado da interface', icone: 'list', cor: 'mauve', resumo: 'Redux, Zustand, Pinia, Riverpod: onde mora o estado do app.' },
  { id: 'interfaces', titulo: 'Interface e componentes', icone: 'layout', cor: 'pink', resumo: 'Design systems, bibliotecas de componentes e animações.' },
  { id: 'offline', titulo: 'Offline e PWA', icone: 'cloud', cor: 'teal', resumo: 'Apps que funcionam sem internet e guardam dados no aparelho.' },
  // dados e IA
  { id: 'ml', titulo: 'Machine learning', icone: 'sparkles', cor: 'mauve', resumo: 'Modelos de previsão e classificação, do dado ao resultado.' },
  { id: 'llm', titulo: 'IA generativa', icone: 'lightbulb', cor: 'yellow', resumo: 'LLMs, RAG, agentes e chatbots.' },
  { id: 'analise', titulo: 'Análise de dados', icone: 'meter', cor: 'blue', resumo: 'Exploração, gráficos e painéis.' },
  { id: 'etl', titulo: 'Pipelines de dados', icone: 'database', cor: 'peach', resumo: 'ETL, Airflow, dbt e Spark.' },
  { id: 'visao', titulo: 'Visão computacional', icone: 'image', cor: 'sapphire', resumo: 'Classificação de imagens, detecção de objetos e rostos.' },
  // DevOps
  { id: 'containers', titulo: 'Containers e Kubernetes', icone: 'box', cor: 'blue', resumo: 'Docker, Kubernetes e Helm na prática.' },
  { id: 'iac', titulo: 'Infraestrutura como código', icone: 'cloud', cor: 'peach', resumo: 'Terraform, Ansible e nuvem descrita em arquivos.' },
  { id: 'ci-cd', titulo: 'CI/CD', icone: 'play', cor: 'green', resumo: 'Pipelines que testam e publicam sozinhos.' },
  { id: 'observabilidade', titulo: 'Observabilidade', icone: 'meter', cor: 'yellow', resumo: 'Métricas, logs e painéis com Prometheus e Grafana.' },
  // jogos e sistemas
  { id: 'multiplayer', titulo: 'Multiplayer', icone: 'users', cor: 'mauve', resumo: 'Jogos em rede.' },
  { id: 'compiladores', titulo: 'Compiladores', icone: 'code', cor: 'peach', resumo: 'Compiladores, interpretadores e linguagens de brinquedo.' },
  { id: 'emuladores', titulo: 'Emuladores e VMs', icone: 'cpu', cor: 'green', resumo: 'CHIP-8, NES, Game Boy e máquinas virtuais.' },
  { id: 'so', titulo: 'Sistemas operacionais', icone: 'cpu', cor: 'red', resumo: 'Kernels, bootloaders e sistemas feitos do zero.' },
  { id: 'redes', titulo: 'Redes e protocolos', icone: 'globe', cor: 'sapphire', resumo: 'Servidores HTTP, TCP, proxies e balanceadores.' },
  { id: 'bancos', titulo: 'Bancos de dados por dentro', icone: 'database', cor: 'teal', resumo: 'Key-value stores, B-trees e motores de armazenamento.' },
  // ferramentas
  { id: 'automacao', titulo: 'Bots e automação', icone: 'zap', cor: 'yellow', resumo: 'Bots, scrapers e scripts que trabalham por você.' },
  { id: 'terminal', titulo: 'Apps de terminal', icone: 'terminal', cor: 'green', resumo: 'CLIs e interfaces de texto.' },
];
