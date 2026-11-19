// Java, Dart e C#: algoritmos, padrões, apps de referência e bibliotecas base.
import { P, repos } from '../ajuda';

export default repos([
  {
    repo: 'TheAlgorithms/Java', nota: 'Algoritmos clássicos', nivel: 'iniciante', lang: 'Java', temas: ['algoritmos'], tipo: 'tutorial', start: 'src/main/java/com/thealgorithms/sorts/QuickSort.java',
    guia: {
      sobre: 'Algoritmos e estruturas de dados em Java, organizados em pacotes por assunto, com testes.',
      porque: 'Os mesmos algoritmos do TheAlgorithms/Python, em Java: bom para comparar linguagens e ver interfaces e genéricos em uso.',
      antes: ['Java básico: classes, interfaces e genéricos.'],
      comoLer: 'Para cada algoritmo, abra também o teste correspondente em src/test. O teste mostra o uso esperado.',
      conceitos: ['ordenacao', 'genericos', 'interfaces', 'testes'],
      passos: [
        P('Quicksort', 'src/main/java/com/thealgorithms/sorts/QuickSort.java', 'class QuickSort', 'Repare na interface SortAlgorithm que todos os algoritmos de ordenação seguem.'),
        P('O contrato comum', 'src/main/java/com/thealgorithms/sorts/SortAlgorithm.java', 'interface SortAlgorithm', 'Uma interface genérica para trocar algoritmos sem mudar quem usa.'),
        P('Os testes', 'src/test/java/com/thealgorithms/sorts/SortingAlgorithmTest.java', 'abstract class SortingAlgorithmTest', 'Uma bateria de casos que todo algoritmo de ordenação precisa passar; QuickSortTest só a herda.'),
      ],
      tempo: '30 minutos por algoritmo', depois: 'iluwatar/java-design-patterns',
    },
  },
  {
    repo: 'iluwatar/java-design-patterns', nota: 'Cada padrão com exemplo', nivel: 'iniciante', lang: 'Java', temas: ['arquitetura'], tipo: 'tutorial', start: 'singleton/src/main/java/com/iluwatar/singleton/IvoryTower.java',
    guia: {
      sobre: 'Centenas de padrões de projeto, cada um numa pasta com README (intenção, explicação, diagrama) e código executável.',
      porque: 'Ver o padrão funcionando num exemplo pequeno fixa muito mais do que a definição.',
      antes: ['Java básico e orientação a objetos.'],
      comoLer: 'Escolha um padrão por vez. Leia o README da pasta (tem um exemplo do mundo real) e depois o App.java, que mostra o uso.',
      conceitos: ['padroes-projeto', 'interfaces', 'observer', 'composicao'],
      passos: [
        P('Singleton', 'singleton/src/main/java/com/iluwatar/singleton/IvoryTower.java', 'public final class IvoryTower', 'Uma única instância, e por que isso pode ser um problema.'),
        P('Observer', 'observer/src/main/java/com/iluwatar/observer/Weather.java', 'public class Weather', 'Quem muda avisa os inscritos.'),
        P('Strategy', 'strategy/src/main/java/com/iluwatar/strategy/DragonSlayer.java', 'public class DragonSlayer', 'Trocar o comportamento sem trocar a classe.'),
      ],
      tempo: '20 minutos por padrão', depois: 'spring-projects/spring-petclinic',
    },
  },
  {
    repo: 'spring-projects/spring-petclinic', nota: 'App Spring de referência', nivel: 'intermediário', lang: 'Java', temas: ['apis', 'arquitetura'], tipo: 'exemplo', stack: ['Spring Boot', 'JPA', 'Thymeleaf'], start: 'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java',
    guia: {
      sobre: 'Aplicação de exemplo oficial do Spring: uma clínica veterinária com donos, pets e consultas.',
      porque: 'Mostra o Spring Boot "do jeito certo", em pacotes por funcionalidade, pequeno o bastante para ler inteiro.',
      antes: ['Java.', 'Noção de MVC e de banco relacional.'],
      comoLer: 'Repare que os pacotes são por assunto (owner, vet), não por camada. Siga "cadastrar dono": controller, entidade, repositório.',
      conceitos: ['camadas-api', 'orm', 'injecao-dependencia'],
      passos: [
        P('O controller', 'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java', 'class OwnerController', 'Rotas, validação e o modelo para a página.'),
        P('A entidade', 'src/main/java/org/springframework/samples/petclinic/owner/Owner.java', 'public class Owner', 'Anotações JPA mapeiam a classe para a tabela.'),
        P('O repositório', 'src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java', 'interface OwnerRepository', 'Consultas declaradas só pelo nome dos métodos.'),
      ],
      tempo: '2 horas', depois: 'ardalis/CleanArchitecture',
    },
  },
  {
    repo: 'google/guava', nota: 'APIs Java no estado da arte', nivel: 'avançado', lang: 'Java', temas: [], tipo: 'biblioteca', start: 'guava/src/com/google/common/collect/ImmutableList.java',
    guia: {
      sobre: 'Bibliotecas centrais do Google para Java: coleções, cache, utilidades de strings e concorrência.',
      porque: 'Referência de design de API: nomes, imutabilidade, mensagens de erro e documentação cuidadosas.',
      antes: ['Java intermediário.'],
      comoLer: 'Leia os comentários Javadoc com atenção: eles explicam decisões, não só parâmetros.',
      conceitos: ['imutabilidade', 'genericos', 'fachada'],
      passos: [
        P('Lista imutável', 'guava/src/com/google/common/collect/ImmutableList.java', 'public abstract class ImmutableList', 'Fábricas estáticas e garantias claras.'),
        P('Pré-condições', 'guava/src/com/google/common/base/Preconditions.java', 'public static void checkArgument', 'Validar argumentos com mensagens úteis e baratas.'),
      ],
      tempo: '2 horas',
    },
  },
  {
    repo: 'munificent/craftinginterpreters', nota: 'O código do livro Crafting Interpreters', nivel: 'intermediário', lang: 'Java', temas: ['compiladores'], tipo: 'tutorial', start: 'java/com/craftinginterpreters/lox/Scanner.java',
    guia: {
      sobre: 'O código-fonte do livro gratuito "Crafting Interpreters": a linguagem Lox implementada duas vezes, em Java (árvore) e em C (bytecode).',
      porque: 'O melhor material sobre interpretadores para quem estuda sozinho; o livro explica cada linha deste código.',
      antes: ['Java básico para a primeira parte; C para a segunda.'],
      comoLer: 'Leia o livro (craftinginterpreters.com) com este código aberto. Faça a parte em Java inteira antes de passar para o C.',
      conceitos: ['tokenizacao', 'parser', 'ast', 'interpretador', 'ambiente', 'visitor'],
      passos: [
        P('Scanner', 'java/com/craftinginterpreters/lox/Scanner.java', 'class Scanner', 'Texto vira tokens.'),
        P('Parser', 'java/com/craftinginterpreters/lox/Parser.java', 'class Parser', 'Descida recursiva, uma função por regra da gramática.'),
        P('Interpretador', 'java/com/craftinginterpreters/lox/Interpreter.java', 'class Interpreter', 'Um visitor que avalia cada nó.'),
        P('Escopo', 'java/com/craftinginterpreters/lox/Environment.java', 'class Environment', 'Ambientes encadeados implementam escopo e closures.'),
      ],
      tempo: 'um capítulo por semana', depois: 'rui314/chibicc',
    },
  },
  {
    repo: 'flutter/flutter', nota: 'Apps para todas as telas', nivel: 'avançado', lang: 'Dart', temas: ['frontend'], tipo: 'framework', start: 'packages/flutter/lib/src/widgets/framework.dart', famoso: 'Web',
    guia: {
      sobre: 'Framework de interfaces multiplataforma do Google, em Dart.',
      porque: 'framework.dart explica, em comentários excelentes, a ideia de Widget, Element e State que sustenta tudo.',
      antes: ['Ter feito um app em Flutter.', 'Dart básico.'],
      comoLer: 'Leia os comentários longos acima de cada classe: eles são a melhor explicação do Flutter que existe.',
      conceitos: ['reconciliacao', 'imutabilidade', 'composicao'],
      passos: [
        P('Widget', 'packages/flutter/lib/src/widgets/framework.dart', 'abstract class StatelessWidget', 'Descrições imutáveis da interface.'),
        P('State', 'packages/flutter/lib/src/widgets/framework.dart', 'abstract class State', 'O que sobrevive entre reconstruções.'),
        P('Element', 'packages/flutter/lib/src/widgets/framework.dart', 'abstract class Element', 'A instância viva que liga widget e tela.'),
      ],
      tempo: '2 horas',
    },
  },
  {
    repo: 'ardalis/CleanArchitecture', nota: 'Clean Architecture na prática', nivel: 'intermediário', lang: 'C#', temas: ['arquitetura', 'apis'], tipo: 'exemplo', api: ['REST'], stack: ['ASP.NET Core', 'EF Core', 'MediatR'], start: 'src/Clean.Architecture.Core/ContributorAggregate/Contributor.cs',
    guia: {
      sobre: 'Modelo de solução .NET seguindo Clean Architecture: núcleo, casos de uso, infraestrutura e web separados em projetos.',
      porque: 'Mostra as camadas como projetos separados, com as dependências apontando para dentro, e o porquê está no README.',
      antes: ['C# e ASP.NET Core básico.'],
      comoLer: 'Abra a pasta src e veja os projetos: Core não depende de ninguém. Siga "criar contribuidor" da web até o núcleo.',
      conceitos: ['arquitetura', 'camadas-api', 'injecao-dependencia'],
      passos: [
        P('O domínio', 'src/Clean.Architecture.Core/ContributorAggregate/Contributor.cs', 'public class Contributor', 'Uma entidade rica, sem saber de banco ou web.'),
        P('O caso de uso', 'src/Clean.Architecture.UseCases/Contributors/Create/CreateContributorHandler.cs', 'public class CreateContributorHandler', 'Um comando, um handler: a aplicação orquestra, o domínio decide.'),
        P('A porta de entrada', 'src/Clean.Architecture.Web/Contributors/Create.cs', 'public class Create', 'O endpoint só valida e envia o comando; não conhece o banco.'),
        P('A infraestrutura', 'src/Clean.Architecture.Infrastructure/Data/AppDbContext.cs', 'public class AppDbContext', 'O banco fica na borda, trocável sem mexer no domínio.'),
      ],
      tempo: '2 horas', depois: 'dotnet/eShop',
    },
  },
  {
    repo: 'dotnet/eShop', nota: 'App .NET de referência da Microsoft', nivel: 'intermediário', lang: 'C#', temas: ['apis', 'arquitetura'], tipo: 'exemplo', api: ['REST', 'gRPC'], stack: ['ASP.NET Core', '.NET Aspire', 'EF Core', 'RabbitMQ'], start: 'src/Catalog.API/Apis/CatalogApi.cs',
    guia: {
      sobre: 'Loja online de referência em microsserviços com .NET: catálogo, carrinho, pedidos e identidade.',
      porque: 'Mostra serviços que conversam por HTTP, gRPC e eventos, cada um com o estilo que faz sentido.',
      antes: ['C# e ASP.NET Core.', 'A ideia de microsserviços.'],
      comoLer: 'Leia um serviço por vez. Comece pelo Catalog (API mínima, simples) e depois Ordering (domínio rico com comandos).',
      conceitos: ['rest', 'camadas-api', 'pub-sub', 'arquitetura'],
      passos: [
        P('API do catálogo', 'src/Catalog.API/Apis/CatalogApi.cs', 'public static class CatalogApi', 'Minimal APIs: rotas declaradas como funções.'),
        P('Um pedido', 'src/Ordering.Domain/AggregatesModel/OrderAggregate/Order.cs', 'public class Order', 'Uma entidade de domínio com regras próprias.'),
      ],
      tempo: '3 horas',
    },
  },
  {
    repo: 'dotnet/runtime', nota: 'A biblioteca base por dentro', nivel: 'avançado', lang: 'C#', temas: ['algoritmos'], tipo: 'linguagem', start: 'src/libraries/System.Private.CoreLib/src/System/Collections/Generic/List.cs',
    guia: {
      sobre: 'O runtime do .NET e as bibliotecas base (List, Dictionary, String...).',
      porque: 'Ver as coleções que você usa todo dia, otimizadas por quem cuida do desempenho do .NET.',
      antes: ['C# intermediário.'],
      comoLer: 'Fique em src/libraries/System.Private.CoreLib. Escolha um tipo e leia junto da documentação.',
      conceitos: ['genericos', 'hash', 'big-o'],
      passos: [
        P('List<T>', 'src/libraries/System.Private.CoreLib/src/System/Collections/Generic/List.cs', 'public class List<T>', 'Um vetor que cresce, com versão para detectar mudanças durante foreach.'),
        P('Dictionary', 'src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs', 'public class Dictionary<TKey, TValue>', 'Tabela hash com buckets e entradas em vetores.'),
      ],
      tempo: '2 horas',
    },
  },
]);
