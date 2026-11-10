import { TODAY_SQL, query } from "../../db/pool.js";
import { toUtcIso } from "../questions/answers.repository.js";
import type { PlanId } from "../../shared/plan-access.js";

/*
 * Numbers for the admin desktop app (GET /api/admin/metrics and
 * /api/admin/payments). Only students count in the study metrics: answers
 * given by teachers (AnsweredAsRole = 'professor') never mix in.
 */

/** How many days the "respostas por dia" chart covers (today included). */
const CHART_DAYS = 14;

export interface AdminMetrics {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: { aluno: number; professor: number; admin: number };
    /** Accounts created in the last 30 days. */
    newLast30Days: number;
    /** Teacher accounts created in the last 30 days. */
    newTeachersLast30Days: number;
  };
  /** Paid subscriptions (Avançado, Premium) started by students in the last 30 days. */
  adhesions: {
    last30Days: number;
    byPlan: { plan: PlanId; name: string; count: number }[];
  };
  /** Active students per current plan (Básico, Avançado, Premium). */
  studentsByPlan: { plan: PlanId; name: string; students: number; price: number }[];
  activity: {
    answersToday: number;
    answersLast7Days: number;
    /** Students who answered at least one question in the last 7 days. */
    activeStudentsLast7Days: number;
    mockExamsFinishedLast30Days: number;
    mentoringRequestsLast30Days: number;
  };
  /** Student answers per local day (Brasília), oldest first, CHART_DAYS days. */
  answersByDay: { date: string; answers: number }[];
  revenue: {
    /** Sum of the prices of the active paid subscriptions (receita recorrente mensal). */
    monthlyRecurring: number;
    last30Days: number;
    paymentsLast30Days: number;
    total: number;
  };
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [users, plans, activity, byDay, revenue, adhesions] = await Promise.all([
    query<{ Total: number; Active: number; Alunos: number; Professores: number; Admins: number; NewLast30: number; NewTeachers30: number }>(
      `SELECT COUNT(*) AS Total,
              SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS Active,
              SUM(CASE WHEN Role = N'aluno' THEN 1 ELSE 0 END) AS Alunos,
              SUM(CASE WHEN Role = N'professor' THEN 1 ELSE 0 END) AS Professores,
              SUM(CASE WHEN Role = N'admin' THEN 1 ELSE 0 END) AS Admins,
              SUM(CASE WHEN CreatedAt >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS NewLast30,
              SUM(CASE WHEN Role = N'professor' AND CreatedAt >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS NewTeachers30
       FROM dbo.Users
       WHERE DeletedAt IS NULL`
    ),
    // Students without an active subscription are on the free plan (same rule as the login).
    query<{ Slug: PlanId; Name: string; Price: number; Students: number }>(
      `SELECT p.Slug, p.Name, p.Price, COUNT(st.Id) AS Students
       FROM dbo.Plans p
       LEFT JOIN (
         SELECT u.Id, COALESCE(ap.Slug, N'basico') AS PlanSlug
         FROM dbo.Users u
         OUTER APPLY (SELECT TOP (1) pl.Slug FROM dbo.Subscriptions s
                      JOIN dbo.Plans pl ON pl.Id = s.PlanId
                      WHERE s.UserId = u.Id AND s.Status = N'ativa') ap
         WHERE u.Role = N'aluno' AND u.IsActive = 1 AND u.DeletedAt IS NULL
       ) st ON st.PlanSlug = p.Slug
       WHERE p.IsActive = 1
       GROUP BY p.Slug, p.Name, p.Price, p.DisplayOrder
       ORDER BY p.DisplayOrder`
    ),
    query<{ Today: number; Last7: number; ActiveStudents: number; MockExams: number; Mentoring: number }>(
      `SELECT
         (SELECT COUNT(*) FROM dbo.UserAnswers WHERE AnsweredAsRole = N'aluno' AND AnsweredOn = ${TODAY_SQL}) AS Today,
         (SELECT COUNT(*) FROM dbo.UserAnswers WHERE AnsweredAsRole = N'aluno' AND AnsweredOn > DATEADD(DAY, -7, ${TODAY_SQL})) AS Last7,
         (SELECT COUNT(DISTINCT UserId) FROM dbo.UserAnswers WHERE AnsweredAsRole = N'aluno' AND AnsweredOn > DATEADD(DAY, -7, ${TODAY_SQL})) AS ActiveStudents,
         (SELECT COUNT(*) FROM dbo.MockExamAttempts
            WHERE Status IN (N'finalizado', N'expirado') AND FinishedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())) AS MockExams,
         (SELECT COUNT(*) FROM dbo.MentoringRequests WHERE CreatedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())) AS Mentoring`
    ),
    query<{ Day: Date; Answers: number }>(
      `SELECT AnsweredOn AS Day, COUNT(*) AS Answers
       FROM dbo.UserAnswers
       WHERE AnsweredAsRole = N'aluno' AND AnsweredOn > DATEADD(DAY, -${CHART_DAYS}, ${TODAY_SQL})
       GROUP BY AnsweredOn`
    ),
    query<{ Recurring: number | null; Last30: number | null; Count30: number; Total: number | null }>(
      `SELECT
         (SELECT SUM(s.Price) FROM dbo.Subscriptions s
            JOIN dbo.Users u ON u.Id = s.UserId
            WHERE s.Status = N'ativa' AND s.Price > 0 AND u.IsActive = 1 AND u.DeletedAt IS NULL) AS Recurring,
         (SELECT SUM(Amount) FROM dbo.Payments WHERE Status = N'aprovado' AND PaidAt >= DATEADD(DAY, -30, SYSUTCDATETIME())) AS Last30,
         (SELECT COUNT(*) FROM dbo.Payments WHERE Status = N'aprovado' AND PaidAt >= DATEADD(DAY, -30, SYSUTCDATETIME())) AS Count30,
         (SELECT SUM(Amount) FROM dbo.Payments WHERE Status = N'aprovado') AS Total`
    ),
    // Every paid plan a student started in the last 30 days (a new subscription, an upgrade or a switch).
    query<{ Slug: PlanId; Name: string; Adhesions: number }>(
      `SELECT p.Slug, p.Name, COUNT(s.Id) AS Adhesions
       FROM dbo.Plans p
       LEFT JOIN dbo.Subscriptions s
         ON s.PlanId = p.Id AND s.Price > 0 AND s.StartedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())
         AND EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Id = s.UserId AND u.Role = N'aluno' AND u.DeletedAt IS NULL)
       WHERE p.IsActive = 1 AND p.Price > 0
       GROUP BY p.Slug, p.Name, p.DisplayOrder
       ORDER BY p.DisplayOrder`
    ),
  ]);

  const u = users[0];
  const a = activity[0];
  const r = revenue[0];

  // Every day of the window, including the ones without answers.
  const counts = new Map(byDay.map((row) => [isoDate(row.Day), row.Answers]));
  const today = brasiliaToday();
  const answersByDay = Array.from({ length: CHART_DAYS }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - (CHART_DAYS - 1 - index));
    const date = day.toISOString().slice(0, 10);
    return { date, answers: counts.get(date) ?? 0 };
  });

  return {
    users: {
      total: u?.Total ?? 0,
      active: u?.Active ?? 0,
      inactive: (u?.Total ?? 0) - (u?.Active ?? 0),
      byRole: { aluno: u?.Alunos ?? 0, professor: u?.Professores ?? 0, admin: u?.Admins ?? 0 },
      newLast30Days: u?.NewLast30 ?? 0,
      newTeachersLast30Days: u?.NewTeachers30 ?? 0,
    },
    adhesions: {
      last30Days: adhesions.reduce((sum, plan) => sum + plan.Adhesions, 0),
      byPlan: adhesions.map((plan) => ({ plan: plan.Slug, name: plan.Name, count: plan.Adhesions })),
    },
    studentsByPlan: plans.map((plan) => ({ plan: plan.Slug, name: plan.Name, students: plan.Students, price: Number(plan.Price) })),
    activity: {
      answersToday: a?.Today ?? 0,
      answersLast7Days: a?.Last7 ?? 0,
      activeStudentsLast7Days: a?.ActiveStudents ?? 0,
      mockExamsFinishedLast30Days: a?.MockExams ?? 0,
      mentoringRequestsLast30Days: a?.Mentoring ?? 0,
    },
    answersByDay,
    revenue: {
      monthlyRecurring: Number(r?.Recurring ?? 0),
      last30Days: Number(r?.Last30 ?? 0),
      paymentsLast30Days: r?.Count30 ?? 0,
      total: Number(r?.Total ?? 0),
    },
  };
}

/** SQL DATE columns come back as Date at UTC midnight. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's date in Brasília, as a UTC-midnight Date (same day the SQL uses). */
function brasiliaToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(`${parts}T00:00:00Z`);
}

export type PaymentMethod = "cartao" | "pix" | "legado";

export interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: PlanId;
  planName: string;
  amount: number;
  method: PaymentMethod;
  cardLast4: string | null;
  status: "aprovado" | "estornado";
  paidAt: string;
}

/** Newest payments first. */
export async function listPayments(limit: number): Promise<AdminPayment[]> {
  const rows = await query<{
    Id: number; UserId: string; UserName: string; UserEmail: string; PlanSlug: PlanId; PlanName: string;
    Amount: number; Method: PaymentMethod; CardLast4: string | null; Status: "aprovado" | "estornado"; PaidAt: Date;
  }>(
    `SELECT TOP (@limit) pay.Id, pay.UserId, u.Name AS UserName, u.Email AS UserEmail,
            p.Slug AS PlanSlug, p.Name AS PlanName, pay.Amount, pay.Method, pay.CardLast4, pay.Status, pay.PaidAt
     FROM dbo.Payments pay
     JOIN dbo.Users u ON u.Id = pay.UserId
     JOIN dbo.Plans p ON p.Id = pay.PlanId
     ORDER BY pay.PaidAt DESC, pay.Id DESC`,
    { limit }
  );
  return rows.map((row) => ({
    id: String(row.Id),
    userId: row.UserId.toLowerCase(),
    userName: row.UserName,
    userEmail: row.UserEmail,
    plan: row.PlanSlug,
    planName: row.PlanName,
    amount: Number(row.Amount),
    method: row.Method,
    cardLast4: row.CardLast4,
    status: row.Status,
    paidAt: toUtcIso(row.PaidAt),
  }));
}
