/* =============================================================================
   Inkflow — 03_constraints.sql
   Chaves primárias, UNIQUE, chaves estrangeiras, CHECK e DEFAULT.

   Ordem: PK -> UNIQUE -> FK -> CHECK -> DEFAULT
   (as FKs compostas dependem das UNIQUE criadas antes).

   Regras de exclusão:
     - Users NUNCA é apagado fisicamente (exclusão lógica via DeletedAt),
       então nenhuma FK para Users usa CASCADE.
     - Dados "filhos" puramente de conteúdo usam ON DELETE CASCADE
       (ex.: alternativas de uma questão, benefícios de um plano).
     - UserAnswers não tem cascata: questões/alternativas já respondidas não
       podem ser apagadas (use Questions.IsActive = 0).

   Idempotente: cada constraint só é criada se ainda não existir.
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

/* =============================================================================
   1. CHAVES PRIMÁRIAS
   ============================================================================= */

IF OBJECT_ID(N'dbo.PK_Users', N'PK') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_TeacherProfiles', N'PK') IS NULL
    ALTER TABLE dbo.TeacherProfiles ADD CONSTRAINT PK_TeacherProfiles PRIMARY KEY CLUSTERED (UserId);
IF OBJECT_ID(N'dbo.PK_PasswordResetTokens', N'PK') IS NULL
    ALTER TABLE dbo.PasswordResetTokens ADD CONSTRAINT PK_PasswordResetTokens PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_Plans', N'PK') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT PK_Plans PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_PlanBenefits', N'PK') IS NULL
    ALTER TABLE dbo.PlanBenefits ADD CONSTRAINT PK_PlanBenefits PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_Features', N'PK') IS NULL
    ALTER TABLE dbo.Features ADD CONSTRAINT PK_Features PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_PlanFeatures', N'PK') IS NULL
    ALTER TABLE dbo.PlanFeatures ADD CONSTRAINT PK_PlanFeatures PRIMARY KEY CLUSTERED (PlanId, FeatureId);
IF OBJECT_ID(N'dbo.PK_Subscriptions', N'PK') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT PK_Subscriptions PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_Areas', N'PK') IS NULL
    ALTER TABLE dbo.Areas ADD CONSTRAINT PK_Areas PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_Topics', N'PK') IS NULL
    ALTER TABLE dbo.Topics ADD CONSTRAINT PK_Topics PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_Questions', N'PK') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT PK_Questions PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_QuestionOptions', N'PK') IS NULL
    ALTER TABLE dbo.QuestionOptions ADD CONSTRAINT PK_QuestionOptions PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_TeacherComments', N'PK') IS NULL
    ALTER TABLE dbo.TeacherComments ADD CONSTRAINT PK_TeacherComments PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_CommunityComments', N'PK') IS NULL
    ALTER TABLE dbo.CommunityComments ADD CONSTRAINT PK_CommunityComments PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_UserNotes', N'PK') IS NULL
    ALTER TABLE dbo.UserNotes ADD CONSTRAINT PK_UserNotes PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_MockExams', N'PK') IS NULL
    ALTER TABLE dbo.MockExams ADD CONSTRAINT PK_MockExams PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_MockExamQuestions', N'PK') IS NULL
    ALTER TABLE dbo.MockExamQuestions ADD CONSTRAINT PK_MockExamQuestions PRIMARY KEY CLUSTERED (MockExamId, QuestionId);
IF OBJECT_ID(N'dbo.PK_MockExamAttempts', N'PK') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT PK_MockExamAttempts PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_UserAnswers', N'PK') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT PK_UserAnswers PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_RankingSnapshots', N'PK') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD CONSTRAINT PK_RankingSnapshots PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_StudyGroups', N'PK') IS NULL
    ALTER TABLE dbo.StudyGroups ADD CONSTRAINT PK_StudyGroups PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_StudyGroupMembers', N'PK') IS NULL
    ALTER TABLE dbo.StudyGroupMembers ADD CONSTRAINT PK_StudyGroupMembers PRIMARY KEY CLUSTERED (StudyGroupId, UserId);
IF OBJECT_ID(N'dbo.PK_StudyGroupPlanItems', N'PK') IS NULL
    ALTER TABLE dbo.StudyGroupPlanItems ADD CONSTRAINT PK_StudyGroupPlanItems PRIMARY KEY CLUSTERED (Id);
IF OBJECT_ID(N'dbo.PK_MentoringSessions', N'PK') IS NULL
    ALTER TABLE dbo.MentoringSessions ADD CONSTRAINT PK_MentoringSessions PRIMARY KEY CLUSTERED (Id);
GO

/* =============================================================================
   2. UNIQUE
   ============================================================================= */

IF OBJECT_ID(N'dbo.UQ_PasswordResetTokens_TokenHash', N'UQ') IS NULL
    ALTER TABLE dbo.PasswordResetTokens ADD CONSTRAINT UQ_PasswordResetTokens_TokenHash UNIQUE (TokenHash);

IF OBJECT_ID(N'dbo.UQ_Plans_Slug', N'UQ') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT UQ_Plans_Slug UNIQUE (Slug);
IF OBJECT_ID(N'dbo.UQ_Plans_Name', N'UQ') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT UQ_Plans_Name UNIQUE (Name);
IF OBJECT_ID(N'dbo.UQ_PlanBenefits_Plan_Order', N'UQ') IS NULL
    ALTER TABLE dbo.PlanBenefits ADD CONSTRAINT UQ_PlanBenefits_Plan_Order UNIQUE (PlanId, DisplayOrder);
IF OBJECT_ID(N'dbo.UQ_Features_Code', N'UQ') IS NULL
    ALTER TABLE dbo.Features ADD CONSTRAINT UQ_Features_Code UNIQUE (Code);

IF OBJECT_ID(N'dbo.UQ_Areas_Name', N'UQ') IS NULL
    ALTER TABLE dbo.Areas ADD CONSTRAINT UQ_Areas_Name UNIQUE (Name);
IF OBJECT_ID(N'dbo.UQ_Areas_Slug', N'UQ') IS NULL
    ALTER TABLE dbo.Areas ADD CONSTRAINT UQ_Areas_Slug UNIQUE (Slug);
IF OBJECT_ID(N'dbo.UQ_Topics_Area_Name', N'UQ') IS NULL
    ALTER TABLE dbo.Topics ADD CONSTRAINT UQ_Topics_Area_Name UNIQUE (AreaId, Name);

IF OBJECT_ID(N'dbo.UQ_Questions_Code', N'UQ') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT UQ_Questions_Code UNIQUE (Code);
IF OBJECT_ID(N'dbo.UQ_QuestionOptions_Question_Letter', N'UQ') IS NULL
    ALTER TABLE dbo.QuestionOptions ADD CONSTRAINT UQ_QuestionOptions_Question_Letter UNIQUE (QuestionId, Letter);
-- Alvo da FK composta de UserAnswers: garante que a alternativa escolhida
-- pertence à mesma questão respondida.
IF OBJECT_ID(N'dbo.UQ_QuestionOptions_Id_Question', N'UQ') IS NULL
    ALTER TABLE dbo.QuestionOptions ADD CONSTRAINT UQ_QuestionOptions_Id_Question UNIQUE (Id, QuestionId);

IF OBJECT_ID(N'dbo.UQ_TeacherComments_Question_Teacher', N'UQ') IS NULL
    ALTER TABLE dbo.TeacherComments ADD CONSTRAINT UQ_TeacherComments_Question_Teacher UNIQUE (QuestionId, TeacherUserId);
IF OBJECT_ID(N'dbo.UQ_UserNotes_User_Question', N'UQ') IS NULL
    ALTER TABLE dbo.UserNotes ADD CONSTRAINT UQ_UserNotes_User_Question UNIQUE (UserId, QuestionId);

IF OBJECT_ID(N'dbo.UQ_MockExamQuestions_Exam_Order', N'UQ') IS NULL
    ALTER TABLE dbo.MockExamQuestions ADD CONSTRAINT UQ_MockExamQuestions_Exam_Order UNIQUE (MockExamId, DisplayOrder);

IF OBJECT_ID(N'dbo.UQ_UserAnswers_User_Question_Attempt', N'UQ') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT UQ_UserAnswers_User_Question_Attempt UNIQUE (UserId, QuestionId, AttemptNumber);

IF OBJECT_ID(N'dbo.UQ_RankingSnapshots_Period_User', N'UQ') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD CONSTRAINT UQ_RankingSnapshots_Period_User UNIQUE (PeriodType, PeriodStart, UserId);

IF OBJECT_ID(N'dbo.UQ_StudyGroupPlanItems_Group_Order', N'UQ') IS NULL
    ALTER TABLE dbo.StudyGroupPlanItems ADD CONSTRAINT UQ_StudyGroupPlanItems_Group_Order UNIQUE (StudyGroupId, DisplayOrder);
GO

/* -----------------------------------------------------------------------------
   UNIQUE condicionais (índices únicos filtrados)
   ----------------------------------------------------------------------------- */

-- E-mail único entre contas ativas (uma conta removida libera o e-mail).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Users_Email_Active' AND object_id = OBJECT_ID(N'dbo.Users'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_Users_Email_Active
        ON dbo.Users (Email) WHERE DeletedAt IS NULL;

-- No máximo um plano destacado ("Mais popular").
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Plans_Highlighted' AND object_id = OBJECT_ID(N'dbo.Plans'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_Plans_Highlighted
        ON dbo.Plans (IsHighlighted) WHERE IsHighlighted = 1;

-- No máximo uma assinatura ativa por usuário.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Subscriptions_User_Active' AND object_id = OBJECT_ID(N'dbo.Subscriptions'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_Subscriptions_User_Active
        ON dbo.Subscriptions (UserId) WHERE Status = N'ativa';

-- No máximo uma alternativa correta por questão.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_QuestionOptions_OneCorrect' AND object_id = OBJECT_ID(N'dbo.QuestionOptions'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_QuestionOptions_OneCorrect
        ON dbo.QuestionOptions (QuestionId) WHERE IsCorrect = 1;
GO

/* =============================================================================
   3. CHAVES ESTRANGEIRAS
   ============================================================================= */

-- Usuários / autenticação
IF OBJECT_ID(N'dbo.FK_TeacherProfiles_Users', N'F') IS NULL
    ALTER TABLE dbo.TeacherProfiles ADD CONSTRAINT FK_TeacherProfiles_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);
IF OBJECT_ID(N'dbo.FK_PasswordResetTokens_Users', N'F') IS NULL
    ALTER TABLE dbo.PasswordResetTokens ADD CONSTRAINT FK_PasswordResetTokens_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);

-- Planos / assinaturas
IF OBJECT_ID(N'dbo.FK_PlanBenefits_Plans', N'F') IS NULL
    ALTER TABLE dbo.PlanBenefits ADD CONSTRAINT FK_PlanBenefits_Plans
        FOREIGN KEY (PlanId) REFERENCES dbo.Plans (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_PlanFeatures_Plans', N'F') IS NULL
    ALTER TABLE dbo.PlanFeatures ADD CONSTRAINT FK_PlanFeatures_Plans
        FOREIGN KEY (PlanId) REFERENCES dbo.Plans (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_PlanFeatures_Features', N'F') IS NULL
    ALTER TABLE dbo.PlanFeatures ADD CONSTRAINT FK_PlanFeatures_Features
        FOREIGN KEY (FeatureId) REFERENCES dbo.Features (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_Subscriptions_Users', N'F') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT FK_Subscriptions_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);
IF OBJECT_ID(N'dbo.FK_Subscriptions_Plans', N'F') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT FK_Subscriptions_Plans
        FOREIGN KEY (PlanId) REFERENCES dbo.Plans (Id);

-- Banco de questões
IF OBJECT_ID(N'dbo.FK_Topics_Areas', N'F') IS NULL
    ALTER TABLE dbo.Topics ADD CONSTRAINT FK_Topics_Areas
        FOREIGN KEY (AreaId) REFERENCES dbo.Areas (Id);
IF OBJECT_ID(N'dbo.FK_Questions_Topics', N'F') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT FK_Questions_Topics
        FOREIGN KEY (TopicId) REFERENCES dbo.Topics (Id);
IF OBJECT_ID(N'dbo.FK_QuestionOptions_Questions', N'F') IS NULL
    ALTER TABLE dbo.QuestionOptions ADD CONSTRAINT FK_QuestionOptions_Questions
        FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_TeacherComments_Questions', N'F') IS NULL
    ALTER TABLE dbo.TeacherComments ADD CONSTRAINT FK_TeacherComments_Questions
        FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id) ON DELETE CASCADE;
-- Aponta para TeacherProfiles: só quem tem perfil de professor pode comentar.
IF OBJECT_ID(N'dbo.FK_TeacherComments_TeacherProfiles', N'F') IS NULL
    ALTER TABLE dbo.TeacherComments ADD CONSTRAINT FK_TeacherComments_TeacherProfiles
        FOREIGN KEY (TeacherUserId) REFERENCES dbo.TeacherProfiles (UserId);
IF OBJECT_ID(N'dbo.FK_CommunityComments_Questions', N'F') IS NULL
    ALTER TABLE dbo.CommunityComments ADD CONSTRAINT FK_CommunityComments_Questions
        FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_CommunityComments_Users', N'F') IS NULL
    ALTER TABLE dbo.CommunityComments ADD CONSTRAINT FK_CommunityComments_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);
IF OBJECT_ID(N'dbo.FK_UserNotes_Users', N'F') IS NULL
    ALTER TABLE dbo.UserNotes ADD CONSTRAINT FK_UserNotes_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);
IF OBJECT_ID(N'dbo.FK_UserNotes_Questions', N'F') IS NULL
    ALTER TABLE dbo.UserNotes ADD CONSTRAINT FK_UserNotes_Questions
        FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id) ON DELETE CASCADE;

-- Simulados
IF OBJECT_ID(N'dbo.FK_MockExams_Areas', N'F') IS NULL
    ALTER TABLE dbo.MockExams ADD CONSTRAINT FK_MockExams_Areas
        FOREIGN KEY (AreaId) REFERENCES dbo.Areas (Id);
IF OBJECT_ID(N'dbo.FK_MockExamQuestions_MockExams', N'F') IS NULL
    ALTER TABLE dbo.MockExamQuestions ADD CONSTRAINT FK_MockExamQuestions_MockExams
        FOREIGN KEY (MockExamId) REFERENCES dbo.MockExams (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_MockExamQuestions_Questions', N'F') IS NULL
    ALTER TABLE dbo.MockExamQuestions ADD CONSTRAINT FK_MockExamQuestions_Questions
        FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id);
IF OBJECT_ID(N'dbo.FK_MockExamAttempts_MockExams', N'F') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT FK_MockExamAttempts_MockExams
        FOREIGN KEY (MockExamId) REFERENCES dbo.MockExams (Id);
IF OBJECT_ID(N'dbo.FK_MockExamAttempts_Users', N'F') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT FK_MockExamAttempts_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);

-- Respostas
IF OBJECT_ID(N'dbo.FK_UserAnswers_Users', N'F') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT FK_UserAnswers_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);
IF OBJECT_ID(N'dbo.FK_UserAnswers_Questions', N'F') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT FK_UserAnswers_Questions
        FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id);
-- FK composta: a alternativa escolhida precisa ser da mesma questão.
IF OBJECT_ID(N'dbo.FK_UserAnswers_QuestionOptions', N'F') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT FK_UserAnswers_QuestionOptions
        FOREIGN KEY (SelectedOptionId, QuestionId) REFERENCES dbo.QuestionOptions (Id, QuestionId);
IF OBJECT_ID(N'dbo.FK_UserAnswers_MockExamAttempts', N'F') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT FK_UserAnswers_MockExamAttempts
        FOREIGN KEY (MockExamAttemptId) REFERENCES dbo.MockExamAttempts (Id);

-- Ranking
IF OBJECT_ID(N'dbo.FK_RankingSnapshots_Users', N'F') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD CONSTRAINT FK_RankingSnapshots_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);

-- Mentoria / grupos de estudo
IF OBJECT_ID(N'dbo.FK_StudyGroups_TeacherProfiles', N'F') IS NULL
    ALTER TABLE dbo.StudyGroups ADD CONSTRAINT FK_StudyGroups_TeacherProfiles
        FOREIGN KEY (MentorUserId) REFERENCES dbo.TeacherProfiles (UserId);
IF OBJECT_ID(N'dbo.FK_StudyGroups_Areas', N'F') IS NULL
    ALTER TABLE dbo.StudyGroups ADD CONSTRAINT FK_StudyGroups_Areas
        FOREIGN KEY (AreaId) REFERENCES dbo.Areas (Id);
IF OBJECT_ID(N'dbo.FK_StudyGroupMembers_StudyGroups', N'F') IS NULL
    ALTER TABLE dbo.StudyGroupMembers ADD CONSTRAINT FK_StudyGroupMembers_StudyGroups
        FOREIGN KEY (StudyGroupId) REFERENCES dbo.StudyGroups (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_StudyGroupMembers_Users', N'F') IS NULL
    ALTER TABLE dbo.StudyGroupMembers ADD CONSTRAINT FK_StudyGroupMembers_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);
IF OBJECT_ID(N'dbo.FK_StudyGroupPlanItems_StudyGroups', N'F') IS NULL
    ALTER TABLE dbo.StudyGroupPlanItems ADD CONSTRAINT FK_StudyGroupPlanItems_StudyGroups
        FOREIGN KEY (StudyGroupId) REFERENCES dbo.StudyGroups (Id) ON DELETE CASCADE;
IF OBJECT_ID(N'dbo.FK_StudyGroupPlanItems_Topics', N'F') IS NULL
    ALTER TABLE dbo.StudyGroupPlanItems ADD CONSTRAINT FK_StudyGroupPlanItems_Topics
        FOREIGN KEY (TopicId) REFERENCES dbo.Topics (Id);
IF OBJECT_ID(N'dbo.FK_MentoringSessions_StudyGroups', N'F') IS NULL
    ALTER TABLE dbo.MentoringSessions ADD CONSTRAINT FK_MentoringSessions_StudyGroups
        FOREIGN KEY (StudyGroupId) REFERENCES dbo.StudyGroups (Id) ON DELETE CASCADE;
GO

/* =============================================================================
   4. CHECK
   ============================================================================= */

-- Users
IF OBJECT_ID(N'dbo.CK_Users_Role', N'C') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role
        CHECK (Role IN (N'aluno', N'professor'));
IF OBJECT_ID(N'dbo.CK_Users_Name', N'C') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Name
        CHECK (LEN(LTRIM(RTRIM(Name))) > 0);
IF OBJECT_ID(N'dbo.CK_Users_Email', N'C') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Email
        CHECK (Email LIKE N'%_@_%._%' AND Email NOT LIKE N'% %');
IF OBJECT_ID(N'dbo.CK_Users_Phone', N'C') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Phone
        CHECK (Phone IS NULL OR (LEN(Phone) >= 8 AND Phone NOT LIKE N'%[^0-9()+ -]%'));

-- TeacherProfiles
IF OBJECT_ID(N'dbo.CK_TeacherProfiles_Verified', N'C') IS NULL
    ALTER TABLE dbo.TeacherProfiles ADD CONSTRAINT CK_TeacherProfiles_Verified
        CHECK (IsVerified = 0 OR VerifiedAt IS NOT NULL);

-- PasswordResetTokens
IF OBJECT_ID(N'dbo.CK_PasswordResetTokens_Expiration', N'C') IS NULL
    ALTER TABLE dbo.PasswordResetTokens ADD CONSTRAINT CK_PasswordResetTokens_Expiration
        CHECK (ExpiresAt > CreatedAt);

-- Plans
IF OBJECT_ID(N'dbo.CK_Plans_Price', N'C') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT CK_Plans_Price
        CHECK (Price >= 0);
IF OBJECT_ID(N'dbo.CK_Plans_BillingPeriod', N'C') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT CK_Plans_BillingPeriod
        CHECK (BillingPeriod IN (N'gratuito', N'mensal', N'anual'));
-- Plano gratuito tem preço 0; planos pagos têm preço > 0.
IF OBJECT_ID(N'dbo.CK_Plans_FreeHasNoPrice', N'C') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT CK_Plans_FreeHasNoPrice
        CHECK ((BillingPeriod = N'gratuito' AND Price = 0) OR (BillingPeriod <> N'gratuito' AND Price > 0));
IF OBJECT_ID(N'dbo.CK_Plans_DailyQuestionLimit', N'C') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT CK_Plans_DailyQuestionLimit
        CHECK (DailyQuestionLimit IS NULL OR DailyQuestionLimit > 0);

-- Subscriptions
IF OBJECT_ID(N'dbo.CK_Subscriptions_Status', N'C') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT CK_Subscriptions_Status
        CHECK (Status IN (N'pendente', N'ativa', N'cancelada', N'expirada'));
IF OBJECT_ID(N'dbo.CK_Subscriptions_Price', N'C') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT CK_Subscriptions_Price
        CHECK (Price >= 0);
IF OBJECT_ID(N'dbo.CK_Subscriptions_Period', N'C') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT CK_Subscriptions_Period
        CHECK (EndsAt IS NULL OR EndsAt > StartedAt);
IF OBJECT_ID(N'dbo.CK_Subscriptions_Canceled', N'C') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT CK_Subscriptions_Canceled
        CHECK (Status <> N'cancelada' OR CanceledAt IS NOT NULL);

-- Areas
IF OBJECT_ID(N'dbo.CK_Areas_Slug', N'C') IS NULL
    ALTER TABLE dbo.Areas ADD CONSTRAINT CK_Areas_Slug
        CHECK (Slug NOT LIKE N'%[^a-z0-9-]%');

-- Questions
IF OBJECT_ID(N'dbo.CK_Questions_Code', N'C') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT CK_Questions_Code
        CHECK (Code LIKE N'Q[0-9][0-9][0-9][0-9]-[0-9]%');
IF OBJECT_ID(N'dbo.CK_Questions_Year', N'C') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT CK_Questions_Year
        CHECK (Year BETWEEN 2004 AND 2100);  -- ENADE existe desde 2004
IF OBJECT_ID(N'dbo.CK_Questions_Type', N'C') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT CK_Questions_Type
        CHECK (Type IN (N'Múltipla escolha'));
IF OBJECT_ID(N'dbo.CK_Questions_Difficulty', N'C') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT CK_Questions_Difficulty
        CHECK (Difficulty IN (N'fácil', N'médio', N'difícil'));

-- QuestionOptions
IF OBJECT_ID(N'dbo.CK_QuestionOptions_Letter', N'C') IS NULL
    ALTER TABLE dbo.QuestionOptions ADD CONSTRAINT CK_QuestionOptions_Letter
        CHECK (Letter IN (N'a', N'b', N'c', N'd', N'e'));

-- Comentários e anotações não podem ser vazios (o front faz trim antes de enviar).
IF OBJECT_ID(N'dbo.CK_TeacherComments_Content', N'C') IS NULL
    ALTER TABLE dbo.TeacherComments ADD CONSTRAINT CK_TeacherComments_Content
        CHECK (LEN(LTRIM(RTRIM(Content))) > 0);
IF OBJECT_ID(N'dbo.CK_CommunityComments_Content', N'C') IS NULL
    ALTER TABLE dbo.CommunityComments ADD CONSTRAINT CK_CommunityComments_Content
        CHECK (LEN(LTRIM(RTRIM(Content))) > 0);
IF OBJECT_ID(N'dbo.CK_UserNotes_Content', N'C') IS NULL
    ALTER TABLE dbo.UserNotes ADD CONSTRAINT CK_UserNotes_Content
        CHECK (LEN(LTRIM(RTRIM(Content))) > 0);

-- MockExams
IF OBJECT_ID(N'dbo.CK_MockExams_Difficulty', N'C') IS NULL
    ALTER TABLE dbo.MockExams ADD CONSTRAINT CK_MockExams_Difficulty
        CHECK (Difficulty IS NULL OR Difficulty IN (N'fácil', N'médio', N'difícil'));
IF OBJECT_ID(N'dbo.CK_MockExams_TimeLimit', N'C') IS NULL
    ALTER TABLE dbo.MockExams ADD CONSTRAINT CK_MockExams_TimeLimit
        CHECK (TimeLimitMinutes IS NULL OR TimeLimitMinutes > 0);
IF OBJECT_ID(N'dbo.CK_MockExamQuestions_Order', N'C') IS NULL
    ALTER TABLE dbo.MockExamQuestions ADD CONSTRAINT CK_MockExamQuestions_Order
        CHECK (DisplayOrder > 0);

-- MockExamAttempts
IF OBJECT_ID(N'dbo.CK_MockExamAttempts_Status', N'C') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT CK_MockExamAttempts_Status
        CHECK (Status IN (N'em_andamento', N'finalizado', N'expirado', N'abandonado'));
IF OBJECT_ID(N'dbo.CK_MockExamAttempts_Counts', N'C') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT CK_MockExamAttempts_Counts
        CHECK (TotalQuestions > 0 AND (CorrectCount IS NULL OR CorrectCount BETWEEN 0 AND TotalQuestions));
IF OBJECT_ID(N'dbo.CK_MockExamAttempts_Finished', N'C') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT CK_MockExamAttempts_Finished
        CHECK ((Status = N'em_andamento' AND FinishedAt IS NULL)
            OR (Status <> N'em_andamento' AND FinishedAt IS NOT NULL AND FinishedAt >= StartedAt));

-- UserAnswers
IF OBJECT_ID(N'dbo.CK_UserAnswers_AttemptNumber', N'C') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT CK_UserAnswers_AttemptNumber
        CHECK (AttemptNumber >= 1);

-- RankingSnapshots
IF OBJECT_ID(N'dbo.CK_RankingSnapshots_PeriodType', N'C') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD CONSTRAINT CK_RankingSnapshots_PeriodType
        CHECK (PeriodType IN (N'semanal', N'mensal'));
IF OBJECT_ID(N'dbo.CK_RankingSnapshots_Values', N'C') IS NULL
    ALTER TABLE dbo.RankingSnapshots ADD CONSTRAINT CK_RankingSnapshots_Values
        CHECK (Position > 0 AND Score >= 0 AND AnsweredCount >= 0
               AND CorrectCount BETWEEN 0 AND AnsweredCount);

-- StudyGroups
IF OBJECT_ID(N'dbo.CK_StudyGroups_MaxMembers', N'C') IS NULL
    ALTER TABLE dbo.StudyGroups ADD CONSTRAINT CK_StudyGroups_MaxMembers
        CHECK (MaxMembers IS NULL OR MaxMembers > 0);
IF OBJECT_ID(N'dbo.CK_StudyGroups_WhatsAppUrl', N'C') IS NULL
    ALTER TABLE dbo.StudyGroups ADD CONSTRAINT CK_StudyGroups_WhatsAppUrl
        CHECK (WhatsAppInviteUrl IS NULL OR WhatsAppInviteUrl LIKE N'https://%');
IF OBJECT_ID(N'dbo.CK_StudyGroupMembers_LeftAt', N'C') IS NULL
    ALTER TABLE dbo.StudyGroupMembers ADD CONSTRAINT CK_StudyGroupMembers_LeftAt
        CHECK (LeftAt IS NULL OR LeftAt >= JoinedAt);
IF OBJECT_ID(N'dbo.CK_StudyGroupPlanItems_Order', N'C') IS NULL
    ALTER TABLE dbo.StudyGroupPlanItems ADD CONSTRAINT CK_StudyGroupPlanItems_Order
        CHECK (DisplayOrder > 0);

-- MentoringSessions
IF OBJECT_ID(N'dbo.CK_MentoringSessions_Duration', N'C') IS NULL
    ALTER TABLE dbo.MentoringSessions ADD CONSTRAINT CK_MentoringSessions_Duration
        CHECK (DurationMinutes > 0);
IF OBJECT_ID(N'dbo.CK_MentoringSessions_MeetingUrl', N'C') IS NULL
    ALTER TABLE dbo.MentoringSessions ADD CONSTRAINT CK_MentoringSessions_MeetingUrl
        CHECK (MeetingUrl IS NULL OR MeetingUrl LIKE N'https://%');
GO

/* =============================================================================
   5. DEFAULT
   ============================================================================= */

-- Colunas de auditoria: toda coluna CreatedAt/UpdatedAt/JoinedAt de dbo
-- recebe DEFAULT SYSUTCDATETIME(), com o nome DF_<Tabela>_<Coluna>.
-- (UpdatedAt deve ser atualizado pela aplicação a cada UPDATE.)
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE dbo.' + QUOTENAME(t.name)
             + N' ADD CONSTRAINT ' + QUOTENAME(N'DF_' + t.name + N'_' + c.name)
             + N' DEFAULT (SYSUTCDATETIME()) FOR ' + QUOTENAME(c.name) + N';' + NCHAR(10)
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
WHERE t.schema_id = SCHEMA_ID(N'dbo')
  AND c.name IN (N'CreatedAt', N'UpdatedAt', N'JoinedAt')
  AND c.default_object_id = 0;

EXEC sys.sp_executesql @sql;
GO

-- Users
IF OBJECT_ID(N'dbo.DF_Users_Id', N'D') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT DF_Users_Id DEFAULT (NEWSEQUENTIALID()) FOR Id;
IF OBJECT_ID(N'dbo.DF_Users_Role', N'D') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT DF_Users_Role DEFAULT (N'aluno') FOR Role;
IF OBJECT_ID(N'dbo.DF_Users_EmailNotificationsEnabled', N'D') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT DF_Users_EmailNotificationsEnabled DEFAULT (1) FOR EmailNotificationsEnabled;
IF OBJECT_ID(N'dbo.DF_Users_PushNotificationsEnabled', N'D') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT DF_Users_PushNotificationsEnabled DEFAULT (0) FOR PushNotificationsEnabled;

-- TeacherProfiles
IF OBJECT_ID(N'dbo.DF_TeacherProfiles_IsVerified', N'D') IS NULL
    ALTER TABLE dbo.TeacherProfiles ADD CONSTRAINT DF_TeacherProfiles_IsVerified DEFAULT (0) FOR IsVerified;

-- Plans
IF OBJECT_ID(N'dbo.DF_Plans_Price', N'D') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT DF_Plans_Price DEFAULT (0) FOR Price;
IF OBJECT_ID(N'dbo.DF_Plans_BillingPeriod', N'D') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT DF_Plans_BillingPeriod DEFAULT (N'mensal') FOR BillingPeriod;
IF OBJECT_ID(N'dbo.DF_Plans_IsHighlighted', N'D') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT DF_Plans_IsHighlighted DEFAULT (0) FOR IsHighlighted;
IF OBJECT_ID(N'dbo.DF_Plans_IsActive', N'D') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT DF_Plans_IsActive DEFAULT (1) FOR IsActive;
IF OBJECT_ID(N'dbo.DF_Plans_DisplayOrder', N'D') IS NULL
    ALTER TABLE dbo.Plans ADD CONSTRAINT DF_Plans_DisplayOrder DEFAULT (0) FOR DisplayOrder;

-- Subscriptions
IF OBJECT_ID(N'dbo.DF_Subscriptions_Status', N'D') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT DF_Subscriptions_Status DEFAULT (N'ativa') FOR Status;
IF OBJECT_ID(N'dbo.DF_Subscriptions_StartedAt', N'D') IS NULL
    ALTER TABLE dbo.Subscriptions ADD CONSTRAINT DF_Subscriptions_StartedAt DEFAULT (SYSUTCDATETIME()) FOR StartedAt;

-- Questions / QuestionOptions
IF OBJECT_ID(N'dbo.DF_Questions_Type', N'D') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT DF_Questions_Type DEFAULT (N'Múltipla escolha') FOR Type;
IF OBJECT_ID(N'dbo.DF_Questions_IsActive', N'D') IS NULL
    ALTER TABLE dbo.Questions ADD CONSTRAINT DF_Questions_IsActive DEFAULT (1) FOR IsActive;
IF OBJECT_ID(N'dbo.DF_QuestionOptions_IsCorrect', N'D') IS NULL
    ALTER TABLE dbo.QuestionOptions ADD CONSTRAINT DF_QuestionOptions_IsCorrect DEFAULT (0) FOR IsCorrect;

-- MockExams / MockExamAttempts
IF OBJECT_ID(N'dbo.DF_MockExams_IsActive', N'D') IS NULL
    ALTER TABLE dbo.MockExams ADD CONSTRAINT DF_MockExams_IsActive DEFAULT (1) FOR IsActive;
IF OBJECT_ID(N'dbo.DF_MockExamAttempts_Status', N'D') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT DF_MockExamAttempts_Status DEFAULT (N'em_andamento') FOR Status;
IF OBJECT_ID(N'dbo.DF_MockExamAttempts_StartedAt', N'D') IS NULL
    ALTER TABLE dbo.MockExamAttempts ADD CONSTRAINT DF_MockExamAttempts_StartedAt DEFAULT (SYSUTCDATETIME()) FOR StartedAt;

-- UserAnswers
IF OBJECT_ID(N'dbo.DF_UserAnswers_AttemptNumber', N'D') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT DF_UserAnswers_AttemptNumber DEFAULT (1) FOR AttemptNumber;
IF OBJECT_ID(N'dbo.DF_UserAnswers_AnsweredAt', N'D') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT DF_UserAnswers_AnsweredAt DEFAULT (SYSUTCDATETIME()) FOR AnsweredAt;
-- Data local de Brasília (define o "dia" do limite diário e do streak).
IF OBJECT_ID(N'dbo.DF_UserAnswers_AnsweredOn', N'D') IS NULL
    ALTER TABLE dbo.UserAnswers ADD CONSTRAINT DF_UserAnswers_AnsweredOn
        DEFAULT (CONVERT(DATE, SYSDATETIMEOFFSET() AT TIME ZONE 'E. South America Standard Time')) FOR AnsweredOn;

-- StudyGroups
IF OBJECT_ID(N'dbo.DF_StudyGroups_IsActive', N'D') IS NULL
    ALTER TABLE dbo.StudyGroups ADD CONSTRAINT DF_StudyGroups_IsActive DEFAULT (1) FOR IsActive;

-- MentoringSessions
IF OBJECT_ID(N'dbo.DF_MentoringSessions_DurationMinutes', N'D') IS NULL
    ALTER TABLE dbo.MentoringSessions ADD CONSTRAINT DF_MentoringSessions_DurationMinutes DEFAULT (60) FOR DurationMinutes;
GO

PRINT N'03_constraints.sql concluído.';
GO
