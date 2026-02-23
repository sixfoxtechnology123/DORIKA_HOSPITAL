// backend/routes/adminManagementRoutes.js
const express = require('express');
const {
  login,
  getUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/adminManagementController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Public route
router.post('/login', login);

// Protected routes (Admins only)
router.get('/users', authMiddleware, adminOnly, getUsers);
router.post('/users', authMiddleware, adminOnly, createUser);
router.put('/users/:id', authMiddleware, adminOnly, updateUser);
router.delete('/users/:id', authMiddleware, adminOnly, deleteUser);

module.exports = router;
