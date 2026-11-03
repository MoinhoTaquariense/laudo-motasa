require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/config/database');
(async () => {
  try {
    await db.query(fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8'));
    console.log('Atualização do banco concluída.');
  } catch (error) {
    console.error('Não foi possível atualizar o banco:', error.message);
    process.exitCode = 1;
  } finally { await db.end(); }
})();
