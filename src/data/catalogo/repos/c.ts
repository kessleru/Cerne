// C, C++ e Assembly: editores, bancos, sistemas operacionais, compiladores e grandes projetos.
import { P, repos } from '../ajuda';

export default repos([
  {
    repo: 'antirez/kilo', nota: 'Editor de texto em ~1 000 linhas', nivel: 'iniciante', lang: 'C', temas: ['cli'], tipo: 'aplicação', start: 'kilo.c',
    guia: {
      sobre: 'Um editor de texto completo para o terminal, com busca e destaque de sintaxe, num arquivo só.',
      porque: 'Um programa C inteiro, sem dependências, que você consegue ler numa tarde. Ensina terminal, teclado e desenho de tela.',
      antes: ['C básico: structs, ponteiros e strings.'],
      comoLer: 'Leia de cima a baixo. Depois, o tutorial "Build Your Own Text Editor" (snaptoken) reconstrói o kilo em 184 passos; faça-o com este código ao lado.',
      conceitos: ['raw-mode', 'event-loop', 'memoria-manual', 'ponteiros'],
      passos: [
        P('O estado do editor', 'kilo.c', 'struct editorConfig', 'Cursor, linhas, tamanho da tela e o arquivo aberto.'),
        P('Modo raw', 'kilo.c', 'int enableRawMode', 'Como o terminal passa a entregar cada tecla na hora.'),
        P('Desenhar a tela', 'kilo.c', 'void editorRefreshScreen', 'Monta um buffer com sequências de escape e escreve de uma vez.'),
        P('Cada tecla', 'kilo.c', 'void editorProcessKeypress', 'O laço principal reage a cada tecla.'),
        P('Destaque de sintaxe', 'kilo.c', 'void editorUpdateSyntax', 'Um destacador simples, caractere por caractere.'),
      ],
      tempo: '3 horas', depois: 'nothings/stb',
    },
  },
  {
    repo: 'nothings/stb', nota: 'Bibliotecas de um arquivo só', nivel: 'intermediário', lang: 'C', temas: [], tipo: 'biblioteca', start: 'stb_image.h',
    guia: {
      sobre: 'Coleção de bibliotecas em C, cada uma num único arquivo .h: imagens, fontes, áudio e estruturas de dados.',
      porque: 'Código prático e autossuficiente; mostra como escrever uma biblioteca fácil de usar e de distribuir.',
      antes: ['C intermediário.'],
      comoLer: 'O começo de cada arquivo é a documentação. Leia-a, depois procure a função pública e siga até a implementação (depois do #ifdef ..._IMPLEMENTATION).',
      conceitos: ['header-only', 'ponteiros', 'memoria-manual'],
      passos: [
        P('A documentação no topo', 'stb_image.h', 'Primarily of interest', 'Como usar, o que suporta e as limitações.'),
        P('A função pública', 'stb_image.h', 'STBIDEF stbi_uc *stbi_load(', 'A API inteira cabe numa função.'),
        P('Estruturas de dados', 'stb_ds.h', 'arrput', 'Vetor dinâmico e hash map em macros de C.'),
      ],
      tempo: '2 horas', depois: 'redis/redis',
    },
  },
  {
    repo: 'redis/redis', nota: 'C limpo de produção', nivel: 'avançado', lang: 'C', temas: ['bancos'], tipo: 'sistema', start: 'src/adlist.c', famoso: 'Dados',
    guia: {
      sobre: 'Banco em memória de estruturas de dados (strings, listas, hashes, conjuntos), usado como cache e fila.',
      porque: 'Um dos códigos C mais elogiados: estruturas pequenas, um laço de eventos próprio e comandos simples de seguir.',
      antes: ['C intermediário.', 'Ter usado o Redis (redis-cli).'],
      comoLer: 'Comece pelas estruturas pequenas (adlist.c, dict.c), depois o laço de eventos (ae.c), e por fim siga um comando simples como SET.',
      conceitos: ['lista-ligada', 'hash', 'event-loop', 'memoria-manual'],
      passos: [
        P('Lista ligada', 'src/adlist.c', 'list *listCreate', 'Uma lista ligada dupla, genérica, em C.'),
        P('Dicionário', 'src/dict.c', 'dictCreate', 'Tabela hash com rehash incremental.'),
        P('O laço de eventos', 'src/ae.c', 'void aeMain', 'Um único thread atende milhares de clientes.'),
        P('Um comando', 'src/t_string.c', 'void setCommand', 'O caminho do SET até a estrutura.'),
      ],
      tempo: '3 a 4 horas', depois: 'sqlite/sqlite',
    },
  },
  {
    repo: 'curl/curl', nota: 'Rede portátil em C', nivel: 'avançado', lang: 'C', temas: ['apis'], tipo: 'ferramenta', api: ['REST'], start: 'lib/url.c', famoso: 'Sistemas',
    guia: {
      sobre: 'Ferramenta e biblioteca (libcurl) de transferência por dezenas de protocolos, presente em bilhões de aparelhos.',
      porque: 'C portável e muito cuidadoso com segurança, mantido há quase 30 anos.',
      antes: ['C intermediário.', 'HTTP.'],
      comoLer: 'Use a API "easy" como fio condutor: curl_easy_perform chama a máquina de estados que conecta, transfere e termina.',
      conceitos: ['http', 'event-loop'],
      passos: [
        P('A API simples', 'lib/easy.c', 'CURLcode curl_easy_perform', 'O ponto de entrada mais usado.'),
        P('A transferência', 'lib/transfer.c', 'Curl_xfer_setup', 'Prepara a leitura e a escrita de uma transferência.'),
        P('Conexões e URLs', 'lib/url.c', 'CURLcode Curl_connect', 'Achar ou reaproveitar uma conexão.'),
      ],
      tempo: '3 horas',
    },
  },
  {
    repo: 'sqlite/sqlite', nota: 'Um banco num arquivo, C exemplar', nivel: 'avançado', lang: 'C', temas: ['bancos'], tipo: 'sistema', start: 'src/btree.c', famoso: 'Dados',
    guia: {
      sobre: 'O banco de dados mais usado do mundo: está em celulares, navegadores e aviões.',
      porque: 'C extremamente consistente e testado, e um caminho claro do SQL ao disco: tokenizar, compilar para bytecode, executar, árvore B.',
      antes: ['C intermediário.', 'SQL.', 'Ter feito o db_tutorial antes é ideal.'],
      comoLer: 'Leia a página "Architecture of SQLite" no site oficial e use-a como mapa: cada caixa do diagrama é um arquivo daqui.',
      conceitos: ['arvore-b', 'tokenizacao', 'interpretador', 'mvcc'],
      passos: [
        P('Tokenizar SQL', 'src/tokenize.c', 'sqlite3GetToken', 'O primeiro passo de toda consulta.'),
        P('A máquina virtual', 'src/vdbe.c', 'int sqlite3VdbeExec', 'O SQL vira bytecode e roda num grande switch.'),
        P('A árvore B', 'src/btree.c', 'int sqlite3BtreeInsert', 'Como uma linha é guardada em páginas.'),
        P('O planejador', 'src/where.c', 'WhereInfo *sqlite3WhereBegin', 'Decide quais índices usar.'),
      ],
      tempo: '4 horas ou mais',
    },
  },
  {
    repo: 'cstack/db_tutorial', nota: 'Um clone do SQLite, passo a passo', nivel: 'iniciante', lang: 'C', temas: ['bancos'], tipo: 'tutorial', start: 'db.c',
    guia: {
      sobre: 'Tutorial que constrói um banco parecido com o SQLite em C: REPL, páginas, cursor e árvore B.',
      porque: 'Cada parte acrescenta uma peça; ao final você entende como um banco grava e acha linhas no disco.',
      antes: ['C básico.'],
      comoLer: 'Leia as partes em _parts na ordem e compare com db.c, que é o resultado final.',
      conceitos: ['arvore-b', 'memoria-manual', 'parser'],
      passos: [
        P('Parte 1: o REPL', '_parts/part1.md', undefined, 'Um laço que lê comandos.'),
        P('Preparar comandos', 'db.c', 'PrepareResult prepare_statement', 'Um "compilador" de SQL bem pequeno.'),
        P('Páginas e árvore', 'db.c', 'void* get_page', 'Como o arquivo é lido em páginas.'),
      ],
      tempo: 'uma parte por dia', depois: 'sqlite/sqlite',
    },
  },
  {
    repo: 'postgres/postgres', nota: 'Índices do PostgreSQL', nivel: 'avançado', lang: 'C', temas: ['bancos'], tipo: 'sistema', start: 'src/backend/access/nbtree/nbtree.c', famoso: 'Dados',
    guia: {
      sobre: 'O banco relacional livre mais completo.',
      porque: 'Código C enorme mas muito bem comentado; cada pasta tem um README que explica o desenho.',
      antes: ['SQL.', 'C intermediário.'],
      comoLer: 'Leia primeiro src/backend/access/nbtree/README. Os READMEs das pastas são a melhor documentação interna que existe.',
      conceitos: ['arvore-b', 'mvcc', 'processo'],
      passos: [
        P('Uma consulta chega', 'src/backend/tcop/postgres.c', 'exec_simple_query', 'Parse, planejamento e execução de uma consulta simples.'),
        P('Executar', 'src/backend/executor/execMain.c', 'standard_ExecutorRun', 'O executor percorre o plano.'),
        P('Índice B-tree', 'src/backend/access/nbtree/nbtree.c', 'btinsert', 'Inserir uma entrada num índice.'),
      ],
      tempo: '4 horas',
    },
  },
  {
    repo: 'mit-pdos/xv6-riscv', nota: 'O Unix das aulas do MIT', nivel: 'intermediário', lang: 'C', temas: ['so'], tipo: 'tutorial', start: 'kernel/proc.c',
    guia: {
      sobre: 'Uma reimplementação didática do Unix V6 para RISC-V, usada no curso 6.1810 do MIT.',
      porque: 'Um kernel inteiro em poucos milhares de linhas: processos, memória virtual, chamadas de sistema e sistema de arquivos.',
      antes: ['C.', 'Noção de assembly e de como um processador executa instruções.'],
      comoLer: 'Leia junto do livro "xv6: a simple, Unix-like teaching operating system" (gratuito no site do curso). Cada capítulo aponta os arquivos.',
      conceitos: ['processo', 'agendador', 'chamada-sistema', 'boot'],
      passos: [
        P('Criar um processo', 'kernel/proc.c', 'fork(void)', 'Copia memória e estado do processo pai.'),
        P('O agendador', 'kernel/proc.c', 'scheduler(void)', 'Um laço que escolhe o próximo processo.'),
        P('Chamadas de sistema', 'kernel/syscall.c', 'syscall(void)', 'Como o kernel sabe qual chamada o programa pediu.'),
        P('Armadilhas', 'kernel/trap.c', 'usertrap(void)', 'O que acontece quando um programa pede algo ao kernel ou dá erro.'),
      ],
      tempo: 'semanas, um capítulo por vez', depois: 'torvalds/linux',
    },
  },
  {
    repo: 'cfenollosa/os-tutorial', nota: 'Um SO desde o boot', nivel: 'iniciante', lang: 'Assembly', temas: ['so'], tipo: 'tutorial', start: '01-bootsector-barebones/boot_sect_simple.asm',
    guia: {
      sobre: 'Tutorial que constrói um sistema operacional do zero, em pastas numeradas: do setor de boot a um kernel em C.',
      porque: 'Cada pasta é um passo pequeno com explicação; você vê o que acontece antes de qualquer sistema existir.',
      antes: ['Curiosidade sobre como o computador liga.', 'C básico para as pastas mais adiante.'],
      comoLer: 'Siga as pastas em ordem; cada uma tem um README com a explicação e o código daquele passo. Use o QEMU para rodar.',
      conceitos: ['boot', 'chamada-sistema', 'ponteiros'],
      passos: [
        P('O primeiro setor', '01-bootsector-barebones/README.md', undefined, 'O que é um setor de boot e por que ele tem 512 bytes.'),
        P('Um laço infinito', '01-bootsector-barebones/boot_sect_simple.asm', 'jmp loop', 'O menor "sistema" possível: um laço infinito e a assinatura 0xaa55 no fim.'),
        P('Escrever na tela', '02-bootsector-print/boot_sect_hello.asm', 'int 0x10', 'Usar a BIOS para imprimir.'),
      ],
      tempo: 'uma pasta por dia', depois: 'mit-pdos/xv6-riscv',
    },
  },
  {
    repo: 'torvalds/linux', nota: 'O kernel que roda o mundo', nivel: 'avançado', lang: 'C', temas: ['so'], tipo: 'sistema', start: 'kernel/sched/core.c', famoso: 'Sistemas',
    guia: {
      sobre: 'O kernel Linux.',
      porque: 'Ver como ideias do xv6 aparecem em escala real: o mesmo fork, o mesmo agendador, com décadas de otimização.',
      antes: ['Ter estudado o xv6 (ou outro kernel didático).', 'C avançado.'],
      comoLer: 'Nem tente ler tudo. Escolha uma chamada de sistema que você conhece e siga-a. A pasta Documentation tem explicações oficiais.',
      conceitos: ['processo', 'agendador', 'chamada-sistema'],
      passos: [
        P('Criar processos', 'kernel/fork.c', 'copy_process', 'O fork de verdade: o que é copiado e o que é compartilhado.'),
        P('O agendador', 'kernel/sched/core.c', '__schedule', 'O coração da troca de contexto.'),
      ],
      tempo: 'sem pressa',
    },
  },
  {
    repo: 'karpathy/llm.c', nota: 'Treinar o GPT-2 em C puro', nivel: 'avançado', lang: 'C', temas: ['ia'], tipo: 'tutorial', start: 'train_gpt2.c',
    guia: {
      sobre: 'Treina o GPT-2 em C puro (e em CUDA), sem PyTorch.',
      porque: 'Cada camada tem o passo para frente e o para trás escritos à mão: não sobra mistério sobre o que um framework faz por você.',
      antes: ['C.', 'Ter lido o nanoGPT: este código é a mesma rede, sem ajuda nenhuma.'],
      comoLer: 'Abra o model.py do nanoGPT ao lado (Ctrl \\). Para cada função _forward daqui, ache a linha equivalente lá; logo abaixo de cada uma está o _backward correspondente.',
      conceitos: ['backprop', 'atencao', 'transformer', 'memoria-manual'],
      passos: [
        P('Layernorm', 'train_gpt2.c', 'void layernorm_forward', 'Média, variância e normalização; o backward vem logo abaixo.'),
        P('Atenção', 'train_gpt2.c', 'void attention_forward', 'Os laços que o PyTorch esconde.'),
        P('O modelo inteiro', 'train_gpt2.c', 'void gpt2_forward', 'As camadas chamadas em ordem, com os buffers de ativação.'),
        P('Atualizar os pesos', 'train_gpt2.c', 'void gpt2_update', 'O otimizador AdamW em poucas linhas.'),
      ],
      tempo: '3 a 4 horas', depois: 'huggingface/transformers',
    },
  },
  {
    repo: 'rui314/chibicc', nota: 'Compilador C, commit a commit', nivel: 'avançado', lang: 'C', temas: ['compiladores'], tipo: 'tutorial', start: 'tokenize.c',
    guia: {
      sobre: 'Um compilador de C (C11) escrito em C, capaz de compilar projetos reais como o SQLite.',
      porque: 'O histórico de commits é a aula: cada commit acrescenta um recurso pequeno e testado, do "retornar um número" até o C completo.',
      antes: ['C.', 'Ter lido um compilador simples (the-super-tiny-compiler).', 'Noção de assembly x86-64.'],
      comoLer: 'Leia os commits em ordem, a partir do primeiro (o histórico do GitHub mostra um por um). O código final é grande; a evolução é o que ensina.',
      conceitos: ['tokenizacao', 'parser', 'ast', 'geracao-codigo'],
      passos: [
        P('Tokenizar', 'tokenize.c', 'Token *tokenize', 'O código vira uma lista ligada de tokens.'),
        P('A árvore', 'parse.c', 'Obj *parse', 'Parser recursivo descendente para a gramática do C.'),
        P('Gerar assembly', 'codegen.c', 'void codegen', 'Cada nó da árvore vira instruções x86-64.'),
        P('Juntar tudo', 'main.c', 'int main', 'Pré-processar, compilar, montar e ligar.'),
      ],
      tempo: 'semanas', depois: 'sqlite/sqlite',
    },
  },
  {
    repo: 'git/git', nota: 'O controle de versão de todos', nivel: 'avançado', lang: 'C', temas: [], tipo: 'ferramenta', start: 'read-cache.c', famoso: 'Sistemas',
    guia: {
      sobre: 'O próprio Git.',
      porque: 'Entender objetos, índice e referências por dentro faz o Git deixar de parecer mágico.',
      antes: ['Usar Git no dia a dia.', 'C intermediário.'],
      comoLer: 'Leia antes o capítulo "Git Internals" do livro Pro Git. Depois veja aqui como blobs e o índice são gravados.',
      conceitos: ['hash', 'grafo', 'arvore-b'],
      passos: [
        P('O índice', 'read-cache.c', 'int add_to_index', 'O que git add faz: põe o arquivo na área de preparação.'),
        P('O comando add', 'builtin/add.c', 'int cmd_add', 'Cada comando é um arquivo em builtin.'),
      ],
      tempo: '2 horas',
    },
  },
  {
    repo: 'nginx/nginx', nota: 'Servidor web e proxy', nivel: 'avançado', lang: 'C', temas: ['apis'], tipo: 'sistema', start: 'src/core/nginx.c', famoso: 'Sistemas',
    guia: {
      sobre: 'Servidor web, proxy reverso e balanceador de carga.',
      porque: 'Arquitetura de processos (mestre e trabalhadores) e laço de eventos que atende muitas conexões com pouca memória.',
      antes: ['C intermediário.', 'Ter configurado o nginx ajuda.'],
      comoLer: 'Siga a inicialização em nginx.c e depois o laço de eventos de cada trabalhador.',
      conceitos: ['event-loop', 'processo', 'http'],
      passos: [
        P('Começo', 'src/core/nginx.c', 'ngx_cdecl', 'Lê a configuração e cria os processos.'),
        P('O laço', 'src/event/ngx_event.c', 'ngx_process_events_and_timers', 'Cada trabalhador espera eventos e timers aqui.'),
      ],
      tempo: '2 horas',
    },
  },
  {
    repo: 'FFmpeg/FFmpeg', nota: 'Áudio e vídeo em tudo', nivel: 'avançado', lang: 'C', temas: [], tipo: 'ferramenta', start: 'libavcodec/avcodec.c', famoso: 'Sistemas',
    guia: {
      sobre: 'Bibliotecas e ferramentas que decodificam, codificam e convertem praticamente qualquer áudio e vídeo.',
      porque: 'Mostra uma API em C bem desenhada (codecs como "classes" com ponteiros de função) usada por quase todo player.',
      antes: ['C intermediário.', 'Noção de codec e contêiner.'],
      comoLer: 'Comece pela API pública de codecs e pelo exemplo da pasta doc/examples que decodifica vídeo.',
      conceitos: ['ponteiros', 'interfaces'],
      passos: [
        P('Abrir um codec', 'libavcodec/avcodec.c', 'int attribute_align_arg avcodec_open2', 'Como um codec é escolhido e preparado.'),
        P('Um exemplo', 'doc/examples/decode_video.c', 'int main', 'Decodificar quadros de vídeo do começo ao fim.'),
      ],
      tempo: '2 horas',
    },
  },
  {
    repo: 'neovim/neovim', nota: 'O Vim, renovado', nivel: 'avançado', lang: 'C', temas: ['cli'], tipo: 'aplicação', start: 'src/nvim/main.c', famoso: 'Ferramentas',
    guia: {
      sobre: 'Editor de texto derivado do Vim, com Lua e arquitetura de cliente e servidor.',
      porque: 'Um projeto antigo modernizado com cuidado: C refatorado, testes e uma API usada por interfaces externas.',
      antes: ['Usar Vim ou Neovim.', 'C intermediário.'],
      comoLer: 'Comece pelo main e pelos laços de entrada; depois veja como a API (msgpack-rpc) expõe o editor.',
      conceitos: ['event-loop', 'raw-mode'],
      passos: [
        P('Início', 'src/nvim/main.c', 'int main', 'Inicialização, argumentos e o laço principal.'),
        P('Buffers', 'src/nvim/buffer.c', 'buflist_new', 'Um arquivo aberto é um buffer.'),
      ],
      tempo: '2 horas',
    },
  },
  {
    repo: 'ggml-org/llama.cpp', nota: 'Inferência local em C++', nivel: 'avançado', lang: 'C++', temas: ['ia'], tipo: 'ferramenta', start: 'src/llama.cpp', famoso: 'IA',
    guia: {
      sobre: 'Roda LLMs em CPUs e GPUs comuns, com quantização e sem dependências pesadas.',
      porque: 'Inferência de verdade, otimizada à mão: carregamento de pesos, tensores e amostragem.',
      antes: ['C++.', 'Ter lido o nanoGPT para saber o que é um Transformer.'],
      comoLer: 'Comece pelo exemplo "simple": ele mostra a API inteira em poucas dezenas de linhas. Depois veja onde cada chamada vive na biblioteca.',
      conceitos: ['inferencia', 'transformer', 'tokens'],
      passos: [
        P('O exemplo mínimo', 'examples/simple/simple.cpp', 'int main', 'Carregar modelo, tokenizar, gerar e imprimir.'),
        P('Amostragem', 'src/llama-sampler.cpp', 'static void llama_sampler_top_k_impl', 'Como o próximo token é escolhido: top-k corta os candidatos menos prováveis.'),
      ],
      tempo: '3 horas',
    },
  },
  {
    repo: 'godotengine/godot', nota: 'Motor de jogos livre', nivel: 'avançado', lang: 'C++', temas: [], tipo: 'aplicação', start: 'core/object/object.cpp', famoso: 'Ferramentas',
    guia: {
      sobre: 'Motor de jogos 2D e 3D completo e livre.',
      porque: 'C++ organizado em volta de poucas ideias: Object, nós em árvore e sinais.',
      antes: ['C++ intermediário.', 'Ter usado o Godot ajuda muito.'],
      comoLer: 'Entenda Object (a base de tudo) e Node (a árvore da cena); o resto do motor se apoia nisso.',
      conceitos: ['pub-sub', 'composicao', 'grafo'],
      passos: [
        P('A base de tudo', 'core/object/object.cpp', 'Error Object::emit_signalp', 'Como um sinal chega a todos os objetos conectados.'),
        P('A árvore da cena', 'scene/main/node.cpp', 'void Node::add_child', 'Como um nó entra na árvore.'),
      ],
      tempo: '2 horas',
    },
  },
  {
    repo: 'bitcoin/bitcoin', nota: 'A primeira criptomoeda', nivel: 'avançado', lang: 'C++', temas: [], tipo: 'sistema', start: 'src/validation.cpp', famoso: 'Ferramentas',
    guia: {
      sobre: 'O Bitcoin Core: a implementação de referência do Bitcoin.',
      porque: 'Código de altíssimo cuidado, revisado por muita gente, em que um erro custa caro.',
      antes: ['C++.', 'Ler o artigo original do Bitcoin.'],
      comoLer: 'Siga uma transação: a estrutura de dados, o script que a valida e a entrada na mempool.',
      conceitos: ['hash', 'interpretador', 'consenso'],
      passos: [
        P('A transação', 'src/primitives/transaction.h', 'class CTransaction', 'Entradas, saídas e o hash.'),
        P('O script', 'src/script/interpreter.cpp', 'bool EvalScript', 'Uma pequena máquina de pilha valida cada gasto.'),
        P('Validar', 'src/validation.cpp', 'AcceptToMemoryPool', 'Regras para uma transação entrar na fila.'),
      ],
      tempo: '3 horas',
    },
  },
]);
