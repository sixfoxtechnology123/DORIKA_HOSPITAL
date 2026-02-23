const express = require("express");
const router = express.Router();
const { markDailyAttendance, getMyAttendance,getAttendanceHistory ,updateAttendanceRecord} = require("../controllers/attendanceController");
const { requireNonEmployee } = require("../middleware/authMiddleware");

router.post("/mark", markDailyAttendance);
router.get("/my/:employeeUserId", getMyAttendance);
router.get("/history", requireNonEmployee, getAttendanceHistory);
router.put("/update", requireNonEmployee, updateAttendanceRecord);
module.exports = router;
