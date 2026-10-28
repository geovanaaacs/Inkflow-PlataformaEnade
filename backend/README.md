# Inkflow — backend

API REST do Inkflow em **Node.js 22 + Express 5 + TypeScript**, sobre o banco SQL Server da pasta [`database/`](../database/README.md).

## Rodando

Na raiz do monorepo (`npm run dev` sobe front e back juntos) ou só a API:

```powershell
npm run dev -w backend       # http://localhost:3333/api  (recarrega ao salvar)
```

Configuração em `backend/.env` (copie de `.env.example`):

| Variável | Para quê |
|---|---|
| `API_PORT` | Porta da API (padrão 3333 — o proxy do Vite aponta para ela). Não é `PORT` de propósito: várias ferramentas definem `PORT` para todos os processos |
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

Erros sempre como `{ "message": "..." }` com o status HTTP (400 validação, 401 sem sessão, 403 sem permissão/plano, 404, 409 conflito).

## Próximos módulos

`dashboard` (visão geral e rankings Geral/Simulados), `mock-exams`, `mentoring`, `teacher`, `admin` — e então trocar os mocks dos `api.ts` do front por chamadas a esta API.

## Observação de segurança

`npm audit` aponta um alerta em `@azure/msal-node`, dependência indireta de `mssql` → `tedious`, no fluxo de login do Azure AD. O projeto não usa esse fluxo (conecta por ODBC/Windows) e ainda não há versão corrigida compatível; reavaliar ao atualizar o `mssql`.
