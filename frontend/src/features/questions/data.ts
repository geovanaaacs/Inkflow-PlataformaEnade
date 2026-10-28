import { daysAgoIso } from "@/shared/utils/dates";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface CommunityComment {
  author: string;
  comment: string;
}

/** Área de TI (mesmas áreas da tabela Areas do banco). */
export interface Area {
  slug: string;
  name: string;
  /** Rótulo curto usado no dashboard. */
  shortName: string;
}

export type Difficulty = "fácil" | "médio" | "difícil";

export interface Question {
  id: string;
  code: string;
  area: Area;
  topic: string;
  year: number;
  type: "Múltipla escolha";
  difficulty: Difficulty;
  statement: string;
  options: QuestionOption[];
  correctOptionId: string;
  aiExplanation: string;
  teacher: {
    name: string;
    credentials: string;
    comment: string;
  };
  community: CommunityComment[];
}

/** Resposta de um aluno. Só a primeira tentativa (attemptNumber = 1) conta no limite diário. */
export interface AnswerRecord {
  id: string;
  userId: string;
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
  attemptNumber: number;
  answeredAt: string;
  /** Set when the answer was given inside a mock exam (simulado). */
  mockExamAttemptId?: string;
  /**
   * Profile of who answered, frozen at answer time. Only "aluno" answers feed
   * the rankings; teachers answer to contribute. Missing = "aluno" (old seeds).
   */
  answeredAsRole?: "aluno" | "professor" | "admin";
}

/** Anotação individual — uma questão pode ter várias. */
export interface NoteRecord {
  id: string;
  userId: string;
  questionId: string;
  content: string;
  createdAt: string;
}

const AREA = {
  engenhariaSoftware: {
    slug: "engenharia-de-software",
    name: "Engenharia de Software",
    shortName: "Eng. de Software",
  },
  bancoDados: { slug: "banco-de-dados", name: "Banco de Dados", shortName: "Banco de Dados" },
  redes: { slug: "redes", name: "Redes de Computadores", shortName: "Redes" },
  ia: { slug: "ia", name: "Inteligência Artificial", shortName: "IA / ML" },
  algoritmos: {
    slug: "algoritmos",
    name: "Algoritmos e Complexidade",
    shortName: "Algoritmos",
  },
  sistemasOperacionais: {
    slug: "sistemas-operacionais",
    name: "Sistemas Operacionais",
    shortName: "Sist. Operacionais",
  },
} satisfies Record<string, Area>;

export const areas: Area[] = Object.values(AREA);

const MARCELA = {
  name: "Professora Marcela Guedes",
  credentials: "Eng. de Software · UNICAMP · 12 anos ENADE",
};

/** Alternativas no formato "Apenas I e II estão corretas." de a–e. */
function options(labels: [string, string, string, string, string]): QuestionOption[] {
  return labels.map((label, index) => ({ id: String.fromCharCode(97 + index), label }));
}

export const questions: Question[] = [
  {
    id: "q2023-112",
    code: "Q2023-112",
    area: AREA.algoritmos,
    topic: "Estruturas de Controle",
    year: 2023,
    type: "Múltipla escolha",
    difficulty: "médio",
    statement: `Considere as afirmativas:

I. O switch em C# permite o uso de expressões com tipos string.
II. O foreach é utilizado para percorrer coleções que implementam IEnumerable.
III. O while sempre executa pelo menos uma vez o bloco de código.
IV. O do...while garante a execução mínima de uma vez.

Assinale a resposta correta.`,
    options: options([
      "Apenas I e II estão corretas.",
      "Apenas III e IV estão corretas.",
      "Apenas II e IV estão corretas.",
      "Apenas I, II e IV estão corretas.",
      "Todas as afirmativas estão corretas.",
    ]),
    correctOptionId: "d",
    aiExplanation: `Analisando as afirmativas:

✔ I — Verdadeira. O C# permite utilizar string em estruturas switch.
✔ II — Verdadeira. O foreach percorre coleções que implementam IEnumerable.
✘ III — Falsa. O laço while pode não executar nenhuma vez se a condição inicial for falsa.
✔ IV — Verdadeira. O do...while executa o bloco ao menos uma vez antes da verificação da condição.

Portanto, o gabarito correto é a alternativa D.`,
    teacher: {
      ...MARCELA,
      comment:
        "A alternativa correta é a letra D. As assertivas I, II e IV estão corretas sob a ótica da linguagem C#. Em especial, destaca-se que o comando do...while garante ao menos uma execução do bloco, diferentemente do while, cuja condição é verificada antes da execução. Portanto, a assertiva III é incorreta.",
    },
    community: [
      {
        author: "Nicole Silva",
        comment:
          "A alternativa correta é a letra D. A afirmativa I está correta porque o C# permite utilizar string dentro do switch. A II também está certa, já que o foreach é usado para percorrer coleções que implementam IEnumerable. A III está errada, porque o while pode sim não executar nenhuma vez, dependendo da condição. E a IV está correta, pois o do...while executa pelo menos uma vez antes de verificar a condição.",
      },
      {
        author: "Paula Cunha",
        comment:
          "Marquei a letra D. I e II estão corretas. A III está errada porque o while pode não entrar no bloco nenhuma vez. A IV também está correta, já que o do...while executa ao menos uma vez.",
      },
    ],
  },
  {
    id: "q2024-80",
    code: "Q2024-80",
    area: AREA.engenhariaSoftware,
    topic: "Orientação a Objetos",
    year: 2024,
    type: "Múltipla escolha",
    difficulty: "difícil",
    statement: `Considere as afirmativas:

I. A herança múltipla de classes é permitida em C#.
II. Interfaces podem ser implementadas por múltiplas classes.
III. O modificador sealed impede que uma classe seja herdada.
IV. O polimorfismo permite que métodos sejam sobrescritos em classes derivadas.

Assinale a opção correta.`,
    options: options([
      "Apenas I e II estão corretas.",
      "Apenas II e III estão corretas.",
      "Apenas II, III e IV estão corretas.",
      "Apenas III e IV estão corretas.",
      "Todas as afirmativas estão corretas.",
    ]),
    correctOptionId: "c",
    aiExplanation: `I é falsa: C# não permite herança múltipla de classes.
II, III e IV estão corretas: interfaces podem ser implementadas por múltiplas classes, sealed impede herança e o polimorfismo permite sobrescrita de métodos.

Gabarito: C.`,
    teacher: {
      ...MARCELA,
      comment:
        "Cuidado com a pegadinha da herança múltipla — em C# ela só é permitida entre interfaces, nunca entre classes. As demais assertivas descrevem corretamente os conceitos de orientação a objetos da linguagem.",
    },
    community: [
      {
        author: "Rafael Nunes",
        comment: "Errei porque esqueci que sealed impede herança. Bom saber!",
      },
    ],
  },
  {
    id: "q2022-92",
    code: "Q2022-92",
    area: AREA.engenhariaSoftware,
    topic: "Manipulação de Exceções",
    year: 2022,
    type: "Múltipla escolha",
    difficulty: "fácil",
    statement: `Considere as afirmativas:

I. O bloco finally é sempre executado, independentemente de ocorrer exceção.
II. É possível criar exceções personalizadas herdando de Exception.
III. O bloco catch pode capturar exceções específicas por tipo.
IV. O uso de throw permite relançar exceções capturadas.`,
    options: options([
      "Apenas I e II estão corretas.",
      "Apenas II e III estão corretas.",
      "Apenas I, II e IV estão corretas.",
      "Apenas I, II, III e IV estão corretas.",
      "Apenas III e IV estão corretas.",
    ]),
    correctOptionId: "d",
    aiExplanation:
      "Todas as quatro assertivas descrevem corretamente o tratamento de exceções em C#: finally sempre executa, exceções customizadas herdam de Exception, catch pode ser tipado e throw relança exceções. Gabarito: D.",
    teacher: {
      ...MARCELA,
      comment:
        "Questão direta sobre o modelo try/catch/finally. Vale reforçar: mesmo com um return dentro do try, o finally ainda é executado antes do retorno efetivo.",
    },
    community: [],
  },
  {
    id: "q2021-15",
    code: "Q2021-15",
    area: AREA.engenhariaSoftware,
    topic: "Padrões de Projeto",
    year: 2021,
    type: "Múltipla escolha",
    difficulty: "médio",
    statement:
      "Uma loja virtual precisa permitir que o cálculo de frete seja trocado em tempo de execução (por peso, por distância ou frete grátis), sem alterar a classe que finaliza o pedido. Qual padrão de projeto é o mais adequado para essa situação?",
    options: options(["Singleton", "Strategy", "Observer", "Adapter", "Composite"]),
    correctOptionId: "b",
    aiExplanation:
      "O Strategy encapsula uma família de algoritmos intercambiáveis atrás de uma mesma interface (ex.: ICalculoFrete). A classe do pedido recebe a estratégia e não precisa mudar quando uma nova forma de cálculo é criada. Singleton garante instância única, Observer notifica mudanças, Adapter converte interfaces e Composite trata hierarquias parte-todo. Gabarito: B.",
    teacher: {
      ...MARCELA,
      comment:
        "Sempre que o enunciado falar em trocar um comportamento em tempo de execução sem alterar quem o usa, pense em Strategy. É um dos padrões mais cobrados no ENADE.",
    },
    community: [],
  },
  {
    id: "q2024-34",
    code: "Q2024-34",
    area: AREA.bancoDados,
    topic: "Normalização de Dados",
    year: 2024,
    type: "Múltipla escolha",
    difficulty: "médio",
    statement:
      "A tabela Pedido(NumPedido, CodProduto, NomeProduto, Quantidade) tem chave primária composta por (NumPedido, CodProduto). O atributo NomeProduto depende apenas de CodProduto. Essa tabela viola qual forma normal?",
    options: options([
      "Primeira forma normal (1FN)",
      "Segunda forma normal (2FN)",
      "Terceira forma normal (3FN)",
      "Forma normal de Boyce-Codd (FNBC)",
      "Nenhuma — a tabela está normalizada",
    ]),
    correctOptionId: "b",
    aiExplanation:
      "Há uma dependência parcial: NomeProduto depende de apenas parte da chave composta (CodProduto). A 2FN exige que todo atributo não-chave dependa da chave inteira. A solução é mover NomeProduto para uma tabela Produto(CodProduto, NomeProduto). Gabarito: B.",
    teacher: {
      ...MARCELA,
      comment:
        "Dependência de parte da chave composta = violação da 2FN. Dependência entre atributos não-chave = violação da 3FN. Guarde essa diferença.",
    },
    community: [],
  },
  {
    id: "q2023-58",
    code: "Q2023-58",
    area: AREA.bancoDados,
    topic: "Linguagem SQL",
    year: 2023,
    type: "Múltipla escolha",
    difficulty: "fácil",
    statement: `Considere a consulta SQL a seguir:

SELECT curso, COUNT(*)
FROM Aluno
GROUP BY curso
HAVING COUNT(*) > 30;

O que essa consulta retorna?`,
    options: options([
      "Todos os alunos dos cursos que têm mais de 30 alunos.",
      "Os cursos com mais de 30 alunos e a quantidade de alunos de cada um.",
      "O total de alunos matriculados em todos os cursos.",
      "Os 30 primeiros cursos em ordem alfabética.",
      "Um erro, pois HAVING não pode usar funções de agregação.",
    ]),
    correctOptionId: "b",
    aiExplanation:
      "O GROUP BY agrupa os alunos por curso e o COUNT(*) conta quantos há em cada grupo. O HAVING filtra os grupos depois da agregação, mantendo apenas os cursos com mais de 30 alunos. Gabarito: B.",
    teacher: {
      ...MARCELA,
      comment:
        "WHERE filtra linhas antes do agrupamento; HAVING filtra grupos depois. Por isso funções de agregação aparecem no HAVING, e não no WHERE.",
    },
    community: [],
  },
  {
    id: "q2022-47",
    code: "Q2022-47",
    area: AREA.redes,
    topic: "Protocolos HTTP",
    year: 2022,
    type: "Múltipla escolha",
    difficulty: "fácil",
    statement:
      "Em uma API REST, um cliente envia uma requisição GET para buscar um recurso que não existe no servidor. Qual código de status HTTP o servidor deve retornar?",
    options: options([
      "200 OK",
      "201 Created",
      "301 Moved Permanently",
      "404 Not Found",
      "500 Internal Server Error",
    ]),
    correctOptionId: "d",
    aiExplanation:
      "Códigos 4xx indicam erro do cliente; o 404 informa que o recurso solicitado não foi encontrado. 200 e 201 indicam sucesso, 301 indica redirecionamento e 500 indica falha interna do servidor. Gabarito: D.",
    teacher: {
      ...MARCELA,
      comment:
        "Memorize as famílias: 2xx sucesso, 3xx redirecionamento, 4xx erro do cliente, 5xx erro do servidor.",
    },
    community: [],
  },
  {
    id: "q2023-12",
    code: "Q2023-12",
    area: AREA.redes,
    topic: "Camada de Transporte",
    year: 2023,
    type: "Múltipla escolha",
    difficulty: "médio",
    statement: `Sobre os protocolos TCP e UDP, avalie as afirmativas:

I. O TCP é orientado à conexão e garante a entrega ordenada dos segmentos.
II. O UDP realiza controle de congestionamento.
III. Transmissões de vídeo ao vivo costumam usar UDP por tolerarem perdas e priorizarem baixa latência.
IV. O handshake de três vias é utilizado pelo UDP para estabelecer conexões.

É correto o que se afirma em:`,
    options: options([
      "I e II, apenas.",
      "I e III, apenas.",
      "II e IV, apenas.",
      "I, III e IV, apenas.",
      "I, II, III e IV.",
    ]),
    correctOptionId: "b",
    aiExplanation:
      "I é verdadeira: o TCP estabelece conexão e garante ordem e entrega. II é falsa: o UDP não faz controle de congestionamento. III é verdadeira: streaming ao vivo prefere baixa latência a retransmissões. IV é falsa: o handshake de três vias é do TCP. Gabarito: B.",
    teacher: {
      ...MARCELA,
      comment:
        "O UDP é 'enxuto': sem conexão, sem garantia de entrega e sem controle de congestionamento. Tudo isso é responsabilidade do TCP.",
    },
    community: [],
  },
  {
    id: "q2023-201",
    code: "Q2023-201",
    area: AREA.ia,
    topic: "Redes Neurais",
    year: 2023,
    type: "Múltipla escolha",
    difficulty: "difícil",
    statement:
      "Um perceptron de camada única é treinado para aprender funções lógicas booleanas de duas entradas. Qual das funções abaixo ele NÃO consegue aprender?",
    options: options(["AND", "OR", "NAND", "XOR", "NOR"]),
    correctOptionId: "d",
    aiExplanation:
      "O perceptron de camada única só aprende funções linearmente separáveis. AND, OR, NAND e NOR podem ser separadas por uma reta; o XOR não. Para aprender o XOR é necessária ao menos uma camada oculta (perceptron multicamadas). Gabarito: D.",
    teacher: {
      ...MARCELA,
      comment:
        "O problema do XOR é histórico: foi ele que motivou o uso de redes com camadas ocultas. Vale desenhar os quatro pontos no plano para visualizar.",
    },
    community: [],
  },
  {
    id: "q2024-9",
    code: "Q2024-9",
    area: AREA.ia,
    topic: "Aprendizado de Máquina",
    year: 2024,
    type: "Múltipla escolha",
    difficulty: "médio",
    statement:
      "Uma empresa possui um histórico de e-mails já rotulados como 'spam' ou 'não spam' e deseja treinar um modelo para classificar automaticamente os novos e-mails. Esse problema é um exemplo de:",
    options: options([
      "Aprendizado não supervisionado — agrupamento.",
      "Aprendizado supervisionado — classificação.",
      "Aprendizado supervisionado — regressão.",
      "Aprendizado por reforço.",
      "Redução de dimensionalidade.",
    ]),
    correctOptionId: "b",
    aiExplanation:
      "Os dados de treino já têm rótulo (spam / não spam), então o aprendizado é supervisionado. Como a saída é uma categoria e não um valor contínuo, trata-se de classificação. Gabarito: B.",
    teacher: {
      ...MARCELA,
      comment:
        "Dados rotulados → supervisionado. Saída categórica → classificação; saída numérica contínua → regressão.",
    },
    community: [],
  },
  {
    id: "q2021-78",
    code: "Q2021-78",
    area: AREA.algoritmos,
    topic: "Algoritmos de Busca",
    year: 2021,
    type: "Múltipla escolha",
    difficulty: "médio",
    statement:
      "Um vetor ordenado possui 1.024 elementos. Utilizando busca binária, qual é o número máximo de comparações necessárias para determinar se um elemento está presente no vetor?",
    options: options(["10", "11", "32", "512", "1.024"]),
    correctOptionId: "b",
    aiExplanation:
      "Cada comparação da busca binária descarta metade do intervalo. Após 10 divisões (2¹⁰ = 1.024) resta um único elemento, que ainda precisa ser comparado: ⌊log₂ n⌋ + 1 = 11 comparações no pior caso. Gabarito: B.",
    teacher: {
      ...MARCELA,
      comment:
        "A busca binária é O(log n). Cuidado com o +1: o último elemento restante também precisa ser comparado.",
    },
    community: [],
  },
  {
    id: "q2022-66",
    code: "Q2022-66",
    area: AREA.algoritmos,
    topic: "Complexidade de Algoritmos",
    year: 2022,
    type: "Múltipla escolha",
    difficulty: "difícil",
    statement: `Sobre a complexidade de algoritmos de ordenação, avalie as afirmativas:

I. O Merge Sort tem complexidade O(n log n) no pior caso.
II. O Quick Sort tem complexidade O(n log n) no pior caso.
III. O Bubble Sort tem complexidade O(n²) no pior caso.
IV. O Insertion Sort executa em tempo O(n) quando o vetor de entrada já está ordenado.

É correto o que se afirma em:`,
    options: options([
      "I e III, apenas.",
      "I, III e IV, apenas.",
      "II e IV, apenas.",
      "I, II e III, apenas.",
      "I, II, III e IV.",
    ]),
    correctOptionId: "b",
    aiExplanation:
      "I, III e IV estão corretas. II é falsa: o pior caso do Quick Sort é O(n²), que ocorre quando o pivô escolhido é sempre o menor ou o maior elemento; O(n log n) é o caso médio. Gabarito: B.",
    teacher: {
      ...MARCELA,
      comment:
        "O Quick Sort é rápido na prática, mas o pior caso quadrático é uma pegadinha clássica. Já o Merge Sort garante O(n log n) em qualquer caso.",
    },
    community: [],
  },
  {
    id: "q2023-140",
    code: "Q2023-140",
    area: AREA.sistemasOperacionais,
    topic: "Gerência de Processos",
    year: 2023,
    type: "Múltipla escolha",
    difficulty: "médio",
    statement:
      "No algoritmo de escalonamento Round Robin, o que acontece quando o quantum de tempo é muito grande em relação à duração dos processos?",
    options: options([
      "O algoritmo passa a se comportar como FCFS (FIFO).",
      "Ocorre starvation dos processos de menor prioridade.",
      "O número de trocas de contexto aumenta muito.",
      "O algoritmo passa a se comportar como SJF.",
      "O sistema entra em deadlock.",
    ]),
    correctOptionId: "a",
    aiExplanation:
      "Com um quantum maior que a duração dos processos, cada processo termina antes de ser preemptado, na ordem de chegada — exatamente o comportamento do FCFS. Um quantum muito pequeno, ao contrário, aumentaria as trocas de contexto. Gabarito: A.",
    teacher: {
      ...MARCELA,
      comment:
        "Quantum grande demais vira FCFS; quantum pequeno demais gasta a CPU com trocas de contexto. O desafio do Round Robin é equilibrar os dois.",
    },
    community: [],
  },
  {
    id: "q2024-51",
    code: "Q2024-51",
    area: AREA.sistemasOperacionais,
    topic: "Deadlock",
    year: 2024,
    type: "Múltipla escolha",
    difficulty: "difícil",
    statement:
      "Para que ocorra um deadlock, quatro condições precisam ser satisfeitas simultaneamente (condições de Coffman). Qual alternativa NÃO é uma dessas condições?",
    options: options([
      "Exclusão mútua.",
      "Posse e espera.",
      "Não preempção.",
      "Espera circular.",
      "Preempção de recursos pelo sistema operacional.",
    ]),
    correctOptionId: "e",
    aiExplanation:
      "As condições de Coffman são exclusão mútua, posse e espera, não preempção e espera circular. Permitir a preempção de recursos é, na verdade, uma forma de prevenir o deadlock, pois quebra a condição de não preempção. Gabarito: E.",
    teacher: {
      ...MARCELA,
      comment:
        "Para prevenir deadlock basta quebrar uma das quatro condições. A alternativa E descreve justamente uma estratégia de prevenção.",
    },
    community: [],
  },
];

/*
 * Seeds do histórico dos usuários mock (ids de features/auth/data.ts).
 * Datas relativas ao primeiro acesso, para o dashboard mostrar "Hoje"/"Ontem".
 */

function answer(
  userId: string,
  questionId: string,
  selectedOptionId: string,
  daysAgo: number,
  hour: number,
  attemptNumber = 1
): AnswerRecord {
  const question = questions.find((item) => item.id === questionId);
  return {
    id: `a-${userId}-${questionId}-${attemptNumber}`,
    userId,
    questionId,
    selectedOptionId,
    correct: question?.correctOptionId === selectedOptionId,
    attemptNumber,
    answeredAt: daysAgoIso(daysAgo, hour),
  };
}

export function seedAnswers(): AnswerRecord[] {
  return [
    // Maria (Básico): 7 questões hoje → banner "7/10 questões hoje".
    answer("u-maria", "q2023-201", "d", 2, 19),
    answer("u-maria", "q2021-78", "a", 1, 20),
    answer("u-maria", "q2023-112", "d", 0, 8),
    answer("u-maria", "q2024-80", "a", 0, 8),
    answer("u-maria", "q2022-92", "d", 0, 9),
    answer("u-maria", "q2022-47", "b", 0, 9),
    answer("u-maria", "q2024-34", "b", 0, 10),
    answer("u-maria", "q2023-58", "b", 0, 10),
    answer("u-maria", "q2021-15", "a", 0, 11),
    // Paula (Avançado)
    answer("u-paula", "q2023-112", "d", 0, 9),
    answer("u-paula", "q2022-92", "a", 0, 9),
    answer("u-paula", "q2024-34", "b", 1, 18),
    answer("u-paula", "q2023-12", "b", 1, 18),
    answer("u-paula", "q2022-66", "d", 3, 21),
    // Nicole (Premium)
    answer("u-nicole", "q2023-112", "d", 0, 7),
    answer("u-nicole", "q2024-80", "c", 0, 7),
    answer("u-nicole", "q2022-92", "d", 1, 22),
    answer("u-nicole", "q2023-201", "d", 1, 22),
    answer("u-nicole", "q2024-51", "e", 2, 20),
    answer("u-nicole", "q2023-140", "a", 2, 20),
    // Rafael (Básico): errou e tentou de novo
    answer("u-rafael", "q2024-80", "b", 3, 15),
    answer("u-rafael", "q2024-80", "c", 3, 15, 2),
  ];
}

export function seedNotes(): NoteRecord[] {
  return [
    {
      id: "n-paula-1",
      userId: "u-paula",
      questionId: "q2022-92",
      content: "Mesmo com return dentro do try, o finally roda antes de sair do método.",
      createdAt: daysAgoIso(0, 9, 30),
    },
    {
      id: "n-paula-2",
      userId: "u-paula",
      questionId: "q2024-34",
      content: "Dependência de PARTE da chave composta = 2FN. Entre não-chaves = 3FN.",
      createdAt: daysAgoIso(1, 18, 40),
    },
    {
      id: "n-paula-3",
      userId: "u-paula",
      questionId: "q2024-34",
      content: "Revisar exemplos de FNBC antes da prova.",
      createdAt: daysAgoIso(0, 11, 5),
    },
    {
      id: "n-nicole-1",
      userId: "u-nicole",
      questionId: "q2024-80",
      content: "C# não tem herança múltipla de CLASSES, só de interfaces. sealed bloqueia herança.",
      createdAt: daysAgoIso(0, 7, 20),
    },
    {
      id: "n-nicole-2",
      userId: "u-nicole",
      questionId: "q2023-201",
      content: "XOR não é linearmente separável → precisa de camada oculta.",
      createdAt: daysAgoIso(1, 22, 15),
    },
  ];
}
