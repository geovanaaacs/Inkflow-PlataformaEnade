import { env } from "../../config/env.js";
import { HttpError } from "../../http/errors.js";

/*
 * Explanation of a multiple-choice question by AI (Google Gemini, generateContent
 * REST API). The key stays on the server (GEMINI_API_KEY in backend/.env): the
 * web and the desktop app only call POST /api/admin/questions/ai-explanation.
 *
 * The free tier of Google AI Studio has per-minute and per-day limits, and
 * Google may use what is sent to improve its products: only the question text
 * goes out (public exam content), never user data.
 */

export const OPTION_LETTERS = ["a", "b", "c", "d", "e"] as const;
export type OptionLetter = (typeof OPTION_LETTERS)[number];

export interface ExplainInput {
  statement: string;
  /** Texts of options A–E. */
  options: string[];
  /** Answer key, when known: the AI explains it instead of choosing. */
  correctOptionId?: OptionLetter;
}

export interface ExplainResult {
  correctOptionId: OptionLetter;
  /** True when the AI chose the answer (no answer key was given): the reviewer must check it. */
  suggestedByAi: boolean;
  explanation: string;
  model: string;
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 45_000;
/** Longest text accepted for each part (the model is asked for less). */
const MAX_PART = 600;

export function aiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/** What the model returns (JSON); the server turns it into the final text. */
interface ModelAnswer {
  correta?: unknown;
  porque?: unknown;
  erros?: unknown;
  pegadinha?: unknown;
  lembretes?: unknown;
}

function buildPrompt({ statement, options, correctOptionId }: ExplainInput): string {
  const lettered = options.map((text, index) => `${OPTION_LETTERS[index].toUpperCase()}) ${text.trim()}`).join("\n");
  const task = correctOptionId
    ? `O gabarito oficial é a alternativa ${correctOptionId.toUpperCase()}. Não questione o gabarito: explique por que ela está correta e por que as outras quatro estão erradas.`
    : "Não há gabarito informado: resolva a questão, escolha a alternativa correta e explique por que as outras quatro estão erradas.";

  return `Você é um professor de Tecnologia da Informação querido pelos alunos, daqueles que explicam qualquer assunto de um jeito que faz sentido na hora. Você prepara estudantes universitários para o ENADE.
Escreva o gabarito comentado desta questão de múltipla escolha. O aluno acabou de responder (pode ter acertado ou errado) e vai ler no celular.

Como escrever:
- Português do Brasil, linguagem clara, acessível e direta, como numa boa aula de monitoria. Se usar um termo técnico, explique-o na mesma frase.
- "porque": 2 ou 3 frases. Mostre o que o enunciado revela (a pista que leva à resposta) e qual conceito resolve a questão; cite o autor, a norma ou o modelo de referência quando houver um clássico (por exemplo: Codd, Tanenbaum, Scrum Guide, ISO).
- "erros": uma entrada para cada alternativa ERRADA (as quatro letras que não são o gabarito). Em cada uma, "tema" é o nome curto do conceito que a alternativa traz (por exemplo "Fila (FIFO)" ou "Teoria da Burocracia") e "erro" é 1 frase dizendo o que esse conceito é e por que não responde à questão.
- "pegadinha": a letra da alternativa errada mais tentadora, a que mais confunde quem estudou pela metade. Na entrada dela em "erros", explique a confusão.
- "lembretes": 1 ou 2 fórmulas curtas para lembrar na prova, escritas com os símbolos "+" e "=", no estilo "Foco em resultado + autonomia = Administração por Objetivos (APO)". Se fizer sentido, o segundo contrasta com o conceito da pegadinha, no mesmo estilo ("Foco em bem-estar + grupos informais = Relações Humanas").
- Comparações e exemplos neutros do dia a dia (pilha de pratos, fila de padaria, agenda do celular). Nunca cite marcas, empresas, serviços públicos, política ou religião.
- Tudo em português (nada de palavras em inglês fora dos termos técnicos da área), sem markdown, sem emojis, sem repetir o enunciado. Não comece frases com "O conceito central é" ou "Vamos analisar".

${task}

Questão:
${statement.trim()}

Alternativas:
${lettered}

Responda somente com um JSON, sem texto antes ou depois, neste formato:
{"correta": "c", "porque": "...", "erros": {"a": {"tema": "...", "erro": "..."}, "b": {"tema": "...", "erro": "..."}, "d": {"tema": "...", "erro": "..."}, "e": {"tema": "...", "erro": "..."}}, "pegadinha": "e", "lembretes": ["...", "..."]}`;
}

/** The model may wrap the JSON in ```json fences or add text around it. */
function parseAnswer(text: string): ModelAnswer {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("sem JSON");
  return JSON.parse(text.slice(start, end + 1)) as ModelAnswer;
}

function toLetter(value: unknown): OptionLetter | null {
  const letter = String(value ?? "").trim().toLowerCase().replace(/[^a-e]/g, "").slice(0, 1);
  return (OPTION_LETTERS as readonly string[]).includes(letter) ? (letter as OptionLetter) : null;
}

/** One line of text: no markdown, no line breaks, no trailing "Gabarito", within the size limit. */
function clean(value: unknown, max = MAX_PART): string {
  let text = typeof value === "string" ? value : "";
  text = text.replace(/\s+/g, " ").replace(/[*_#`]/g, "").trim();
  text = text.replace(/\s*Gabarito:.*$/i, "").trim();
  if (text.length > max) text = `${text.slice(0, max - 1).trimEnd()}…`;
  return text;
}

function sentence(text: string): string {
  return text && !/[.!?…]$/.test(text) ? `${text}.` : text;
}

/**
 * Final text, in the format of the "Gabarito IA" panel (plain text with line
 * breaks, shown as is on the site, the app and the desktop):
 *
 *   Gabarito: Alternativa C
 *
 *   Por que essa é a resposta?
 *   ...
 *
 *   Onde está o erro das outras opções?
 *   • A) Tema: erro
 *   • E) Tema: Essa é a principal pegadinha da questão. erro
 *
 *   Para lembrar na hora da prova:
 *   • lembrete
 */
function composeExplanation(answer: ModelAnswer, letter: OptionLetter): string | null {
  const why = sentence(clean(answer.porque));
  if (why.length < 20) return null;

  const errors = (answer.erros && typeof answer.erros === "object" ? answer.erros : {}) as Record<string, unknown>;
  const trap = toLetter(answer.pegadinha);
  const wrongLines = OPTION_LETTERS.filter((option) => option !== letter).flatMap((option) => {
    const entry = (errors[option] ?? errors[option.toUpperCase()]) as { tema?: unknown; erro?: unknown } | string | undefined;
    const theme = clean(typeof entry === "object" ? entry?.tema : "", 80).replace(/[:.]+$/, "");
    const reason = sentence(clean(typeof entry === "object" ? entry?.erro : entry));
    if (!reason) return [];
    const trapNote = option === trap ? "Essa é a principal pegadinha da questão. " : "";
    return [`• ${option.toUpperCase()})${theme ? ` ${theme}:` : ""} ${trapNote}${reason}`];
  });

  const reminders = (Array.isArray(answer.lembretes) ? answer.lembretes : [answer.lembretes])
    .map((item) => clean(item, 200))
    .filter((item) => item.length > 0)
    .slice(0, 3)
    .map((item) => `• ${item}`);

  const sections = [`Gabarito: Alternativa ${letter.toUpperCase()}`, `Por que essa é a resposta?\n${why}`];
  if (wrongLines.length > 0) sections.push(`Onde está o erro das outras opções?\n${wrongLines.join("\n")}`);
  if (reminders.length > 0) sections.push(`Para lembrar na hora da prova:\n${reminders.join("\n")}`);
  return sections.join("\n\n");
}

export async function explainQuestion(input: ExplainInput): Promise<ExplainResult> {
  if (!env.GEMINI_API_KEY) {
    throw new HttpError(
      503,
      "A IA não está configurada: coloque GEMINI_API_KEY no backend/.env (chave gratuita em aistudio.google.com) e reinicie a API."
    );
  }

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(502, "Não foi possível falar com a IA do Google agora. Confira a internet e tente de novo.");
  }

  const payload = (await response.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    error?: { message?: string; status?: string };
  } | null;

  if (!response.ok) {
    const detail = payload?.error?.message ?? `HTTP ${response.status}`;
    console.error(`[ia] Gemini respondeu ${response.status}: ${detail}`);
    if (response.status === 429) {
      throw new HttpError(429, "Limite gratuito da IA atingido. Aguarde um minuto e tente de novo (ou amanhã, se for o limite diário).");
    }
    if (response.status === 400 && /api key/i.test(detail)) {
      throw new HttpError(503, "A chave da IA (GEMINI_API_KEY) foi recusada pelo Google. Confira a chave no backend/.env.");
    }
    if (response.status === 403) {
      throw new HttpError(503, "A chave da IA (GEMINI_API_KEY) não tem acesso a este modelo. Confira a chave e o GEMINI_MODEL no backend/.env.");
    }
    if (response.status === 404) {
      throw new HttpError(503, `O modelo "${env.GEMINI_MODEL}" não existe mais. Troque GEMINI_MODEL no backend/.env.`);
    }
    throw new HttpError(502, "A IA do Google não conseguiu gerar a explicação agora. Tente de novo.");
  }

  const text = (payload?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  let answer: ModelAnswer;
  try {
    answer = parseAnswer(text);
  } catch {
    console.error(`[ia] resposta fora do formato: ${text.slice(0, 300)}`);
    throw new HttpError(502, "A IA respondeu fora do formato esperado. Tente de novo.");
  }

  const letter = input.correctOptionId ?? toLetter(answer.correta);
  const explanation = letter ? composeExplanation(answer, letter) : null;
  if (!letter || !explanation) {
    throw new HttpError(502, "A IA não devolveu uma explicação completa. Tente de novo.");
  }

  return {
    correctOptionId: letter,
    suggestedByAi: !input.correctOptionId,
    explanation,
    model: env.GEMINI_MODEL,
  };
}
