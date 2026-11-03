-- Tabela de configurações para substituição de valores na planilha
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PARAMETROS_PR]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PARAMETROS_PR] (
        id INT PRIMARY KEY IDENTITY(1,1),
        campo VARCHAR(100) NOT NULL,
        tipo CHAR(1) NOT NULL CHECK(tipo IN ('P', 'N', 'T')),
        min_valor FLOAT,
        max_valor FLOAT,
        texto NVARCHAR(MAX),
        posicao VARCHAR(10) NOT NULL,
        template NVARCHAR(MAX),
        expoente VARCHAR(50),
        planilha_base_ref INT,
        codpar INT,
        ativo BIT DEFAULT 1,
        criado_em DATETIME DEFAULT GETDATE(),
        atualizado_em DATETIME DEFAULT GETDATE()
    );
END
GO

-- Inserindo as configurações atuais
INSERT INTO PARAMETROS_PR (campo, tipo, min_valor, max_valor, posicao) 
VALUES ('Umidade', 'P', 13.01, 16, 'G12');

INSERT INTO PARAMETROS_PR (campo, tipo, min_valor, max_valor, posicao) 
VALUES ('Cinzas', 'N', 0.00, 1.0, 'G13');

INSERT INTO PARAMETROS_PR (campo, tipo, min_valor, max_valor, posicao) 
VALUES ('GlutenU', 'P', 50.0, 51.0, 'G14');

INSERT INTO PARAMETROS_PR (campo, tipo, min_valor, max_valor, posicao, template) 
VALUES ('teste', 'N', 4, 10, 'G43', N'{V1} à {V2} mg /100g de farinha');

INSERT INTO PARAMETROS_PR (campo, tipo, min_valor, max_valor, posicao, template, expoente) 
VALUES ('Escherichia', 'N', 3, 10, 'I34', N'Máx. {V1} x 10', '{V2}');

INSERT INTO PARAMETROS_PR (campo, tipo, texto, posicao) 
VALUES ('nome', 'T', N'Vitor', 'D2');

-- Consulta para verificar os dados
SELECT * FROM PARAMETROS_PR WHERE ativo = 1;

-- Adicionando coluna CODCLIENTE
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PARAMETROS_PR]') AND name = 'CODCLIENTE')
BEGIN
    ALTER TABLE PARAMETROS_PR ADD CODCLIENTE INT NULL;
END
GO

-- Adicionando coluna CODPROD
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PARAMETROS_PR]') AND name = 'CODPROD')
BEGIN
    ALTER TABLE PARAMETROS_PR ADD CODPROD INT NULL;
END
GO
