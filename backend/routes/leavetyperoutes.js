const express = require("express");
const router = express.Router();
const {
  getNextLeaveTypeID,
  createLeaveType,
  getAllLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
} = require("../controllers/leavetypecontroller");

router.get("/next-id", getNextLeaveTypeID);
router.post("/", createLeaveType);
router.get("/", getAllLeaveTypes);
router.put("/:id", updateLeaveType);
router.delete("/:id", deleteLeaveType);

module.exports = router;
