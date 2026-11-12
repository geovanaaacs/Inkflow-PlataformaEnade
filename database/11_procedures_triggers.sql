/* =============================================================================
   Inkflow — 11_procedures_triggers.sql
   Programação no banco (Etapa 7 do PIM IV): regras que a API chama ou que o
   próprio banco dispara.

   Procedures (a API chama com EXEC):
     - dbo.sp_AssinarPlano        assinatura + pagamento numa transação só
     - dbo.sp_RegistrarResposta   resposta do aluno + limite diário do Básico
     - dbo.sp_MetricasAdmin       números do painel de administração

   Tabela e triggers (o banco dispara sozinho):
     - dbo.AuditLog                         histórico de alterações
     - dbo.trg_Users_AuditoriaPerfil        registra troca de perfil e de acesso
     - dbo.trg_Subscriptions_SomenteAlunos  só aluno tem assinatura ativa
     - dbo.trg_<Tabela>_UpdatedAt           preenche UpdatedAt em toda alteração

   Erros de regra de negócio usam THROW 50400/50403/50404/50409: a API devolve
   o status HTTP correspondente (400, 403, 404, 409) com a mensagem.

   Pré-requisito: 01–10.
   Idempotente: CREATE OR ALTER e criação da tabela só se ainda não existir.
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

/* =============================================================================
   1. AUDITORIA
   ============================================================================= */

IF OBJECT_ID(N'dbo.AuditLog', N'U') IS NULL
CREATE TABLE dbo.AuditLog (
    Id              BIGINT IDENTITY(1,1) NOT NULL,
    TableName       NVARCHAR(128)    NOT NULL,
    RecordId        NVARCHAR(64)     NOT NULL,
    Action          NVARCHAR(30)     NOT NULL,  -- 'perfil' | 'acesso'
    OldValue        NVARCHAR(200)    NULL,
    NewValue        NVARCHAR(200)    NULL,
    ChangedByUserId UNIQUEIDENTIFIER NULL,      -- quem fez (SESSION_CONTEXT 'UserId', definido pela API)
    ChangedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_AuditLog_ChangedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (Id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLog_Table_Record' AND object_id = OBJECT_ID(N'dbo.AuditLog'))
    CREATE NONCLUSTERED INDEX IX_AuditLog_Table_Record ON dbo.AuditLog (TableName, RecordId, ChangedAt DESC);
GO

/* =============================================================================
   2. TRIGGERS
   ============================================================================= */

/* Quando o perfil (aluno/professor/admin) ou o acesso (ativo/desativado) de
   alguém muda — pelo app desktop, pelo site ou direto no banco — fica
   registrado quem mudou, quando, e o valor antigo e o novo. */
CREATE OR ALTER TRIGGER dbo.trg_Users_AuditoriaPerfil
ON dbo.Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT (UPDATE(Role) OR UPDATE(IsActive)) RETURN;

    DECLARE @changedBy UNIQUEIDENTIFIER = TRY_CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER);

    INSERT INTO dbo.AuditLog (TableName, RecordId, Action, OldValue, NewValue, ChangedByUserId)
    SELECT N'Users', CONVERT(NVARCHAR(64), i.Id), N'perfil', d.Role, i.Role, @changedBy
    FROM inserted i
    JOIN deleted d ON d.Id = i.Id
    WHERE i.Role <> d.Role
    UNION ALL
    SELECT N'Users', CONVERT(NVARCHAR(64), i.Id), N'acesso',
           CASE WHEN d.IsActive = 1 THEN N'ativo' ELSE N'desativado' END,
           CASE WHEN i.IsActive = 1 THEN N'ativo' ELSE N'desativado' END,
           @changedBy
    FROM inserted i
    JOIN deleted d ON d.Id = i.Id
    WHERE i.IsActive <> d.IsActive;
END;
GO

/* Assinatura ativa é só de aluno: professor e administrador não têm plano.
   (Uma assinatura ativa por aluno já é garantida pelo índice único filtrado
   UX_Subscriptions_User_Active, do script 03.) */
CREATE OR ALTER TRIGGER dbo.trg_Subscriptions_SomenteAlunos
ON dbo.Subscriptions
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN dbo.Users u ON u.Id = i.UserId
        WHERE i.Status = N'ativa' AND u.Role <> N'aluno'
    )
        THROW 50409, N'Só alunos podem ter assinatura ativa: professores e administradores não têm plano.', 1;
END;
GO

/* UpdatedAt automático: uma trigger por tabela que tem a coluna, criada aqui
   a partir do catálogo (junta pela chave primária de cada tabela). Se o
   próprio UPDATE já mexeu em UpdatedAt, a trigger não faz nada. */
DECLARE @table SYSNAME, @join NVARCHAR(MAX), @sql NVARCHAR(MAX);
DECLARE tables_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT t.name,
           STRING_AGG(N't.' + QUOTENAME(c.name) + N' = i.' + QUOTENAME(c.name), N' AND ')
    FROM sys.tables t
    JOIN sys.indexes ix ON ix.object_id = t.object_id AND ix.is_primary_key = 1
    JOIN sys.index_columns ic ON ic.object_id = ix.object_id AND ic.index_id = ix.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE t.schema_id = SCHEMA_ID(N'dbo')
      AND EXISTS (SELECT 1 FROM sys.columns u WHERE u.object_id = t.object_id AND u.name = N'UpdatedAt')
    GROUP BY t.name;
OPEN tables_cursor;
FETCH NEXT FROM tables_cursor INTO @table, @join;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'CREATE OR ALTER TRIGGER dbo.' + QUOTENAME(N'trg_' + @table + N'_UpdatedAt') + N'
ON dbo.' + QUOTENAME(@table) + N'
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(UpdatedAt) RETURN;
    UPDATE t SET UpdatedAt = SYSUTCDATETIME()
    FROM dbo.' + QUOTENAME(@table) + N' t
    JOIN inserted i ON ' + @join + N';
END;';
    EXEC sys.sp_executesql @sql;
    FETCH NEXT FROM tables_cursor INTO @table, @join;
END;
CLOSE tables_cursor;
DEALLOCATE tables_cursor;
GO

/* =============================================================================
   3. PROCEDURES
   ============================================================================= */

/* Troca o plano do aluno: fecha a assinatura ativa, abre a nova e, se o plano
   é pago, registra o pagamento (checkout simulado: só a forma e os 4 últimos
   dígitos do cartão). Tudo ou nada.
   Retorna: Changed (0 = já estava nesse plano), SubscriptionId, PaymentId. */
CREATE OR ALTER PROCEDURE dbo.sp_AssinarPlano
    @UserId    UNIQUEIDENTIFIER,
    @PlanSlug  NVARCHAR(30),
    @Method    NVARCHAR(10) = NULL,   -- 'cartao' | 'pix' (obrigatório em plano pago)
    @CardLast4 CHAR(4)      = NULL    -- só para 'cartao'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @planId INT, @price DECIMAL(10,2);
    SELECT @planId = Id, @price = Price FROM dbo.Plans WHERE Slug = @PlanSlug AND IsActive = 1;
    IF @planId IS NULL
        THROW 50404, N'Plano não encontrado.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @UserId AND Role = N'aluno' AND IsActive = 1 AND DeletedAt IS NULL)
        THROW 50403, N'Só alunos com a conta ativa podem assinar um plano.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Subscriptions WHERE UserId = @UserId AND PlanId = @planId AND Status = N'ativa')
    BEGIN
        SELECT CAST(0 AS BIT) AS Changed, CAST(NULL AS INT) AS SubscriptionId, CAST(NULL AS INT) AS PaymentId;
        RETURN;
    END;

    IF @price > 0 AND @Method IS NULL
        THROW 50400, N'Informe a forma de pagamento para assinar este plano.', 1;
    IF @price > 0 AND @Method NOT IN (N'cartao', N'pix')
        THROW 50400, N'Forma de pagamento inválida.', 1;
    IF @price > 0 AND @Method = N'cartao' AND (@CardLast4 IS NULL OR @CardLast4 NOT LIKE '[0-9][0-9][0-9][0-9]')
        THROW 50400, N'Informe os 4 últimos dígitos do cartão.', 1;

    DECLARE @subscriptionId INT, @paymentId INT;
    DECLARE @ids TABLE (Id INT);

    BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE dbo.Subscriptions
        SET Status = N'cancelada', CanceledAt = SYSUTCDATETIME()
        WHERE UserId = @UserId AND Status = N'ativa';

        INSERT INTO dbo.Subscriptions (UserId, PlanId, Status, Price)
        OUTPUT inserted.Id INTO @ids
        VALUES (@UserId, @planId, N'ativa', @price);
        SELECT @subscriptionId = Id FROM @ids;

        IF @price > 0
        BEGIN
            DELETE FROM @ids;
            INSERT INTO dbo.Payments (UserId, PlanId, SubscriptionId, Amount, Method, CardLast4)
            OUTPUT inserted.Id INTO @ids
            VALUES (@UserId, @planId, @subscriptionId, @price, @Method,
                    CASE WHEN @Method = N'cartao' THEN @CardLast4 END);
            SELECT @paymentId = Id FROM @ids;
        END;
    COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Desfaz tudo e repassa o erro para quem chamou (a API devolve a mensagem).
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT CAST(1 AS BIT) AS Changed, @subscriptionId AS SubscriptionId, @paymentId AS PaymentId;
END;
GO

/* Grava uma resposta: número da tentativa, limite diário (só a 1ª tentativa
   de cada questão conta; @DailyLimit NULL = sem limite) e o perfil de quem
   respondeu (respostas de professor não entram nos rankings).
   Retorna: IsCorrect, CorrectLetter, AttemptNumber, UsedToday. */
CREATE OR ALTER PROCEDURE dbo.sp_RegistrarResposta
    @UserId     UNIQUEIDENTIFIER,
    @QuestionId INT,
    @Letter     CHAR(1),
    @Role       NVARCHAR(20),
    @DailyLimit INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @optionId INT, @isCorrect BIT, @correctLetter CHAR(1), @attempt INT, @used INT;
    DECLARE @today DATE = CONVERT(DATE, SYSDATETIMEOFFSET() AT TIME ZONE 'E. South America Standard Time');

    BEGIN TRY
    BEGIN TRANSACTION;
        SELECT @optionId = o.Id, @isCorrect = o.IsCorrect,
               @correctLetter = (SELECT Letter FROM dbo.QuestionOptions WHERE QuestionId = q.Id AND IsCorrect = 1)
        FROM dbo.Questions q
        JOIN dbo.QuestionOptions o ON o.QuestionId = q.Id AND o.Letter = LOWER(@Letter)
        WHERE q.Id = @QuestionId AND q.IsActive = 1;
        IF @optionId IS NULL
            THROW 50404, N'Questão ou alternativa não encontrada.', 1;

        -- Locks this student's answers to the question: two clicks at once can't
        -- both become "attempt 1".
        SELECT @attempt = ISNULL(MAX(AttemptNumber), 0) + 1
        FROM dbo.UserAnswers WITH (UPDLOCK, HOLDLOCK)
        WHERE UserId = @UserId AND QuestionId = @QuestionId;

        SELECT @used = COUNT(*)
        FROM dbo.UserAnswers WITH (UPDLOCK, HOLDLOCK)
        WHERE UserId = @UserId AND AttemptNumber = 1 AND AnsweredOn = @today;

        IF @attempt = 1 AND @DailyLimit IS NOT NULL AND @used >= @DailyLimit
        BEGIN
            DECLARE @message NVARCHAR(200) = CONCAT(N'Você atingiu o limite de ', @DailyLimit, N' questões por dia do plano Básico.');
            THROW 50403, @message, 1;
        END;

        INSERT INTO dbo.UserAnswers (UserId, QuestionId, SelectedOptionId, IsCorrect, AttemptNumber, AnsweredAsRole)
        VALUES (@UserId, @QuestionId, @optionId, @isCorrect, @attempt, @Role);
    COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT @isCorrect AS IsCorrect, @correctLetter AS CorrectLetter, @attempt AS AttemptNumber,
           CASE WHEN @attempt = 1 THEN @used + 1 ELSE @used END AS UsedToday;
END;
GO

/* Números do painel de administração, em 6 resultados (na ordem):
   1 usuários · 2 alunos por plano · 3 atividade · 4 respostas por dia
   5 receita · 6 adesões a planos pagos nos últimos 30 dias.
   Só respostas de alunos contam nas métricas de estudo. */
CREATE OR ALTER PROCEDURE dbo.sp_MetricasAdmin
    @ChartDays INT = 14
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @today DATE = CONVERT(DATE, SYSDATETIMEOFFSET() AT TIME ZONE 'E. South America Standard Time');
    DECLARE @since30 DATETIME2(3) = DATEADD(DAY, -30, SYSUTCDATETIME());

    -- 1. Usuários
    SELECT COUNT(*) AS Total,
           SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS Active,
           SUM(CASE WHEN Role = N'aluno' THEN 1 ELSE 0 END) AS Alunos,
           SUM(CASE WHEN Role = N'professor' THEN 1 ELSE 0 END) AS Professores,
           SUM(CASE WHEN Role = N'admin' THEN 1 ELSE 0 END) AS Admins,
           SUM(CASE WHEN CreatedAt >= @since30 THEN 1 ELSE 0 END) AS NewLast30,
           SUM(CASE WHEN Role = N'professor' AND CreatedAt >= @since30 THEN 1 ELSE 0 END) AS NewTeachers30
    FROM dbo.Users
    WHERE DeletedAt IS NULL;

    -- 2. Alunos ativos por plano (sem assinatura ativa = Básico, como no login)
    SELECT p.Slug, p.Name, p.Price, COUNT(st.Id) AS Students
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
    ORDER BY p.DisplayOrder;

    -- 3. Atividade
    SELECT
        (SELECT COUNT(*) FROM dbo.UserAnswers WHERE AnsweredAsRole = N'aluno' AND AnsweredOn = @today) AS Today,
        (SELECT COUNT(*) FROM dbo.UserAnswers WHERE AnsweredAsRole = N'aluno' AND AnsweredOn > DATEADD(DAY, -7, @today)) AS Last7,
        (SELECT COUNT(DISTINCT UserId) FROM dbo.UserAnswers WHERE AnsweredAsRole = N'aluno' AND AnsweredOn > DATEADD(DAY, -7, @today)) AS ActiveStudents,
        (SELECT COUNT(*) FROM dbo.MockExamAttempts WHERE Status IN (N'finalizado', N'expirado') AND FinishedAt >= @since30) AS MockExams,
        (SELECT COUNT(*) FROM dbo.MentoringRequests WHERE CreatedAt >= @since30) AS Mentoring;

    -- 4. Respostas de alunos por dia (horário de Brasília)
    SELECT AnsweredOn AS Day, COUNT(*) AS Answers
    FROM dbo.UserAnswers
    WHERE AnsweredAsRole = N'aluno' AND AnsweredOn > DATEADD(DAY, -@ChartDays, @today)
    GROUP BY AnsweredOn;

    -- 5. Receita
    SELECT
        (SELECT SUM(s.Price) FROM dbo.Subscriptions s
           JOIN dbo.Users u ON u.Id = s.UserId
           WHERE s.Status = N'ativa' AND s.Price > 0 AND u.IsActive = 1 AND u.DeletedAt IS NULL) AS Recurring,
        (SELECT SUM(Amount) FROM dbo.Payments WHERE Status = N'aprovado' AND PaidAt >= @since30) AS Last30,
        (SELECT COUNT(*) FROM dbo.Payments WHERE Status = N'aprovado' AND PaidAt >= @since30) AS Count30,
        (SELECT SUM(Amount) FROM dbo.Payments WHERE Status = N'aprovado') AS Total;

    -- 6. Adesões a planos pagos nos últimos 30 dias (nova assinatura, upgrade ou troca)
    SELECT p.Slug, p.Name, COUNT(s.Id) AS Adhesions
    FROM dbo.Plans p
    LEFT JOIN dbo.Subscriptions s
      ON s.PlanId = p.Id AND s.Price > 0 AND s.StartedAt >= @since30
     AND EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Id = s.UserId AND u.Role = N'aluno' AND u.DeletedAt IS NULL)
    WHERE p.IsActive = 1 AND p.Price > 0
    GROUP BY p.Slug, p.Name, p.DisplayOrder
    ORDER BY p.DisplayOrder;
END;
GO
