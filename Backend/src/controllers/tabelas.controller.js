const svc = require('../services/tabelas.service');

const getAll = async (req, res) => {
  try { res.json(await svc.findAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

const getById = async (req, res) => {
  try {
    const data = await svc.findById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Tabela não encontrada' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const create = async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Campo "nome" obrigatório' });
    res.status(201).json(await svc.create({ nome }));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const clonar = async (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  if (!/^\d+$/.test(req.params.id) || !nome || nome.length > 200)
    return res.status(400).json({ error: 'Informe uma tabela e um nome válido para a cópia.' });
  try {
    const copia = await svc.clonar(req.params.id, nome);
    if (!copia) return res.status(404).json({ error: 'Tabela de origem não encontrada.' });
    res.status(201).json(copia);
  } catch (err) { res.status(500).json({ error: 'Não foi possível clonar a tabela.' }); }
};

const update = async (req, res) => {
  try {
    const data = await svc.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ error: 'Tabela não encontrada' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const remove = async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Tabela inválida.' });
  try { if (!await svc.remove(req.params.id)) return res.status(404).json({ error: 'Tabela não encontrada.' }); res.status(204).send(); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getAll, getById, create, clonar, update, remove };
