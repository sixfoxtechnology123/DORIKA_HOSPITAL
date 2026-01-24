const express = require("express");
const router = express.Router();
const { markDailyAttendance, getMyAttendance,getAttendanceHistory ,updateAttendanceRecord} = require("../controllers/attendanceController");

router.post("/mark", markDailyAttendance);
router.get("/my/:employeeUserId", getMyAttendance);
router.get("/history", getAttendanceHistory);
router.put("/update", updateAttendanceRecord);
module.exports = router;