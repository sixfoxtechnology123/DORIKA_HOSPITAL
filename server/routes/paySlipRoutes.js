const express = require("express");
const {
  createPaySlip,
  getAllPaySlips,
  deletePaySlip,
  getEmployeeById,
  checkBatchStatus,
} = require("../controllers/paySlipController");

const router = express.Router();

// MATCHING FRONTEND: axios.post("/api/payslips/bulk")
router.post("/bulk", createPaySlip); 

// MATCHING FRONTEND: axios.get("/api/payslips/check-batch")
router.get("/check-batch", checkBatchStatus);

router.get("/", getAllPaySlips);
router.delete("/:id", deletePaySlip);

// Employee details
router.get("/employee/:employeeId", getEmployeeById);

module.exports = router;