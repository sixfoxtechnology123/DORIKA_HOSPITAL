const express = require("express");
const router = express.Router();
const { markDailyAttendance, getMyAttendance } = require("../controllers/attendanceController");

router.post("/mark", markDailyAttendance);
router.get("/my/:employeeUserId", getMyAttendance);

module.exports = router;