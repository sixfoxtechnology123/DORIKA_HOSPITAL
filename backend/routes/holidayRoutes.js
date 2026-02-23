const express = require("express");
const router = express.Router();
const {
  getNextHolidayID,
  createHoliday,
  getAllHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/holidayController");

router.get("/next-id", getNextHolidayID);
router.post("/", createHoliday);
router.get("/", getAllHolidays);
router.put("/:id", updateHoliday);
router.delete("/:id", deleteHoliday);

module.exports = router;
