const router = require('express').Router();
const multer = require('multer');
const db = require('../config/database');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const campos = ['cliente', 'produto', 'lote', 'validade', 'emissao', 'operador'];
const cellPattern = /^[A-Z]{1,3}[1-9][0-9]{0,6}$/;

router.post('/tabelas/:id/modelo', upload.single('modelo'), async (req, res) => {
  try {
    if (!req.file || !/\.xlsx$/i.test(req.file.originalname) || req.file.buffer.subarray(0, 2).toString() !== 'PK')
      return res.status(400).json({ error: 'Selecione um arquivo .xlsx válido.' });
    const result = await db.query('UPDATE tabelas SET modelo_excel=$1, modelo_nome=$2 WHERE id=$3 RETURNING id', [req.file.buffer, req.file.originalname, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Tabela não encontrada.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/tabelas/:id/celulas', async (req, res) => {
  try {
    const celulas = Object.fromEntries(campos.map(k => [k, String(req.body[k] || '').trim().toUpperCase()]));
    if (campos.some(k => !cellPattern.test(celulas[k])) || new Set(Object.values(celulas)).size !== campos.length)
      return res.status(400).json({ error: 'Informe uma célula válida e diferente para cada campo.' });
    const result = await db.query('UPDATE tabelas SET celulas=$1 WHERE id=$2 RETURNING id', [JSON.stringify(celulas), req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Tabela não encontrada.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/farinhas', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.query.tabela_id || ''))) return res.status(400).json({ error: 'Selecione uma tabela.' });
    const result = await db.query('SELECT id, nome FROM farinhas WHERE tabela_id=$1 ORDER BY nome', [req.query.tabela_id]);
    res.json(result.rows.map(r => r.nome));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function sortear(row) {
  const min = Number(row.valormin), max = Number(row.valormax);
  if (row.formato === 7) {
    const seconds = Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  if (row.passo_meio) {
    const low = Math.ceil(min * 2 - 1e-8), high = Math.floor(max * 2 + 1e-8);
    if (low > high) throw new Error(`Não há múltiplos de 0,50 no intervalo de ${row.nome}.`);
    const number = (Math.floor(Math.random() * (high - low + 1)) + low) / 2;
    if (row.formato === 8) return `${String(number).replace('.', ',')} J`;
    return row.formato === 1 ? `${number.toFixed(2)}%` : number;
  }
  const precision = (original, numeric) => {
    const value = original == null ? String(numeric).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : String(original);
    return (value.split('.')[1] || '').length;
  };
  const places = row.formato === 2 ? 0 : Math.max(precision(row.vmin_str, row.valormin), precision(row.vmax_str, row.valormax));
  const scale = 10 ** Math.min(places, 6);
  const low = Math.ceil(min * scale - 1e-8), high = Math.floor(max * scale + 1e-8);
  if (low > high) throw new Error(`Intervalo inválido para ${row.nome}.`);
  const number = (Math.floor(Math.random() * (high - low + 1)) + low) / scale;
  if (row.formato === 8) return `${number.toFixed(Math.min(places, 6)).replace('.', ',')} J`;
  return row.formato === 1 ? `${number.toFixed(Math.min(places, 6))}%` : number;
}

function pythonPath() {
  const bundled = path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe');
  return process.env.PYTHON_PATH || (require('fs').existsSync(bundled) ? bundled : 'python');
}
async function escreverExcel(modelo, valores) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'laudo-'));
  try {
    const input = path.join(dir, 'modelo.xlsx'), output = path.join(dir, 'laudo.xlsx');
    await fs.writeFile(input, modelo);
    await new Promise((resolve, reject) => {
      const child = spawn(pythonPath(), [path.join(__dirname, '..', 'gerar_excel.py')], { windowsHide: true });
      let error = '';
      child.stderr.on('data', chunk => { error += chunk.toString(); });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve() : reject(new Error(`Erro ao preencher o Excel: ${error.trim()}`)));
      child.stdin.end(JSON.stringify({ modelo: input, saida: output, valores }));
    });
    return await fs.readFile(output);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

router.post('/laudos', async (req, res) => {
  const { tabela_id, farinha, cliente_id, operador, lote, emissao, validade } = req.body;
  const dateValid = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  if (!Number.isInteger(Number(tabela_id)) || !Number.isInteger(Number(cliente_id)) || Number(cliente_id) < 1 || ![farinha, operador, validade].every(s => typeof s === 'string' && s.trim()) || operador.trim().length > 200 || !dateValid(lote) || !dateValid(emissao))
    return res.status(400).json({ error: 'Preencha todos os campos e informe datas válidas.' });
  const connection = await db.connect().catch(() => null);
  if (!connection) return res.status(503).json({ error: 'Não foi possível acessar o banco de dados.' });
  try {
    await connection.query('BEGIN');
    const cliente = (await connection.query('SELECT codigo, nome FROM clientes WHERE id=$1 FOR SHARE', [cliente_id])).rows[0];
    if (!cliente) throw new Error('Selecione um cliente cadastrado.');
    const registered = (await connection.query('SELECT nome, produto FROM farinhas WHERE tabela_id=$1 AND lower(trim(nome))=lower(trim($2)) FOR SHARE', [tabela_id, farinha])).rows[0];
    if (!registered) throw new Error('Selecione uma farinha cadastrada nesta tabela.');
    if (!registered.produto?.trim()) throw new Error('Cadastre o nome do produto nesta farinha antes de gerar o laudo.');
    const flour = registered.nome;
    await connection.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${tabela_id}:${flour.toLocaleLowerCase('pt-BR')}:${lote}`]);
    const t = (await connection.query('SELECT modelo_excel, celulas FROM tabelas WHERE id=$1', [tabela_id])).rows[0];
    if (!t?.modelo_excel) throw new Error('Envie um modelo Excel para esta tabela antes de gerar o laudo.');
    if (!cellPattern.test(String(t.celulas?.operador || '').toUpperCase())) throw new Error('Configure a célula do operador em Configurações → Células antes de gerar o laudo.');
    const existing = (await connection.query('SELECT valores FROM laudos_gerados WHERE tabela_id=$1 AND lower(farinha)=lower($2) AND lote=$3', [tabela_id, flour, lote])).rows[0];
    let resultados = existing?.valores;
    if (!resultados) {
      const rows = (await connection.query(`SELECT e.id, e.nome, e.posicao, e.formato, i.id AS intervalo_id, i.valormin, i.valormax, i.vmin_str, i.vmax_str, i.passo_meio
        FROM elementos e LEFT JOIN intervalos i ON i.elemento_id=e.id AND i.ativo AND lower(trim(i.farinha))=lower($2)
        WHERE e.tabela_id=$1 AND e.ativo AND e.formato IN (1,2,3,7,8) ORDER BY e.id`, [tabela_id, flour])).rows;
      if (!rows.length) throw new Error('Não há elementos numéricos configurados para esta tabela.');
      const ids = new Set(); resultados = {};
      for (const row of rows) {
        if (!row.intervalo_id) throw new Error(`Falta intervalo para ${row.nome} na farinha ${flour}.`);
        if (ids.has(row.id)) throw new Error(`Há mais de um intervalo para ${row.nome} e ${flour}; revise os cadastros.`);
        if (!cellPattern.test(row.posicao.toUpperCase()) || resultados[row.posicao.toUpperCase()] !== undefined) throw new Error(`Posição inválida ou repetida para ${row.nome}.`);
        ids.add(row.id); resultados[row.posicao.toUpperCase()] = sortear(row);
      }
      await connection.query('INSERT INTO laudos_gerados (tabela_id, farinha, lote, valores) VALUES ($1,$2,$3,$4)', [tabela_id, flour, lote, JSON.stringify(resultados)]);
    }
    const formatDate = s => s.split('-').reverse().join('/');
    const values = { cliente: `${cliente.codigo} - ${cliente.nome}`, produto: registered.produto.trim(), operador: operador.trim(), lote: formatDate(lote), emissao: formatDate(emissao), validade: validade.trim() };
    const writes = { ...resultados };
    for (const field of campos) {
      const address = String(t.celulas?.[field] || '').toUpperCase();
      if (!cellPattern.test(address) || Object.hasOwn(writes, address)) throw new Error(`Confira a célula configurada para ${field}; ela está ausente ou em conflito.`);
      writes[address] = values[field];
    }
    const buffer = await escreverExcel(t.modelo_excel, writes);
    await connection.query('COMMIT');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="laudo.xlsx"');
    res.send(buffer);
  } catch (e) { await connection.query('ROLLBACK').catch(() => {}); res.status(400).json({ error: e.message }); }
  finally { connection.release(); }
});
module.exports = router;
