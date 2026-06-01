const express = require('express');
const router = express.Router();
const poController = require('../controllers/poController');

// @route   POST /api/purchase-orders
// @desc    Create a new PO
router.post('/', poController.createPO);

// @route   GET /api/purchase-orders
// @desc    Get all PO headers for the list
router.get('/', poController.getAllPOs);

// @route   GET /api/purchase-orders/:id
// @desc    Get specific PO items/details
router.get('/:id', poController.getPOById);

// @route   PUT /api/purchase-orders/:id
// @desc    Update a PO
router.put('/:id', poController.updatePO);

// @route   DELETE /api/purchase-orders/:id
// @desc    Delete a PO
router.delete('/:id', poController.deletePO);

module.exports = router;
