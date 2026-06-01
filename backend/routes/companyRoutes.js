const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/companyController');

router.get('/all', ctrl.getAll);
router.get('/next-id', ctrl.getNextId);
router.post('/save', ctrl.saveCompany);
router.delete('/:id', ctrl.deleteCompany);

module.exports = router;