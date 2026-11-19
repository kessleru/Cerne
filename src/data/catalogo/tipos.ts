// Tipos do catálogo do Explorar. Como acrescentar repositórios: docs/catalogo.md.

export type Nivel = 'iniciante' | 'intermediário' | 'avançado';

/** Que tipo de projeto é. "projeto" é o trabalho de uma pessoa (o que aparece no Estudar). */
export type Tipo = 'projeto' | 'tutorial' | 'exemplo' | 'biblioteca' | 'framework' | 'aplicação' | 'ferramenta' | 'linguagem' | 'sistema';

export type Api = 'REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'tRPC' | 'RPC';

export type CategoriaFamoso = 'Aprender' | 'Back-end' | 'Front-end' | 'IA' | 'Dados' | 'Sistemas' | 'Linguagens' | 'Ferramentas';

export type Entrada = {
  /** dono/nome no GitHub */
  repo: string;
  /** do que se trata, em uma linha (aparece no cartão) */
  nota: string;
  /** nome da linguagem principal, como em linguagens.ts */
  lang: string;
  /** ids de temas.ts */
  temas: string[];
  tipo: Tipo;
  /** peças do projeto, para comparar (ex.: Express, Prisma, PostgreSQL, JWT) */
  stack?: string[];
  api?: Api[];
  /** assunto do projeto (Livraria, E-commerce, Bancos e pagamentos...) */
  dominio?: string;
  nivel?: Nivel;
  /** arquivo para abrir primeiro (no ramo padrão) */
  start?: string;
  /** só nos Famosos: a categoria */
  famoso?: CategoriaFamoso;
  /** estrelas e último envio quando a lista foi gerada (Estudar) */
  estrelas?: number;
  atualizado?: string;
};

export type Linguagem = { nome: string; ext: string; cor: string };
export type Tema = { id: string; titulo: string; icone: import('../../components/Icon').IconName; cor: string; resumo: string };
