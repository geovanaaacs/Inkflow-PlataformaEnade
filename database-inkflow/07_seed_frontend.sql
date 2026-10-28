/* =============================================================================
   Inkflow — 07_seed_frontend.sql
   Alinha os dados de exemplo do banco aos mocks do frontend:
     - 11 questões novas (com alternativas e comentário da professora)
     - Prof. Ricardo Alves (segundo professor da agenda)
     - os 4 simulados do front (o simulado antigo do 05 continua)
     - várias anotações por questão (Paula e Nicole)
     - agenda de mentoria: horários abertos e solicitações da Nicole

   Pré-requisito: 01–06 (usa as tabelas da agenda criadas no 06).
   O bloco de questões e simulados foi gerado a partir de
   src/features/questions/data.ts e src/features/mock-exams/data.ts — o texto
   das questões é idêntico ao do front.

   Fora deste seed (só existem no front, como dados de vitrine):
     - os 14 estudantes fictícios do ranking (Lucas Andrade, Camila Torres...)
     - o histórico de respostas do front (o 05 tem o seu próprio histórico)

   Idempotente: cada registro só é inserido se ainda não existir.
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

DECLARE @uPaula   UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000003';
DECLARE @uNicole  UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000002';
DECLARE @uMarcela UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000005';
DECLARE @uRicardo UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000007';

/* -----------------------------------------------------------------------------
   1. Prof. Ricardo Alves
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Users (Id, Name, Email, PasswordHash, Role, Course)
SELECT @uRicardo, N'Ricardo Alves', N'ricardo.alves@email.com', @pwd, N'professor', N'Redes de Computadores'
WHERE NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @uRicardo);

INSERT INTO dbo.TeacherProfiles (UserId, Title, Credentials, Bio, IsVerified, VerifiedAt)
SELECT @uRicardo, N'Prof.', N'Redes e Infraestrutura · 10 anos ENADE',
       N'Professor de redes e sistemas operacionais, mentor das trilhas de infraestrutura.',
       1, @now
WHERE NOT EXISTS (SELECT 1 FROM dbo.TeacherProfiles WHERE UserId = @uRicardo);

/* -----------------------------------------------------------------------------
   2. Questões e simulados do frontend (bloco gerado)
   ----------------------------------------------------------------------------- */

/* ---- Tópicos novos ---- */
INSERT INTO dbo.Topics (AreaId, Name)
SELECT a.Id, v.TopicName
FROM (VALUES
    (N'algoritmos', N'Estruturas de Controle'),
    (N'engenharia-de-software', N'Orientação a Objetos'),
    (N'engenharia-de-software', N'Manipulação de Exceções'),
    (N'engenharia-de-software', N'Padrões de Projeto'),
    (N'banco-de-dados', N'Normalização de Dados'),
    (N'banco-de-dados', N'Linguagem SQL'),
    (N'redes', N'Protocolos HTTP'),
    (N'redes', N'Camada de Transporte'),
    (N'ia', N'Redes Neurais'),
    (N'ia', N'Aprendizado de Máquina'),
    (N'algoritmos', N'Algoritmos de Busca'),
    (N'algoritmos', N'Complexidade de Algoritmos'),
    (N'sistemas-operacionais', N'Gerência de Processos'),
    (N'sistemas-operacionais', N'Deadlock')
) AS v (AreaSlug, TopicName)
JOIN dbo.Areas a ON a.Slug = v.AreaSlug
WHERE NOT EXISTS (SELECT 1 FROM dbo.Topics t WHERE t.AreaId = a.Id AND t.Name = v.TopicName);

/* ---- Questões ---- */
INSERT INTO dbo.Questions (Code, TopicId, Year, Type, Difficulty, Statement, AiExplanation)
SELECT v.Code, t.Id, v.Year, N'Múltipla escolha', v.Difficulty, v.Statement, v.AiExplanation
FROM (VALUES
    (N'Q2021-15', N'engenharia-de-software', N'Padrões de Projeto', 2021, N'médio',
N'Uma loja virtual precisa permitir que o cálculo de frete seja trocado em tempo de execução (por peso, por distância ou frete grátis), sem alterar a classe que finaliza o pedido. Qual padrão de projeto é o mais adequado para essa situação?',
N'O Strategy encapsula uma família de algoritmos intercambiáveis atrás de uma mesma interface (ex.: ICalculoFrete). A classe do pedido recebe a estratégia e não precisa mudar quando uma nova forma de cálculo é criada. Singleton garante instância única, Observer notifica mudanças, Adapter converte interfaces e Composite trata hierarquias parte-todo. Gabarito: B.'),

    (N'Q2024-34', N'banco-de-dados', N'Normalização de Dados', 2024, N'médio',
N'A tabela Pedido(NumPedido, CodProduto, NomeProduto, Quantidade) tem chave primária composta por (NumPedido, CodProduto). O atributo NomeProduto depende apenas de CodProduto. Essa tabela viola qual forma normal?',
N'Há uma dependência parcial: NomeProduto depende de apenas parte da chave composta (CodProduto). A 2FN exige que todo atributo não-chave dependa da chave inteira. A solução é mover NomeProduto para uma tabela Produto(CodProduto, NomeProduto). Gabarito: B.'),

    (N'Q2023-58', N'banco-de-dados', N'Linguagem SQL', 2023, N'fácil',
N'Considere a consulta SQL a seguir:

SELECT curso, COUNT(*)
FROM Aluno
GROUP BY curso
HAVING COUNT(*) > 30;

O que essa consulta retorna?',
N'O GROUP BY agrupa os alunos por curso e o COUNT(*) conta quantos há em cada grupo. O HAVING filtra os grupos depois da agregação, mantendo apenas os cursos com mais de 30 alunos. Gabarito: B.'),

    (N'Q2022-47', N'redes', N'Protocolos HTTP', 2022, N'fácil',
N'Em uma API REST, um cliente envia uma requisição GET para buscar um recurso que não existe no servidor. Qual código de status HTTP o servidor deve retornar?',
N'Códigos 4xx indicam erro do cliente; o 404 informa que o recurso solicitado não foi encontrado. 200 e 201 indicam sucesso, 301 indica redirecionamento e 500 indica falha interna do servidor. Gabarito: D.'),

    (N'Q2023-12', N'redes', N'Camada de Transporte', 2023, N'médio',
N'Sobre os protocolos TCP e UDP, avalie as afirmativas:

I. O TCP é orientado à conexão e garante a entrega ordenada dos segmentos.
II. O UDP realiza controle de congestionamento.
III. Transmissões de vídeo ao vivo costumam usar UDP por tolerarem perdas e priorizarem baixa latência.
IV. O handshake de três vias é utilizado pelo UDP para estabelecer conexões.

É correto o que se afirma em:',
N'I é verdadeira: o TCP estabelece conexão e garante ordem e entrega. II é falsa: o UDP não faz controle de congestionamento. III é verdadeira: streaming ao vivo prefere baixa latência a retransmissões. IV é falsa: o handshake de três vias é do TCP. Gabarito: B.'),

    (N'Q2023-201', N'ia', N'Redes Neurais', 2023, N'difícil',
N'Um perceptron de camada única é treinado para aprender funções lógicas booleanas de duas entradas. Qual das funções abaixo ele NÃO consegue aprender?',
N'O perceptron de camada única só aprende funções linearmente separáveis. AND, OR, NAND e NOR podem ser separadas por uma reta; o XOR não. Para aprender o XOR é necessária ao menos uma camada oculta (perceptron multicamadas). Gabarito: D.'),

    (N'Q2024-9', N'ia', N'Aprendizado de Máquina', 2024, N'médio',
N'Uma empresa possui um histórico de e-mails já rotulados como ''spam'' ou ''não spam'' e deseja treinar um modelo para classificar automaticamente os novos e-mails. Esse problema é um exemplo de:',
N'Os dados de treino já têm rótulo (spam / não spam), então o aprendizado é supervisionado. Como a saída é uma categoria e não um valor contínuo, trata-se de classificação. Gabarito: B.'),

    (N'Q2021-78', N'algoritmos', N'Algoritmos de Busca', 2021, N'médio',
N'Um vetor ordenado possui 1.024 elementos. Utilizando busca binária, qual é o número máximo de comparações necessárias para determinar se um elemento está presente no vetor?',
N'Cada comparação da busca binária descarta metade do intervalo. Após 10 divisões (2¹⁰ = 1.024) resta um único elemento, que ainda precisa ser comparado: ⌊log₂ n⌋ + 1 = 11 comparações no pior caso. Gabarito: B.'),

    (N'Q2022-66', N'algoritmos', N'Complexidade de Algoritmos', 2022, N'difícil',
N'Sobre a complexidade de algoritmos de ordenação, avalie as afirmativas:

I. O Merge Sort tem complexidade O(n log n) no pior caso.
II. O Quick Sort tem complexidade O(n log n) no pior caso.
III. O Bubble Sort tem complexidade O(n²) no pior caso.
IV. O Insertion Sort executa em tempo O(n) quando o vetor de entrada já está ordenado.

É correto o que se afirma em:',
N'I, III e IV estão corretas. II é falsa: o pior caso do Quick Sort é O(n²), que ocorre quando o pivô escolhido é sempre o menor ou o maior elemento; O(n log n) é o caso médio. Gabarito: B.'),

    (N'Q2023-140', N'sistemas-operacionais', N'Gerência de Processos', 2023, N'médio',
N'No algoritmo de escalonamento Round Robin, o que acontece quando o quantum de tempo é muito grande em relação à duração dos processos?',
N'Com um quantum maior que a duração dos processos, cada processo termina antes de ser preemptado, na ordem de chegada — exatamente o comportamento do FCFS. Um quantum muito pequeno, ao contrário, aumentaria as trocas de contexto. Gabarito: A.'),

    (N'Q2024-51', N'sistemas-operacionais', N'Deadlock', 2024, N'difícil',
N'Para que ocorra um deadlock, quatro condições precisam ser satisfeitas simultaneamente (condições de Coffman). Qual alternativa NÃO é uma dessas condições?',
N'As condições de Coffman são exclusão mútua, posse e espera, não preempção e espera circular. Permitir a preempção de recursos é, na verdade, uma forma de prevenir o deadlock, pois quebra a condição de não preempção. Gabarito: E.')
) AS v (Code, AreaSlug, TopicName, Year, Difficulty, Statement, AiExplanation)
JOIN dbo.Areas a  ON a.Slug = v.AreaSlug
JOIN dbo.Topics t ON t.AreaId = a.Id AND t.Name = v.TopicName
WHERE NOT EXISTS (SELECT 1 FROM dbo.Questions q WHERE q.Code = v.Code);

/* ---- Alternativas ---- */
INSERT INTO dbo.QuestionOptions (QuestionId, Letter, Text, IsCorrect)
SELECT q.Id, v.Letter, v.Text, v.IsCorrect
FROM (VALUES
    (N'Q2021-15', N'a', N'Singleton', CAST(0 AS BIT)),
    (N'Q2021-15', N'b', N'Strategy', CAST(1 AS BIT)),
    (N'Q2021-15', N'c', N'Observer', CAST(0 AS BIT)),
    (N'Q2021-15', N'd', N'Adapter', CAST(0 AS BIT)),
    (N'Q2021-15', N'e', N'Composite', CAST(0 AS BIT)),
    (N'Q2024-34', N'a', N'Primeira forma normal (1FN)', CAST(0 AS BIT)),
    (N'Q2024-34', N'b', N'Segunda forma normal (2FN)', CAST(1 AS BIT)),
    (N'Q2024-34', N'c', N'Terceira forma normal (3FN)', CAST(0 AS BIT)),
    (N'Q2024-34', N'd', N'Forma normal de Boyce-Codd (FNBC)', CAST(0 AS BIT)),
    (N'Q2024-34', N'e', N'Nenhuma — a tabela está normalizada', CAST(0 AS BIT)),
    (N'Q2023-58', N'a', N'Todos os alunos dos cursos que têm mais de 30 alunos.', CAST(0 AS BIT)),
    (N'Q2023-58', N'b', N'Os cursos com mais de 30 alunos e a quantidade de alunos de cada um.', CAST(1 AS BIT)),
    (N'Q2023-58', N'c', N'O total de alunos matriculados em todos os cursos.', CAST(0 AS BIT)),
    (N'Q2023-58', N'd', N'Os 30 primeiros cursos em ordem alfabética.', CAST(0 AS BIT)),
    (N'Q2023-58', N'e', N'Um erro, pois HAVING não pode usar funções de agregação.', CAST(0 AS BIT)),
    (N'Q2022-47', N'a', N'200 OK', CAST(0 AS BIT)),
    (N'Q2022-47', N'b', N'201 Created', CAST(0 AS BIT)),
    (N'Q2022-47', N'c', N'301 Moved Permanently', CAST(0 AS BIT)),
    (N'Q2022-47', N'd', N'404 Not Found', CAST(1 AS BIT)),
    (N'Q2022-47', N'e', N'500 Internal Server Error', CAST(0 AS BIT)),
    (N'Q2023-12', N'a', N'I e II, apenas.', CAST(0 AS BIT)),
    (N'Q2023-12', N'b', N'I e III, apenas.', CAST(1 AS BIT)),
    (N'Q2023-12', N'c', N'II e IV, apenas.', CAST(0 AS BIT)),
    (N'Q2023-12', N'd', N'I, III e IV, apenas.', CAST(0 AS BIT)),
    (N'Q2023-12', N'e', N'I, II, III e IV.', CAST(0 AS BIT)),
    (N'Q2023-201', N'a', N'AND', CAST(0 AS BIT)),
    (N'Q2023-201', N'b', N'OR', CAST(0 AS BIT)),
    (N'Q2023-201', N'c', N'NAND', CAST(0 AS BIT)),
    (N'Q2023-201', N'd', N'XOR', CAST(1 AS BIT)),
    (N'Q2023-201', N'e', N'NOR', CAST(0 AS BIT)),
    (N'Q2024-9', N'a', N'Aprendizado não supervisionado — agrupamento.', CAST(0 AS BIT)),
    (N'Q2024-9', N'b', N'Aprendizado supervisionado — classificação.', CAST(1 AS BIT)),
    (N'Q2024-9', N'c', N'Aprendizado supervisionado — regressão.', CAST(0 AS BIT)),
    (N'Q2024-9', N'd', N'Aprendizado por reforço.', CAST(0 AS BIT)),
    (N'Q2024-9', N'e', N'Redução de dimensionalidade.', CAST(0 AS BIT)),
    (N'Q2021-78', N'a', N'10', CAST(0 AS BIT)),
    (N'Q2021-78', N'b', N'11', CAST(1 AS BIT)),
    (N'Q2021-78', N'c', N'32', CAST(0 AS BIT)),
    (N'Q2021-78', N'd', N'512', CAST(0 AS BIT)),
    (N'Q2021-78', N'e', N'1.024', CAST(0 AS BIT)),
    (N'Q2022-66', N'a', N'I e III, apenas.', CAST(0 AS BIT)),
    (N'Q2022-66', N'b', N'I, III e IV, apenas.', CAST(1 AS BIT)),
    (N'Q2022-66', N'c', N'II e IV, apenas.', CAST(0 AS BIT)),
    (N'Q2022-66', N'd', N'I, II e III, apenas.', CAST(0 AS BIT)),
    (N'Q2022-66', N'e', N'I, II, III e IV.', CAST(0 AS BIT)),
    (N'Q2023-140', N'a', N'O algoritmo passa a se comportar como FCFS (FIFO).', CAST(1 AS BIT)),
    (N'Q2023-140', N'b', N'Ocorre starvation dos processos de menor prioridade.', CAST(0 AS BIT)),
    (N'Q2023-140', N'c', N'O número de trocas de contexto aumenta muito.', CAST(0 AS BIT)),
    (N'Q2023-140', N'd', N'O algoritmo passa a se comportar como SJF.', CAST(0 AS BIT)),
    (N'Q2023-140', N'e', N'O sistema entra em deadlock.', CAST(0 AS BIT)),
    (N'Q2024-51', N'a', N'Exclusão mútua.', CAST(0 AS BIT)),
    (N'Q2024-51', N'b', N'Posse e espera.', CAST(0 AS BIT)),
    (N'Q2024-51', N'c', N'Não preempção.', CAST(0 AS BIT)),
    (N'Q2024-51', N'd', N'Espera circular.', CAST(0 AS BIT)),
    (N'Q2024-51', N'e', N'Preempção de recursos pelo sistema operacional.', CAST(1 AS BIT))
) AS v (Code, Letter, Text, IsCorrect)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.QuestionOptions o WHERE o.QuestionId = q.Id AND o.Letter = v.Letter);

/* ---- Comentários da professora Marcela ---- */
INSERT INTO dbo.TeacherComments (QuestionId, TeacherUserId, Content)
SELECT q.Id, @uMarcela, v.Content
FROM (VALUES
    (N'Q2021-15', N'Sempre que o enunciado falar em trocar um comportamento em tempo de execução sem alterar quem o usa, pense em Strategy. É um dos padrões mais cobrados no ENADE.'),
    (N'Q2024-34', N'Dependência de parte da chave composta = violação da 2FN. Dependência entre atributos não-chave = violação da 3FN. Guarde essa diferença.'),
    (N'Q2023-58', N'WHERE filtra linhas antes do agrupamento; HAVING filtra grupos depois. Por isso funções de agregação aparecem no HAVING, e não no WHERE.'),
    (N'Q2022-47', N'Memorize as famílias: 2xx sucesso, 3xx redirecionamento, 4xx erro do cliente, 5xx erro do servidor.'),
    (N'Q2023-12', N'O UDP é ''enxuto'': sem conexão, sem garantia de entrega e sem controle de congestionamento. Tudo isso é responsabilidade do TCP.'),
    (N'Q2023-201', N'O problema do XOR é histórico: foi ele que motivou o uso de redes com camadas ocultas. Vale desenhar os quatro pontos no plano para visualizar.'),
    (N'Q2024-9', N'Dados rotulados → supervisionado. Saída categórica → classificação; saída numérica contínua → regressão.'),
    (N'Q2021-78', N'A busca binária é O(log n). Cuidado com o +1: o último elemento restante também precisa ser comparado.'),
    (N'Q2022-66', N'O Quick Sort é rápido na prática, mas o pior caso quadrático é uma pegadinha clássica. Já o Merge Sort garante O(n log n) em qualquer caso.'),
    (N'Q2023-140', N'Quantum grande demais vira FCFS; quantum pequeno demais gasta a CPU com trocas de contexto. O desafio do Round Robin é equilibrar os dois.'),
    (N'Q2024-51', N'Para prevenir deadlock basta quebrar uma das quatro condições. A alternativa E descreve justamente uma estratégia de prevenção.')
) AS v (Code, Content)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.TeacherComments tc WHERE tc.QuestionId = q.Id AND tc.TeacherUserId = @uMarcela);

/* ---- Simulados do frontend ---- */
INSERT INTO dbo.MockExams (Title, Description, AreaId, Difficulty, TimeLimitMinutes)
SELECT v.Title, v.Description, a.Id, v.Difficulty, v.TimeLimitMinutes
FROM (VALUES
    (N'Programação e Engenharia de Software', N'Estruturas de controle, orientação a objetos, exceções, padrões de projeto e busca.', N'Engenharia de Software', N'médio', 20),
    (N'Infraestrutura, Redes e Dados', N'Normalização, SQL, protocolos HTTP, camada de transporte e sistemas operacionais.', CAST(NULL AS NVARCHAR(100)), N'médio', 25),
    (N'Simulado Geral ENADE', N'Todas as áreas em uma prova completa, com tempo reduzido para treinar sob pressão real.', CAST(NULL AS NVARCHAR(100)), N'difícil', 40),
    (N'Simulado relâmpago', N'Três questões em apenas 2 minutos. Ótimo para aquecer — e para ver a finalização automática quando o tempo acaba.', CAST(NULL AS NVARCHAR(100)), N'fácil', 2)
) AS v (Title, Description, AreaName, Difficulty, TimeLimitMinutes)
LEFT JOIN dbo.Areas a ON a.Name = v.AreaName
WHERE NOT EXISTS (SELECT 1 FROM dbo.MockExams m WHERE m.Title = v.Title);

INSERT INTO dbo.MockExamQuestions (MockExamId, QuestionId, DisplayOrder)
SELECT m.Id, q.Id, v.DisplayOrder
FROM (VALUES
    (N'Programação e Engenharia de Software', N'Q2023-112', 1),
    (N'Programação e Engenharia de Software', N'Q2024-80', 2),
    (N'Programação e Engenharia de Software', N'Q2022-92', 3),
    (N'Programação e Engenharia de Software', N'Q2021-15', 4),
    (N'Programação e Engenharia de Software', N'Q2021-78', 5),
    (N'Infraestrutura, Redes e Dados', N'Q2024-34', 1),
    (N'Infraestrutura, Redes e Dados', N'Q2023-58', 2),
    (N'Infraestrutura, Redes e Dados', N'Q2022-47', 3),
    (N'Infraestrutura, Redes e Dados', N'Q2023-12', 4),
    (N'Infraestrutura, Redes e Dados', N'Q2023-140', 5),
    (N'Infraestrutura, Redes e Dados', N'Q2024-51', 6),
    (N'Simulado Geral ENADE', N'Q2023-112', 1),
    (N'Simulado Geral ENADE', N'Q2024-80', 2),
    (N'Simulado Geral ENADE', N'Q2022-92', 3),
    (N'Simulado Geral ENADE', N'Q2021-15', 4),
    (N'Simulado Geral ENADE', N'Q2024-34', 5),
    (N'Simulado Geral ENADE', N'Q2023-58', 6),
    (N'Simulado Geral ENADE', N'Q2022-47', 7),
    (N'Simulado Geral ENADE', N'Q2023-12', 8),
    (N'Simulado Geral ENADE', N'Q2023-201', 9),
    (N'Simulado Geral ENADE', N'Q2024-9', 10),
    (N'Simulado Geral ENADE', N'Q2021-78', 11),
    (N'Simulado Geral ENADE', N'Q2022-66', 12),
    (N'Simulado Geral ENADE', N'Q2023-140', 13),
    (N'Simulado Geral ENADE', N'Q2024-51', 14),
    (N'Simulado relâmpago', N'Q2022-47', 1),
    (N'Simulado relâmpago', N'Q2023-58', 2),
    (N'Simulado relâmpago', N'Q2024-9', 3)
) AS v (Title, Code, DisplayOrder)
JOIN dbo.MockExams m ON m.Title = v.Title
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.MockExamQuestions mq WHERE mq.MockExamId = m.Id AND mq.QuestionId = q.Id);

/* -----------------------------------------------------------------------------
   3. Várias anotações por questão (mesmas do front)
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.UserNotes (UserId, QuestionId, Content, CreatedAt, UpdatedAt)
SELECT v.UserId, q.Id, v.Content, x.CreatedAt, x.CreatedAt
FROM (VALUES
    (@uPaula,  N'Q2022-92',  N'Mesmo com return dentro do try, o finally roda antes de sair do método.', 0, 9, 30),
    (@uPaula,  N'Q2024-34',  N'Dependência de PARTE da chave composta = 2FN. Entre não-chaves = 3FN.', -1, 18, 40),
    (@uPaula,  N'Q2024-34',  N'Revisar exemplos de FNBC antes da prova.', 0, 11, 5),
    (@uNicole, N'Q2024-80',  N'C# não tem herança múltipla de CLASSES, só de interfaces. sealed bloqueia herança.', 0, 7, 20),
    (@uNicole, N'Q2023-201', N'XOR não é linearmente separável → precisa de camada oculta.', -1, 22, 15)
) AS v (UserId, Code, Content, DayOffset, LocalHour, LocalMinute)
JOIN dbo.Questions q ON q.Code = v.Code
-- Hora local de Brasília convertida para UTC (+3h).
CROSS APPLY (SELECT DATEADD(MINUTE, v.LocalMinute, DATEADD(HOUR, v.LocalHour + 3,
             CAST(DATEADD(DAY, v.DayOffset, @today) AS DATETIME2(3)))) AS CreatedAt) x
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.UserNotes n
    WHERE n.UserId = v.UserId AND n.QuestionId = q.Id AND n.Content = v.Content
);

/* -----------------------------------------------------------------------------
   4. Agenda de mentoria (horários relativos ao dia da execução)
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.TeacherAvailabilitySlots (TeacherUserId, SessionType, Topic, StartsAt, DurationMinutes, Capacity)
SELECT v.TeacherUserId, v.SessionType, v.Topic, x.StartsAt, v.DurationMinutes, v.Capacity
FROM (VALUES
    (@uMarcela, N'mentoria', N'Estruturas de controle em C#',                 -2, 19,  0, 60, 30),
    (@uMarcela, N'mentoria', N'Revisão de Orientação a Objetos',               1, 19,  0, 60, 30),
    (@uRicardo, N'mentoria', N'Redes: camada de transporte',                   3, 20,  0, 60, 30),
    (@uMarcela, N'mentoria', N'Padrões de projeto na prática',                 6, 19,  0, 60, 30),
    (@uRicardo, N'mentoria', N'Banco de dados: normalização',                 10, 19, 30, 60, 30),
    (@uMarcela, N'mentoria', N'Simulado comentado ao vivo',                   15, 19,  0, 90, 40),
    (@uMarcela, N'grupo',    N'Trilha Eng. de Software — semana 1',            2, 18,  0, 90,  8),
    (@uRicardo, N'grupo',    N'Trilha Infraestrutura — sistemas operacionais', 5, 18,  0, 90,  8),
    (@uMarcela, N'grupo',    N'Trilha Eng. de Software — semana 2',            9, 18,  0, 90,  8),
    (@uRicardo, N'grupo',    N'Trilha Infraestrutura — redes',                12, 10,  0, 90,  8),
    (@uMarcela, N'grupo',    N'Trilha Eng. de Software — semana 3',           16, 18,  0, 90,  8)
) AS v (TeacherUserId, SessionType, Topic, DayOffset, LocalHour, LocalMinute, DurationMinutes, Capacity)
CROSS APPLY (SELECT DATEADD(MINUTE, v.LocalMinute, DATEADD(HOUR, v.LocalHour + 3,
             CAST(DATEADD(DAY, v.DayOffset, @today) AS DATETIME2(3)))) AS StartsAt) x
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.TeacherAvailabilitySlots s
    WHERE s.TeacherUserId = v.TeacherUserId AND s.SessionType = v.SessionType AND s.Topic = v.Topic
);

-- Solicitações da Nicole (Premium): uma confirmada e uma aguardando o professor.
INSERT INTO dbo.MentoringRequests (SlotId, StudentUserId, Message, Status, RespondedAt)
SELECT s.Id, @uNicole, v.Message, v.Status, CASE WHEN v.Status = N'pendente' THEN NULL ELSE @now END
FROM (VALUES
    (N'Revisão de Orientação a Objetos',    N'Quero revisar polimorfismo.', N'confirmada'),
    (N'Trilha Eng. de Software — semana 1', CAST(NULL AS NVARCHAR(500)),   N'pendente')
) AS v (Topic, Message, Status)
JOIN dbo.TeacherAvailabilitySlots s ON s.Topic = v.Topic AND s.TeacherUserId = @uMarcela
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.MentoringRequests r WHERE r.SlotId = s.Id AND r.StudentUserId = @uNicole
);

COMMIT TRANSACTION;
PRINT N'07_seed_frontend.sql concluído.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

SELECT 'Questions' AS Tabela, COUNT(*) AS Registros FROM dbo.Questions
UNION ALL SELECT 'QuestionOptions',          COUNT(*) FROM dbo.QuestionOptions
UNION ALL SELECT 'Topics',                   COUNT(*) FROM dbo.Topics
UNION ALL SELECT 'TeacherComments',          COUNT(*) FROM dbo.TeacherComments
UNION ALL SELECT 'MockExams',                COUNT(*) FROM dbo.MockExams
UNION ALL SELECT 'MockExamQuestions',        COUNT(*) FROM dbo.MockExamQuestions
UNION ALL SELECT 'UserNotes',                COUNT(*) FROM dbo.UserNotes
UNION ALL SELECT 'TeacherAvailabilitySlots', COUNT(*) FROM dbo.TeacherAvailabilitySlots
UNION ALL SELECT 'MentoringRequests',        COUNT(*) FROM dbo.MentoringRequests;
GO
