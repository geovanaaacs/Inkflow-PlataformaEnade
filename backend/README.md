# Inkflow — backend

API REST do Inkflow em **Node.js 22 + Express 5 + TypeScript**, sobre o banco SQL Server da pasta [`database/`](../database/README.md).

## Rodando

Na raiz do monorepo (`npm run dev` sobe front e back juntos) ou só a API:

```powershell
npm run dev -w backend       # http://localhost:3333/api  (recarrega ao salvar)
```

Para executar em produção a partir da raiz do projeto, configure `NODE_ENV=production` em `backend/.env` e rode `npm start`. O comando compila frontend e backend antes de subir o Express, que serve ambos na porta `API_PORT`.

Configuração em `backend/.env` (copie de `.env.example`):

| Variável | Para quê |
|---|---|
| `NODE_ENV` | `development` (padrão) mantém front e API separados; `production` habilita a entrega do frontend buildado pelo Express |
| `FRONTEND_PORT` | Porta do Vite em desenvolvimento (padrão 5173) |
| `API_PORT` | Porta do Express (padrão 3333); o proxy do Vite usa essa porta em desenvolvimento |
| `DB_CONNECTION_STRING` | Connection string ODBC. O padrão usa o **login do Windows** no SQL Server local |
| `JWT_SECRET` | Assina o cookie de sessão (mín. 32 caracteres, nunca versionado) |
| `SESSION_DAYS` | Validade do login (padrão 30 dias) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Só para `npm run db:dev-accounts` criar a conta admin |

## Estrutura

```
src/
├── server.ts            sobe o servidor e fecha a conexão no Ctrl+C
├── app.ts               Express: JSON, cookies, rotas em /api, erros
├── config/env.ts        variáveis do .env validadas com zod
├── db/pool.ts           conexão (mssql + msnodesqlv8), query(), withTransaction()
├── http/
│   ├── errors.ts        HttpError → { message } com o status certo
│   └── session.ts       cookie httpOnly com JWT, requireUser(...perfis)
├── shared/plan-access.ts   regras de plano/perfil (espelham as do front)
├── modules/             uma pasta por feature, como no front
│   ├── auth/            users.repository.ts · auth.routes.ts
│   ├── plans/           plans.routes.ts
│   └── questions/       questions/answers/notes.repository.ts · questions.routes.ts
└── scripts/dev-accounts.ts
```

Cada módulo tem **rotas** (HTTP: valida entrada com zod, chama o repositório, responde JSON) e **repositórios** (SQL parametrizado). Quando as regras crescerem, a ideia é colocar uma camada `service` entre os dois.

## Decisões

- **Driver `msnodesqlv8` (ODBC)** em vez do `tedious`: o SQL Server local aceita só login do Windows e não tem TCP habilitado. O ODBC conecta assim, sem mudar a configuração de segurança do servidor.
- **Sessão em cookie httpOnly** (JWT assinado): o JavaScript da página não lê o token; o login sobrevive a fechar o navegador. O usuário é relido do banco a cada requisição, então desativar uma conta ou trocar o perfil vale na hora.
- **Regras de plano vêm do banco** (`Plans.DailyQuestionLimit`, `PlanFeatures`/`Features`). Professores e admins: sem limite diário e com anotações, por perfil.
- **Respostas guardam o perfil** (`UserAnswers.AnsweredAsRole`): as do professor são gravadas, mas não entram no ranking.
- **Mesmo JSON do front:** `question.id` é o `Id` do banco em texto e `option.id` é a letra (`a`–`e`), como nos mocks.

## Endpoints

| Front (`api.ts`) | Método e rota | Quem |
|---|---|---|
| — | `GET /api/health` | público |
| `auth.login` | `POST /api/auth/login` `{ email, password }` | público |
| `auth.signup` | `POST /api/auth/register` `{ name, email, password, role }` | público |
| `auth.logout` | `POST /api/auth/logout` | público |
| `auth.getSessionUser` | `GET /api/me` | logado |
| `plans.listPlans` | `GET /api/plans` | público |
| `plans.subscribeToPlan` | `POST /api/me/subscription` `{ planId }` (simulado, sem pagamento) | aluno |
| `questions.listQuestions` | `GET /api/questions?keyword=&area=&year=&type=` | aluno, professor |
| `questions.getQuestionFilterOptions` | `GET /api/questions/filters` | aluno, professor |
| `questions.getQuestionByCode` | `GET /api/questions/by-code/:code` | aluno, professor |
| `questions.listQuestionsByArea` | `GET /api/areas/:slug/questions` | aluno, professor |
| `questions.countQuestionsByArea` | `GET /api/questions/count-by-area` | logado |
| `questions.answerQuestion` | `POST /api/questions/:id/answers` `{ selectedOptionId }` | aluno, professor |
| `questions.getDailyUsage` | `GET /api/me/daily-usage` | aluno, professor |
| `questions.listMyRecentAnswers` | `GET /api/me/answers?limit=` | aluno, professor |
| `questions.getMyNoteCounts` | `GET /api/me/note-counts` | aluno, professor |
| `questions.listQuestionNotes` / `addNote` | `GET` / `POST /api/questions/:id/notes` | Avançado+, professor |
| `questions.listMyNotes` | `GET /api/me/notes` | Avançado+, professor |
| `dashboard.getDashboardOverview` | `GET /api/dashboard` | aluno |
| `dashboard.getRanking` | `GET /api/ranking?scope=geral\|simulados` | logado (Simulados: Premium ou equipe) |
| `mock-exams.listMockExams` | `GET /api/mock-exams` | aluno (catálogo para todos) |
| `mock-exams.getMockExam` | `GET /api/mock-exams/:id` | Premium |
| `mock-exams.getActiveAttempt` | `GET /api/mock-exams/:id/active-attempt` | Premium |
| `mock-exams.startAttempt` | `POST /api/mock-exams/:id/attempts` (reaproveita a tentativa ativa) | Premium |
| `mock-exams.saveAttemptAnswer` | `PUT /api/mock-exam-attempts/:id/answers/:questionId` `{ selectedOptionId }` | Premium |
| `mock-exams.finishAttempt` | `POST /api/mock-exam-attempts/:id/finish` | Premium |
| `mock-exams.getAttemptDetails` | `GET /api/mock-exam-attempts/:id` | Premium |
| `mentoring.listOpenSlots` | `GET /api/mentoring/slots?type=mentoria\|grupo` | Premium |
| `mentoring.requestSlot` | `POST /api/mentoring/slots/:id/requests` `{ message }` | Premium |
| `mentoring.listMyRequests` | `GET /api/me/mentoring-requests` | Premium |
| `mentoring.cancelMyRequest` | `POST /api/me/mentoring-requests/:id/cancel` | Premium |
| `mentoring.listTeacherSlots` / `createSlot` | `GET` / `POST /api/teacher/slots` `{ type, date, time, durationMinutes, capacity, topic }` | professor |
| `mentoring.deleteSlot` | `DELETE /api/teacher/slots/:id` (cancelamento lógico; recusa os pedidos ativos) | professor |
| `mentoring.listTeacherRequests` | `GET /api/teacher/mentoring-requests` | professor |
| `mentoring.respondToRequest` | `POST /api/teacher/mentoring-requests/:id/accept\|decline` | professor |
| `teacher.getTeacherOverview` | `GET /api/teacher/overview` | professor |
| `admin.listAdminUsers` | `GET /api/admin/users?search=&role=` | admin |
| `admin.updateAdminUser` | `PATCH /api/admin/users/:id` `{ role?, plan?, active? }` | admin |
| `admin.listAdminQuestions` | `GET /api/admin/questions?search=&areaSlug=` | admin |
| `admin.getQuestionCatalog` | `GET /api/admin/questions/catalog` | admin |
| `admin.createQuestion` / `updateQuestion` | `POST /api/admin/questions` / `PUT /api/admin/questions/:id` | admin |
| `admin.deleteQuestion` | `DELETE /api/admin/questions/:id` (desativa e tira dos simulados) | admin |
| `admin.listAdminMockExams` | `GET /api/admin/mock-exams` | admin |
| `admin.createMockExam` / `updateMockExam` | `POST /api/admin/mock-exams` / `PUT /api/admin/mock-exams/:id` | admin |

Erros sempre como `{ "message": "..." }` com o status HTTP (400 validação, 401 sem sessão, 403 sem permissão/plano, 404, 409 conflito).

Datas e horas saem em ISO UTC (`2026-10-28T20:20:29.751Z`); os horários de mentoria são digitados no horário de Brasília (`date` + `time`) e convertidos no banco.

O front chama essas rotas pelos seus `api.ts` (coluna "Front" acima).

## Observação de segurança

`npm audit` aponta um alerta em `@azure/msal-node`, dependência indireta de `mssql` → `tedious`, no fluxo de login do Azure AD. O projeto não usa esse fluxo (conecta por ODBC/Windows) e ainda não há versão corrigida compatível; reavaliar ao atualizar o `mssql`.
