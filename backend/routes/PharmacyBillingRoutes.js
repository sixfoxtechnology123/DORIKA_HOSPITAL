const express = require('express');
const router = express.Router();
const { createBill, getAllBills, updateBill, deleteBill } = require('../controllers/pharmacyBillingController');

// Route to handle bill creation and stock deduction
router.post('/generate-bill', createBill);
router.get('/all', getAllBills);
router.put('/update/:id', updateBill);
router.delete('/:id', deleteBill);

module.exports = router;
