const express = require("express");
const router = express.Router();
const {
  createLeaveAllocation,
  getAllLeaveAllocations,
  getLeaveAllocationById,
  updateLeaveAllocation,
  deleteLeaveAllocation,
  getAllLeaveRules
} = require("../controllers/leaveAllocationController");

// Define routes
router.post("/", createLeaveAllocation);
router.get("/", getAllLeaveAllocations);
router.get("/:id", getLeaveAllocationById);
router.put("/:id", updateLeaveAllocation);
router.delete("/:id", deleteLeaveAllocation);
router.get("/leaverules/all", getAllLeaveRules);


// Export router
module.exports = router; 
