const express = require("express");
const {
  getNextDepartmentHeadId,
  createDepartmentHead,
  getDepartmentHeads,
  updateDepartmentHead,
  deleteDepartmentHead,
} = require("../controllers/departmentHeadController");
const { requireNonEmployee } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getDepartmentHeads);
router.get("/next-id", requireNonEmployee, getNextDepartmentHeadId);
router.post("/", requireNonEmployee, createDepartmentHead);
router.put("/:id", requireNonEmployee, updateDepartmentHead);
router.delete("/:id", requireNonEmployee, deleteDepartmentHead);

module.exports = router;
