const express = require('express');
const router = express.Router();
const controller = require('../controllers/UserManagementController');
const { changePassword } = require('../controllers/authController');
const { authenticate } = require('../utils/authMiddleware');

// Standardized routes
router.get('/all', controller.getAllUsers);           // Fixes "Failed to load users"
router.get('/latest-id', controller.getLatestId);     // For user-1, user-2 format
router.post('/upsert', controller.upsertUser);        // For Save/Update
router.delete('/:id', controller.deleteUser);   // For Delete
router.post('/change-password', authenticate, changePassword);
     

module.exports = router;
