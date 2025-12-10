// controllers/shiftController.js
const Shift = require("../models/Shift");
const Activity = require("../models/Activity"); // Import Activity model

// Auto-generate ShiftID
const generateShiftID = async () => {
  const last = await Shift.findOne().sort({ shiftID: -1 });
  let nextNumber = 1;
  if (last && last.shiftID) {
    const match = last.shiftID.match(/SHF(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `SHF${String(nextNumber).padStart(2, "0")}`;
};

// Get next shift ID (API)
exports.getNextShiftID = async (req, res) => {
  try {
    const code = await generateShiftID();
    res.json({ shiftID: code });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate ID" });
  }
};

// Create shift
exports.createShift = async (req, res) => {
  try {
    const { shiftName, startTime, endTime, breakDuration, status } = req.body;

    // Check duplicate by shiftName
    const existingShift = await Shift.findOne({ shiftName });
    if (existingShift) {
      return res.status(400).json({ error: "Shift name already exists" });
    }

    // Generate ID
    const newId = await generateShiftID();

    const newShift = new Shift({
      shiftID: newId,
      shiftName,
      startTime,
      endTime,
      breakDuration,
      status,
    });

    await newShift.save();

    // Log activity
    try {
      await Activity.create({
        text: `Shift created: ${shiftName} (${newId})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.status(201).json(newShift);
  } catch (err) {
    res.status(500).json({ error: "Failed to create shift" });
  }
};

// Get all shifts
exports.getAllShifts = async (req, res) => {
  try {
    const shifts = await Shift.find();
    res.json(shifts);
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
};

// Update shift
exports.updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Prevent overwriting shiftID
    if (updateData.shiftID) delete updateData.shiftID;

    // Prevent duplicate shiftName
    if (updateData.shiftName) {
      const exists = await Shift.findOne({ shiftName: updateData.shiftName, _id: { $ne: id } });
      if (exists) return res.status(400).json({ error: "Shift name already exists" });
    }

    const updated = await Shift.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Shift not found" });

    // Log activity
    try {
      await Activity.create({
        text: `Shift updated: ${updated.shiftName} (${updated.shiftID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete shift
exports.deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    // Log activity
    try {
      await Activity.create({
        text: `Shift deleted: ${shift.shiftName} (${shift.shiftID})`,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json({ message: "Shift deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
