-- Mantém os cadastros existentes. Produtos antigos tornam-se nomes de farinha;
-- intervalos repetidos devem ser revisados antes da geração.
ALTER TABLE tabelas ADD COLUMN IF NOT EXISTS modelo_excel BYTEA;
ALTER TABLE tabelas ADD COLUMN IF NOT EXISTS modelo_nome TEXT;
ALTER TABLE tabelas ADD COLUMN IF NOT EXISTS celulas JSONB NOT NULL DEFAULT '{"cliente":"C5","produto":"C6","lote":"C8","validade":"C9","emissao":"G9"}'::jsonb;
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(100) NOT NULL CHECK (trim(codigo) <> ''),
  nome VARCHAR(200) NOT NULL CHECK (trim(nome) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS clientes_codigo_unico ON clientes (lower(trim(codigo)));
ALTER TABLE elementos DROP CONSTRAINT IF EXISTS elementos_formato_check;
ALTER TABLE elementos ADD CONSTRAINT elementos_formato_check CHECK (formato BETWEEN 1 AND 8);
ALTER TABLE intervalos ADD COLUMN IF NOT EXISTS farinha TEXT;
ALTER TABLE intervalos ADD COLUMN IF NOT EXISTS passo_meio BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE intervalos ADD COLUMN IF NOT EXISTS vmin_str VARCHAR(50);
ALTER TABLE intervalos ADD COLUMN IF NOT EXISTS vmax_str VARCHAR(50);
UPDATE intervalos SET farinha = produto WHERE farinha IS NULL AND produto IS NOT NULL;
CREATE TABLE IF NOT EXISTS laudos_gerados (
  id SERIAL PRIMARY KEY,
  tabela_id INTEGER NOT NULL REFERENCES tabelas(id) ON DELETE CASCADE,
  farinha TEXT NOT NULL,
  lote DATE NOT NULL,
  valores JSONB NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tabela_id, farinha, lote)
);
CREATE TABLE IF NOT EXISTS farinhas (
  id SERIAL PRIMARY KEY,
  tabela_id INTEGER NOT NULL REFERENCES tabelas(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL CHECK (trim(nome) <> ''),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE farinhas ADD COLUMN IF NOT EXISTS produto VARCHAR(200);
CREATE UNIQUE INDEX IF NOT EXISTS farinhas_nome_unico ON farinhas (tabela_id, lower(trim(nome)));
INSERT INTO farinhas (tabela_id, nome)
SELECT tabela_id, MIN(trim(nome))
FROM (
  SELECT e.tabela_id, i.farinha AS nome FROM intervalos i JOIN elementos e ON e.id=i.elemento_id
  UNION ALL
  SELECT tabela_id, farinha AS nome FROM laudos_gerados
) existentes
WHERE nome IS NOT NULL AND trim(nome) <> ''
GROUP BY tabela_id, lower(trim(nome))
ON CONFLICT DO NOTHING;
