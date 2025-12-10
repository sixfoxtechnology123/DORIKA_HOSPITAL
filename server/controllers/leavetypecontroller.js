const LeaveType = require("../models/LeaveType");
const Activity = require("../models/Activity");

// Auto-generate LeaveTypeID
const generateLeaveTypeID = async () => {
  const last = await LeaveType.findOne().sort({ leaveTypeID: -1 });
  let nextNumber = 1;
  if (last && last.leaveTypeID) {
    const match = last.leaveTypeID.match(/LVT(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `LVT${String(nextNumber).padStart(2, "0")}`;
};

// Get next LeaveTypeID
exports.getNextLeaveTypeID = async (req, res) => {
  try {
    const code = await generateLeaveTypeID();
    res.json({ leaveTypeID: code });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate ID" });
  }
};

// Create leave type
exports.createLeaveType = async (req, res) => {
  try {
    const { leaveTypeID, leaveName, leaveCode, annualQuota, carryForward, status,remarks } = req.body;

    // if (!leaveTypeID || !leaveName ) {
    //   return res.status(400).json({ message: "All fields are required" });
    // }

    const leaveType = new LeaveType({
      leaveTypeID,
      leaveName,
      leaveCode,
      // annualQuota,
      // carryForward,
      // status,
      remarks
    });

    const savedLeaveType = await leaveType.save();

    // Log activity
    try {
      await Activity.create({ text: `Leave Type Added: ${savedLeaveType.leaveName} (${savedLeaveType.leaveTypeID})` });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.status(201).json(savedLeaveType);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all leave types
exports.getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();
    res.json(leaveTypes);
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch leave types" });
  }
};

// Update leave type
exports.updateLeaveType = async (req, res) => {
  try {
    const updated = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Leave type not found" });

    // Log activity
    try {
      await Activity.create({ text: `Leave Type Updated: ${updated.leaveName} (${updated.leaveTypeID})` });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete leave type
exports.deleteLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByIdAndDelete(req.params.id);
    if (!leaveType) return res.status(404).json({ message: "Leave type not found" });

    // Log activity
    try {
      await Activity.create({ text: `Leave Type Deleted: ${leaveType.leaveName} (${leaveType.leaveTypeID})` });
    } catch (err) {
      console.error("Activity log failed:", err.message);
    }

    res.json({ message: "Leave type deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
