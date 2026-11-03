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

const update = async (req, res) => {
  try {
    const data = await svc.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ error: 'Tabela não encontrada' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const remove = async (req, res) => {
  try { await svc.remove(req.params.id); res.status(204).send(); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getAll, getById, create, update, remove };
