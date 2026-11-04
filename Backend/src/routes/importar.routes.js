const router = require('express').Router();
const db = require('../config/database');
const key = value => (value || '').trim().toLocaleLowerCase('pt-BR');
function indexUnique(rows, identify, descricao) {
  const map = new Map();
  for (const row of rows) {
    const k = identify(row);
    if (!k || map.has(k)) throw new Error(`Há ${descricao} duplicado ou sem nome. Revise antes de importar.`);
    map.set(k, row);
  }
  return map;
}
router.post('/:id/importar', async (req, res) => {
  const destino = Number(req.params.id), origem = Number(req.body.origem_id);
  if (!Number.isSafeInteger(destino) || destino < 1 || !Number.isSafeInteger(origem) || origem < 1 || origem === destino)
    return res.status(400).json({ error: 'Selecione outra tabela como origem.' });
  const conn = await db.connect().catch(() => null);
  if (!conn) return res.status(503).json({ error: 'Não foi possível acessar o banco.' });
  try {
    await conn.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const tables = (await conn.query('SELECT id,nome,celulas FROM tabelas WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE', [[origem,destino]])).rows;
    const src = tables.find(t => t.id === origem), dst = tables.find(t => t.id === destino);
    if (!src || !dst) throw new Error('Tabela de origem ou destino não encontrada.');
    const elementos = (await conn.query('SELECT * FROM elementos WHERE tabela_id=ANY($1::int[]) AND ativo ORDER BY id', [[origem,destino]])).rows;
    const origemEls = elementos.filter(e => e.tabela_id === origem), destinoEls = elementos.filter(e => e.tabela_id === destino);
    const srcEls = indexUnique(origemEls, e => key(e.nome), 'elemento na origem');
    const dstEls = indexUnique(destinoEls, e => key(e.nome), 'elemento no destino');
    const allFlour = (await conn.query('SELECT * FROM farinhas WHERE tabela_id=ANY($1::int[]) ORDER BY id', [[origem,destino]])).rows;
    const srcFlour = indexUnique(allFlour.filter(f => f.tabela_id === origem), f => key(f.nome), 'farinha na origem');
    const dstFlour = indexUnique(allFlour.filter(f => f.tabela_id === destino), f => key(f.nome), 'farinha no destino');
    const intervals = (await conn.query('SELECT i.*, e.tabela_id FROM intervalos i JOIN elementos e ON e.id=i.elemento_id WHERE e.tabela_id=ANY($1::int[]) AND e.ativo AND i.ativo ORDER BY i.id', [[origem,destino]])).rows;
    const srcIntervals = intervals.filter(i => i.tabela_id === origem), dstIntervals = intervals.filter(i => i.tabela_id === destino);
    indexUnique(srcIntervals, i => `${i.elemento_id}:${key(i.farinha)}`, 'intervalo na origem');
    indexUnique(dstIntervals, i => `${i.elemento_id}:${key(i.farinha)}`, 'intervalo no destino');
    if (srcIntervals.some(i => !srcFlour.has(key(i.farinha)))) throw new Error('Há intervalos da origem com farinha não cadastrada. Revise a origem antes de importar.');
    const historico = (await conn.query('SELECT EXISTS(SELECT 1 FROM laudos_gerados WHERE tabela_id=$1) AS existe', [destino])).rows[0].existe;
    if (historico && [...srcEls].some(([k,e]) => dstEls.has(k) && (key(dstEls.get(k).posicao) !== key(e.posicao) || dstEls.get(k).formato !== e.formato)))
      throw new Error('A importação mudaria células ou tipos de elementos com laudos já gerados. Revise as configurações para preservar os resultados anteriores.');
    const positions = new Map();
    for (const e of destinoEls.filter(e => !srcEls.has(key(e.nome))).concat(origemEls)) {
      const p = key(e.posicao);
      if (positions.has(p)) throw new Error(`A célula ${e.posicao} ficaria repetida entre elementos. Revise as tabelas antes de importar.`);
      positions.set(p, e.nome);
    }
    for (const [field, pos] of Object.entries(src.celulas || {})) {
      if (pos && positions.has(key(pos))) throw new Error(`A célula ${pos} do campo ${field} conflita com um elemento no destino.`);
    }
    await conn.query('UPDATE tabelas SET celulas=$1 WHERE id=$2', [JSON.stringify(src.celulas),destino]);
    let farin = 0, elem = 0, inter = 0;
    for (const [k, f] of srcFlour) {
      if (dstFlour.has(k)) await conn.query('UPDATE farinhas SET produto=$1 WHERE id=$2', [f.produto, dstFlour.get(k).id]);
      else { const result = await conn.query('INSERT INTO farinhas (tabela_id,nome,produto) VALUES ($1,$2,$3) RETURNING *',[destino,f.nome,f.produto]); dstFlour.set(k,result.rows[0]); }
      farin++;
    }
    for (const [k, e] of srcEls) {
      if (dstEls.has(k)) await conn.query('UPDATE elementos SET posicao=$1,formato=$2 WHERE id=$3',[e.posicao,e.formato,dstEls.get(k).id]);
      else { const result = await conn.query('INSERT INTO elementos (tabela_id,nome,posicao,formato) VALUES ($1,$2,$3,$4) RETURNING *',[destino,e.nome,e.posicao,e.formato]); dstEls.set(k,result.rows[0]); }
      elem++;
    }
    const srcById = new Map(origemEls.map(e => [e.id,e]));
    const dstIntervalMap = new Map(dstIntervals.map(i => [`${i.elemento_id}:${key(i.farinha)}`,i]));
    for (const i of srcIntervals) {
      const targetEl = dstEls.get(key(srcById.get(i.elemento_id).nome));
      const farinha = dstFlour.get(key(i.farinha)).nome;
      const existing = dstIntervalMap.get(`${targetEl.id}:${key(farinha)}`);
      if (existing) await conn.query('UPDATE intervalos SET valormin=$1,valormax=$2,vmin_str=$3,vmax_str=$4,passo_meio=$5,passo_cinco_segundos=$6 WHERE id=$7',[i.valormin,i.valormax,i.vmin_str,i.vmax_str,i.passo_meio,i.passo_cinco_segundos,existing.id]);
      else await conn.query("INSERT INTO intervalos (elemento_id,cliente,produto,farinha,valormin,valormax,vmin_str,vmax_str,passo_meio,passo_cinco_segundos) VALUES ($1,'',$2::text,$2::text,$3,$4,$5,$6,$7,$8)",[targetEl.id,farinha,i.valormin,i.valormax,i.vmin_str,i.vmax_str,i.passo_meio,i.passo_cinco_segundos]);
      inter++;
    }
    await conn.query('COMMIT');
    res.json({ elementos:elem, farinhas:farin, intervalos:inter });
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {});
    res.status(err.code === '40001' ? 409 : 400).json({ error: err.code === '40001' ? 'Os dados foram alterados durante a importação. Tente novamente.' : err.message });
  } finally { conn.release(); }
});
module.exports = router;
