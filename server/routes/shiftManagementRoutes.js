const express = require("express");
const {
  getShiftsByMonth,
  saveShift,
  saveBulkShifts,
} = require("../controllers/shiftManagementController");

const router = express.Router();

router.get("/:month", getShiftsByMonth);
router.post("/save", saveShift);
router.post("/save-bulk", saveBulkShifts); // ✅ NEW

module.exports = router;
