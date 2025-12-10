const Holiday = require("../models/Holiday");
const Activity = require("../models/Activity");

// Auto-generate HolidayID
const generateHolidayID = async () => {
  const last = await Holiday.findOne().sort({ holidayID: -1 });
  let nextNumber = 1;
  if (last && last.holidayID) {
    const match = last.holidayID.match(/HOL(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `HOL${String(nextNumber).padStart(2, "0")}`;
};

// Get next HolidayID
exports.getNextHolidayID = async (req, res) => {
  try {
    const code = await generateHolidayID();
    res.json({ holidayID: code });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate ID" });
  }
};

// Create Holiday
exports.createHoliday = async (req, res) => {
  try {
    const { holidayID, holidayName, holidayDate, location, status } = req.body;
    if (!holidayID || !holidayName || !holidayDate) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const holiday = new Holiday({
      holidayID,
      holidayName,
      holidayDate,
      location,
      status,
    });

    const savedHoliday = await holiday.save();

    // Activity log
    try {
      await Activity.create({ text: `Holiday Added: ${savedHoliday.holidayName} (${savedHoliday.holidayID})` });
    } catch (logErr) {
      console.error("Activity log failed:", logErr.message);
    }

    res.status(201).json(savedHoliday);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get All Holidays
exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find();

    // Format dates into DD-MM-YYYY
    const formatted = holidays.map((h) => {
      const d = new Date(h.holidayDate);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return {
        ...h._doc,
        holidayDate: `${day}-${month}-${year}`, // formatted
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch holidays" });
  }
};

// Update Holiday
exports.updateHoliday = async (req, res) => {
  try {
    const updated = await Holiday.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Holiday not found" });

    // Activity log
    try {
      await Activity.create({ text: `Holiday Updated: ${updated.holidayName} (${updated.holidayID})` });
    } catch (logErr) {
      console.error("Activity log failed:", logErr.message);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) return res.status(404).json({ message: "Holiday not found" });

    // Activity log
    try {
      await Activity.create({ text: `Holiday Deleted: ${holiday.holidayName} (${holiday.holidayID})` });
    } catch (logErr) {
      console.error("Activity log failed:", logErr.message);
    }

    res.json({ message: "Holiday deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
