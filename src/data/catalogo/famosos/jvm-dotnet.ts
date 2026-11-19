// Java, Dart e C#: algoritmos, padrões, apps de referência e bibliotecas base.
import { repos } from '../ajuda';

export default repos([
  {
    repo: 'TheAlgorithms/Java', famoso: 'Aprender', nota: 'Algoritmos clássicos', nivel: 'iniciante', lang: 'Java', temas: ['algoritmos'], tipo: 'tutorial', start: 'src/main/java/com/thealgorithms/sorts/QuickSort.java',
  },
  {
    repo: 'iluwatar/java-design-patterns', famoso: 'Aprender', nota: 'Cada padrão com exemplo', nivel: 'iniciante', lang: 'Java', temas: ['arquitetura'], tipo: 'tutorial', start: 'singleton/src/main/java/com/iluwatar/singleton/IvoryTower.java',
  },
  {
    repo: 'spring-projects/spring-petclinic', famoso: 'Back-end', nota: 'App Spring de referência', nivel: 'intermediário', lang: 'Java', temas: ['apis', 'arquitetura'], tipo: 'exemplo', stack: ['Spring Boot', 'JPA', 'Thymeleaf'], start: 'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java',
  },
  {
    repo: 'google/guava', famoso: 'Ferramentas', nota: 'APIs Java no estado da arte', nivel: 'avançado', lang: 'Java', temas: [], tipo: 'biblioteca', start: 'guava/src/com/google/common/collect/ImmutableList.java',
  },
  {
    repo: 'munificent/craftinginterpreters', famoso: 'Aprender', nota: 'O código do livro Crafting Interpreters', nivel: 'intermediário', lang: 'Java', temas: ['compiladores'], tipo: 'tutorial', start: 'java/com/craftinginterpreters/lox/Scanner.java',
  },
  {
    repo: 'flutter/flutter', famoso: 'Front-end', nota: 'Apps para todas as telas', nivel: 'avançado', lang: 'Dart', temas: ['frontend'], tipo: 'framework', start: 'packages/flutter/lib/src/widgets/framework.dart',
  },
  {
    repo: 'ardalis/CleanArchitecture', famoso: 'Back-end', nota: 'Clean Architecture na prática', nivel: 'intermediário', lang: 'C#', temas: ['arquitetura', 'apis'], tipo: 'exemplo', api: ['REST'], stack: ['ASP.NET Core', 'EF Core', 'MediatR'], start: 'src/Clean.Architecture.Core/ContributorAggregate/Contributor.cs',
  },
  {
    repo: 'dotnet/eShop', famoso: 'Back-end', nota: 'App .NET de referência da Microsoft', nivel: 'intermediário', lang: 'C#', temas: ['apis', 'arquitetura'], tipo: 'exemplo', api: ['REST', 'gRPC'], stack: ['ASP.NET Core', '.NET Aspire', 'EF Core', 'RabbitMQ'], start: 'src/Catalog.API/Apis/CatalogApi.cs',
  },
  {
    repo: 'dotnet/runtime', famoso: 'Linguagens', nota: 'A biblioteca base por dentro', nivel: 'avançado', lang: 'C#', temas: ['algoritmos'], tipo: 'linguagem', start: 'src/libraries/System.Private.CoreLib/src/System/Collections/Generic/List.cs',
  },
]);
