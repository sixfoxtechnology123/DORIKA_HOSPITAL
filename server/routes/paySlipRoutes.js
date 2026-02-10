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

const router = express.Router();

// MATCHING FRONTEND: axios.delete("/api/payslips/clean")
router.delete("/clean", clearMonthData);

// MATCHING FRONTEND: axios.post("/api/payslips/bulk")
router.post("/bulk", createPaySlip); 

// MATCHING FRONTEND: axios.get("/api/payslips/check-batch")
router.get("/check-batch", checkBatchStatus);

router.get("/", getAllPaySlips);
router.delete("/:id", deletePaySlip);

// Employee details
router.get("/employee/:employeeId", getEmployeeById);

router.get("/view-all/:empUserId", getPayslipsByEmployeeUserId);
module.exports = router;