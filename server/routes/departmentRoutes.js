const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createDepartment,
  getAllDepartments,
  getNextDeptCode,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');

router.get('/next-code', getNextDeptCode);
router.get('/', getAllDepartments);
router.post('/', authMiddleware, createDepartment);
router.put('/:id', authMiddleware, updateDepartment);
router.delete('/:id', authMiddleware, deleteDepartment);

module.exports = router;
