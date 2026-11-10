/* =============================================================================
   Inkflow — 10_pagamentos.sql
   Pagamentos dos planos, para o app desktop de administração:
     - tabela dbo.Payments: cada assinatura paga gera um pagamento aprovado
       com valor, forma (cartão ou Pix) e só os 4 últimos dígitos do cartão
       (o número completo nunca chega ao servidor: o checkout é simulado)
     - histórico: as assinaturas pagas que já existiam ganham um pagamento
       com a forma "legado" (registradas antes desta tabela existir)

   Pré-requisito: 01–09.
   Idempotente: a tabela, as constraints e o histórico só são criados se ainda
   não existirem.
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
CREATE TABLE dbo.Payments (
    Id             INT IDENTITY(1,1) NOT NULL,
    UserId         UNIQUEIDENTIFIER  NOT NULL,
    PlanId         INT               NOT NULL,
    SubscriptionId INT               NOT NULL,
    Amount         DECIMAL(10,2)     NOT NULL,
    Method         NVARCHAR(10)      NOT NULL,  -- 'cartao' | 'pix' | 'legado'
    CardLast4      NCHAR(4)          NULL,      -- só para cartão
    Status         NVARCHAR(15)      NOT NULL,  -- 'aprovado' (checkout simulado)
    PaidAt         DATETIME2(3)      NOT NULL,
    CreatedAt      DATETIME2(3)      NOT NULL,
    UpdatedAt      DATETIME2(3)      NOT NULL,
    CONSTRAINT PK_Payments PRIMARY KEY (Id),
    CONSTRAINT FK_Payments_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_Payments_Plans FOREIGN KEY (PlanId) REFERENCES dbo.Plans (Id),
    CONSTRAINT FK_Payments_Subscriptions FOREIGN KEY (SubscriptionId) REFERENCES dbo.Subscriptions (Id),
    CONSTRAINT CK_Payments_Amount CHECK (Amount > 0),
    CONSTRAINT CK_Payments_Method CHECK (Method IN (N'cartao', N'pix', N'legado')),
    CONSTRAINT CK_Payments_CardLast4 CHECK (
        (Method = N'cartao' AND CardLast4 LIKE N'[0-9][0-9][0-9][0-9]')
        OR (Method <> N'cartao' AND CardLast4 IS NULL)
    ),
    CONSTRAINT CK_Payments_Status CHECK (Status IN (N'aprovado', N'estornado'))
);
GO

IF OBJECT_ID(N'dbo.DF_Payments_Status', N'D') IS NULL
    ALTER TABLE dbo.Payments ADD CONSTRAINT DF_Payments_Status DEFAULT (N'aprovado') FOR Status;
IF OBJECT_ID(N'dbo.DF_Payments_PaidAt', N'D') IS NULL
    ALTER TABLE dbo.Payments ADD CONSTRAINT DF_Payments_PaidAt DEFAULT (SYSUTCDATETIME()) FOR PaidAt;
IF OBJECT_ID(N'dbo.DF_Payments_CreatedAt', N'D') IS NULL
    ALTER TABLE dbo.Payments ADD CONSTRAINT DF_Payments_CreatedAt DEFAULT (SYSUTCDATETIME()) FOR CreatedAt;
IF OBJECT_ID(N'dbo.DF_Payments_UpdatedAt', N'D') IS NULL
    ALTER TABLE dbo.Payments ADD CONSTRAINT DF_Payments_UpdatedAt DEFAULT (SYSUTCDATETIME()) FOR UpdatedAt;
GO

-- Listagem do admin (mais recentes primeiro) e somatórios por período.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Payments_PaidAt' AND object_id = OBJECT_ID(N'dbo.Payments'))
    CREATE NONCLUSTERED INDEX IX_Payments_PaidAt ON dbo.Payments (PaidAt DESC) INCLUDE (UserId, PlanId, Amount, Method, Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Payments_UserId' AND object_id = OBJECT_ID(N'dbo.Payments'))
    CREATE NONCLUSTERED INDEX IX_Payments_UserId ON dbo.Payments (UserId);
GO

/* Histórico: assinaturas pagas que ainda não têm pagamento ---------------- */
INSERT INTO dbo.Payments (UserId, PlanId, SubscriptionId, Amount, Method, CardLast4, Status, PaidAt)
SELECT s.UserId, s.PlanId, s.Id, s.Price, N'legado', NULL, N'aprovado', s.StartedAt
FROM dbo.Subscriptions s
WHERE s.Price > 0
  AND NOT EXISTS (SELECT 1 FROM dbo.Payments p WHERE p.SubscriptionId = s.Id);
GO

/* Conferência */
SELECT p.Method, COUNT(*) AS Pagamentos, SUM(p.Amount) AS Total
FROM dbo.Payments p
GROUP BY p.Method;
GO
