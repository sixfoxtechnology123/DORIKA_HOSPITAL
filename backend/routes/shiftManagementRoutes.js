const express = require("express");
const {
  getShiftsByMonth,
  saveShift,
  saveBulkShifts,
} = require("../controllers/shiftManagementController");
const { requireNonEmployee } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:month", getShiftsByMonth);
router.post("/save", requireNonEmployee, saveShift);
router.post("/save-bulk", requireNonEmployee, saveBulkShifts);

module.exports = router;
