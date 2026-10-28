/* =============================================================================
   Inkflow — 08_alinhar_planos.sql
   Ajustes para o front passar a ler os planos da API (GET /api/plans):
     - ordem de exibição Básico → Avançado → Premium (cada plano inclui o anterior)
     - benefícios com o mesmo texto que a página de Planos já mostrava,
       incluindo o "Tudo do plano ..." no início do Avançado e do Premium
     - equipe (professor e admin) sem assinatura ativa: os recursos deles vêm
       do perfil, não de um plano (o seed tinha uma assinatura Básico para a
       professora Marcela)

   Pré-requisito: 01–07.
   Idempotente: os benefícios dos três planos são regravados a cada execução.
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

DECLARE @now DATETIME2(3) = SYSUTCDATETIME();

/* 1. Ordem dos planos ------------------------------------------------------ */
UPDATE dbo.Plans
SET DisplayOrder = CASE Slug WHEN N'basico' THEN 1 WHEN N'avancado' THEN 2 WHEN N'premium' THEN 3 END,
    UpdatedAt    = @now
WHERE Slug IN (N'basico', N'avancado', N'premium')
  AND DisplayOrder <> CASE Slug WHEN N'basico' THEN 1 WHEN N'avancado' THEN 2 WHEN N'premium' THEN 3 END;

/* 2. Benefícios ------------------------------------------------------------ */
DECLARE @benefits TABLE (Slug NVARCHAR(30) NOT NULL, DisplayOrder INT NOT NULL, Description NVARCHAR(300) NOT NULL);
INSERT INTO @benefits (Slug, DisplayOrder, Description) VALUES
  (N'basico',   1, N'Resolva até 10 questões por dia no seu ritmo'),
  (N'basico',   2, N'Gabaritos comentados por professores e colegas'),
  (N'basico',   3, N'Feedback instantâneo com IA para corrigir erros na hora'),
  (N'basico',   4, N'Ranking Geral em tempo real com as questões que você responde'),
  (N'avancado', 1, N'Tudo do plano Básico'),
  (N'avancado', 2, N'Questões ilimitadas para praticar sempre que quiser'),
  (N'avancado', 3, N'Bloco de anotações individual para organizar seus estudos'),
  (N'avancado', 4, N'Histórico completo de acertos e erros'),
  (N'premium',  1, N'Tudo do plano Avançado'),
  (N'premium',  2, N'Mentoria coletiva e grupo de estudo com especialista'),
  (N'premium',  3, N'Simulados com timer para treinar em condições reais de prova'),
  (N'premium',  4, N'Grupo exclusivo no WhatsApp: especialista define o que e a ordem para estudar'),
  (N'premium',  5, N'Acesso ao Ranking dos Simulados: acompanhe sua evolução e sua posição nos simulados');

DELETE pb
FROM dbo.PlanBenefits pb
JOIN dbo.Plans p ON p.Id = pb.PlanId
WHERE p.Slug IN (SELECT Slug FROM @benefits);

INSERT INTO dbo.PlanBenefits (PlanId, Description, DisplayOrder, CreatedAt, UpdatedAt)
SELECT p.Id, b.Description, b.DisplayOrder, @now, @now
FROM @benefits b
JOIN dbo.Plans p ON p.Slug = b.Slug;

/* 3. Equipe sem assinatura ativa ------------------------------------------- */
UPDATE s
SET Status = N'cancelada', CanceledAt = @now, UpdatedAt = @now
FROM dbo.Subscriptions s
JOIN dbo.Users u ON u.Id = s.UserId
WHERE s.Status = N'ativa' AND u.Role <> N'aluno';

COMMIT TRANSACTION;
PRINT N'08_alinhar_planos: planos e benefícios alinhados ao front.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO
