const express = require('express');
const router = express.Router();
const billingController = require('../controllers/ConsultationBillingController');

// Route to create a new bill
router.get('/next-id', billingController.getNextBillId);
router.get('/all', billingController.getAllBills);
router.post('/create', billingController.generateBill);
router.put('/update/:id', billingController.updateBill);
router.delete('/:id', billingController.deleteBill);

module.exports = router;
