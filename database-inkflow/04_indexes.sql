/* =============================================================================
   Inkflow — 04_indexes.sql
   Índices não clusterizados para chaves estrangeiras e consultas frequentes.

   FKs já cobertas pela coluna líder de uma PK/UNIQUE não ganham índice extra:
     - Topics.AreaId               -> UQ_Topics_Area_Name
     - QuestionOptions.QuestionId  -> UQ_QuestionOptions_Question_Letter
     - TeacherComments.QuestionId  -> UQ_TeacherComments_Question_Teacher
     - UserNotes.UserId            -> UQ_UserNotes_User_Question
     - PlanBenefits.PlanId         -> UQ_PlanBenefits_Plan_Order
     - PlanFeatures.PlanId         -> PK_PlanFeatures
     - MockExamQuestions.MockExamId-> PK_MockExamQuestions
     - StudyGroupMembers.StudyGroupId -> PK_StudyGroupMembers
     - StudyGroupPlanItems.StudyGroupId -> UQ_StudyGroupPlanItems_Group_Order

   Idempotente: cada índice só é criado se ainda não existir.
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

/* -----------------------------------------------------------------------------
   Usuários / autenticação
   ----------------------------------------------------------------------------- */

-- Listagens por perfil (ex.: professores verificados) ignorando contas removidas.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_Role' AND object_id = OBJECT_ID(N'dbo.Users'))
    CREATE NONCLUSTERED INDEX IX_Users_Role
        ON dbo.Users (Role) INCLUDE (Name) WHERE DeletedAt IS NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PasswordResetTokens_UserId' AND object_id = OBJECT_ID(N'dbo.PasswordResetTokens'))
    CREATE NONCLUSTERED INDEX IX_PasswordResetTokens_UserId
        ON dbo.PasswordResetTokens (UserId) INCLUDE (ExpiresAt, UsedAt);

/* -----------------------------------------------------------------------------
   Planos / assinaturas
   ----------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PlanFeatures_FeatureId' AND object_id = OBJECT_ID(N'dbo.PlanFeatures'))
    CREATE NONCLUSTERED INDEX IX_PlanFeatures_FeatureId
        ON dbo.PlanFeatures (FeatureId);

-- "Qual o plano atual do usuário?" (consultada em toda tela logada).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Subscriptions_UserId_Status' AND object_id = OBJECT_ID(N'dbo.Subscriptions'))
    CREATE NONCLUSTERED INDEX IX_Subscriptions_UserId_Status
        ON dbo.Subscriptions (UserId, Status) INCLUDE (PlanId, StartedAt, EndsAt);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Subscriptions_PlanId' AND object_id = OBJECT_ID(N'dbo.Subscriptions'))
    CREATE NONCLUSTERED INDEX IX_Subscriptions_PlanId
        ON dbo.Subscriptions (PlanId);

/* -----------------------------------------------------------------------------
   Banco de questões (filtros da tela /questoes: área, ano, tipo)
   ----------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Questions_TopicId' AND object_id = OBJECT_ID(N'dbo.Questions'))
    CREATE NONCLUSTERED INDEX IX_Questions_TopicId
        ON dbo.Questions (TopicId, Year) INCLUDE (Code, Type, Difficulty)
        WHERE IsActive = 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Questions_Year' AND object_id = OBJECT_ID(N'dbo.Questions'))
    CREATE NONCLUSTERED INDEX IX_Questions_Year
        ON dbo.Questions (Year) INCLUDE (Code, TopicId, Type, Difficulty)
        WHERE IsActive = 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Questions_Difficulty' AND object_id = OBJECT_ID(N'dbo.Questions'))
    CREATE NONCLUSTERED INDEX IX_Questions_Difficulty
        ON dbo.Questions (Difficulty) INCLUDE (Code, TopicId, Year)
        WHERE IsActive = 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TeacherComments_TeacherUserId' AND object_id = OBJECT_ID(N'dbo.TeacherComments'))
    CREATE NONCLUSTERED INDEX IX_TeacherComments_TeacherUserId
        ON dbo.TeacherComments (TeacherUserId);

-- Painel "Comunidade": comentários de uma questão em ordem cronológica.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CommunityComments_QuestionId_CreatedAt' AND object_id = OBJECT_ID(N'dbo.CommunityComments'))
    CREATE NONCLUSTERED INDEX IX_CommunityComments_QuestionId_CreatedAt
        ON dbo.CommunityComments (QuestionId, CreatedAt) INCLUDE (UserId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CommunityComments_UserId' AND object_id = OBJECT_ID(N'dbo.CommunityComments'))
    CREATE NONCLUSTERED INDEX IX_CommunityComments_UserId
        ON dbo.CommunityComments (UserId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserNotes_QuestionId' AND object_id = OBJECT_ID(N'dbo.UserNotes'))
    CREATE NONCLUSTERED INDEX IX_UserNotes_QuestionId
        ON dbo.UserNotes (QuestionId);

/* -----------------------------------------------------------------------------
   Respostas (dashboard, limite diário, streak, ranking)
   ----------------------------------------------------------------------------- */

-- "Meus acertos e erros": últimas respostas do usuário.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserAnswers_UserId_AnsweredAt' AND object_id = OBJECT_ID(N'dbo.UserAnswers'))
    CREATE NONCLUSTERED INDEX IX_UserAnswers_UserId_AnsweredAt
        ON dbo.UserAnswers (UserId, AnsweredAt DESC)
        INCLUDE (QuestionId, IsCorrect, AttemptNumber);

-- Limite diário ("7/10 questões hoje"), streak e total respondido:
-- só primeiras tentativas contam.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserAnswers_UserId_AnsweredOn_FirstAttempt' AND object_id = OBJECT_ID(N'dbo.UserAnswers'))
    CREATE NONCLUSTERED INDEX IX_UserAnswers_UserId_AnsweredOn_FirstAttempt
        ON dbo.UserAnswers (UserId, AnsweredOn)
        INCLUDE (QuestionId, IsCorrect)
        WHERE AttemptNumber = 1;

-- Ranking do período: primeiras tentativas de todos os usuários por data.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserAnswers_AnsweredOn_FirstAttempt' AND object_id = OBJECT_ID(N'dbo.UserAnswers'))
    CREATE NONCLUSTERED INDEX IX_UserAnswers_AnsweredOn_FirstAttempt
        ON dbo.UserAnswers (AnsweredOn)
        INCLUDE (UserId, IsCorrect)
        WHERE AttemptNumber = 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserAnswers_QuestionId' AND object_id = OBJECT_ID(N'dbo.UserAnswers'))
    CREATE NONCLUSTERED INDEX IX_UserAnswers_QuestionId
        ON dbo.UserAnswers (QuestionId) INCLUDE (IsCorrect);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserAnswers_SelectedOption' AND object_id = OBJECT_ID(N'dbo.UserAnswers'))
    CREATE NONCLUSTERED INDEX IX_UserAnswers_SelectedOption
        ON dbo.UserAnswers (SelectedOptionId, QuestionId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserAnswers_MockExamAttemptId' AND object_id = OBJECT_ID(N'dbo.UserAnswers'))
    CREATE NONCLUSTERED INDEX IX_UserAnswers_MockExamAttemptId
        ON dbo.UserAnswers (MockExamAttemptId)
        WHERE MockExamAttemptId IS NOT NULL;

/* -----------------------------------------------------------------------------
   Simulados
   ----------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MockExams_AreaId' AND object_id = OBJECT_ID(N'dbo.MockExams'))
    CREATE NONCLUSTERED INDEX IX_MockExams_AreaId
        ON dbo.MockExams (AreaId) WHERE AreaId IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MockExamQuestions_QuestionId' AND object_id = OBJECT_ID(N'dbo.MockExamQuestions'))
    CREATE NONCLUSTERED INDEX IX_MockExamQuestions_QuestionId
        ON dbo.MockExamQuestions (QuestionId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MockExamAttempts_UserId_StartedAt' AND object_id = OBJECT_ID(N'dbo.MockExamAttempts'))
    CREATE NONCLUSTERED INDEX IX_MockExamAttempts_UserId_StartedAt
        ON dbo.MockExamAttempts (UserId, StartedAt DESC)
        INCLUDE (MockExamId, Status, CorrectCount, TotalQuestions);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MockExamAttempts_MockExamId' AND object_id = OBJECT_ID(N'dbo.MockExamAttempts'))
    CREATE NONCLUSTERED INDEX IX_MockExamAttempts_MockExamId
        ON dbo.MockExamAttempts (MockExamId);

/* -----------------------------------------------------------------------------
   Ranking
   ----------------------------------------------------------------------------- */

-- Exibir o ranking de um período em ordem de posição.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RankingSnapshots_Period_Position' AND object_id = OBJECT_ID(N'dbo.RankingSnapshots'))
    CREATE NONCLUSTERED INDEX IX_RankingSnapshots_Period_Position
        ON dbo.RankingSnapshots (PeriodType, PeriodStart, Position)
        INCLUDE (UserId, Score);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RankingSnapshots_UserId' AND object_id = OBJECT_ID(N'dbo.RankingSnapshots'))
    CREATE NONCLUSTERED INDEX IX_RankingSnapshots_UserId
        ON dbo.RankingSnapshots (UserId, PeriodStart DESC);

/* -----------------------------------------------------------------------------
   Mentoria / grupos de estudo
   ----------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StudyGroups_MentorUserId' AND object_id = OBJECT_ID(N'dbo.StudyGroups'))
    CREATE NONCLUSTERED INDEX IX_StudyGroups_MentorUserId
        ON dbo.StudyGroups (MentorUserId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StudyGroups_AreaId' AND object_id = OBJECT_ID(N'dbo.StudyGroups'))
    CREATE NONCLUSTERED INDEX IX_StudyGroups_AreaId
        ON dbo.StudyGroups (AreaId) WHERE AreaId IS NOT NULL;

-- "Meus grupos": grupos em que o usuário participa atualmente.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StudyGroupMembers_UserId' AND object_id = OBJECT_ID(N'dbo.StudyGroupMembers'))
    CREATE NONCLUSTERED INDEX IX_StudyGroupMembers_UserId
        ON dbo.StudyGroupMembers (UserId) INCLUDE (LeftAt);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StudyGroupPlanItems_TopicId' AND object_id = OBJECT_ID(N'dbo.StudyGroupPlanItems'))
    CREATE NONCLUSTERED INDEX IX_StudyGroupPlanItems_TopicId
        ON dbo.StudyGroupPlanItems (TopicId);

-- Próximos encontros de um grupo.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MentoringSessions_StudyGroupId_ScheduledAt' AND object_id = OBJECT_ID(N'dbo.MentoringSessions'))
    CREATE NONCLUSTERED INDEX IX_MentoringSessions_StudyGroupId_ScheduledAt
        ON dbo.MentoringSessions (StudyGroupId, ScheduledAt);
GO

PRINT N'04_indexes.sql concluído.';
GO
