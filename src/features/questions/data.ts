export interface QuestionOption {
  id: string;
  label: string;
}

export interface CommunityComment {
  author: string;
  comment: string;
}

export interface Question {
  id: string;
  code: string;
  subject: string;
  topic: string;
  year: number;
  type: "Múltipla escolha";
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

export const questions: Question[] = [
  {
    id: "q2023-112",
    code: "Q2023-112",
    subject: "Tecnologia da informação",
    topic: "Estruturas de Controle",
    year: 2023,
    type: "Múltipla escolha",
    statement:
      "Considere as afirmativas: I. O switch em C# permite o uso de expressões com tipos string. II. O foreach é utilizado para percorrer coleções que implementam IEnumerable. III. O while sempre executa pelo menos uma vez o bloco de código. IV. O do...while garante a execução mínima de uma vez.",
    options: [
      { id: "a", label: "Apenas I e II estão corretas." },
      { id: "b", label: "Apenas III e IV estão corretas." },
      { id: "c", label: "Apenas II e IV estão corretas." },
      { id: "d", label: "Apenas I, II e IV estão corretas." },
      { id: "e", label: "Todas as afirmativas estão corretas." },
    ],
    correctOptionId: "d",
    aiExplanation:
      "Analisando as afirmativas: ✔ I — Verdadeira. O C# permite utilizar string em estruturas switch. ✔ II — Verdadeira. O foreach percorre coleções que implementam IEnumerable. ✘ III — Falsa. O laço while pode não executar nenhuma vez se a condição inicial for falsa. ✔ IV — Verdadeira. O do...while executa o bloco ao menos uma vez antes da verificação da condição. Portanto, o gabarito correto é a alternativa D.",
    teacher: {
      name: "Professora Marcela Guedes",
      credentials: "Eng. de Software · UNICAMP · 12 anos ENADE",
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
    subject: "Ciências da Computação",
    topic: "Orientação a Objetos",
    year: 2024,
    type: "Múltipla escolha",
    statement:
      "Considere as afirmativas: I. A herança múltipla de classes é permitida em C#. II. Interfaces podem ser implementadas por múltiplas classes. III. O modificador sealed impede que uma classe seja herdada. IV. O polimorfismo permite que métodos sejam sobrescritos em classes derivadas.",
    options: [
      { id: "a", label: "Apenas I e II estão corretas." },
      { id: "b", label: "Apenas II e III estão corretas." },
      { id: "c", label: "Apenas II, III e IV estão corretas" },
      { id: "d", label: "Apenas III e IV estão corretas." },
      { id: "e", label: "Todas as afirmativas estão corretas." },
    ],
    correctOptionId: "c",
    aiExplanation:
      "I é falsa: C# não permite herança múltipla de classes. II, III e IV estão corretas: interfaces podem ser implementadas por múltiplas classes, sealed impede herança e o polimorfismo permite sobrescrita de métodos. Gabarito: C.",
    teacher: {
      name: "Professora Marcela Guedes",
      credentials: "Eng. de Software · UNICAMP · 12 anos ENADE",
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
    subject: "Tecnologia da informação",
    topic: "Manipulação de Exceções",
    year: 2022,
    type: "Múltipla escolha",
    statement:
      "Considere as afirmativas: I. O bloco finally é sempre executado, independentemente de ocorrer exceção. II. É possível criar exceções personalizadas herdando de Exception. III. O bloco catch pode capturar exceções específicas por tipo. IV. O uso de throw permite relançar exceções capturadas.",
    options: [
      { id: "a", label: "Apenas I e II estão corretas." },
      { id: "b", label: "Apenas II e III estão corretas." },
      { id: "c", label: "Apenas I, II e IV estão corretas" },
      { id: "d", label: "Apenas I, II, III e IV estão corretas." },
      { id: "e", label: "Apenas III e IV estão corretas." },
    ],
    correctOptionId: "d",
    aiExplanation:
      "Todas as quatro assertivas descrevem corretamente o tratamento de exceções em C#: finally sempre executa, exceções customizadas herdam de Exception, catch pode ser tipado e throw relança exceções. Gabarito: D.",
    teacher: {
      name: "Professora Marcela Guedes",
      credentials: "Eng. de Software · UNICAMP · 12 anos ENADE",
      comment:
        "Questão direta sobre o modelo try/catch/finally. Vale reforçar: mesmo com um return dentro do try, o finally ainda é executado antes do retorno efetivo.",
    },
    community: [],
  },
];
