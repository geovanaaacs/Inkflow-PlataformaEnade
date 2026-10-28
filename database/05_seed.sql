/* =============================================================================
   Inkflow — 05_seed.sql
   Dados de exemplo baseados nos mocks do front-end:
     - src/features/questions/data.ts  (questões, alternativas, IA, professor, comunidade)
     - src/features/plans/data.ts      (planos e benefícios)
     - src/features/dashboard/data.ts  (áreas do dashboard)
     - src/features/profile/ProfilePage.tsx (usuária padrão Maria Clara Silva)

   Observações:
     - Preços são fictícios, pensados para uma plataforma que está começando.
     - PasswordHash é um valor fictício: nenhum usuário do seed consegue logar.
     - Datas de respostas/comentários são relativas ao momento da execução,
       para o dashboard mostrar "Hoje"/"Ontem" de forma coerente.

   Idempotente: cada registro só é inserido se ainda não existir
   (identificado por chave natural: Slug, Code, Email/Id etc.).
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRY
BEGIN TRANSACTION;

DECLARE @now   DATETIME2(3) = SYSUTCDATETIME();
DECLARE @tz    NVARCHAR(64) = N'E. South America Standard Time';
DECLARE @today DATE         = CONVERT(DATE, SYSDATETIMEOFFSET() AT TIME ZONE @tz);
DECLARE @pwd   NVARCHAR(255) = N'SEED-HASH-FICTICIO-NAO-USAR-EM-PRODUCAO';

-- IDs fixos dos usuários (facilitam testes e mantêm o seed idempotente).
DECLARE @uMaria    UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000001';
DECLARE @uNicole   UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000002';
DECLARE @uPaula    UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000003';
DECLARE @uRafael   UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000004';
DECLARE @uMarcela  UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000005';
DECLARE @uRemovido UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000006';

/* -----------------------------------------------------------------------------
   1. Áreas e tópicos
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Areas (Name, ShortName, Slug)
SELECT v.Name, v.ShortName, v.Slug
FROM (VALUES
    (N'Engenharia de Software',    N'Eng. de Software',   N'engenharia-de-software'),
    (N'Banco de Dados',            N'Banco de Dados',     N'banco-de-dados'),
    (N'Redes de Computadores',     N'Redes',              N'redes'),
    (N'Inteligência Artificial',   N'IA / ML',            N'ia'),
    (N'Algoritmos e Complexidade', N'Algoritmos',         N'algoritmos'),
    (N'Sistemas Operacionais',     N'Sist. Operacionais', N'sistemas-operacionais')
) AS v (Name, ShortName, Slug)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Areas a WHERE a.Slug = v.Slug);

INSERT INTO dbo.Topics (AreaId, Name)
SELECT a.Id, v.TopicName
FROM (VALUES
    (N'engenharia-de-software', N'Orientação a Objetos'),
    (N'engenharia-de-software', N'Manipulação de Exceções'),
    (N'engenharia-de-software', N'Padrões de Projeto'),
    (N'algoritmos',             N'Estruturas de Controle'),
    (N'algoritmos',             N'Algoritmos de Busca'),
    (N'banco-de-dados',         N'Normalização de Dados'),
    (N'redes',                  N'Protocolos HTTP'),
    (N'ia',                     N'Redes Neurais'),
    (N'sistemas-operacionais',  N'Gerência de Processos')
) AS v (AreaSlug, TopicName)
JOIN dbo.Areas a ON a.Slug = v.AreaSlug
WHERE NOT EXISTS (SELECT 1 FROM dbo.Topics t WHERE t.AreaId = a.Id AND t.Name = v.TopicName);

/* -----------------------------------------------------------------------------
   2. Planos, benefícios e funcionalidades
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Plans (Slug, Name, Description, Price, BillingPeriod, DailyQuestionLimit, IsHighlighted, DisplayOrder)
SELECT v.Slug, v.Name, v.Description, v.Price, v.BillingPeriod, v.DailyQuestionLimit, v.IsHighlighted, v.DisplayOrder
FROM (VALUES
    (N'basico', N'Básico',
     N'Ideal para quem está começando e quer testar o ritmo de estudos.',
     CAST(0.00 AS DECIMAL(10,2)), N'gratuito', 10, CAST(0 AS BIT), 1),
    (N'premium', N'Premium',
     N'Orientação especializada, simulados reais e comunidade para quem está comprometido com seu diploma.',
     CAST(29.90 AS DECIMAL(10,2)), N'mensal', NULL, CAST(1 AS BIT), 2),
    (N'avancado', N'Avançado',
     N'Para quem quer praticar mais e acompanhar sua evolução frente à concorrência.',
     CAST(14.90 AS DECIMAL(10,2)), N'mensal', NULL, CAST(0 AS BIT), 3)
) AS v (Slug, Name, Description, Price, BillingPeriod, DailyQuestionLimit, IsHighlighted, DisplayOrder)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Plans p WHERE p.Slug = v.Slug);

INSERT INTO dbo.PlanBenefits (PlanId, Description, DisplayOrder)
SELECT p.Id, v.Description, v.DisplayOrder
FROM (VALUES
    (N'basico',   1, N'Resolva questões para praticar no seu ritmo'),
    (N'basico',   2, N'Gabaritos comentados por professores e colegas'),
    (N'basico',   3, N'Feedback instantâneo com IA para corrigir erros na hora'),
    (N'premium',  1, N'Mentoria coletiva e grupo de estudo com especialista'),
    (N'premium',  2, N'Simulado com timer para treinar em condições reais de prova'),
    (N'premium',  3, N'Grupo exclusivo no WhatsApp: especialista define o que e a ordem para estudar'),
    (N'premium',  4, N'Ranking exclusivo para acompanhar sua posição entre os mais preparados'),
    (N'avancado', 1, N'Questões ilimitadas para praticar sempre que quiser'),
    (N'avancado', 2, N'Ranking em tempo real: veja sua posição frente aos concorrentes'),
    (N'avancado', 3, N'Bloco de anotações individual para organizar seus estudos')
) AS v (PlanSlug, DisplayOrder, Description)
JOIN dbo.Plans p ON p.Slug = v.PlanSlug
WHERE NOT EXISTS (SELECT 1 FROM dbo.PlanBenefits b WHERE b.PlanId = p.Id AND b.DisplayOrder = v.DisplayOrder);

INSERT INTO dbo.Features (Code, Name, Description)
SELECT v.Code, v.Name, v.Description
FROM (VALUES
    (N'GABARITO_IA',           N'Gabarito com IA',            N'Explicação da resposta gerada por IA.'),
    (N'COMENTARIOS_PROFESSOR', N'Comentários de professores', N'Resolução comentada por professores verificados.'),
    (N'COMUNIDADE',            N'Comunidade',                 N'Ler e publicar comentários nas questões.'),
    (N'QUESTOES_ILIMITADAS',   N'Questões ilimitadas',        N'Sem limite diário de questões.'),
    (N'ANOTACOES',             N'Bloco de anotações',         N'Anotações individuais em cada questão.'),
    (N'HISTORICO_COMPLETO',    N'Histórico completo',         N'Histórico completo de acertos e erros.'),
    (N'RANKING',               N'Ranking',                    N'Posição entre os estudantes em tempo real.'),
    (N'SIMULADOS',             N'Simulados',                  N'Simulados com cronômetro em condições reais de prova.'),
    (N'MENTORIA',              N'Mentoria coletiva',          N'Grupos de estudo com mentoria de especialista.'),
    (N'GRUPO_WHATSAPP',        N'Grupo no WhatsApp',          N'Grupo exclusivo com trilha de estudo definida pelo especialista.')
) AS v (Code, Name, Description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Features f WHERE f.Code = v.Code);

-- Premium inclui tudo do Avançado, que inclui tudo do Básico.
INSERT INTO dbo.PlanFeatures (PlanId, FeatureId)
SELECT p.Id, f.Id
FROM (VALUES
    (N'basico',   N'GABARITO_IA'),
    (N'basico',   N'COMENTARIOS_PROFESSOR'),
    (N'basico',   N'COMUNIDADE'),
    (N'avancado', N'GABARITO_IA'),
    (N'avancado', N'COMENTARIOS_PROFESSOR'),
    (N'avancado', N'COMUNIDADE'),
    (N'avancado', N'QUESTOES_ILIMITADAS'),
    (N'avancado', N'ANOTACOES'),
    (N'avancado', N'HISTORICO_COMPLETO'),
    (N'avancado', N'RANKING'),
    (N'premium',  N'GABARITO_IA'),
    (N'premium',  N'COMENTARIOS_PROFESSOR'),
    (N'premium',  N'COMUNIDADE'),
    (N'premium',  N'QUESTOES_ILIMITADAS'),
    (N'premium',  N'ANOTACOES'),
    (N'premium',  N'HISTORICO_COMPLETO'),
    (N'premium',  N'RANKING'),
    (N'premium',  N'SIMULADOS'),
    (N'premium',  N'MENTORIA'),
    (N'premium',  N'GRUPO_WHATSAPP')
) AS v (PlanSlug, FeatureCode)
JOIN dbo.Plans p    ON p.Slug = v.PlanSlug
JOIN dbo.Features f ON f.Code = v.FeatureCode
WHERE NOT EXISTS (SELECT 1 FROM dbo.PlanFeatures pf WHERE pf.PlanId = p.Id AND pf.FeatureId = f.Id);

/* -----------------------------------------------------------------------------
   3. Usuários (autores dos mocks + usuária padrão do perfil)
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Users (Id, Name, Email, PasswordHash, Role, Phone, Course,
                       EmailNotificationsEnabled, PushNotificationsEnabled,
                       CreatedAt, UpdatedAt, DeletedAt)
SELECT v.Id, v.Name, v.Email, @pwd, v.Role, v.Phone, v.Course,
       v.EmailNotif, v.PushNotif, v.CreatedAt, v.CreatedAt, v.DeletedAt
FROM (VALUES
    (@uMaria,   N'Maria Clara Silva', N'maria.clara@email.com',    N'aluno',
     CAST(NULL AS NVARCHAR(20)), N'Análise e Desenvolvimento de Sistemas', CAST(1 AS BIT), CAST(0 AS BIT),
     DATEADD(DAY, -45, @now), CAST(NULL AS DATETIME2(3))),
    (@uNicole,  N'Nicole Silva',      N'nicole.silva@email.com',   N'aluno',
     N'(11) 91234-5678', N'Análise e Desenvolvimento de Sistemas', CAST(1 AS BIT), CAST(1 AS BIT),
     DATEADD(DAY, -60, @now), NULL),
    (@uPaula,   N'Paula Cunha',       N'paula.cunha@email.com',    N'aluno',
     N'(21) 99876-5432', N'Ciência da Computação', CAST(1 AS BIT), CAST(0 AS BIT),
     DATEADD(DAY, -90, @now), NULL),
    (@uRafael,  N'Rafael Nunes',      N'rafael.nunes@email.com',   N'aluno',
     NULL, N'Sistemas de Informação', CAST(0 AS BIT), CAST(0 AS BIT),
     DATEADD(DAY, -30, @now), NULL),
    (@uMarcela, N'Marcela Guedes',    N'marcela.guedes@email.com', N'professor',
     N'(19) 99111-2233', N'Engenharia de Software', CAST(1 AS BIT), CAST(0 AS BIT),
     DATEADD(DAY, -60, @now), NULL),
    -- Conta apagada (exclusão lógica + dados pessoais anonimizados).
    -- Seus comentários continuam visíveis como "Usuário removido".
    (@uRemovido, N'Usuário removido',
     N'removido-a1000000000000000000000000000006@inkflow.invalid', N'aluno',
     NULL, NULL, CAST(0 AS BIT), CAST(0 AS BIT),
     DATEADD(DAY, -120, @now), DATEADD(DAY, -10, @now))
) AS v (Id, Name, Email, Role, Phone, Course, EmailNotif, PushNotif, CreatedAt, DeletedAt)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Id = v.Id);

INSERT INTO dbo.TeacherProfiles (UserId, Title, Credentials, Bio, IsVerified, VerifiedAt)
SELECT @uMarcela, N'Professora',
       N'Eng. de Software · UNICAMP · 12 anos ENADE',
       N'Engenheira de software e professora com 12 anos de experiência preparando turmas para o ENADE.',
       1, DATEADD(DAY, -55, @now)
WHERE NOT EXISTS (SELECT 1 FROM dbo.TeacherProfiles WHERE UserId = @uMarcela);

/* -----------------------------------------------------------------------------
   4. Assinaturas
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Subscriptions (UserId, PlanId, Status, Price, StartedAt, EndsAt, CanceledAt)
SELECT v.UserId, p.Id, v.Status, p.Price, v.StartedAt, v.EndsAt, v.CanceledAt
FROM (VALUES
    (@uMaria,    N'basico',   N'ativa',     DATEADD(DAY, -45, @now),  CAST(NULL AS DATETIME2(3)), CAST(NULL AS DATETIME2(3))),
    (@uNicole,   N'premium',  N'ativa',     DATEADD(DAY, -15, @now),  DATEADD(DAY, 15, @now),     NULL),
    (@uPaula,    N'basico',   N'cancelada', DATEADD(DAY, -90, @now),  DATEADD(DAY, -20, @now),    DATEADD(DAY, -20, @now)),
    (@uPaula,    N'avancado', N'ativa',     DATEADD(DAY, -20, @now),  DATEADD(DAY, 10, @now),     NULL),
    (@uRafael,   N'basico',   N'ativa',     DATEADD(DAY, -30, @now),  NULL,                       NULL),
    (@uMarcela,  N'basico',   N'ativa',     DATEADD(DAY, -60, @now),  NULL,                       NULL),
    (@uRemovido, N'basico',   N'cancelada', DATEADD(DAY, -120, @now), DATEADD(DAY, -10, @now),    DATEADD(DAY, -10, @now))
) AS v (UserId, PlanSlug, Status, StartedAt, EndsAt, CanceledAt)
JOIN dbo.Plans p ON p.Slug = v.PlanSlug
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Subscriptions s
    WHERE s.UserId = v.UserId AND s.PlanId = p.Id AND s.Status = v.Status
);

/* -----------------------------------------------------------------------------
   5. Questões e alternativas (src/features/questions/data.ts)
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Questions (Code, TopicId, Year, Type, Difficulty, Statement, AiExplanation)
SELECT v.Code, t.Id, v.Year, N'Múltipla escolha', v.Difficulty, v.Statement, v.AiExplanation
FROM (VALUES
    (N'Q2023-112', N'algoritmos', N'Estruturas de Controle', 2023, N'médio',
N'Considere as afirmativas:

I. O switch em C# permite o uso de expressões com tipos string.
II. O foreach é utilizado para percorrer coleções que implementam IEnumerable.
III. O while sempre executa pelo menos uma vez o bloco de código.
IV. O do...while garante a execução mínima de uma vez.

Assinale a resposta correta.',
N'Analisando as afirmativas:

✔ I — Verdadeira. O C# permite utilizar string em estruturas switch.
✔ II — Verdadeira. O foreach percorre coleções que implementam IEnumerable.
✘ III — Falsa. O laço while pode não executar nenhuma vez se a condição inicial for falsa.
✔ IV — Verdadeira. O do...while executa o bloco ao menos uma vez antes da verificação da condição.

Portanto, o gabarito correto é a alternativa D.'),

    (N'Q2024-80', N'engenharia-de-software', N'Orientação a Objetos', 2024, N'difícil',
N'Considere as afirmativas:

I. A herança múltipla de classes é permitida em C#.
II. Interfaces podem ser implementadas por múltiplas classes.
III. O modificador sealed impede que uma classe seja herdada.
IV. O polimorfismo permite que métodos sejam sobrescritos em classes derivadas.

Assinale a opção correta.',
N'I é falsa: C# não permite herança múltipla de classes.
II, III e IV estão corretas: interfaces podem ser implementadas por múltiplas classes, sealed impede herança e o polimorfismo permite sobrescrita de métodos.

Gabarito: C.'),

    (N'Q2022-92', N'engenharia-de-software', N'Manipulação de Exceções', 2022, N'fácil',
N'Considere as afirmativas:

I. O bloco finally é sempre executado, independentemente de ocorrer exceção.
II. É possível criar exceções personalizadas herdando de Exception.
III. O bloco catch pode capturar exceções específicas por tipo.
IV. O uso de throw permite relançar exceções capturadas.',
N'Todas as quatro assertivas descrevem corretamente o tratamento de exceções em C#: finally sempre executa, exceções customizadas herdam de Exception, catch pode ser tipado e throw relança exceções. Gabarito: D.')
) AS v (Code, AreaSlug, TopicName, Year, Difficulty, Statement, AiExplanation)
JOIN dbo.Areas a  ON a.Slug = v.AreaSlug
JOIN dbo.Topics t ON t.AreaId = a.Id AND t.Name = v.TopicName
WHERE NOT EXISTS (SELECT 1 FROM dbo.Questions q WHERE q.Code = v.Code);

INSERT INTO dbo.QuestionOptions (QuestionId, Letter, Text, IsCorrect)
SELECT q.Id, v.Letter, v.Text, v.IsCorrect
FROM (VALUES
    (N'Q2023-112', N'a', N'Apenas I e II estão corretas.',          CAST(0 AS BIT)),
    (N'Q2023-112', N'b', N'Apenas III e IV estão corretas.',        CAST(0 AS BIT)),
    (N'Q2023-112', N'c', N'Apenas II e IV estão corretas.',         CAST(0 AS BIT)),
    (N'Q2023-112', N'd', N'Apenas I, II e IV estão corretas.',      CAST(1 AS BIT)),
    (N'Q2023-112', N'e', N'Todas as afirmativas estão corretas.',   CAST(0 AS BIT)),

    (N'Q2024-80',  N'a', N'Apenas I e II estão corretas.',          CAST(0 AS BIT)),
    (N'Q2024-80',  N'b', N'Apenas II e III estão corretas.',        CAST(0 AS BIT)),
    (N'Q2024-80',  N'c', N'Apenas II, III e IV estão corretas.',    CAST(1 AS BIT)),
    (N'Q2024-80',  N'd', N'Apenas III e IV estão corretas.',        CAST(0 AS BIT)),
    (N'Q2024-80',  N'e', N'Todas as afirmativas estão corretas.',   CAST(0 AS BIT)),

    (N'Q2022-92',  N'a', N'Apenas I e II estão corretas.',          CAST(0 AS BIT)),
    (N'Q2022-92',  N'b', N'Apenas II e III estão corretas.',        CAST(0 AS BIT)),
    (N'Q2022-92',  N'c', N'Apenas I, II e IV estão corretas.',      CAST(0 AS BIT)),
    (N'Q2022-92',  N'd', N'Apenas I, II, III e IV estão corretas.', CAST(1 AS BIT)),
    (N'Q2022-92',  N'e', N'Apenas III e IV estão corretas.',        CAST(0 AS BIT))
) AS v (Code, Letter, Text, IsCorrect)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.QuestionOptions o WHERE o.QuestionId = q.Id AND o.Letter = v.Letter);

/* -----------------------------------------------------------------------------
   6. Comentários de professor e da comunidade
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.TeacherComments (QuestionId, TeacherUserId, Content, CreatedAt, UpdatedAt)
SELECT q.Id, @uMarcela, v.Content, DATEADD(DAY, -40, @now), DATEADD(DAY, -40, @now)
FROM (VALUES
    (N'Q2023-112', N'A alternativa correta é a letra D. As assertivas I, II e IV estão corretas sob a ótica da linguagem C#. Em especial, destaca-se que o comando do...while garante ao menos uma execução do bloco, diferentemente do while, cuja condição é verificada antes da execução. Portanto, a assertiva III é incorreta.'),
    (N'Q2024-80',  N'Cuidado com a pegadinha da herança múltipla — em C# ela só é permitida entre interfaces, nunca entre classes. As demais assertivas descrevem corretamente os conceitos de orientação a objetos da linguagem.'),
    (N'Q2022-92',  N'Questão direta sobre o modelo try/catch/finally. Vale reforçar: mesmo com um return dentro do try, o finally ainda é executado antes do retorno efetivo.')
) AS v (Code, Content)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.TeacherComments tc WHERE tc.QuestionId = q.Id AND tc.TeacherUserId = @uMarcela);

INSERT INTO dbo.CommunityComments (QuestionId, UserId, Content, CreatedAt, UpdatedAt)
SELECT q.Id, v.UserId, v.Content, DATEADD(MINUTE, -v.MinutesAgo, @now), DATEADD(MINUTE, -v.MinutesAgo, @now)
FROM (VALUES
    (N'Q2023-112', @uNicole, 2 * 1440,
     N'A alternativa correta é a letra D. A afirmativa I está correta porque o C# permite utilizar string dentro do switch. A II também está certa, já que o foreach é usado para percorrer coleções que implementam IEnumerable. A III está errada, porque o while pode sim não executar nenhuma vez, dependendo da condição. E a IV está correta, pois o do...while executa pelo menos uma vez antes de verificar a condição.'),
    (N'Q2023-112', @uPaula, 170,
     N'Marquei a letra D. I e II estão corretas. A III está errada porque o while pode não entrar no bloco nenhuma vez. A IV também está correta, já que o do...while executa ao menos uma vez.'),
    (N'Q2024-80',  @uRafael, 3 * 1440 - 5,
     N'Errei porque esqueci que sealed impede herança. Bom saber!'),
    -- Comentário de conta removida: a aplicação exibe "Usuário removido".
    (N'Q2022-92',  @uRemovido, 12 * 1440,
     N'Boa questão para revisar: o finally roda mesmo quando há return dentro do try.')
) AS v (Code, UserId, MinutesAgo, Content)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.CommunityComments c
    WHERE c.QuestionId = q.Id AND c.UserId = v.UserId AND c.Content = v.Content
);

/* -----------------------------------------------------------------------------
   7. Anotações
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.UserNotes (UserId, QuestionId, Content)
SELECT @uMaria, q.Id,
       N'Lembrar: C# não tem herança múltipla de CLASSES, só de interfaces. sealed bloqueia herança.'
FROM dbo.Questions q
WHERE q.Code = N'Q2024-80'
  AND NOT EXISTS (SELECT 1 FROM dbo.UserNotes n WHERE n.UserId = @uMaria AND n.QuestionId = q.Id);

/* -----------------------------------------------------------------------------
   8. Simulado (recurso Premium)
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.MockExams (Title, Description, AreaId, Difficulty, TimeLimitMinutes)
SELECT N'Simulado ENADE — Programação em C#',
       N'Simulado cronometrado com questões de estruturas de controle, orientação a objetos e exceções.',
       a.Id, N'difícil', 30
FROM dbo.Areas a
WHERE a.Slug = N'engenharia-de-software'
  AND NOT EXISTS (SELECT 1 FROM dbo.MockExams m WHERE m.Title = N'Simulado ENADE — Programação em C#');

DECLARE @mockExamId INT =
    (SELECT Id FROM dbo.MockExams WHERE Title = N'Simulado ENADE — Programação em C#');

INSERT INTO dbo.MockExamQuestions (MockExamId, QuestionId, DisplayOrder)
SELECT @mockExamId, q.Id, v.DisplayOrder
FROM (VALUES (N'Q2023-112', 1), (N'Q2024-80', 2), (N'Q2022-92', 3)) AS v (Code, DisplayOrder)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.MockExamQuestions mq WHERE mq.MockExamId = @mockExamId AND mq.QuestionId = q.Id);

-- Nicole (Premium) fez o simulado ontem e acertou tudo.
INSERT INTO dbo.MockExamAttempts (MockExamId, UserId, Status, TotalQuestions, CorrectCount, StartedAt, FinishedAt)
SELECT @mockExamId, @uNicole, N'finalizado', 3, 3,
       DATEADD(MINUTE, -(1440 + 40), @now), DATEADD(MINUTE, -(1440 + 15), @now)
WHERE NOT EXISTS (SELECT 1 FROM dbo.MockExamAttempts WHERE MockExamId = @mockExamId AND UserId = @uNicole);

DECLARE @nicoleAttemptId INT =
    (SELECT TOP (1) Id FROM dbo.MockExamAttempts
     WHERE MockExamId = @mockExamId AND UserId = @uNicole ORDER BY Id);

/* -----------------------------------------------------------------------------
   9. Respostas (todas as tentativas)
   AttemptNumber = 1 é a única que conta para "questões respondidas" e para
   o limite diário. Ex.: Maria errou a Q2024-80 e tentou de novo hoje —
   são 3 tentativas hoje, mas só 2 questões contam no limite (2/10).
   ----------------------------------------------------------------------------- */

DECLARE @answers TABLE (
    UserId        UNIQUEIDENTIFIER,
    Code          NVARCHAR(20),
    Letter        NCHAR(1),
    AttemptNumber SMALLINT,
    MinutesAgo    INT,
    InMockExam    BIT
);

INSERT INTO @answers (UserId, Code, Letter, AttemptNumber, MinutesAgo, InMockExam) VALUES
    -- Maria Clara (Básico)
    (@uMaria,    N'Q2022-92',  N'c', 1, 1440 + 120, 0),  -- ontem, errou
    (@uMaria,    N'Q2023-112', N'd', 1, 30,         0),  -- hoje, acertou
    (@uMaria,    N'Q2024-80',  N'a', 1, 25,         0),  -- hoje, errou
    (@uMaria,    N'Q2024-80',  N'c', 2, 20,         0),  -- hoje, nova tentativa: acertou
    -- Nicole (Premium)
    (@uNicole,   N'Q2023-112', N'd', 1, 2 * 1440 + 10, 0),
    (@uNicole,   N'Q2023-112', N'd', 2, 1440 + 35,  1),  -- dentro do simulado
    (@uNicole,   N'Q2024-80',  N'c', 1, 1440 + 30,  1),
    (@uNicole,   N'Q2022-92',  N'd', 1, 1440 + 20,  1),
    -- Paula (Avançado)
    (@uPaula,    N'Q2023-112', N'd', 1, 180,        0),
    (@uPaula,    N'Q2022-92',  N'a', 1, 175,        0),
    -- Rafael (Básico)
    (@uRafael,   N'Q2024-80',  N'b', 1, 3 * 1440,      0),
    (@uRafael,   N'Q2024-80',  N'c', 2, 3 * 1440 - 3,  0),
    -- Conta removida: o histórico é mantido
    (@uRemovido, N'Q2022-92',  N'd', 1, 12 * 1440 + 10, 0);

INSERT INTO dbo.UserAnswers (UserId, QuestionId, SelectedOptionId, IsCorrect, AttemptNumber,
                             MockExamAttemptId, AnsweredAt, AnsweredOn)
SELECT a.UserId, q.Id, o.Id, o.IsCorrect, a.AttemptNumber,
       CASE WHEN a.InMockExam = 1 THEN @nicoleAttemptId END,
       x.AnsweredAt,
       CONVERT(DATE, (x.AnsweredAt AT TIME ZONE 'UTC') AT TIME ZONE @tz)
FROM @answers a
JOIN dbo.Questions q       ON q.Code = a.Code
JOIN dbo.QuestionOptions o ON o.QuestionId = q.Id AND o.Letter = a.Letter
CROSS APPLY (SELECT DATEADD(MINUTE, -a.MinutesAgo, @now) AS AnsweredAt) x
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.UserAnswers ua
    WHERE ua.UserId = a.UserId AND ua.QuestionId = q.Id AND ua.AttemptNumber = a.AttemptNumber
);

/* -----------------------------------------------------------------------------
   10. Ranking do mês atual (calculado a partir das primeiras tentativas)
   Pontuação: 10 pontos por acerto na primeira tentativa.
   ----------------------------------------------------------------------------- */

DECLARE @monthStart DATE = DATEFROMPARTS(YEAR(@today), MONTH(@today), 1);

IF NOT EXISTS (SELECT 1 FROM dbo.RankingSnapshots WHERE PeriodType = N'mensal' AND PeriodStart = @monthStart)
    INSERT INTO dbo.RankingSnapshots (UserId, PeriodType, PeriodStart, Position, Score, AnsweredCount, CorrectCount)
    SELECT s.UserId, N'mensal', @monthStart,
           RANK() OVER (ORDER BY s.Score DESC, s.CorrectCount DESC),
           s.Score, s.AnsweredCount, s.CorrectCount
    FROM (
        SELECT ua.UserId,
               COUNT(*)                                AS AnsweredCount,
               SUM(CAST(ua.IsCorrect AS INT))          AS CorrectCount,
               SUM(CAST(ua.IsCorrect AS INT)) * 10     AS Score
        FROM dbo.UserAnswers ua
        JOIN dbo.Users u ON u.Id = ua.UserId
        WHERE ua.AttemptNumber = 1
          AND ua.AnsweredOn >= @monthStart
          AND u.DeletedAt IS NULL
          AND u.Role = N'aluno'
        GROUP BY ua.UserId
    ) AS s;

/* -----------------------------------------------------------------------------
   11. Mentoria / grupo de estudo (recurso Premium)
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.StudyGroups (Name, Description, MentorUserId, AreaId, MaxMembers)
SELECT N'Mentoria ENADE — Engenharia de Software',
       N'Grupo de estudo com mentoria coletiva da Profa. Marcela Guedes. A especialista define os tópicos e a ordem de estudo.',
       @uMarcela, a.Id, 30
FROM dbo.Areas a
WHERE a.Slug = N'engenharia-de-software'
  AND NOT EXISTS (SELECT 1 FROM dbo.StudyGroups g WHERE g.Name = N'Mentoria ENADE — Engenharia de Software');

DECLARE @groupId INT =
    (SELECT Id FROM dbo.StudyGroups WHERE Name = N'Mentoria ENADE — Engenharia de Software');

INSERT INTO dbo.StudyGroupMembers (StudyGroupId, UserId, JoinedAt)
SELECT @groupId, @uNicole, DATEADD(DAY, -14, @now)
WHERE NOT EXISTS (SELECT 1 FROM dbo.StudyGroupMembers WHERE StudyGroupId = @groupId AND UserId = @uNicole);

INSERT INTO dbo.StudyGroupPlanItems (StudyGroupId, TopicId, DisplayOrder, Guidance, DueDate)
SELECT @groupId, t.Id, v.DisplayOrder, v.Guidance, DATEADD(DAY, v.DueInDays, @today)
FROM (VALUES
    (1, N'algoritmos',             N'Estruturas de Controle',  N'Revisar while x do...while e switch com string.', 3),
    (2, N'engenharia-de-software', N'Orientação a Objetos',    N'Herança, interfaces, sealed e polimorfismo.',     7),
    (3, N'engenharia-de-software', N'Manipulação de Exceções', N'try/catch/finally e exceções personalizadas.',   10),
    (4, N'engenharia-de-software', N'Padrões de Projeto',      N'Strategy, Factory e Observer.',                   14)
) AS v (DisplayOrder, AreaSlug, TopicName, Guidance, DueInDays)
JOIN dbo.Areas a  ON a.Slug = v.AreaSlug
JOIN dbo.Topics t ON t.AreaId = a.Id AND t.Name = v.TopicName
WHERE NOT EXISTS (SELECT 1 FROM dbo.StudyGroupPlanItems i WHERE i.StudyGroupId = @groupId AND i.DisplayOrder = v.DisplayOrder);

-- Encontro daqui a 3 dias às 19h de Brasília (22h UTC).
INSERT INTO dbo.MentoringSessions (StudyGroupId, Title, Description, ScheduledAt, DurationMinutes)
SELECT @groupId,
       N'Revisão: Orientação a Objetos em C#',
       N'Resolução comentada das questões de OO mais cobradas no ENADE.',
       DATEADD(HOUR, 22, CAST(DATEADD(DAY, 3, @today) AS DATETIME2(3))),
       60
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.MentoringSessions
    WHERE StudyGroupId = @groupId AND Title = N'Revisão: Orientação a Objetos em C#'
);

COMMIT TRANSACTION;
PRINT N'05_seed.sql concluído.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

-- Resumo do que existe no banco após o seed.
SELECT 'Areas' AS Tabela, COUNT(*) AS Registros FROM dbo.Areas
UNION ALL SELECT 'Topics',              COUNT(*) FROM dbo.Topics
UNION ALL SELECT 'Plans',               COUNT(*) FROM dbo.Plans
UNION ALL SELECT 'PlanBenefits',        COUNT(*) FROM dbo.PlanBenefits
UNION ALL SELECT 'Features',            COUNT(*) FROM dbo.Features
UNION ALL SELECT 'PlanFeatures',        COUNT(*) FROM dbo.PlanFeatures
UNION ALL SELECT 'Users',               COUNT(*) FROM dbo.Users
UNION ALL SELECT 'TeacherProfiles',     COUNT(*) FROM dbo.TeacherProfiles
UNION ALL SELECT 'Subscriptions',       COUNT(*) FROM dbo.Subscriptions
UNION ALL SELECT 'Questions',           COUNT(*) FROM dbo.Questions
UNION ALL SELECT 'QuestionOptions',     COUNT(*) FROM dbo.QuestionOptions
UNION ALL SELECT 'TeacherComments',     COUNT(*) FROM dbo.TeacherComments
UNION ALL SELECT 'CommunityComments',   COUNT(*) FROM dbo.CommunityComments
UNION ALL SELECT 'UserNotes',           COUNT(*) FROM dbo.UserNotes
UNION ALL SELECT 'MockExams',           COUNT(*) FROM dbo.MockExams
UNION ALL SELECT 'MockExamQuestions',   COUNT(*) FROM dbo.MockExamQuestions
UNION ALL SELECT 'MockExamAttempts',    COUNT(*) FROM dbo.MockExamAttempts
UNION ALL SELECT 'UserAnswers',         COUNT(*) FROM dbo.UserAnswers
UNION ALL SELECT 'RankingSnapshots',    COUNT(*) FROM dbo.RankingSnapshots
UNION ALL SELECT 'StudyGroups',         COUNT(*) FROM dbo.StudyGroups
UNION ALL SELECT 'StudyGroupMembers',   COUNT(*) FROM dbo.StudyGroupMembers
UNION ALL SELECT 'StudyGroupPlanItems', COUNT(*) FROM dbo.StudyGroupPlanItems
UNION ALL SELECT 'MentoringSessions',   COUNT(*) FROM dbo.MentoringSessions;
GO
