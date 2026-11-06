/*
 * OpenAPI 3.0 description of every route under /api, served by app.ts:
 *   GET /api/docs               Swagger UI (try the routes from the browser)
 *   GET /api/docs/openapi.json  this document
 *
 * Keep it in sync with the *.routes.ts files: when a route, a body schema or a
 * response shape changes, update the matching entry here.
 */

type Schema = Record<string, unknown>;

/* ------------------------------------------------------------------ helpers */

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (items: Schema): Schema => ({ type: "array", items });
const nullable = (schema: Schema): Schema => ({ ...schema, nullable: true });
const str = (description?: string, extra: Schema = {}): Schema => ({ type: "string", ...(description && { description }), ...extra });
const int = (description?: string, extra: Schema = {}): Schema => ({ type: "integer", ...(description && { description }), ...extra });
const bool = (description?: string): Schema => ({ type: "boolean", ...(description && { description }) });
const dateTime = (description?: string): Schema => str(description, { format: "date-time" });
const object = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({
  type: "object",
  required: Object.keys(properties).filter((key) => !optional.includes(key)),
  properties,
});
const record = (values: Schema, description?: string): Schema => ({
  type: "object",
  additionalProperties: values,
  ...(description && { description }),
});

const json = (schema: Schema) => ({ "application/json": { schema } });
const ok = (schema: Schema, description = "OK") => ({ description, content: json(schema) });
const created = (schema: Schema) => ok(schema, "Criado");
const noContent = { description: "Sem conteúdo" };
const error = (description: string) => ({ description, content: json(ref("Error")) });

const E400 = error("Dados inválidos (validação)");
const E401 = error("Sem sessão ou sessão expirada");
const E403 = error("Perfil ou plano sem acesso");
const E404 = error("Não encontrado");
const E409 = error("Conflito com o estado atual");

const body = (schema: Schema, required = true) => ({ required, content: json(schema) });

const pathParam = (name: string, description: string, schema: Schema = int()) => ({
  name,
  in: "path",
  required: true,
  description,
  schema,
});
const queryParam = (name: string, description: string, schema: Schema = str()) => ({
  name,
  in: "query",
  required: false,
  description,
  schema,
});

const idParam = pathParam("id", "Identificador numérico");

interface Operation {
  tag: string;
  summary: string;
  description?: string;
  /** Profiles allowed; omitted = public route (no session needed). */
  auth?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
}

function op({ tag, summary, description, auth, parameters, requestBody, responses }: Operation) {
  return {
    tags: [tag],
    summary,
    description: [auth && `**Acesso:** ${auth}.`, description].filter(Boolean).join("\n\n") || undefined,
    ...(auth ? {} : { security: [] }),
    ...(parameters && { parameters }),
    ...(requestBody ? { requestBody } : {}),
    responses: auth ? { 401: E401, ...responses } : responses,
  };
}

/* ------------------------------------------------------------------ schemas */

const roleEnum = { type: "string", enum: ["aluno", "professor", "admin"] };
const planEnum = { type: "string", enum: ["basico", "avancado", "premium"] };
const difficultyEnum = { type: "string", enum: ["fácil", "médio", "difícil"] };
const optionLetter = { type: "string", enum: ["a", "b", "c", "d", "e"] };
const sessionTypeEnum = { type: "string", enum: ["mentoria", "grupo"] };
const requestStatusEnum = { type: "string", enum: ["pendente", "confirmada", "recusada", "cancelada"] };

const authUserProps = {
  id: str("GUID do usuário"),
  name: str(),
  email: str(undefined, { format: "email" }),
  role: ref("UserRole"),
  plan: nullable({ ...ref("PlanId"), description: "Plano do aluno; null para professor e admin" }),
  course: nullable(str()),
};

const mockExamProps = {
  id: str(),
  title: str(),
  description: str(),
  areaName: nullable(str("Área de TI; null = simulado geral")),
  difficulty: ref("Difficulty"),
  timeLimitMinutes: int(),
  questionIds: arrayOf(str()),
};

const slotProps = {
  id: str(),
  teacherId: str(),
  teacherName: str(),
  type: ref("SessionType"),
  startsAt: dateTime(),
  durationMinutes: int(),
  capacity: int(),
  topic: str(),
  canceledAt: nullable(dateTime("Preenchido quando o professor cancela o horário")),
};

const requestProps = {
  id: str(),
  slotId: str(),
  studentId: str(),
  studentName: str(),
  message: str(),
  status: ref("RequestStatus"),
  createdAt: dateTime(),
  respondedAt: nullable(dateTime()),
};

const schemas: Record<string, Schema> = {
  Error: object({ message: str("Mensagem pronta para mostrar ao usuário") }),
  UserRole: roleEnum,
  PlanId: planEnum,
  Difficulty: difficultyEnum,
  SessionType: sessionTypeEnum,
  RequestStatus: requestStatusEnum,

  AuthUser: object(authUserProps),
  AdminUser: object({ ...authUserProps, active: bool() }),
  LoginInput: object({ email: str(undefined, { format: "email" }), password: str() }),
  RegisterInput: object({
    name: str("2 a 150 caracteres"),
    email: str(undefined, { format: "email" }),
    password: str("6 a 128 caracteres"),
    role: { type: "string", enum: ["aluno", "professor"] },
  }),
  TokenResponse: object({
    token: str("JWT para enviar como `Authorization: Bearer <token>`"),
    expiresAt: dateTime("Quando o token expira (SESSION_DAYS após o login)"),
    user: ref("AuthUser"),
  }),

  Plan: object(
    {
      id: ref("PlanId"),
      name: str(),
      description: str(),
      price: { type: "number", description: "Preço mensal em reais (0 no plano gratuito)" },
      billingPeriod: { type: "string", enum: ["gratuito", "mensal"] },
      items: arrayOf(str()),
      highlighted: bool(),
    },
    ["highlighted"]
  ),

  Area: object({ slug: str(), name: str(), shortName: str("Rótulo curto usado no dashboard") }),
  QuestionOption: object({ id: { ...optionLetter, description: "Letra da alternativa" }, label: str() }),
  Question: object({
    id: str("Id do banco, em texto"),
    code: str("Ex.: Q2024-15"),
    area: ref("Area"),
    topic: str(),
    year: int(),
    type: { type: "string", enum: ["Múltipla escolha"] },
    difficulty: ref("Difficulty"),
    statement: str(),
    options: arrayOf(ref("QuestionOption")),
    correctOptionId: str(),
    aiExplanation: str(),
    teacher: object({ name: str(), credentials: str(), comment: str() }),
    community: arrayOf(object({ author: str(), comment: str() })),
  }),
  QuestionFilterOptions: object({ areas: arrayOf(ref("Area")), years: arrayOf(int()), types: arrayOf(str()) }),
  DailyUsage: object({
    used: int("Questões respondidas hoje (só primeiras tentativas)"),
    limit: nullable(int("null = ilimitado")),
  }),
  AnswerResult: object({
    correct: bool(),
    correctOptionId: str(),
    attemptNumber: int("1 = primeira vez que o usuário responde esta questão"),
    usage: ref("DailyUsage"),
  }),
  AnswerSummary: object({
    id: str(),
    questionCode: str(),
    topic: str(),
    correct: bool(),
    answeredAt: dateTime(),
  }),
  NoteRecord: object({ id: str(), userId: str(), questionId: str(), content: str(), createdAt: dateTime() }),
  NoteWithQuestion: object({
    id: str(),
    userId: str(),
    questionId: str(),
    content: str(),
    createdAt: dateTime(),
    questionCode: str(),
    topic: str(),
    areaName: str(),
  }),

  AreaPerformance: object({ area: str(), percent: int(), questionsCount: int() }),
  SuggestedTopic: object({
    areaSlug: str(),
    title: str(),
    level: ref("Difficulty"),
    percent: int(),
    message: str(),
    totalQuestions: int(),
  }),
  StudentStats: object({
    answered: int(),
    answeredThisWeek: int("Primeiras tentativas nos últimos 7 dias"),
    totalQuestions: int("Questões ativas no banco"),
    accuracyPercent: int(),
    streak: int("Dias seguidos com pelo menos uma resposta"),
    bestStreak: int(),
  }),
  DashboardOverview: object({
    dailyUsage: ref("DailyUsage"),
    areaPerformance: arrayOf(ref("AreaPerformance")),
    recentAnswers: arrayOf(ref("AnswerSummary")),
    suggestedTopics: arrayOf(ref("SuggestedTopic")),
    stats: ref("StudentStats"),
  }),
  RankingEntry: object({
    id: str(),
    position: int(),
    name: str(),
    points: int(),
    detail: str("Ex.: \"120 questões · 95 acertos\""),
    isCurrentUser: bool(),
  }),
  Ranking: object({
    scope: { type: "string", enum: ["geral", "simulados"] },
    top: arrayOf(ref("RankingEntry")),
    currentUser: nullable(ref("RankingEntry")),
    totalParticipants: int(),
  }),

  MockExam: object(mockExamProps),
  MockExamSummary: object({
    ...mockExamProps,
    questionCount: int(),
    activeAttemptId: nullable(str("Tentativa em andamento, que o aluno pode retomar")),
    lastResult: nullable(
      object({
        attemptId: str(),
        correctCount: int(),
        total: int(),
        finishedAt: dateTime(),
        status: { type: "string", enum: ["em_andamento", "finalizado", "expirado"] },
      })
    ),
  }),
  MockExamAttempt: object({
    id: str(),
    examId: str(),
    userId: str(),
    status: { type: "string", enum: ["em_andamento", "finalizado", "expirado"] },
    startedAt: dateTime(),
    endsAt: dateTime("startedAt + tempo limite; o cronômetro conta até aqui"),
    finishedAt: nullable(dateTime()),
    answers: record(str(), "questionId → alternativa escolhida"),
    results: nullable(
      arrayOf(
        object({
          questionId: str(),
          selectedOptionId: nullable(str()),
          correctOptionId: str(),
          correct: bool(),
        })
      )
    ),
  }),
  MockExamWithQuestions: object({ exam: ref("MockExam"), questions: arrayOf(ref("Question")) }),
  AttemptDetails: object({
    attempt: ref("MockExamAttempt"),
    exam: ref("MockExam"),
    questions: arrayOf(ref("Question")),
  }),

  AvailabilitySlot: object(slotProps, ["canceledAt"]),
  OpenSlot: object(
    {
      ...slotProps,
      spotsLeft: int(),
      myRequest: nullable(object({ id: str(), status: ref("RequestStatus") })),
    },
    ["canceledAt"]
  ),
  TeacherSlot: object({ ...slotProps, confirmed: int(), pending: int() }, ["canceledAt"]),
  MentoringRequest: object(requestProps),
  RequestWithSlot: object({ ...requestProps, slot: ref("AvailabilitySlot") }),
  NewSlotInput: object({
    type: ref("SessionType"),
    date: str("Data no horário de Brasília (YYYY-MM-DD)", { pattern: "^\\d{4}-\\d{2}-\\d{2}$", example: "2026-11-20" }),
    time: str("Hora no horário de Brasília (HH:mm)", { pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "19:30" }),
    durationMinutes: int("15 a 240", { minimum: 15, maximum: 240 }),
    capacity: int("1 a 100", { minimum: 1, maximum: 100 }),
    topic: str("Até 120 caracteres"),
  }),

  TeacherOverview: object({
    totalAnswers: int(),
    activeStudents: int(),
    accuracyPercent: int(),
    answersToday: int(),
    pendingRequests: int(),
    mostMissed: arrayOf(
      object({
        questionCode: str(),
        topic: str(),
        areaName: str(),
        answers: int(),
        errorRate: int(),
        commonMistake: nullable(object({ optionId: str(), percent: int() })),
      })
    ),
    rows: arrayOf(
      object({
        id: str(),
        studentId: str(),
        studentName: str(),
        questionCode: str(),
        topic: str(),
        area: ref("Area"),
        selectedOptionId: str(),
        correctOptionId: str(),
        correct: bool(),
        attemptNumber: int(),
        fromMockExam: bool("Respondida dentro de um simulado"),
        answeredAt: dateTime(),
      })
    ),
    students: arrayOf(object({ id: str(), name: str() })),
    areas: arrayOf(ref("Area")),
  }),

  AdminUserChanges: {
    type: "object",
    description: "Envie pelo menos um campo",
    minProperties: 1,
    properties: { role: ref("UserRole"), plan: nullable(ref("PlanId")), active: bool() },
  },
  QuestionInput: object(
    {
      code: str("Formato Q2024-15", { pattern: "^Q\\d{4}-\\d+$" }),
      areaSlug: str(),
      topic: str("Até 150 caracteres"),
      year: int("De 2004 até o ano que vem"),
      difficulty: ref("Difficulty"),
      statement: str(),
      options: { ...arrayOf(str()), minItems: 5, maxItems: 5, description: "Textos das alternativas A a E" },
      correctOptionId: optionLetter,
      aiExplanation: str(),
    },
    ["aiExplanation"]
  ),
  QuestionCatalog: object({
    areas: arrayOf(ref("Area")),
    topicsByArea: record(arrayOf(str()), "slug da área → tópicos já usados"),
  }),
  MockExamInput: object(
    {
      title: str("Até 150 caracteres"),
      description: str("Até 1000 caracteres"),
      areaName: nullable(str("null = várias áreas")),
      difficulty: ref("Difficulty"),
      timeLimitMinutes: int("1 a 240", { minimum: 1, maximum: 240 }),
      questionIds: { ...arrayOf(int()), minItems: 1 },
    },
    ["description", "areaName"]
  ),
};

/* ------------------------------------------------------------------ paths */

const ANY = "qualquer usuário logado";
const STUDENT = "aluno";
const PRACTICE = "aluno ou professor";
const PREMIUM = "aluno com plano Premium";
const TEACHER = "professor";
const ADMIN = "admin";

const selectedOption = object({ selectedOptionId: optionLetter });

const paths = {
  "/health": {
    get: op({
      tag: "Sistema",
      summary: "Verifica se a API e o banco estão no ar",
      responses: { 200: ok(object({ status: str(undefined, { example: "ok" }), database: nullable(str()) })) },
    }),
  },

  /* ---------------------------------------------------------------- Auth */
  "/auth/login": {
    post: op({
      tag: "Autenticação",
      summary: "Entrar",
      description: "Cria a sessão: devolve o usuário e grava o cookie httpOnly `inkflow_session`.",
      requestBody: body(ref("LoginInput")),
      responses: { 200: ok(ref("AuthUser")), 400: E400, 401: error("E-mail ou senha inválidos"), 403: error("Conta desativada") },
    }),
  },
  "/auth/register": {
    post: op({
      tag: "Autenticação",
      summary: "Criar conta (aluno ou professor)",
      description: "Cria a conta e já inicia a sessão. Contas admin só são criadas por outro admin.",
      requestBody: body(ref("RegisterInput")),
      responses: { 201: created(ref("AuthUser")), 400: E400, 409: error("E-mail já cadastrado") },
    }),
  },
  "/auth/mobile/login": {
    post: op({
      tag: "Autenticação",
      summary: "Entrar pelo app mobile (devolve um token)",
      description:
        "Mesmas regras do `/auth/login`, mas sem cookie: o token vem no corpo e o app o envia nas próximas " +
        "chamadas como `Authorization: Bearer <token>`. Para sair, o app só descarta o token.",
      requestBody: body(ref("LoginInput")),
      responses: { 200: ok(ref("TokenResponse")), 400: E400, 401: error("E-mail ou senha inválidos"), 403: error("Conta desativada") },
    }),
  },
  "/auth/mobile/register": {
    post: op({
      tag: "Autenticação",
      summary: "Criar conta pelo app mobile (devolve um token)",
      description: "Mesmas regras do `/auth/register`, devolvendo o token no lugar do cookie.",
      requestBody: body(ref("RegisterInput")),
      responses: { 201: created(ref("TokenResponse")), 400: E400, 409: error("E-mail já cadastrado") },
    }),
  },
  "/auth/logout": {
    post: op({ tag: "Autenticação", summary: "Sair (apaga o cookie de sessão)", responses: { 204: noContent } }),
  },
  "/me": {
    get: op({ tag: "Autenticação", summary: "Usuário da sessão atual", auth: ANY, responses: { 200: ok(ref("AuthUser")) } }),
  },

  /* ---------------------------------------------------------------- Plans */
  "/plans": {
    get: op({ tag: "Planos", summary: "Lista os planos ativos", responses: { 200: ok(arrayOf(ref("Plan"))) } }),
  },
  "/me/subscription": {
    post: op({
      tag: "Planos",
      summary: "Troca o plano do aluno (assinatura simulada, sem pagamento)",
      auth: STUDENT,
      requestBody: body(object({ planId: ref("PlanId") })),
      responses: { 204: noContent, 400: E400, 403: E403, 404: E404 },
    }),
  },

  /* ---------------------------------------------------------------- Questions */
  "/questions": {
    get: op({
      tag: "Questões",
      summary: "Banco de questões com filtros",
      description: "A busca ignora maiúsculas e acentos. Em cada filtro, `todas` ou vazio = sem filtro.",
      auth: PRACTICE,
      parameters: [
        queryParam("keyword", "Texto no enunciado, código ou tópico"),
        queryParam("area", "Slug da área"),
        queryParam("year", "Ano do ENADE"),
        queryParam("type", "Tipo da questão"),
      ],
      responses: { 200: ok(arrayOf(ref("Question"))), 400: E400, 403: E403 },
    }),
  },
  "/questions/filters": {
    get: op({
      tag: "Questões",
      summary: "Opções dos filtros (áreas, anos, tipos)",
      auth: PRACTICE,
      responses: { 200: ok(ref("QuestionFilterOptions")), 403: E403 },
    }),
  },
  "/questions/count-by-area": {
    get: op({
      tag: "Questões",
      summary: "Quantidade de questões ativas por área",
      auth: ANY,
      responses: { 200: ok(record(int(), "slug da área → total")) },
    }),
  },
  "/questions/by-code/{code}": {
    get: op({
      tag: "Questões",
      summary: "Busca uma questão pelo código",
      auth: PRACTICE,
      parameters: [pathParam("code", "Código da questão", str(undefined, { example: "Q2024-15" }))],
      responses: { 200: ok(ref("Question")), 403: E403, 404: E404 },
    }),
  },
  "/areas/{slug}/questions": {
    get: op({
      tag: "Questões",
      summary: "Questões de uma área",
      auth: PRACTICE,
      parameters: [pathParam("slug", "Slug da área", str())],
      responses: { 200: ok(object({ area: ref("Area"), questions: arrayOf(ref("Question")) })), 403: E403, 404: E404 },
    }),
  },
  "/questions/{id}/answers": {
    post: op({
      tag: "Questões",
      summary: "Responde uma questão",
      description:
        "Toda tentativa é gravada, mas só a primeira de cada questão conta no limite diário do plano Básico e no ranking.",
      auth: PRACTICE,
      parameters: [idParam],
      requestBody: body(selectedOption),
      responses: { 201: created(ref("AnswerResult")), 400: E400, 403: error("Limite diário do plano atingido"), 404: E404 },
    }),
  },
  "/questions/{id}/notes": {
    get: op({
      tag: "Anotações",
      summary: "Anotações do usuário em uma questão (mais novas primeiro)",
      auth: `${PRACTICE} (aluno a partir do plano Avançado)`,
      parameters: [idParam],
      responses: { 200: ok(arrayOf(ref("NoteRecord"))), 403: E403, 404: E404 },
    }),
    post: op({
      tag: "Anotações",
      summary: "Cria uma anotação na questão",
      auth: `${PRACTICE} (aluno a partir do plano Avançado)`,
      parameters: [idParam],
      requestBody: body(object({ content: str("1 a 2000 caracteres") })),
      responses: { 201: created(ref("NoteRecord")), 400: E400, 403: E403, 404: E404 },
    }),
  },
  "/me/daily-usage": {
    get: op({
      tag: "Questões",
      summary: "Uso do limite diário de questões",
      auth: PRACTICE,
      responses: { 200: ok(ref("DailyUsage")), 403: E403 },
    }),
  },
  "/me/answers": {
    get: op({
      tag: "Questões",
      summary: "Últimas respostas do usuário",
      auth: PRACTICE,
      parameters: [queryParam("limit", "1 a 50 (padrão 5)", int(undefined, { minimum: 1, maximum: 50, default: 5 }))],
      responses: { 200: ok(arrayOf(ref("AnswerSummary"))), 400: E400, 403: E403 },
    }),
  },
  "/me/note-counts": {
    get: op({
      tag: "Anotações",
      summary: "Quantas anotações o usuário tem em cada questão",
      description: "Objeto vazio quando o plano não inclui anotações.",
      auth: PRACTICE,
      responses: { 200: ok(record(int(), "id da questão → total")), 403: E403 },
    }),
  },
  "/me/notes": {
    get: op({
      tag: "Anotações",
      summary: "Todas as anotações do usuário",
      auth: `${PRACTICE} (aluno a partir do plano Avançado)`,
      responses: { 200: ok(arrayOf(ref("NoteWithQuestion"))), 403: E403 },
    }),
  },

  /* ---------------------------------------------------------------- Dashboard */
  "/dashboard": {
    get: op({
      tag: "Dashboard e ranking",
      summary: "Resumo do aluno (uso diário, desempenho por área, sugestões, estatísticas)",
      auth: STUDENT,
      responses: { 200: ok(ref("DashboardOverview")), 403: E403 },
    }),
  },
  "/ranking": {
    get: op({
      tag: "Dashboard e ranking",
      summary: "Ranking Geral ou dos Simulados",
      description:
        "`geral`: 10 pontos por acerto e 2 por erro na primeira tentativa de cada questão (todos os planos). " +
        "`simulados`: acertos da melhor tentativa de cada simulado (aluno Premium; professores e admins podem ver). " +
        "Só alunos aparecem no ranking.",
      auth: ANY,
      parameters: [queryParam("scope", "Qual ranking (padrão geral)", { type: "string", enum: ["geral", "simulados"], default: "geral" })],
      responses: { 200: ok(ref("Ranking")), 400: E400, 403: E403 },
    }),
  },

  /* ---------------------------------------------------------------- Mock exams */
  "/mock-exams": {
    get: op({
      tag: "Simulados",
      summary: "Catálogo de simulados",
      description: "Visível para todos os alunos; fazer um simulado exige o plano Premium.",
      auth: STUDENT,
      responses: { 200: ok(arrayOf(ref("MockExamSummary"))), 403: E403 },
    }),
  },
  "/mock-exams/{id}": {
    get: op({
      tag: "Simulados",
      summary: "Simulado com as questões",
      auth: PREMIUM,
      parameters: [idParam],
      responses: { 200: ok(ref("MockExamWithQuestions")), 403: E403, 404: E404 },
    }),
  },
  "/mock-exams/{id}/active-attempt": {
    get: op({
      tag: "Simulados",
      summary: "Tentativa em andamento do aluno (ou null)",
      description: "Tentativas com o tempo esgotado são encerradas e corrigidas antes de responder.",
      auth: PREMIUM,
      parameters: [idParam],
      responses: { 200: ok(nullable(ref("MockExamAttempt"))), 403: E403, 404: E404 },
    }),
  },
  "/mock-exams/{id}/attempts": {
    post: op({
      tag: "Simulados",
      summary: "Inicia o simulado (liga o cronômetro)",
      description: "Se já houver uma tentativa em andamento, devolve ela.",
      auth: PREMIUM,
      parameters: [idParam],
      responses: { 201: created(ref("MockExamAttempt")), 403: E403, 404: E404, 409: error("Simulado sem questões") },
    }),
  },
  "/mock-exam-attempts/{id}": {
    get: op({
      tag: "Simulados",
      summary: "Detalhes de uma tentativa (com o simulado e as questões)",
      auth: PREMIUM,
      parameters: [idParam],
      responses: { 200: ok(ref("AttemptDetails")), 403: E403, 404: E404 },
    }),
  },
  "/mock-exam-attempts/{id}/answers/{questionId}": {
    put: op({
      tag: "Simulados",
      summary: "Salva a resposta de uma questão da tentativa",
      auth: PREMIUM,
      parameters: [idParam, pathParam("questionId", "Id da questão")],
      requestBody: body(selectedOption),
      responses: { 204: noContent, 400: E400, 403: E403, 404: E404, 409: error("O tempo do simulado já acabou") },
    }),
  },
  "/mock-exam-attempts/{id}/finish": {
    post: op({
      tag: "Simulados",
      summary: "Encerra e corrige a tentativa",
      auth: PREMIUM,
      parameters: [idParam],
      responses: { 200: ok(ref("MockExamAttempt")), 403: E403, 404: E404 },
    }),
  },

  /* ---------------------------------------------------------------- Mentoring (student) */
  "/mentoring/slots": {
    get: op({
      tag: "Mentoria (aluno)",
      summary: "Horários futuros abertos pelos professores",
      auth: PREMIUM,
      parameters: [{ ...queryParam("type", "Tipo de encontro", ref("SessionType")), required: true }],
      responses: { 200: ok(arrayOf(ref("OpenSlot"))), 400: E400, 403: E403 },
    }),
  },
  "/mentoring/slots/{id}/requests": {
    post: op({
      tag: "Mentoria (aluno)",
      summary: "Pede uma vaga no horário",
      auth: PREMIUM,
      parameters: [idParam],
      requestBody: body(object({ message: str("Até 500 caracteres") }, ["message"]), false),
      responses: { 201: created(ref("MentoringRequest")), 400: E400, 403: E403, 404: E404, 409: E409 },
    }),
  },
  "/me/mentoring-requests": {
    get: op({
      tag: "Mentoria (aluno)",
      summary: "Pedidos do aluno (todos os status)",
      auth: PREMIUM,
      responses: { 200: ok(arrayOf(ref("RequestWithSlot"))), 403: E403 },
    }),
  },
  "/me/mentoring-requests/{id}/cancel": {
    post: op({
      tag: "Mentoria (aluno)",
      summary: "Cancela um pedido pendente ou confirmado",
      auth: PREMIUM,
      parameters: [idParam],
      responses: { 204: noContent, 403: E403, 404: E404, 409: E409 },
    }),
  },

  /* ---------------------------------------------------------------- Teacher */
  "/teacher/overview": {
    get: op({
      tag: "Professor",
      summary: "Painel do professor (respostas dos alunos e questões com mais erros)",
      description: "Só respostas dadas como aluno entram; a tabela traz as 500 mais recentes.",
      auth: TEACHER,
      responses: { 200: ok(ref("TeacherOverview")), 403: E403 },
    }),
  },
  "/teacher/slots": {
    get: op({
      tag: "Professor",
      summary: "Horários abertos pelo professor (passados e futuros)",
      auth: TEACHER,
      responses: { 200: ok(arrayOf(ref("TeacherSlot"))), 403: E403 },
    }),
    post: op({
      tag: "Professor",
      summary: "Abre um horário de mentoria ou grupo",
      auth: TEACHER,
      requestBody: body(ref("NewSlotInput")),
      responses: { 201: created(ref("AvailabilitySlot")), 400: E400, 403: E403, 409: error("Sobrepõe outro horário do professor") },
    }),
  },
  "/teacher/slots/{id}": {
    delete: op({
      tag: "Professor",
      summary: "Cancela o horário (exclusão lógica; recusa os pedidos ativos)",
      auth: TEACHER,
      parameters: [idParam],
      responses: { 204: noContent, 403: E403, 404: E404 },
    }),
  },
  "/teacher/mentoring-requests": {
    get: op({
      tag: "Professor",
      summary: "Pedidos para os horários do professor",
      auth: TEACHER,
      responses: { 200: ok(arrayOf(ref("RequestWithSlot"))), 403: E403 },
    }),
  },
  "/teacher/mentoring-requests/{id}/{decision}": {
    post: op({
      tag: "Professor",
      summary: "Aceita ou recusa um pedido",
      auth: TEACHER,
      parameters: [idParam, pathParam("decision", "Decisão", { type: "string", enum: ["accept", "decline"] })],
      responses: { 204: noContent, 400: E400, 403: E403, 404: E404, 409: error("Pedido já respondido ou sem vagas") },
    }),
  },

  /* ---------------------------------------------------------------- Admin */
  "/admin/users": {
    get: op({
      tag: "Admin",
      summary: "Lista os usuários",
      auth: ADMIN,
      parameters: [
        queryParam("search", "Nome ou e-mail"),
        queryParam("role", "Perfil (`todos` = sem filtro)", { type: "string", enum: ["todos", "aluno", "professor", "admin"] }),
      ],
      responses: { 200: ok(arrayOf(ref("AdminUser"))), 400: E400, 403: E403 },
    }),
  },
  "/admin/users/{id}": {
    patch: op({
      tag: "Admin",
      summary: "Altera perfil, plano ou acesso de um usuário",
      description: "Alunos sempre têm plano; professores e admins nunca têm.",
      auth: ADMIN,
      parameters: [pathParam("id", "GUID do usuário", str(undefined, { format: "uuid" }))],
      requestBody: body(ref("AdminUserChanges")),
      responses: { 200: ok(ref("AdminUser")), 400: E400, 403: E403, 404: E404, 409: E409 },
    }),
  },
  "/admin/questions": {
    get: op({
      tag: "Admin",
      summary: "Lista as questões ativas",
      auth: ADMIN,
      parameters: [queryParam("search", "Texto no enunciado, código ou tópico"), queryParam("areaSlug", "Slug da área")],
      responses: { 200: ok(arrayOf(ref("Question"))), 403: E403 },
    }),
    post: op({
      tag: "Admin",
      summary: "Cria uma questão",
      auth: ADMIN,
      requestBody: body(ref("QuestionInput")),
      responses: { 201: created(ref("Question")), 400: E400, 403: E403, 409: error("Código já usado") },
    }),
  },
  "/admin/questions/catalog": {
    get: op({
      tag: "Admin",
      summary: "Áreas e tópicos já usados (sugestões do formulário)",
      auth: ADMIN,
      responses: { 200: ok(ref("QuestionCatalog")), 403: E403 },
    }),
  },
  "/admin/questions/{id}": {
    put: op({
      tag: "Admin",
      summary: "Edita uma questão",
      auth: ADMIN,
      parameters: [idParam],
      requestBody: body(ref("QuestionInput")),
      responses: { 200: ok(ref("Question")), 400: E400, 403: E403, 404: E404, 409: error("Código já usado") },
    }),
    delete: op({
      tag: "Admin",
      summary: "Desativa a questão e a tira dos simulados",
      description: "As respostas já dadas continuam no histórico dos alunos.",
      auth: ADMIN,
      parameters: [idParam],
      responses: { 204: noContent, 403: E403, 404: E404 },
    }),
  },
  "/admin/mock-exams": {
    get: op({
      tag: "Admin",
      summary: "Lista os simulados",
      auth: ADMIN,
      responses: { 200: ok(arrayOf(ref("MockExam"))), 403: E403 },
    }),
    post: op({
      tag: "Admin",
      summary: "Cria um simulado",
      auth: ADMIN,
      requestBody: body(ref("MockExamInput")),
      responses: { 201: created(ref("MockExam")), 400: E400, 403: E403 },
    }),
  },
  "/admin/mock-exams/{id}": {
    put: op({
      tag: "Admin",
      summary: "Edita um simulado",
      auth: ADMIN,
      parameters: [idParam],
      requestBody: body(ref("MockExamInput")),
      responses: { 200: ok(ref("MockExam")), 400: E400, 403: E403, 404: E404 },
    }),
  },
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Inkflow API",
    version: "0.1.0",
    description:
      "API REST do Inkflow (Node.js + Express + SQL Server), a plataforma de preparação para o ENADE.\n\n" +
      "**Sessão (web):** `POST /auth/login` grava o cookie httpOnly `inkflow_session`; o navegador o envia nas " +
      "próximas chamadas. Para testar aqui, faça o login pelo próprio Swagger (Try it out) e depois chame as rotas protegidas.\n\n" +
      "**Sessão (app mobile):** `POST /auth/mobile/login` devolve um token; envie-o como `Authorization: Bearer <token>` " +
      "(botão Authorize). Quando esse cabeçalho é enviado, ele vale no lugar do cookie.\n\n" +
      "**Erros:** sempre `{ \"message\": \"...\" }` com o status HTTP (400 validação, 401 sem sessão, " +
      "403 sem permissão/plano, 404, 409 conflito).\n\n" +
      "**Datas:** ISO 8601 em UTC.",
  },
  servers: [{ url: "/api" }],
  tags: [
    { name: "Sistema" },
    { name: "Autenticação" },
    { name: "Planos" },
    { name: "Questões" },
    { name: "Anotações" },
    { name: "Dashboard e ranking" },
    { name: "Simulados" },
    { name: "Mentoria (aluno)" },
    { name: "Professor" },
    { name: "Admin" },
  ],
  security: [{ sessionCookie: [] }, { bearerToken: [] }],
  components: {
    securitySchemes: {
      bearerToken: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token devolvido por /auth/mobile/login ou /auth/mobile/register (app mobile)",
      },
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "inkflow_session",
        description: "JWT assinado, gravado pelo login/cadastro",
      },
    },
    schemas,
  },
  paths,
};
