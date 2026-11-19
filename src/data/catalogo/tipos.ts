// Tipos do catálogo do Explorar. Para acrescentar um repositório, veja docs/catalogo.md.
import type { IconName } from '../../components/Icon';

export type Nivel = 'iniciante' | 'intermediário' | 'avançado';

/** Que tipo de projeto é: ajuda a pessoa a saber o que esperar do código. */
export type Tipo = 'tutorial' | 'exemplo' | 'biblioteca' | 'framework' | 'aplicação' | 'ferramenta' | 'linguagem' | 'sistema';

export type Api = 'REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'tRPC' | 'RPC';

export type CategoriaFamoso = 'Sistemas' | 'Linguagens' | 'Dados' | 'Web' | 'IA' | 'Ferramentas';

/** Um passo do roteiro de leitura: um arquivo, um trecho e o que observar. */
export type Passo = {
  titulo: string;
  arquivo: string;
  /** texto exato que aparece no arquivo; o Cerne abre na primeira linha que o contém */
  ancora?: string;
  foco: string;
};

/** Guia escrito à mão para quem estuda sozinho. */
export type Guia = {
  /** o que é, em uma ou duas frases */
  sobre: string;
  /** por que vale ler este código */
  porque: string;
  /** o que já saber; se não souber, por onde começar */
  antes: string[];
  /** como atacar a leitura deste repositório */
  comoLer: string;
  /** ids do glossário (glossario.ts) */
  conceitos: string[];
  passos: Passo[];
  /** tempo de leitura sugerido */
  tempo: string;
  /** próximo repositório sugerido (dono/nome, de preferência no catálogo) */
  depois?: string;
};

export type Entrada = {
  /** dono/nome no GitHub */
  repo: string;
  /** por que ler, em poucas palavras (aparece no cartão) */
  nota: string;
  nivel: Nivel;
  /** nome da linguagem principal, como em linguagens.ts */
  lang: string;
  /** ids de temas.ts */
  temas: string[];
  tipo: Tipo;
  /** peças do projeto, para comparar (ex.: Express, Prisma, PostgreSQL, JWT) */
  stack?: string[];
  api?: Api[];
  /** arquivo para abrir primeiro (no ramo padrão) */
  start?: string;
  /** aparece em Famosos, nesta categoria */
  famoso?: CategoriaFamoso;
  guia?: Guia;
};

export type Linguagem = { nome: string; ext: string; cor: string; resumo: string };
export type Tema = { id: string; titulo: string; icone: IconName; cor: string; resumo: string };
export type Termo = { termo: string; explicacao: string };
