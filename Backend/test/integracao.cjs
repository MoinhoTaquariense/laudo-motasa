require('dotenv').config();
const assert = require('assert/strict');
const { Pool } = require('pg');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const crypto = require('crypto');

const python = process.env.PYTHON_PATH || path.join(process.env.USERPROFILE, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe');
const schema = 'teste_laudos_' + crypto.randomBytes(6).toString('hex');
const db = new Pool({ host:process.env.DB_HOST, port:process.env.DB_PORT, user:process.env.DB_USER, password:process.env.DB_PASSWORD, database:process.env.DB_NAME });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teste-laudos-'));
let server;
(async () => {
  let created = false;
  try {
    const client = await db.connect();
    try {
      await client.query('CREATE SCHEMA ' + schema); created = true;
      await client.query('SET search_path TO ' + schema);
      await client.query(fs.readFileSync(path.join(__dirname, '..', 'init.sql'), 'utf8'));
      // Simula um banco antigo que ainda não possui os campos de precisão.
      await client.query('ALTER TABLE intervalos DROP COLUMN vmin_str, DROP COLUMN vmax_str');
      await client.query(fs.readFileSync(path.join(__dirname, '..', 'migration.sql'), 'utf8'));
      await client.query(fs.readFileSync(path.join(__dirname, '..', 'migration.sql'), 'utf8'));
    } finally { client.release(); }
    const port = await new Promise(resolve => { const socket=net.createServer(); socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));}); });
    const testPassword = 'senha-isolada-de-teste';
    server = spawn(process.execPath, ['server.js'], { cwd:path.join(__dirname,'..'), env:{...process.env, APP_PASSWORD:testPassword, COOKIE_SECURE:'false', PORT:String(port), PGOPTIONS:'-c search_path='+schema, PYTHON_PATH:python}, stdio:'ignore' });
    const base = `http://127.0.0.1:${port}/api`;
    for (let i=0;i<50;i++) { try { await fetch(base+'/health'); break; } catch { await new Promise(r=>setTimeout(r,100)); } }
    assert.equal((await fetch(base+'/tabelas')).status, 401);
    assert.equal((await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha:'incorreta'})})).status, 401);
    const login = await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha:testPassword})});
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const originalFetch = global.fetch;
    global.fetch = (url, options={}) => originalFetch(url, {...options, headers:{...options.headers, cookie}});
    assert.equal((await fetch(base+'/auth/session')).status, 200);
    assert.equal((await fetch(base+'/tabelas',{method:'POST',headers:{Origin:'https://invasor.example','Content-Type':'application/json'},body:'{}'})).status, 403);
    const call = async (url, method='GET', body) => {
      const res=await fetch(base+url,{method,...(body === undefined ? {} : {headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
      if (!res.ok) throw new Error(`${url}: ${await res.text()}`);
      return res.status===204 ? null : res.json();
    };
    const table=await call('/tabelas','POST',{nome:'Teste isolado'});
    const clienteA=await call('/clientes','POST',{codigo:'001',nome:'Cliente A'});
    const clienteB=await call('/clientes','POST',{codigo:'002',nome:'Cliente B'});
    assert.equal((await call('/clientes')).length,2);
    const duplicateClient = await fetch(base+'/clientes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codigo:'001',nome:'Outro'})});
    assert.equal(duplicateClient.status,409);
    await call('/clientes/'+clienteB.id,'PUT',{codigo:'002',nome:'Cliente B'});
    const el=await call('/elementos','POST',{tabela_id:table.id,nome:'Umidade',posicao:'G12',tipo:1});
    const joules=await call('/elementos','POST',{tabela_id:table.id,nome:'Energia',posicao:'G13',tipo:8});
    const flour=await call('/farinhas-cadastro','POST',{tabela_id:table.id,nome:'80002',produto:'Farinha'});
    assert.equal((await call('/farinhas-cadastro?tabela_id='+table.id))[0].nome,'80002');
    const unregistered = await fetch(base+'/intervalos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({elemento_id:el.id,farinha:'Nao cadastrada',valorMin:1,valorMax:2})});
    assert.equal(unregistered.status,400);
    const interval=await call('/intervalos','POST',{elemento_id:el.id,farinha:'80002',valorMin:10,valorMax:12,vmin_str:'10.00',vmax_str:'12.00',passo_meio:true});
    await call('/intervalos','POST',{elemento_id:joules.id,farinha:'80002',valorMin:10,valorMax:20,vmin_str:'10',vmax_str:'20',passo_meio:true});
    assert.equal(interval.passo_meio, true);
    const invalidStep = await fetch(base+'/intervalos/'+interval.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({farinha:'80002',valorMin:10.1,valorMax:10.4,passo_meio:true})});
    assert.equal(invalidStep.status,400);
    assert.deepEqual(await call('/farinhas?tabela_id='+table.id),['80002']);
    const duplicate = await fetch(base+'/intervalos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({elemento_id:el.id,farinha:'80002',valorMin:1,valorMax:2})});
    assert.equal(duplicate.status,409);
    const image=path.join(dir,'logo.png'), model=path.join(dir,'modelo.xlsx');
    execFileSync(python,['-c',`from PIL import Image\nfrom openpyxl import Workbook\nfrom openpyxl.drawing.image import Image as XLImage\nImage.new('RGB',(10,10),'red').save(r'${image}')\nw=Workbook(); w.active.add_image(XLImage(r'${image}'),'A1'); w.save(r'${model}')`]);
    const form=new FormData(); form.append('modelo',new Blob([fs.readFileSync(model)]),'modelo.xlsx');
    let response=await fetch(base+`/tabelas/${table.id}/modelo`,{method:'POST',body:form}); assert.equal(response.status,200,await response.text());
    const payload={tabela_id:table.id,farinha:'80002',cliente_id:clienteA.id,operador:'Operador A',produto:'Nome ignorado',lote:'2026-10-20',emissao:'2026-10-27',validade:'150 dias'};
    const invalidClient = await fetch(base+'/laudos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,cliente_id:999999})});
    assert.equal(invalidClient.status,400);
    const missingOperator = await fetch(base+'/laudos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,operador:' '})});
    assert.equal(missingOperator.status,400);
    const missingCell = await fetch(base+'/laudos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    assert.equal(missingCell.status,400);
    assert.match((await missingCell.json()).error, /célula do operador/);
    const cells={cliente:'C5',produto:'C6',lote:'C8',validade:'C9',emissao:'G9',operador:'C10'};
    const duplicateCell = await fetch(base+`/tabelas/${table.id}/celulas`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...cells,operador:'C5'})});
    assert.equal(duplicateCell.status,400);
    await call(`/tabelas/${table.id}/celulas`,'PUT',cells);
    const generate=async data => {const r=await fetch(base+'/laudos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw new Error(await r.text());return Buffer.from(await r.arrayBuffer());};
    const first=path.join(dir,'primeiro.xlsx'); fs.writeFileSync(first,await generate(payload));
    const updatedInterval = await call('/intervalos/'+interval.id,'PUT',{farinha:'80002',valorMin:20,valorMax:22,vmin_str:'20.00',vmax_str:'22.00',passo_meio:false});
    assert.equal(updatedInterval.passo_meio, false);
    await call('/farinhas-cadastro/'+flour.id,'PUT',{nome:'80002 atualizada',produto:'Farinha'});
    assert.deepEqual(await call('/farinhas?tabela_id='+table.id),['80002 atualizada']);
    const deletion=await fetch(base+'/farinhas-cadastro/'+flour.id,{method:'DELETE'}); assert.equal(deletion.status,409);
    const second=path.join(dir,'segundo.xlsx'); fs.writeFileSync(second,await generate({...payload,farinha:'80002 atualizada',cliente_id:clienteB.id,operador:'Operador B'}));
    const check=`import sys,openpyxl\na=openpyxl.load_workbook(sys.argv[1]).active\nb=openpyxl.load_workbook(sys.argv[2]).active\nassert a['C5'].value == '001 - Cliente A' and b['C5'].value == '002 - Cliente B'\nassert a['C6'].value == 'Farinha' and a['C8'].value == '20/10/2026'\nassert a['C10'].value == 'Operador A' and b['C10'].value == 'Operador B'\nassert a['G9'].value == '27/10/2026' and a['C9'].value == '150 dias'\nassert a['G12'].value == b['G12'].value\nassert a['G13'].value == b['G13'].value and a['G13'].value.endswith(' J')\nassert 10 <= float(a['G13'].value[:-2].replace(',', '.')) <= 20\nassert float(a['G13'].value[:-2].replace(',', '.')) * 2 % 1 == 0\nassert float(a['G12'].value.rstrip('%')) * 2 % 1 == 0\nassert len(a._images) == 1 and len(b._images) == 1\nprint('Geração, reutilização de valores, dados e logo: OK')`;
    console.log(execFileSync(python,['-c',check,first,second],{encoding:'utf8'}).trim());
    console.log('Cadastro, selecao, renomeacao e protecao de farinhas: OK');
    await fetch(base+'/auth/logout',{method:'POST'});
    assert.equal((await fetch(base+'/tabelas')).status, 401);
    console.log('Autenticacao, protecao da API e saida: OK');
  } finally {
    if (server) server.kill();
    if (created) await db.query('DROP SCHEMA '+schema+' CASCADE');
    await db.end();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e => { console.error(e); process.exitCode=1; });

