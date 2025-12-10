const express = require('express');
const router = express.Router();
const {
  createDepartment,
  getAllDepartments,
  getNextDeptCode,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');

router.get('/next-code', getNextDeptCode);
router.post('/', createDepartment);
router.get('/', getAllDepartments);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
