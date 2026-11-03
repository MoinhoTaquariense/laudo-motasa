const router = require('express').Router();
const ctrl = require('../controllers/elementos.controller');

// GET /api/elementos?tabela_id=X  ou  POST /api/elementos/por-tabela  { id: X }
router.get('/',             ctrl.getByTabela);
router.post('/por-tabela',  ctrl.getByTabela);
router.get('/:id',          ctrl.getById);
router.post('/',            ctrl.create);
router.put('/:id',          ctrl.update);
router.delete('/:id',       ctrl.remove);

module.exports = router;
