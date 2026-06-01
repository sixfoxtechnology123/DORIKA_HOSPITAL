const express = require('express');
const router = express.Router();
const {
  getLatestSupplierId,
  upsertSupplier,
  getAllSuppliers,
  deleteSupplier
} = require('../controllers/supplierController');

router.get('/latest-id', getLatestSupplierId);
router.post('/upsert', upsertSupplier);
router.get('/all', getAllSuppliers);
router.delete('/:id', deleteSupplier);

module.exports = router;
