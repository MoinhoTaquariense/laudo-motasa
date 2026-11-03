const db = require('../config/database');

const findByElemento = async (elemento_id) => {
  const { rows } = await db.query(
    'SELECT * FROM intervalos WHERE elemento_id = $1 AND ativo = TRUE ORDER BY id',
    [elemento_id]
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM intervalos WHERE id = $1', [id]);
  return rows[0] || null;
};

const create = async ({ elemento_id, farinha, valorMin, valorMax, vmin_str, vmax_str, passo_meio }) => {
  const { rows } = await db.query(
    `INSERT INTO intervalos (elemento_id, cliente, produto, farinha, valormin, valormax, vmin_str, vmax_str, passo_meio)
     VALUES ($1, '', $2::text, $2::text, $3, $4, $5, $6, $7) RETURNING *`,
    [elemento_id, farinha, valorMin, valorMax, vmin_str, vmax_str, passo_meio ?? false]
  );
  return rows[0];
};

const update = async (id, { farinha, valorMin, valorMax, vmin_str, vmax_str, passo_meio }) => {
  const fields = [];
  const values = [];
  let i = 1;
  if (farinha     !== undefined) { fields.push(`farinha = $${i++}`);     values.push(farinha); }
  if (valorMin    !== undefined) { fields.push(`valormin = $${i++}`);    values.push(valorMin); }
  if (valorMax    !== undefined) { fields.push(`valormax = $${i++}`);    values.push(valorMax); }
  if (vmin_str    !== undefined) { fields.push(`vmin_str = $${i++}`);    values.push(vmin_str); }
  if (vmax_str    !== undefined) { fields.push(`vmax_str = $${i++}`);    values.push(vmax_str); }
  if (passo_meio !== undefined) { fields.push(`passo_meio = $${i++}`); values.push(passo_meio); }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const { rows } = await db.query(
    `UPDATE intervalos SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] || null;
};

const remove = async (id) => {
  await db.query('DELETE FROM intervalos WHERE id = $1', [id]);
};

module.exports = { findByElemento, findById, create, update, remove };
