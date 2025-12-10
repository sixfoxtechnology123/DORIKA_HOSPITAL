const express = require("express");
const router = express.Router();
const {
  applyLeave,
  getEmployeeLeaves,
  getLeaveAllocationsByEmployee,
  deleteLeaveApplication,
  updateLeaveApplication,
} = require("../controllers/leaveApplicationController");

router.post("/", applyLeave);
router.get("/employee/:employeeId", getEmployeeLeaves);
router.get("/leaveAllocations/employee/:employeeId", getLeaveAllocationsByEmployee);
router.delete("/:id", deleteLeaveApplication);
router.put("/:id", updateLeaveApplication); 

module.exports = router;
