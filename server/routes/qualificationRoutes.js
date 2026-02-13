const express = require('express');
const router = express.Router();
const qualController = require('../controllers/qualificationController');
// const { verifyToken } = require('../middleware/auth'); // Uncomment if using auth

// Base path is /api/master/qualifications
router.get('/next-code', qualController.getNextCode);
router.get('/', qualController.getAll);
router.post('/', qualController.create);
router.put('/:id', qualController.update);
router.delete('/:id', qualController.delete);

module.exports = router;