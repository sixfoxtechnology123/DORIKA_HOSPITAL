const express = require('express');
const router = express.Router();
const { loginUser, changePassword } = require('../controllers/authController');
const { authenticate } = require('../utils/authMiddleware');

router.post('/login', loginUser);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
