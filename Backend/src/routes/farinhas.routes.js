const router = require('express').Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.query.tabela_id || ''))) return res.status(400).json({ error: 'Selecione uma tabela.' });
    const { rows } = await db.query('SELECT id, tabela_id, nome, produto FROM farinhas WHERE tabela_id=$1 ORDER BY nome', [req.query.tabela_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const produto = typeof req.body.produto === 'string' ? req.body.produto.trim() : '';
  const tabela = Number(req.body.tabela_id);
  if (!nome || nome.length > 200 || produto.length > 200 || !Number.isInteger(tabela) || tabela < 1) return res.status(400).json({ error: 'Informe uma tabela e um nome de farinha válido.' });
  try {
    const { rows } = await db.query('INSERT INTO farinhas (tabela_id,nome,produto) VALUES ($1,$2,$3) RETURNING id,tabela_id,nome,produto', [tabela,nome,produto || null]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(e.code === '23505' ? 409 : e.code === '23503' ? 404 : 500).json({ error: e.code === '23505' ? 'Esta farinha já está cadastrada nesta tabela.' : e.code === '23503' ? 'Tabela não encontrada.' : e.message });
  }
});

router.put('/:id', async (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  if (!nome || nome.length > 200 || !/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Informe um nome de farinha válido.' });
  const produto = typeof req.body.produto === 'string' ? req.body.produto.trim() : undefined;
  if (produto !== undefined && produto.length > 200) return res.status(400).json({ error: 'Nome do produto muito longo.' });
  const client = await db.connect().catch(() => null);
  if (!client) return res.status(503).json({ error: 'Não foi possível acessar o banco.' });
  try {
    await client.query('BEGIN');
    const current = (await client.query('SELECT * FROM farinhas WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!current) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Farinha não encontrada.' }); }
    const changed = (await client.query('UPDATE farinhas SET nome=$1, produto=$2 WHERE id=$3 RETURNING id,tabela_id,nome,produto', [nome, produto === undefined ? current.produto : (produto || null), current.id])).rows[0];
    await client.query(`UPDATE intervalos i SET farinha=$1 FROM elementos e WHERE e.id=i.elemento_id AND e.tabela_id=$2 AND lower(trim(i.farinha))=lower(trim($3))`, [nome,current.tabela_id,current.nome]);
    await client.query('UPDATE laudos_gerados SET farinha=$1 WHERE tabela_id=$2 AND lower(trim(farinha))=lower(trim($3))', [nome,current.tabela_id,current.nome]);
    await client.query('COMMIT'); res.json(changed);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(e.code === '23505' ? 409 : 500).json({ error: e.code === '23505' ? 'Este nome já existe ou há laudos com nomes duplicados; revise os dados antes de renomear.' : e.message });
  } finally { client.release(); }
});

router.delete('/:id', async (req, res) => {
  const client = await db.connect().catch(() => null);
  if (!client) return res.status(503).json({ error: 'Não foi possível acessar o banco.' });
  try {
    await client.query('BEGIN');
    const current = (await client.query('SELECT * FROM farinhas WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!current) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Farinha não encontrada.' }); }
    const used = await client.query(`SELECT EXISTS(
      SELECT 1 FROM intervalos i JOIN elementos e ON e.id=i.elemento_id WHERE e.tabela_id=$1 AND lower(trim(i.farinha))=lower(trim($2))
      UNION ALL SELECT 1 FROM laudos_gerados WHERE tabela_id=$1 AND lower(trim(farinha))=lower(trim($2))
    ) AS usado`, [current.tabela_id,current.nome]);
    if (used.rows[0].usado) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Esta farinha possui intervalos ou laudos e não pode ser excluída.' }); }
    await client.query('DELETE FROM farinhas WHERE id=$1', [current.id]);
    await client.query('COMMIT'); res.status(204).end();
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
module.exports = router;
