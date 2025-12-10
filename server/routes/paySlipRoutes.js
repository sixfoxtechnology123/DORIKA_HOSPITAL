const express = require("express");
const {
  createPaySlip,
  getAllPaySlips,
  getPaySlipByEmp,
  updatePaySlip,
  deletePaySlip,
  getEmployeeById,
  getLatestPayslipByEmployee
} = require("../controllers/paySlipController");

const router = express.Router();

// Payslip routes
router.post("/", createPaySlip);
router.get("/", getAllPaySlips);
router.get("/by-emp", getPaySlipByEmp); // query: ?employeeId=EMP1&month=Nov&year=2025
router.put("/:id", updatePaySlip);
router.delete("/:id", deletePaySlip);

// Employee details (must be after other routes)
router.get("/employee/:employeeId", getEmployeeById);
router.get("/latest/:employeeId", getLatestPayslipByEmployee);

module.exports = router;
