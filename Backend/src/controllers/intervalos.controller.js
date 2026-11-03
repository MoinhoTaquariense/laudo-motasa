const svc = require('../services/intervalos.service');
const db = require('../config/database');

const repetido = async (elemento, farinha, id = 0) => {
  const result = await db.query('SELECT id FROM intervalos WHERE elemento_id=$1 AND ativo AND lower(trim(farinha))=lower(trim($2)) AND id<>$3 LIMIT 1', [elemento, farinha, id]);
  return result.rowCount > 0;
};
const farinhaCadastrada = async (elemento, farinha) => {
  const result = await db.query('SELECT f.nome FROM farinhas f JOIN elementos e ON e.tabela_id=f.tabela_id WHERE e.id=$1 AND lower(trim(f.nome))=lower(trim($2))', [elemento, farinha]);
  return result.rows[0]?.nome;
};

const getByElemento = async (req, res) => {
  try {
    const elemento_id = req.query.elemento_id || req.body?.elemento_id;
    if (!elemento_id) return res.status(400).json({ error: 'elemento_id obrigatório' });
    res.json(await svc.findByElemento(elemento_id));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getById = async (req, res) => {
  try {
    const data = await svc.findById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Intervalo não encontrado' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const validarPasso = async (elemento, min, max, passo) => {
  if (passo === undefined || passo === false) return null;
  if (passo !== true) return 'Opção de intervalos de 0,50 inválida.';
  const result = await db.query('SELECT formato FROM elementos WHERE id=$1', [elemento]);
  if (![1, 3, 8].includes(result.rows[0]?.formato)) return 'A opção de 0,50 está disponível para elementos percentuais, decimais e Joules.';
  if (Math.ceil(Number(min) * 2 - 1e-8) > Math.floor(Number(max) * 2 + 1e-8)) return 'Não há múltiplos de 0,50 dentro deste intervalo.';
  return null;
};

const create = async (req, res) => {
  try {
    const { elemento_id, farinha, valorMin, valorMax, vmin_str, vmax_str, passo_meio } = req.body;
    if (!elemento_id || !farinha?.trim() || valorMin == null || valorMax == null)
      return res.status(400).json({ error: 'Informe farinha e os limites do intervalo.' });
    if (!Number.isFinite(Number(valorMin)) || !Number.isFinite(Number(valorMax)) || Number(valorMax) <= Number(valorMin))
      return res.status(400).json({ error: 'valorMax deve ser maior que valorMin' });
    const erroPasso = await validarPasso(elemento_id, valorMin, valorMax, passo_meio);
    if (erroPasso) return res.status(400).json({ error: erroPasso });
    const nomeFarinha = await farinhaCadastrada(elemento_id, farinha);
    if (!nomeFarinha) return res.status(400).json({ error: 'Cadastre e selecione uma farinha desta tabela.' });
    if (await repetido(elemento_id, nomeFarinha)) return res.status(409).json({ error: 'Já existe intervalo para este elemento e farinha.' });
    res.status(201).json(await svc.create({ elemento_id, farinha: nomeFarinha, valorMin, valorMax, vmin_str, vmax_str, passo_meio }));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const update = async (req, res) => {
  try {
    const { farinha, valorMin, valorMax } = req.body;
    if (!farinha?.trim() || !Number.isFinite(Number(valorMin)) || !Number.isFinite(Number(valorMax)) || Number(valorMax) <= Number(valorMin))
      return res.status(400).json({ error: 'Informe farinha e um intervalo válido.' });
    const atual = await svc.findById(req.params.id);
    if (!atual) return res.status(404).json({ error: 'Intervalo não encontrado' });
    const erroPasso = await validarPasso(atual.elemento_id, valorMin, valorMax, req.body.passo_meio ?? atual.passo_meio);
    if (erroPasso) return res.status(400).json({ error: erroPasso });
    const nomeFarinha = await farinhaCadastrada(atual.elemento_id, farinha);
    if (!nomeFarinha) return res.status(400).json({ error: 'Cadastre e selecione uma farinha desta tabela.' });
    if (await repetido(atual.elemento_id, nomeFarinha, req.params.id)) return res.status(409).json({ error: 'Já existe outro intervalo para este elemento e farinha. Exclua ou altere o repetido.' });
    const data = await svc.update(req.params.id, { ...req.body, farinha: nomeFarinha });
    if (!data) return res.status(404).json({ error: 'Intervalo não encontrado' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const remove = async (req, res) => {
  try { await svc.remove(req.params.id); res.status(204).send(); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getByElemento, getById, create, update, remove };
