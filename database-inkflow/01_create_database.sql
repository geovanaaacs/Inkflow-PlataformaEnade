/* =============================================================================
   Inkflow — 01_create_database.sql
   Cria o banco de dados Inkflow.

   Collation: Latin1_General_CI_AI
     - CI (case-insensitive): "Banco" = "banco"
     - AI (accent-insensitive): "Exceções" = "excecoes"
   Mantém a busca por palavra-chave com o mesmo comportamento do front-end.

   Idempotente: só cria o banco se ele ainda não existir.
   ============================================================================= */

USE master;
GO

IF DB_ID(N'Inkflow') IS NULL
BEGIN
    CREATE DATABASE Inkflow COLLATE Latin1_General_CI_AI;
    PRINT N'Banco Inkflow criado.';
END
ELSE
BEGIN
    PRINT N'Banco Inkflow já existe — nada a fazer.';

    IF DATABASEPROPERTYEX(N'Inkflow', 'Collation') <> N'Latin1_General_CI_AI'
        PRINT N'ATENÇÃO: o banco existente usa a collation '
            + CONVERT(NVARCHAR(128), DATABASEPROPERTYEX(N'Inkflow', 'Collation'))
            + N' em vez de Latin1_General_CI_AI.';
END
GO
