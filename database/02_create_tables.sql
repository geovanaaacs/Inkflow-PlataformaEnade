/* =============================================================================
   Inkflow — 02_create_tables.sql
   Cria as tabelas (apenas colunas, tipos e nulidade).
   PK, FK, UNIQUE, CHECK e DEFAULT ficam em 03_constraints.sql.

   Convenções:
     - Datas/horas (DATETIME2) sempre em UTC.
     - UserAnswers.AnsweredOn é a data LOCAL (horário de Brasília), usada no
       limite diário de questões e no streak.
     - Users usa UNIQUEIDENTIFIER (não expõe IDs sequenciais na API);
       as demais tabelas usam INT IDENTITY (UserAnswers usa BIGINT por volume).

   Idempotente: cada tabela só é criada se ainda não existir.
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

/* -----------------------------------------------------------------------------
   USUÁRIOS E AUTENTICAÇÃO
   ----------------------------------------------------------------------------- */

-- Usuários (alunos e professores). Exclusão lógica via DeletedAt.
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
CREATE TABLE dbo.Users (
    Id                        UNIQUEIDENTIFIER NOT NULL,
    Name                      NVARCHAR(150)    NOT NULL,
    Email                     NVARCHAR(254)    NOT NULL,
    PasswordHash              NVARCHAR(255)    NOT NULL,
    Role                      NVARCHAR(20)     NOT NULL,  -- 'aluno' | 'professor'
    Phone                     NVARCHAR(20)     NULL,
    Course                    NVARCHAR(150)    NULL,
    PhotoUrl                  NVARCHAR(500)    NULL,
    EmailNotificationsEnabled BIT              NOT NULL,
    PushNotificationsEnabled  BIT              NOT NULL,
    CreatedAt                 DATETIME2(3)     NOT NULL,
    UpdatedAt                 DATETIME2(3)     NOT NULL,
    DeletedAt                 DATETIME2(3)     NULL
);
GO

-- Dados extras de quem tem perfil de professor (1:1 com Users).
IF OBJECT_ID(N'dbo.TeacherProfiles', N'U') IS NULL
CREATE TABLE dbo.TeacherProfiles (
    UserId      UNIQUEIDENTIFIER NOT NULL,
    Title       NVARCHAR(30)     NULL,      -- ex.: 'Professora', 'Prof. Dr.'
    Credentials NVARCHAR(200)    NOT NULL,  -- ex.: 'Eng. de Software · UNICAMP · 12 anos ENADE'
    Bio         NVARCHAR(1000)   NULL,
    IsVerified  BIT              NOT NULL,  -- selo "Professor verificado"
    VerifiedAt  DATETIME2(3)     NULL,
    CreatedAt   DATETIME2(3)     NOT NULL,
    UpdatedAt   DATETIME2(3)     NOT NULL
);
GO

-- Tokens do fluxo "Esqueceu sua senha?" / "Alterar senha" (link por e-mail).
IF OBJECT_ID(N'dbo.PasswordResetTokens', N'U') IS NULL
CREATE TABLE dbo.PasswordResetTokens (
    Id        INT IDENTITY(1,1) NOT NULL,
    UserId    UNIQUEIDENTIFIER  NOT NULL,
    TokenHash NVARCHAR(128)     NOT NULL,
    ExpiresAt DATETIME2(3)      NOT NULL,
    UsedAt    DATETIME2(3)      NULL,
    CreatedAt DATETIME2(3)      NOT NULL
);
GO

/* -----------------------------------------------------------------------------
   PLANOS E ASSINATURAS
   ----------------------------------------------------------------------------- */

-- Planos (Básico = gratuito, Premium, Avançado).
IF OBJECT_ID(N'dbo.Plans', N'U') IS NULL
CREATE TABLE dbo.Plans (
    Id                 INT IDENTITY(1,1) NOT NULL,
    Slug               NVARCHAR(50)      NOT NULL,
    Name               NVARCHAR(50)      NOT NULL,
    Description        NVARCHAR(500)     NOT NULL,
    Price              DECIMAL(10,2)     NOT NULL,
    BillingPeriod      NVARCHAR(10)      NOT NULL,  -- 'gratuito' | 'mensal' | 'anual'
    DailyQuestionLimit INT               NULL,      -- NULL = ilimitado
    IsHighlighted      BIT               NOT NULL,  -- badge "Mais popular"
    IsActive           BIT               NOT NULL,
    DisplayOrder       INT               NOT NULL,
    CreatedAt          DATETIME2(3)      NOT NULL,
    UpdatedAt          DATETIME2(3)      NOT NULL
);
GO

-- Benefícios exibidos no card de cada plano (texto de marketing).
IF OBJECT_ID(N'dbo.PlanBenefits', N'U') IS NULL
CREATE TABLE dbo.PlanBenefits (
    Id           INT IDENTITY(1,1) NOT NULL,
    PlanId       INT               NOT NULL,
    Description  NVARCHAR(300)     NOT NULL,
    DisplayOrder INT               NOT NULL,
    CreatedAt    DATETIME2(3)      NOT NULL,
    UpdatedAt    DATETIME2(3)      NOT NULL
);
GO

-- Catálogo de funcionalidades controladas por plano (controle de acesso).
IF OBJECT_ID(N'dbo.Features', N'U') IS NULL
CREATE TABLE dbo.Features (
    Id          INT IDENTITY(1,1) NOT NULL,
    Code        NVARCHAR(50)      NOT NULL,  -- ex.: 'SIMULADOS', 'RANKING'
    Name        NVARCHAR(100)     NOT NULL,
    Description NVARCHAR(300)     NULL,
    CreatedAt   DATETIME2(3)      NOT NULL,
    UpdatedAt   DATETIME2(3)      NOT NULL
);
GO

-- Quais funcionalidades cada plano libera (N:N Plans x Features).
IF OBJECT_ID(N'dbo.PlanFeatures', N'U') IS NULL
CREATE TABLE dbo.PlanFeatures (
    PlanId    INT          NOT NULL,
    FeatureId INT          NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL
);
GO

-- Histórico de assinaturas do usuário (no máximo uma 'ativa' por vez).
IF OBJECT_ID(N'dbo.Subscriptions', N'U') IS NULL
CREATE TABLE dbo.Subscriptions (
    Id         INT IDENTITY(1,1) NOT NULL,
    UserId     UNIQUEIDENTIFIER  NOT NULL,
    PlanId     INT               NOT NULL,
    Status     NVARCHAR(20)      NOT NULL,  -- 'pendente' | 'ativa' | 'cancelada' | 'expirada'
    Price      DECIMAL(10,2)     NOT NULL,  -- preço contratado (histórico)
    StartedAt  DATETIME2(3)      NOT NULL,
    EndsAt     DATETIME2(3)      NULL,      -- NULL = sem vencimento (plano gratuito)
    CanceledAt DATETIME2(3)      NULL,
    CreatedAt  DATETIME2(3)      NOT NULL,
    UpdatedAt  DATETIME2(3)      NOT NULL
);
GO

/* -----------------------------------------------------------------------------
   BANCO DE QUESTÕES
   ----------------------------------------------------------------------------- */

-- Áreas de TI (filtro "Sua área de TI" e desempenho por área no dashboard).
IF OBJECT_ID(N'dbo.Areas', N'U') IS NULL
CREATE TABLE dbo.Areas (
    Id        INT IDENTITY(1,1) NOT NULL,
    Name      NVARCHAR(100)     NOT NULL,  -- 'Engenharia de Software'
    ShortName NVARCHAR(50)      NOT NULL,  -- 'Eng. de Software' (rótulo do dashboard)
    Slug      NVARCHAR(100)     NOT NULL,  -- usado em /questoes?area=<slug>
    CreatedAt DATETIME2(3)      NOT NULL,
    UpdatedAt DATETIME2(3)      NOT NULL
);
GO

-- Tópicos dentro de cada área.
IF OBJECT_ID(N'dbo.Topics', N'U') IS NULL
CREATE TABLE dbo.Topics (
    Id        INT IDENTITY(1,1) NOT NULL,
    AreaId    INT               NOT NULL,
    Name      NVARCHAR(150)     NOT NULL,
    CreatedAt DATETIME2(3)      NOT NULL,
    UpdatedAt DATETIME2(3)      NOT NULL
);
GO

-- Questões do ENADE.
IF OBJECT_ID(N'dbo.Questions', N'U') IS NULL
CREATE TABLE dbo.Questions (
    Id            INT IDENTITY(1,1) NOT NULL,
    Code          NVARCHAR(20)      NOT NULL,  -- 'Q2023-112'
    TopicId       INT               NOT NULL,
    Year          SMALLINT          NOT NULL,
    Type          NVARCHAR(30)      NOT NULL,  -- 'Múltipla escolha'
    Difficulty    NVARCHAR(10)      NOT NULL,  -- 'fácil' | 'médio' | 'difícil'
    Statement     NVARCHAR(MAX)     NOT NULL,
    AiExplanation NVARCHAR(MAX)     NULL,      -- painel "Gabarito IA"
    IsActive      BIT               NOT NULL,
    CreatedAt     DATETIME2(3)      NOT NULL,
    UpdatedAt     DATETIME2(3)      NOT NULL
);
GO

-- Alternativas de cada questão (exatamente uma com IsCorrect = 1).
IF OBJECT_ID(N'dbo.QuestionOptions', N'U') IS NULL
CREATE TABLE dbo.QuestionOptions (
    Id         INT IDENTITY(1,1) NOT NULL,
    QuestionId INT               NOT NULL,
    Letter     NCHAR(1)          NOT NULL,  -- 'a'..'e'
    Text       NVARCHAR(1000)    NOT NULL,
    IsCorrect  BIT               NOT NULL,
    CreatedAt  DATETIME2(3)      NOT NULL,
    UpdatedAt  DATETIME2(3)      NOT NULL
);
GO

-- Comentário/resolução de professores (painel "Professor"). 1:N por questão.
IF OBJECT_ID(N'dbo.TeacherComments', N'U') IS NULL
CREATE TABLE dbo.TeacherComments (
    Id            INT IDENTITY(1,1) NOT NULL,
    QuestionId    INT               NOT NULL,
    TeacherUserId UNIQUEIDENTIFIER  NOT NULL,
    Content       NVARCHAR(4000)    NOT NULL,
    CreatedAt     DATETIME2(3)      NOT NULL,
    UpdatedAt     DATETIME2(3)      NOT NULL
);
GO

-- Comentários da comunidade (painel "Comunidade").
IF OBJECT_ID(N'dbo.CommunityComments', N'U') IS NULL
CREATE TABLE dbo.CommunityComments (
    Id         INT IDENTITY(1,1) NOT NULL,
    QuestionId INT               NOT NULL,
    UserId     UNIQUEIDENTIFIER  NOT NULL,
    Content    NVARCHAR(2000)    NOT NULL,
    CreatedAt  DATETIME2(3)      NOT NULL,
    UpdatedAt  DATETIME2(3)      NOT NULL
);
GO

-- Anotação pessoal do usuário em uma questão (uma por usuário/questão).
IF OBJECT_ID(N'dbo.UserNotes', N'U') IS NULL
CREATE TABLE dbo.UserNotes (
    Id         INT IDENTITY(1,1) NOT NULL,
    UserId     UNIQUEIDENTIFIER  NOT NULL,
    QuestionId INT               NOT NULL,
    Content    NVARCHAR(4000)    NOT NULL,
    CreatedAt  DATETIME2(3)      NOT NULL,
    UpdatedAt  DATETIME2(3)      NOT NULL
);
GO

/* -----------------------------------------------------------------------------
   SIMULADOS (recurso Pro)
   ----------------------------------------------------------------------------- */

-- Simulados montados a partir do banco de questões.
IF OBJECT_ID(N'dbo.MockExams', N'U') IS NULL
CREATE TABLE dbo.MockExams (
    Id               INT IDENTITY(1,1) NOT NULL,
    Title            NVARCHAR(150)     NOT NULL,
    Description      NVARCHAR(1000)    NULL,
    AreaId           INT               NULL,      -- NULL = simulado geral
    Difficulty       NVARCHAR(10)      NULL,
    TimeLimitMinutes SMALLINT          NULL,      -- NULL = sem limite de tempo
    IsActive         BIT               NOT NULL,
    CreatedAt        DATETIME2(3)      NOT NULL,
    UpdatedAt        DATETIME2(3)      NOT NULL
);
GO

-- Questões que compõem cada simulado (N:N MockExams x Questions).
IF OBJECT_ID(N'dbo.MockExamQuestions', N'U') IS NULL
CREATE TABLE dbo.MockExamQuestions (
    MockExamId   INT          NOT NULL,
    QuestionId   INT          NOT NULL,
    DisplayOrder SMALLINT     NOT NULL,
    CreatedAt    DATETIME2(3) NOT NULL
);
GO

-- Cada vez que um usuário faz um simulado (com cronômetro).
IF OBJECT_ID(N'dbo.MockExamAttempts', N'U') IS NULL
CREATE TABLE dbo.MockExamAttempts (
    Id             INT IDENTITY(1,1) NOT NULL,
    MockExamId     INT               NOT NULL,
    UserId         UNIQUEIDENTIFIER  NOT NULL,
    Status         NVARCHAR(20)      NOT NULL,  -- 'em_andamento' | 'finalizado' | 'expirado' | 'abandonado'
    TotalQuestions SMALLINT          NOT NULL,
    CorrectCount   SMALLINT          NULL,      -- preenchido ao finalizar
    StartedAt      DATETIME2(3)      NOT NULL,
    FinishedAt     DATETIME2(3)      NULL,
    CreatedAt      DATETIME2(3)      NOT NULL,
    UpdatedAt      DATETIME2(3)      NOT NULL
);
GO

/* -----------------------------------------------------------------------------
   RESPOSTAS
   ----------------------------------------------------------------------------- */

-- Todas as tentativas de resposta (histórico imutável).
-- AttemptNumber = 1 é a primeira vez que o usuário responde a questão:
-- só ela conta para "questões respondidas" e para o limite diário do plano.
IF OBJECT_ID(N'dbo.UserAnswers', N'U') IS NULL
CREATE TABLE dbo.UserAnswers (
    Id                BIGINT IDENTITY(1,1) NOT NULL,
    UserId            UNIQUEIDENTIFIER     NOT NULL,
    QuestionId        INT                  NOT NULL,
    SelectedOptionId  INT                  NOT NULL,
    IsCorrect         BIT                  NOT NULL,
    AttemptNumber     SMALLINT             NOT NULL,
    MockExamAttemptId INT                  NULL,      -- preenchido se respondida dentro de um simulado
    AnsweredAt        DATETIME2(3)         NOT NULL,  -- UTC
    AnsweredOn        DATE                 NOT NULL   -- data local (Brasília)
);
GO

/* -----------------------------------------------------------------------------
   RANKING (recurso Pro)
   ----------------------------------------------------------------------------- */

-- Fotografia do ranking por período (o ranking "em tempo real" é calculado
-- a partir de UserAnswers; esta tabela guarda o histórico fechado).
IF OBJECT_ID(N'dbo.RankingSnapshots', N'U') IS NULL
CREATE TABLE dbo.RankingSnapshots (
    Id            INT IDENTITY(1,1) NOT NULL,
    UserId        UNIQUEIDENTIFIER  NOT NULL,
    PeriodType    NVARCHAR(10)      NOT NULL,  -- 'semanal' | 'mensal'
    PeriodStart   DATE              NOT NULL,
    Position      INT               NOT NULL,
    Score         INT               NOT NULL,
    AnsweredCount INT               NOT NULL,
    CorrectCount  INT               NOT NULL,
    CreatedAt     DATETIME2(3)      NOT NULL
);
GO

/* -----------------------------------------------------------------------------
   MENTORIA / GRUPOS DE ESTUDO (recurso Pro)
   ----------------------------------------------------------------------------- */

-- Grupos de estudo com mentoria coletiva de um especialista (professor).
IF OBJECT_ID(N'dbo.StudyGroups', N'U') IS NULL
CREATE TABLE dbo.StudyGroups (
    Id                INT IDENTITY(1,1) NOT NULL,
    Name              NVARCHAR(150)     NOT NULL,
    Description       NVARCHAR(1000)    NULL,
    MentorUserId      UNIQUEIDENTIFIER  NOT NULL,
    AreaId            INT               NULL,
    WhatsAppInviteUrl NVARCHAR(500)     NULL,  -- grupo exclusivo no WhatsApp
    MaxMembers        SMALLINT          NULL,
    IsActive          BIT               NOT NULL,
    CreatedAt         DATETIME2(3)      NOT NULL,
    UpdatedAt         DATETIME2(3)      NOT NULL
);
GO

-- Membros de cada grupo (N:N StudyGroups x Users).
IF OBJECT_ID(N'dbo.StudyGroupMembers', N'U') IS NULL
CREATE TABLE dbo.StudyGroupMembers (
    StudyGroupId INT              NOT NULL,
    UserId       UNIQUEIDENTIFIER NOT NULL,
    JoinedAt     DATETIME2(3)     NOT NULL,
    LeftAt       DATETIME2(3)     NULL
);
GO

-- Trilha de estudo definida pelo especialista ("o que e a ordem para estudar").
IF OBJECT_ID(N'dbo.StudyGroupPlanItems', N'U') IS NULL
CREATE TABLE dbo.StudyGroupPlanItems (
    Id           INT IDENTITY(1,1) NOT NULL,
    StudyGroupId INT               NOT NULL,
    TopicId      INT               NOT NULL,
    DisplayOrder SMALLINT          NOT NULL,
    Guidance     NVARCHAR(1000)    NULL,
    DueDate      DATE              NULL,
    CreatedAt    DATETIME2(3)      NOT NULL,
    UpdatedAt    DATETIME2(3)      NOT NULL
);
GO

-- Encontros de mentoria agendados para o grupo.
IF OBJECT_ID(N'dbo.MentoringSessions', N'U') IS NULL
CREATE TABLE dbo.MentoringSessions (
    Id              INT IDENTITY(1,1) NOT NULL,
    StudyGroupId    INT               NOT NULL,
    Title           NVARCHAR(150)     NOT NULL,
    Description     NVARCHAR(1000)    NULL,
    ScheduledAt     DATETIME2(3)      NOT NULL,  -- UTC
    DurationMinutes SMALLINT          NOT NULL,
    MeetingUrl      NVARCHAR(500)     NULL,
    CreatedAt       DATETIME2(3)      NOT NULL,
    UpdatedAt       DATETIME2(3)      NOT NULL
);
GO

PRINT N'02_create_tables.sql concluído.';
GO
