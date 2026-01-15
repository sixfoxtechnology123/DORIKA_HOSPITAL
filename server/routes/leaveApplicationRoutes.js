const express = require("express");
const router = express.Router();
const {
  applyLeave,
  getEmployeeLeaves,
  getLeaveAllocationsByEmployee,
  deleteLeaveApplication,
  updateLeaveApplication,
  getLeavesForManagerOrDH,
  updateLeaveStatus
} = require("../controllers/leaveApplicationController");

router.post("/", applyLeave);
router.get("/employee/:employeeId", getEmployeeLeaves);
router.get("/leaveAllocations/employee/:employeeId", getLeaveAllocationsByEmployee);
router.delete("/:id", deleteLeaveApplication);
router.put("/:id", updateLeaveApplication); 

router.get(
  "/manager/:employeeUserId",
  getLeavesForManagerOrDH
);

router.put(
  "/:id/status",
  updateLeaveStatus
);



module.exports = router;
