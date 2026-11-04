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

module.exports = { findAll, findById, create, update, remove };
