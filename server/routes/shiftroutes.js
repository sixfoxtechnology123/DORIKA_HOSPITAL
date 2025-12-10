const express = require("express");
const router = express.Router();
const {
  getNextShiftID,
  createShift,
  getAllShifts,
  updateShift,
  deleteShift,
} = require("../controllers/shiftcontroller");

router.get("/next-id", getNextShiftID);
router.post("/", createShift);
router.get("/", getAllShifts);
router.put("/:id", updateShift);
router.delete("/:id", deleteShift);

module.exports = router;
