// controllers/leaveRuleController.js
const LeaveRule = require("../models/LeaveRule");
const LeaveType = require("../models/Leavetype");

// Create Leave Rule
exports.createLeaveRule = async (req, res) => {
  try {
    const { leaveType, ...rest } = req.body;

    // If leaveType is an ID, fetch its name
    const leaveTypeData = await LeaveType.findOne({ _id: leaveType });
    if (!leaveTypeData) return res.status(400).json({ message: "Invalid leave type" });

    // Save leave rule with leaveType name
    const leaveRule = new LeaveRule({
      ...rest,
      leaveType: leaveTypeData.leaveName // store name, not ID
    });

    await leaveRule.save();
    res.status(201).json(leaveRule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save leave rule" });
  }
};

// controllers/leaveRuleController.js
exports.getAllLeaveRules = async (req, res) => {
  try {
    const rules = await LeaveRule.find().sort({ createdAt: -1 });
    res.status(200).json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leave rules" });
  }
};


// Get Single Leave Rule
exports.getLeaveRuleById = async (req, res) => {
  try {
    const rule = await LeaveRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: "Leave rule not found" });
    res.status(200).json(rule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching leave rule" });
  }
};

// Update Leave Rule
exports.updateLeaveRule = async (req, res) => {
  try {
    const rule = await LeaveRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ message: "Leave rule not found" });
    res.status(200).json(rule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update leave rule" });
  }
};

// Delete Leave Rule
exports.deleteLeaveRule = async (req, res) => {
  try {
    const rule = await LeaveRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ message: "Leave rule not found" });
    res.status(200).json({ message: "Leave rule deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete leave rule" });
  }
};

// Get All Leave Types for Dropdown
exports.getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find().sort({ leaveName: 1 });
    res.status(200).json(leaveTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leave types" });
  }
};
