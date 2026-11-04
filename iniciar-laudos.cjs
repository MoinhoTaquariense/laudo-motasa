const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn, exec } = require('child_process');

const root = __dirname;
const backend = path.join(root, 'Backend');
const frontend = path.join(root, 'Frontend');
const configFile = path.join(backend, '.env');
const stopFile = path.join(root, '.laudos-encerrar');
const children = [];
let stopping = false;

function portAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({ port, host: '::', exclusive: true }, () => server.close(() => resolve(true)));
  });
}

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed && child.exitCode === null) child.kill();
  }
  process.exitCode = exitCode;
}

function watchForStop() {
  const timer = setInterval(() => {
    if (!fs.existsSync(stopFile)) return;
    try { fs.unlinkSync(stopFile); } catch {}
    console.log('Encerrando o sistema...');
    stop(0);
    clearInterval(timer);
  }, 1000);
  timer.unref();
}

async function waitFor(url) {
  for (let i = 0; i < 80 && !stopping; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('O sistema nao respondeu a tempo. Verifique as mensagens acima.');
}

async function main() {
  if (!fs.existsSync(configFile)) throw new Error('Arquivo Backend/.env nao encontrado. Configure o banco de dados antes de iniciar.');
  for (const file of [path.join(backend, 'node_modules', 'dotenv'), path.join(backend, 'node_modules', 'pg'), path.join(backend, 'node_modules', 'express'), path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js')]) {
    if (!fs.existsSync(file)) throw new Error('Dependencias ausentes. Execute npm install nas pastas Backend e Frontend.');
  }
  require(path.join(backend, 'node_modules', 'dotenv')).config({ path: configFile });
  if (!process.env.APP_PASSWORD || process.env.APP_PASSWORD.length < 12) throw new Error('Configure APP_PASSWORD com pelo menos 12 caracteres em Backend/.env. Consulte DOKPLOY.md.');
  if (process.env.PORT && process.env.PORT !== '9000') throw new Error('A porta do Backend/.env deve ser 9000 para corresponder a configuracao do frontend.');
  if (!(await portAvailable(9000)) || !(await portAvailable(8080))) throw new Error('A porta 9000 ou 8080 ja esta em uso. Feche a outra instancia ou o programa que a estiver usando.');
  if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);
  watchForStop();

  const { Pool } = require(path.join(backend, 'node_modules', 'pg'));
  const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionTimeoutMillis: 5000 });
  try {
    await pool.query('SELECT modelo_nome, celulas FROM tabelas LIMIT 1');
    await pool.query('SELECT farinha, vmin_str, vmax_str, passo_meio, passo_cinco_segundos FROM intervalos LIMIT 1');
    await pool.query('SELECT nome, produto FROM farinhas LIMIT 1');
    await pool.query('SELECT valores FROM laudos_gerados LIMIT 1');
  } catch (error) {
    throw new Error('Nao foi possivel acessar o banco ou ele ainda nao foi atualizado. Verifique o PostgreSQL, o arquivo Backend/.env e execute npm run migrate na pasta Backend. Detalhe: ' + error.message);
  } finally { await pool.end(); }

  const start = (label, args, cwd, env = {}) => {
    const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
    children.push(child);
    child.on('error', error => { console.error(label + ': ' + error.message); stop(1); });
    child.on('exit', code => {
      if (!stopping) { console.error(label + ' foi encerrado.'); stop(code || 1); }
    });
  };
  console.log('Iniciando o sistema de laudos...');
  start('Backend', ['server.js'], backend, { PORT: '9000' });
  start('Frontend', [path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js'), '--strictPort'], frontend);
  await Promise.all([waitFor('http://localhost:9000/api/health'), waitFor('http://localhost:8080/')]);
  if (stopping) return;
  console.log('\nSistema pronto: http://localhost:8080/');
  console.log('Para encerrar, execute Encerrar Laudos.vbs.');
  if (process.env.LAUDOS_SEM_NAVEGADOR !== '1') exec('start "" "http://localhost:8080/"');
}

process.on('SIGINT', () => { console.log('\nEncerrando o sistema...'); stop(0); });
process.on('SIGTERM', () => stop(0));
main().catch(error => { console.error('\n' + error.message); stop(1); });
