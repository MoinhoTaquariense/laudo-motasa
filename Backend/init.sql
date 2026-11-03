-- ============================================================
-- BANCO DE DADOS - PR Projeto
-- PostgreSQL
-- Gerado com base na análise do frontend
-- ============================================================

-- ============================================================
-- 1. TABELAS (configurar.tsx)
--    Representa os templates de planilha configuráveis.
-- ============================================================
CREATE TABLE IF NOT EXISTS tabelas (
  id        SERIAL PRIMARY KEY,
  nome      VARCHAR(200) NOT NULL,
  dtcriaco  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. ELEMENTOS (elementos.tsx)
--    Cada tabela possui N elementos (campos da planilha).
--    Tipos:
--      1 = Porcentagem
--      2 = Inteiro
--      3 = Decimal
--      4 = Num + Texto
--      5 = Texto + Potencia
--      6 = Texto
--      7 = Tempo (00:00)
-- ============================================================
CREATE TABLE IF NOT EXISTS elementos (
  id         SERIAL PRIMARY KEY,
  tabela_id  INTEGER NOT NULL REFERENCES tabelas(id) ON DELETE CASCADE,
  nome       VARCHAR(200) NOT NULL,
  posicao    VARCHAR(20)  NOT NULL,   -- Ex: G12, I34, D2
  formato    SMALLINT     NOT NULL    -- 1..7 conforme mapeamento acima
                          CHECK (formato BETWEEN 1 AND 7),
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elementos_tabela ON elementos(tabela_id);

-- ============================================================
-- 3. INTERVALOS (intervalos.tsx)
--    Regras numéricas por elemento/cliente/produto.
--    Usado para tipos 1 (Porcentagem), 2 (Inteiro), 3 (Decimal), 7 (Tempo).
--    valorMin e valorMax definem o intervalo aceito.
-- ============================================================
CREATE TABLE IF NOT EXISTS intervalos (
  id          SERIAL PRIMARY KEY,
  elemento_id INTEGER NOT NULL REFERENCES elementos(id) ON DELETE CASCADE,
  cliente     VARCHAR(200) NOT NULL,
  produto     VARCHAR(200) NOT NULL,
  valormin    NUMERIC(18, 6) NOT NULL,
  valormax    NUMERIC(18, 6) NOT NULL,
  vmin_str    VARCHAR(50),
  vmax_str    VARCHAR(50),
  ativo       BOOLEAN   NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_intervalo_ordem CHECK (valormax > valormin)
);

CREATE INDEX IF NOT EXISTS idx_intervalos_elemento  ON intervalos(elemento_id);
CREATE INDEX IF NOT EXISTS idx_intervalos_cliente   ON intervalos(cliente);
CREATE INDEX IF NOT EXISTS idx_intervalos_produto   ON intervalos(produto);

-- ============================================================
-- 4. USUARIOS (login.tsx)
--    Autenticação básica de usuários.
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(200) NOT NULL UNIQUE,
  senha_hash VARCHAR(300) NOT NULL,
  ativo      BOOLEAN   NOT NULL DEFAULT TRUE,
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================

