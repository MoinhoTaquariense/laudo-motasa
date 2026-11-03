const router = require('express').Router();
const ctrl = require('../controllers/intervalos.controller');

// GET /api/intervalos?elemento_id=X  ou  POST /api/intervalos/por-elemento  { elemento_id: X }
router.get('/',               ctrl.getByElemento);
router.post('/por-elemento',  ctrl.getByElemento);
router.get('/:id',            ctrl.getById);
router.post('/',              ctrl.create);
router.put('/:id',            ctrl.update);
router.delete('/:id',         ctrl.remove);

module.exports = router;
