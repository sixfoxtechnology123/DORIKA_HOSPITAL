const express = require('express');
const router = express.Router();
const { getActivityHistory } = require('../controllers/activityLogController');

router.get('/', getActivityHistory);

module.exports = router;
