const express = require('express');
const router = express.Router();
const {
  getLatestUnitId,
  upsertUnit,
  getAllUnits,
  deleteUnit
} = require('../controllers/unitMeasurementController');

router.get('/latest-id', getLatestUnitId);
router.post('/upsert', upsertUnit);
router.get('/all', getAllUnits);
router.delete('/:id', deleteUnit);

module.exports = router;
