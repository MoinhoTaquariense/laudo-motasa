const db = require('../config/database');

const findByTabela = async (tabela_id) => {
  const { rows } = await db.query(
    'SELECT * FROM elementos WHERE tabela_id = $1 AND ativo = TRUE ORDER BY id',
    [tabela_id]
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM elementos WHERE id = $1', [id]);
  return rows[0] || null;
};

const create = async ({ tabela_id, nome, posicao, formato }) => {
  const { rows } = await db.query(
    'INSERT INTO elementos (tabela_id, nome, posicao, formato) VALUES ($1, $2, $3, $4) RETURNING *',
    [tabela_id, nome, posicao, formato]
  );
  return rows[0];
};

const update = async (id, { nome, posicao, formato, tabela_id }) => {
  const fields = [];
  const values = [];
  let i = 1;
  if (nome      !== undefined) { fields.push(`nome = $${i++}`);      values.push(nome); }
  if (posicao   !== undefined) { fields.push(`posicao = $${i++}`);   values.push(posicao); }
  if (formato   !== undefined) { fields.push(`formato = $${i++}`);   values.push(formato); }
  if (tabela_id !== undefined) { fields.push(`tabela_id = $${i++}`); values.push(tabela_id); }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const { rows } = await db.query(
    `UPDATE elementos SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] || null;
};

const remove = async (id) => {
  await db.query('DELETE FROM elementos WHERE id = $1', [id]);
};

module.exports = { findByTabela, findById, create, update, remove };
