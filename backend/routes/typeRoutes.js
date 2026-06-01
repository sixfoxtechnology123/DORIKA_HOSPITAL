const express = require('express');
const router = express.Router();
const typeCtrl = require('../controllers/typeController');

// Get all types
router.get('/all', typeCtrl.getTypes);

// Get the next auto-generated ID (e.g., TYPE-5)
router.get('/next-id', typeCtrl.getNextId);

// Save or Update Type (Handles both based on ID presence)
router.post('/save', typeCtrl.saveType);
router.post('/save/:id', typeCtrl.saveType);

// Delete Type
router.delete('/:id', typeCtrl.deleteType);

module.exports = router;