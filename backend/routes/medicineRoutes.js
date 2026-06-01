const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/medicineController');

router.get('/all', ctrl.getAll);
router.get('/latest-id', ctrl.getLatestId);
router.post('/upsert', ctrl.upsert);
router.delete('/:id', ctrl.delete);

module.exports = router;