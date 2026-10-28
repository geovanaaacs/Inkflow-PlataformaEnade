/* =============================================================================
   Inkflow — 06_ajustes_pendentes.sql
   Ajustes no modelo exigidos pelas features novas do frontend.
   Roda DEPOIS dos scripts 01–05.

   STATUS: script preparado, AINDA NÃO EXECUTADO em nenhum SQL Server.

   Variáveis obrigatórias (modo SQLCMD) — nada de senha fixa no script:
     ADMIN_EMAIL          e-mail da conta administradora
     ADMIN_PASSWORD_HASH  hash da senha (gerado pelo backend, ex.: bcrypt)

   Exemplo:
     sqlcmd -S localhost -E -C -I -f 65001 -b -i 06_ajustes_pendentes.sql ^
       -v ADMIN_EMAIL="admin@inkflow.com" ADMIN_PASSWORD_HASH="$2b$12$..."

   No SSMS: menu Query → SQLCMD Mode e, numa linha antes do USE abaixo, o
   comando setvar do SQLCMD para cada variável (ver README, seção 06).

   Idempotente: cada alteração verifica se já foi aplicada.

   Conteúdo:
     1. Perfil admin (Users.Role)
     2. Desativação de contas (Users.IsActive)
     3. Respostas de professor sem misturar ao ranking (UserAnswers.AnsweredAsRole)
     4. Ranking Geral (todos os planos) e Ranking dos Simulados (Premium)
     5. Várias anotações por questão (UserNotes)
     6. Agenda de mentoria: horários dos professores e solicitações
     7. Simulado em andamento: prazo e respostas parciais
     8. Conta admin (seed, via variáveis)
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

/* =============================================================================
   1. PERFIL ADMIN
   ============================================================================= */

IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_Users_Role' AND definition NOT LIKE N'%admin%'
)
    ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_Role;

IF OBJECT_ID(N'dbo.CK_Users_Role', N'C') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role
        CHECK (Role IN (N'aluno', N'professor', N'admin'));
GO

/* =============================================================================
   2. DESATIVAÇÃO DE CONTAS
   Desativar (admin) é diferente de apagar (DeletedAt): a conta continua com
   os dados pessoais, só não consegue entrar. Pode ser reativada.
   ============================================================================= */

IF COL_LENGTH(N'dbo.Users', N'IsActive') IS NULL
    ALTER TABLE dbo.Users ADD
        IsActive      BIT          NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        DeactivatedAt DATETIME2(3) NULL;
GO

IF OBJECT_ID(N'dbo.CK_Users_Deactivated', N'C') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Deactivated
        CHECK (IsActive = 1 OR DeactivatedAt IS NOT NULL);
GO

/* =============================================================================
   3. RESPOSTAS DE PROFESSOR SEM MISTURAR AO RANKING
   Professores respondem questões para contribuir. A resposta guarda o perfil
   de quem respondeu NO MOMENTO da resposta (se o perfil mudar depois, o
   histórico não muda). Rankings usam só AnsweredAsRole = 'aluno'.
   ============================================================================= */

IF COL_LENGTH(N'dbo.UserAnswers', N'AnsweredAsRole') IS NULL
    ALTER TABLE dbo.UserAnswers ADD
        AnsweredAsRole NVARCHAR(20) NOT NULL CONSTRAINT DF_UserAnswers_AnsweredAsRole DEFAULT (N'aluno');
GO

IF OBJECT_ID(N'dbo.CK_UserAnswers_AnsweredAsRole', N'C') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT CK_UserAnswers_AnsweredAsRole
        CHECK (AnsweredAsRole IN (N'aluno', N'professor', N'admin'));
GO

-- Respostas já existentes: copia o perfil atual de quem respondeu.
UPDATE ua
SET ua.AnsweredAsRole = u.Role
FROM dbo.UserAnswers ua
JOIN dbo.Users u ON u.Id = ua.UserId
WHERE ua.AnsweredAsRole <> u.Role;
GO

-- Ranking Geral: 1ª tentativa, aba Questões (fora de simulado), respondida como aluno.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserAnswers_PracticeRanking' AND object_id = OBJECT_ID(N'dbo.UserAnswers'))
    CREATE NONCLUSTERED INDEX IX_UserAnswers_PracticeRanking
        ON dbo.UserAnswers (UserId)
        INCLUDE (IsCorrect, AnsweredOn)
        WHERE AttemptNumber = 1 AND MockExamAttemptId IS NULL AND AnsweredAsRole = N'aluno';
GO

/* View com a regra do Ranking Geral (a mesma exibida na tela):
   acerto = 10 pts, erro = 2 pts, só a 1ª tentativa de cada questão da aba
   Questões, só alunos com conta ativa. */
CREATE OR ALTER VIEW dbo.vw_PracticeRanking
AS
SELECT
    ua.UserId,
    COUNT(*)                                             AS AnsweredCount,
    SUM(CAST(ua.IsCorrect AS INT))                       AS CorrectCount,
    SUM(CASE WHEN ua.IsCorrect = 1 THEN 10 ELSE 2 END)   AS Points
FROM dbo.UserAnswers ua
JOIN dbo.Users u ON u.Id = ua.UserId
WHERE ua.AttemptNumber = 1
  AND ua.MockExamAttemptId IS NULL
  AND ua.AnsweredAsRole = N'aluno'
  AND u.Role = N'aluno'
  AND u.IsActive = 1
  AND u.DeletedAt IS NULL
GROUP BY ua.UserId;
GO

/* =============================================================================
   4. RANKING GERAL (TODOS OS PLANOS) E RANKING DOS SIMULADOS (PREMIUM)
   ============================================================================= */

-- Feature do Ranking dos Simulados (no lugar do antigo "ranking exclusivo").
IF EXISTS (SELECT 1 FROM dbo.Features WHERE Code = N'RANKING_EXCLUSIVO')
    UPDATE dbo.Features SET Code = N'RANKING_SIMULADOS' WHERE Code = N'RANKING_EXCLUSIVO';

IF NOT EXISTS (SELECT 1 FROM dbo.Features WHERE Code = N'RANKING_SIMULADOS')
    INSERT INTO dbo.Features (Code, Name, Description)
    VALUES (N'RANKING_SIMULADOS', N'Ranking dos Simulados',
            N'Posição a partir dos resultados nos simulados (melhor tentativa de cada um).');

UPDATE dbo.Features
SET Name = N'Ranking Geral',
    Description = N'Posição a partir das questões respondidas: acerto vale 10 pts e erro vale 2 pts.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Code = N'RANKING' AND Name <> N'Ranking Geral';

-- Ranking Geral liberado também no Básico; Ranking dos Simulados só no Premium.
INSERT INTO dbo.PlanFeatures (PlanId, FeatureId)
SELECT p.Id, f.Id
FROM (VALUES (N'basico', N'RANKING'), (N'premium', N'RANKING_SIMULADOS')) AS v (PlanSlug, FeatureCode)
JOIN dbo.Plans p    ON p.Slug = v.PlanSlug
JOIN dbo.Features f ON f.Code = v.FeatureCode
WHERE NOT EXISTS (SELECT 1 FROM dbo.PlanFeatures pf WHERE pf.PlanId = p.Id AND pf.FeatureId = f.Id);
GO

-- Textos dos planos (iguais aos do frontend, sem comparar o valor das pessoas).
UPDATE dbo.Plans
SET Description = N'Para quem quer praticar sem limites e organizar os estudos com anotações.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Slug = N'avancado' AND Description LIKE N'%concorr%';

UPDATE b
SET b.Description = v.Description, b.UpdatedAt = SYSUTCDATETIME()
FROM dbo.PlanBenefits b
JOIN dbo.Plans p ON p.Id = b.PlanId
JOIN (VALUES
    (N'premium',  4, N'Acesso ao Ranking dos Simulados: acompanhe sua evolução e sua posição nos simulados'),
    (N'avancado', 2, N'Histórico completo de acertos e erros')
) AS v (PlanSlug, DisplayOrder, Description)
    ON v.PlanSlug = p.Slug AND v.DisplayOrder = b.DisplayOrder
WHERE b.Description <> v.Description;

INSERT INTO dbo.PlanBenefits (PlanId, Description, DisplayOrder)
SELECT p.Id, N'Ranking Geral em tempo real com as questões que você responde', 4
FROM dbo.Plans p
WHERE p.Slug = N'basico'
  AND NOT EXISTS (SELECT 1 FROM dbo.PlanBenefits b WHERE b.PlanId = p.Id AND b.DisplayOrder = 4);
GO

-- RankingSnapshots ganha o escopo: GERAL ou SIMULADOS.
IF COL_LENGTH(N'dbo.RankingSnapshots', N'Scope') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD
        Scope NVARCHAR(10) NOT NULL CONSTRAINT DF_RankingSnapshots_Scope DEFAULT (N'GERAL');
GO

IF OBJECT_ID(N'dbo.CK_RankingSnapshots_Scope', N'C') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD CONSTRAINT CK_RankingSnapshots_Scope
        CHECK (Scope IN (N'GERAL', N'SIMULADOS'));

IF OBJECT_ID(N'dbo.UQ_RankingSnapshots_Period_User', N'UQ') IS NOT NULL
    ALTER TABLE dbo.RankingSnapshots DROP CONSTRAINT UQ_RankingSnapshots_Period_User;

IF OBJECT_ID(N'dbo.UQ_RankingSnapshots_Scope_Period_User', N'UQ') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD CONSTRAINT UQ_RankingSnapshots_Scope_Period_User
        UNIQUE (Scope, PeriodType, PeriodStart, UserId);
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RankingSnapshots_Period_Position' AND object_id = OBJECT_ID(N'dbo.RankingSnapshots'))
    DROP INDEX IX_RankingSnapshots_Period_Position ON dbo.RankingSnapshots;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RankingSnapshots_Scope_Period_Position' AND object_id = OBJECT_ID(N'dbo.RankingSnapshots'))
    CREATE NONCLUSTERED INDEX IX_RankingSnapshots_Scope_Period_Position
        ON dbo.RankingSnapshots (Scope, PeriodType, PeriodStart, Position)
        INCLUDE (UserId, Score);
GO

/* =============================================================================
   5. VÁRIAS ANOTAÇÕES POR QUESTÃO
   ============================================================================= */

IF OBJECT_ID(N'dbo.UQ_UserNotes_User_Question', N'UQ') IS NOT NULL
    ALTER TABLE dbo.UserNotes DROP CONSTRAINT UQ_UserNotes_User_Question;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserNotes_User_Question_CreatedAt' AND object_id = OBJECT_ID(N'dbo.UserNotes'))
    CREATE NONCLUSTERED INDEX IX_UserNotes_User_Question_CreatedAt
        ON dbo.UserNotes (UserId, QuestionId, CreatedAt DESC);
GO

/* =============================================================================
   6. AGENDA DE MENTORIA
   O professor abre horários; o aluno Premium solicita vaga; o professor
   aceita ou recusa. Substitui, para a agenda, o modelo de grupos fixos
   (StudyGroups/MentoringSessions continuam no banco — decidir se saem).
   ============================================================================= */

IF OBJECT_ID(N'dbo.TeacherAvailabilitySlots', N'U') IS NULL
CREATE TABLE dbo.TeacherAvailabilitySlots (
    Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TeacherAvailabilitySlots PRIMARY KEY,
    TeacherUserId   UNIQUEIDENTIFIER  NOT NULL
        CONSTRAINT FK_TeacherAvailabilitySlots_TeacherProfiles REFERENCES dbo.TeacherProfiles (UserId),
    SessionType     NVARCHAR(10)      NOT NULL
        CONSTRAINT CK_TeacherAvailabilitySlots_Type CHECK (SessionType IN (N'mentoria', N'grupo')),
    Topic           NVARCHAR(120)     NOT NULL
        CONSTRAINT CK_TeacherAvailabilitySlots_Topic CHECK (LEN(LTRIM(RTRIM(Topic))) > 0),
    StartsAt        DATETIME2(3)      NOT NULL,  -- UTC
    DurationMinutes SMALLINT          NOT NULL
        CONSTRAINT CK_TeacherAvailabilitySlots_Duration CHECK (DurationMinutes BETWEEN 15 AND 240),
    Capacity        SMALLINT          NOT NULL
        CONSTRAINT CK_TeacherAvailabilitySlots_Capacity CHECK (Capacity BETWEEN 1 AND 100),
    CanceledAt      DATETIME2(3)      NULL,      -- cancelamento lógico pelo professor
    CreatedAt       DATETIME2(3)      NOT NULL CONSTRAINT DF_TeacherAvailabilitySlots_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2(3)      NOT NULL CONSTRAINT DF_TeacherAvailabilitySlots_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TeacherAvailabilitySlots_Open' AND object_id = OBJECT_ID(N'dbo.TeacherAvailabilitySlots'))
    CREATE NONCLUSTERED INDEX IX_TeacherAvailabilitySlots_Open
        ON dbo.TeacherAvailabilitySlots (SessionType, StartsAt)
        INCLUDE (TeacherUserId, Capacity, Topic, DurationMinutes)
        WHERE CanceledAt IS NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TeacherAvailabilitySlots_Teacher' AND object_id = OBJECT_ID(N'dbo.TeacherAvailabilitySlots'))
    CREATE NONCLUSTERED INDEX IX_TeacherAvailabilitySlots_Teacher
        ON dbo.TeacherAvailabilitySlots (TeacherUserId, StartsAt);
GO

IF OBJECT_ID(N'dbo.MentoringRequests', N'U') IS NULL
CREATE TABLE dbo.MentoringRequests (
    Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MentoringRequests PRIMARY KEY,
    SlotId        INT               NOT NULL
        CONSTRAINT FK_MentoringRequests_Slots REFERENCES dbo.TeacherAvailabilitySlots (Id),
    StudentUserId UNIQUEIDENTIFIER  NOT NULL
        CONSTRAINT FK_MentoringRequests_Users REFERENCES dbo.Users (Id),
    Message       NVARCHAR(500)     NULL,
    Status        NVARCHAR(20)      NOT NULL CONSTRAINT DF_MentoringRequests_Status DEFAULT (N'pendente')
        CONSTRAINT CK_MentoringRequests_Status CHECK (Status IN (N'pendente', N'confirmada', N'recusada', N'cancelada')),
    RespondedAt   DATETIME2(3)      NULL,
    CreatedAt     DATETIME2(3)      NOT NULL CONSTRAINT DF_MentoringRequests_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2(3)      NOT NULL CONSTRAINT DF_MentoringRequests_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_MentoringRequests_Responded CHECK (Status = N'pendente' OR RespondedAt IS NOT NULL)
);
GO

-- Um aluno só pode ter uma solicitação ativa por horário.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_MentoringRequests_Slot_Student_Active' AND object_id = OBJECT_ID(N'dbo.MentoringRequests'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_MentoringRequests_Slot_Student_Active
        ON dbo.MentoringRequests (SlotId, StudentUserId)
        WHERE Status IN (N'pendente', N'confirmada');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MentoringRequests_Student' AND object_id = OBJECT_ID(N'dbo.MentoringRequests'))
    CREATE NONCLUSTERED INDEX IX_MentoringRequests_Student
        ON dbo.MentoringRequests (StudentUserId, Status);
GO

/* =============================================================================
   7. SIMULADO EM ANDAMENTO
   O frontend salva cada resposta durante o simulado (para retomar depois de
   recarregar a página) e conta o tempo até EndsAt.
   ============================================================================= */

IF COL_LENGTH(N'dbo.MockExamAttempts', N'EndsAt') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD EndsAt DATETIME2(3) NULL;
GO

UPDATE a
SET a.EndsAt = DATEADD(MINUTE, m.TimeLimitMinutes, a.StartedAt)
FROM dbo.MockExamAttempts a
JOIN dbo.MockExams m ON m.Id = a.MockExamId
WHERE a.EndsAt IS NULL AND m.TimeLimitMinutes IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.MockExamAttemptAnswers', N'U') IS NULL
CREATE TABLE dbo.MockExamAttemptAnswers (
    MockExamAttemptId INT          NOT NULL
        CONSTRAINT FK_MockExamAttemptAnswers_Attempts REFERENCES dbo.MockExamAttempts (Id) ON DELETE CASCADE,
    QuestionId        INT          NOT NULL,
    SelectedOptionId  INT          NOT NULL,
    UpdatedAt         DATETIME2(3) NOT NULL CONSTRAINT DF_MockExamAttemptAnswers_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_MockExamAttemptAnswers PRIMARY KEY (MockExamAttemptId, QuestionId),
    -- A alternativa precisa ser da mesma questão.
    CONSTRAINT FK_MockExamAttemptAnswers_Options
        FOREIGN KEY (SelectedOptionId, QuestionId) REFERENCES dbo.QuestionOptions (Id, QuestionId)
);
GO

/* =============================================================================
   8. CONTA ADMIN (seed)
   E-mail e hash vêm das variáveis SQLCMD. Sem elas o sqlcmd para com erro;
   fora do modo SQLCMD o bloco abaixo detecta o texto não substituído e pula.
   ============================================================================= */

DECLARE @adminEmail NVARCHAR(254) = N'$(ADMIN_EMAIL)';
DECLARE @adminHash  NVARCHAR(255) = N'$(ADMIN_PASSWORD_HASH)';
DECLARE @notSubstituted NVARCHAR(2) = N'$' + N'(';

IF LEFT(@adminEmail, 2) = @notSubstituted OR LEFT(@adminHash, 2) = @notSubstituted
    PRINT N'Conta admin NÃO criada: defina ADMIN_EMAIL e ADMIN_PASSWORD_HASH (modo SQLCMD).';
ELSE IF LEN(@adminHash) < 20
    PRINT N'Conta admin NÃO criada: ADMIN_PASSWORD_HASH não parece um hash de senha.';
ELSE IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = LOWER(@adminEmail) AND DeletedAt IS NULL)
    -- Já existe: não altera nada (nunca sobrescreve a senha de uma conta).
    PRINT N'Conta admin já existe — nada a fazer.';
ELSE
BEGIN
    INSERT INTO dbo.Users (Name, Email, PasswordHash, Role)
    VALUES (N'Administração Inkflow', LOWER(@adminEmail), @adminHash, N'admin');
    PRINT N'Conta admin criada.';
END
GO

PRINT N'06_ajustes_pendentes.sql concluído.';
GO
