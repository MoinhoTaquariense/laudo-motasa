const router = require('express').Router();
const db = require('../config/database');

router.get('/', async (_req, res) => {
  try { res.json((await db.query('SELECT id, codigo, nome FROM clientes ORDER BY nome, codigo')).rows); }
  catch (e) { res.status(500).json({ error: 'Não foi possível carregar os clientes.' }); }
});

function validar(body) {
  const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : '';
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  return codigo && codigo.length <= 100 && nome && nome.length <= 200 ? { codigo, nome } : null;
}
async function salvar(req, res, atualizar) {
  const dados = validar(req.body);
  if (!dados || (atualizar && !/^\d+$/.test(req.params.id))) return res.status(400).json({ error: 'Informe código e nome válidos.' });
  try {
    const result = atualizar
      ? await db.query('UPDATE clientes SET codigo=$1,nome=$2 WHERE id=$3 RETURNING id,codigo,nome', [dados.codigo, dados.nome, req.params.id])
      : await db.query('INSERT INTO clientes (codigo,nome) VALUES ($1,$2) RETURNING id,codigo,nome', [dados.codigo, dados.nome]);
    if (!result.rowCount) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.status(atualizar ? 200 : 201).json(result.rows[0]);
  } catch (e) { res.status(e.code === '23505' ? 409 : 500).json({ error: e.code === '23505' ? 'Já existe um cliente com este código.' : 'Não foi possível salvar o cliente.' }); }
}
router.post('/', (req, res) => salvar(req, res, false));
router.put('/:id', (req, res) => salvar(req, res, true));
router.delete('/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Cliente inválido.' });
  try { const result = await db.query('DELETE FROM clientes WHERE id=$1', [req.params.id]); if (!result.rowCount) return res.status(404).json({ error: 'Cliente não encontrado.' }); res.status(204).end(); }
  catch (e) { res.status(500).json({ error: 'Não foi possível excluir o cliente.' }); }
});
module.exports = router;
