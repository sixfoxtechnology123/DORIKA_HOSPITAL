const express = require('express');
const router = express.Router();
const genericCtrl = require('../controllers/genericController');

router.get('/all', genericCtrl.getGenerics);
router.get('/next-id', genericCtrl.getNextId);
router.post('/save', genericCtrl.saveGeneric);
router.post('/save/:id', genericCtrl.saveGeneric);
router.delete('/:id', genericCtrl.deleteGeneric);

module.exports = router;