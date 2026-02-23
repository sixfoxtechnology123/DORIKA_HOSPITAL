const express = require("express");
const {
  createPaySlip,
  getAllPaySlips,
  deletePaySlip,
  getEmployeeById,
  checkBatchStatus,
  clearMonthData,
  getPayslipsByEmployeeUserId
} = require("../controllers/paySlipController");
const { requireNonEmployee, requireSelfOrNonEmployee } = require("../middleware/authMiddleware");

const router = express.Router();

// MATCHING FRONTEND: axios.delete("/api/payslips/clean")
router.delete("/clean", requireNonEmployee, clearMonthData);

// MATCHING FRONTEND: axios.post("/api/payslips/bulk")
router.post("/bulk", requireNonEmployee, createPaySlip); 

// MATCHING FRONTEND: axios.get("/api/payslips/check-batch")
router.get("/check-batch", requireNonEmployee, checkBatchStatus);

router.get("/", requireNonEmployee, getAllPaySlips);
router.delete("/:id", requireNonEmployee, deletePaySlip);

// Employee details
router.get("/employee/:employeeId", requireNonEmployee, getEmployeeById);

router.get("/view-all/:empUserId", requireSelfOrNonEmployee("empUserId", "employeeUserId"), getPayslipsByEmployeeUserId);
module.exports = router;
