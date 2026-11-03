const db = require('../config/database');

const findAll = async () => {
  const { rows } = await db.query('SELECT * FROM examples ORDER BY id');
  return rows;
};

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM examples WHERE id = $1', [id]);
  return rows[0] || null;
};

const create = async (body) => {
  const { name, description } = body;
  const { rows } = await db.query(
    'INSERT INTO examples (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  );
  return rows[0];
};

const update = async (id, body) => {
  const { name, description } = body;
  const { rows } = await db.query(
    'UPDATE examples SET name = $1, description = $2 WHERE id = $3 RETURNING *',
    [name, description, id]
  );
  return rows[0] || null;
};

const remove = async (id) => {
  await db.query('DELETE FROM examples WHERE id = $1', [id]);
};

module.exports = { findAll, findById, create, update, remove };
