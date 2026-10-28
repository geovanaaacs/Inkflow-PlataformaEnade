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

/** Anotação individual — uma questão pode ter várias. */
export interface NoteRecord {
  id: string;
  userId: string;
  questionId: string;
  content: string;
  createdAt: string;
}
