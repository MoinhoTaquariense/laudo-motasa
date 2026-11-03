const svc = require('../services/elementos.service');

const getByTabela = async (req, res) => {
  try {
    const tabela_id = req.query.tabela_id || req.body?.id;
    if (!tabela_id) return res.status(400).json({ error: 'tabela_id obrigatório' });
    res.json(await svc.findByTabela(tabela_id));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getById = async (req, res) => {
  try {
    const data = await svc.findById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Elemento não encontrado' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const create = async (req, res) => {
  try {
    const { tabela_id, nome, posicao, tipo, formato } = req.body;
    // aceita "tipo" (frontend envia tipo como number) ou "formato"
    const fmt = formato ?? tipo;
    if (!tabela_id || !nome || !posicao || !fmt)
      return res.status(400).json({ error: 'Campos tabela_id, nome, posicao e tipo/formato são obrigatórios' });
    res.status(201).json(await svc.create({ tabela_id, nome, posicao, formato: fmt }));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const update = async (req, res) => {
  try {
    const { tipo, ...rest } = req.body;
    // normaliza: frontend pode enviar "tipo" como campo de formato
    const payload = { ...rest, formato: rest.formato ?? tipo };
    const data = await svc.update(req.params.id, payload);
    if (!data) return res.status(404).json({ error: 'Elemento não encontrado' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const remove = async (req, res) => {
  try { await svc.remove(req.params.id); res.status(204).send(); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getByTabela, getById, create, update, remove };
