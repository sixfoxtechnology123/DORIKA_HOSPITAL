const express = require('express');
const router = express.Router();
const {
  getLatestCategoryId,
  upsertCategory,
  getAllCategories,
  deleteCategory
} = require('../controllers/medicineCategoryController');

router.get('/latest-id', getLatestCategoryId);
router.post('/upsert', upsertCategory);
router.get('/all', getAllCategories);
router.delete('/:id', deleteCategory);

module.exports = router;
