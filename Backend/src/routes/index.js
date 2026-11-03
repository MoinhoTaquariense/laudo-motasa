const express = require('express');
const router = express.Router();
const tabelasRoutes   = require('./tabelas.routes');
const elementosRoutes = require('./elementos.routes');
const intervalosRoutes = require('./intervalos.routes');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando' });
});

router.use('/tabelas', require('./importar.routes'));
router.use('/tabelas',   tabelasRoutes);
router.use('/elementos', elementosRoutes);
router.use('/intervalos', intervalosRoutes);
router.use('/farinhas-cadastro', require('./farinhas.routes'));
router.use('/clientes', require('./clientes.routes'));
router.use('/', require('./laudos.routes'));

module.exports = router;
