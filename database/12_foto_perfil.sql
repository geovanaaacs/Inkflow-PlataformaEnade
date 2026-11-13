/* =============================================================================
   Inkflow — 12_foto_perfil.sql
   Foto de perfil: a coluna Users.PhotoUrl passa a guardar a imagem como
   data URL (data:image/jpeg;base64,...), já reduzida pelo app para 256 x 256.
   Assim a foto fica no banco e aparece em qualquer computador que rode a API,
   sem depender de um serviço de arquivos.

   Pré-requisito: 01–11.
   Idempotente: só altera a coluna se ela ainda não for NVARCHAR(MAX).
   ============================================================================= */

USE Inkflow;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = N'PhotoUrl' AND max_length <> -1
)
    ALTER TABLE dbo.Users ALTER COLUMN PhotoUrl NVARCHAR(MAX) NULL;
GO
