const db = require('../config/database');

const findAll = async () => {
  const { rows } = await db.query('SELECT id, nome, dtcriaco, modelo_nome, celulas FROM tabelas ORDER BY id');
  return rows;
};

const findById = async (id) => {
  const { rows } = await db.query('SELECT id, nome, dtcriaco, modelo_nome, celulas FROM tabelas WHERE id = $1', [id]);
  return rows[0] || null;
};

const create = async ({ nome }) => {
  const { rows } = await db.query(
    'INSERT INTO tabelas (nome) VALUES ($1) RETURNING id, nome, dtcriaco, modelo_nome, celulas',
    [nome]
  );
  return rows[0];
};

const clonar = async (id, nome) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const origem = (await client.query('SELECT id FROM tabelas WHERE id=$1 FOR SHARE', [id])).rows[0];
    if (!origem) { await client.query('ROLLBACK'); return null; }
    const copia = (await client.query(`INSERT INTO tabelas (nome, modelo_excel, modelo_nome, celulas)
      SELECT $1, modelo_excel, modelo_nome, celulas FROM tabelas WHERE id=$2
      RETURNING id, nome, dtcriaco, modelo_nome, celulas`, [nome, id])).rows[0];
    await client.query(`INSERT INTO farinhas (tabela_id, nome, produto)
      SELECT $1, nome, produto FROM farinhas WHERE tabela_id=$2`, [copia.id, id]);
    const elementos = (await client.query('SELECT id FROM elementos WHERE tabela_id=$1 ORDER BY id', [id])).rows;
    for (const elemento of elementos) {
      const novo = (await client.query(`INSERT INTO elementos (tabela_id, nome, posicao, formato, ativo)
        SELECT $1, nome, posicao, formato, ativo FROM elementos WHERE id=$2 RETURNING id`, [copia.id, elemento.id])).rows[0];
      await client.query(`INSERT INTO intervalos (elemento_id, cliente, produto, farinha, valormin, valormax, vmin_str, vmax_str, ativo, passo_meio, passo_cinco_segundos)
        SELECT $1, cliente, produto, farinha, valormin, valormax, vmin_str, vmax_str, ativo, passo_meio, passo_cinco_segundos
        FROM intervalos WHERE elemento_id=$2`, [novo.id, elemento.id]);
    }
    await client.query('COMMIT');
    return copia;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally { client.release(); }
};

const update = async (id, { nome }) => {
  const { rows } = await db.query(
    'UPDATE tabelas SET nome = $1 WHERE id = $2 RETURNING id, nome, dtcriaco, modelo_nome, celulas',
    [nome, id]
  );
  return rows[0] || null;
};

const remove = async (id) => {
  const result = await db.query('DELETE FROM tabelas WHERE id = $1', [id]);
  return result.rowCount > 0;
};

module.exports = { findAll, findById, create, clonar, update, remove };
