import LeaveAllocation from "../models/LeaveAllocation.js";
import LeaveRule from "../models/LeaveRule.js"; // import LeaveRule model

// Create Leave Allocation
export const createLeaveAllocation = async (req, res) => {
  try {
    const newAllocation = new LeaveAllocation(req.body);
    await newAllocation.save();
    res.status(201).json({ message: "Leave Allocation Saved Successfully" });
  } catch (error) {
    console.error("Error in createLeaveAllocation:", error);
    res.status(500).json({ error: "Failed to save Leave Allocation" });
  }
};

// Get All Leave Allocations
export const getAllLeaveAllocations = async (req, res) => {
  try {
    const allocations = await LeaveAllocation.find().sort({ createdAt: 1 });
    res.status(200).json(allocations);
  } catch (error) {
    console.error("Error in getAllLeaveAllocations:", error);
    res.status(500).json({ error: "Failed to fetch Leave Allocations" });
  }
};

// Get Single Leave Allocation by ID
export const getLeaveAllocationById = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findById(req.params.id);
    if (!allocation)
      return res.status(404).json({ error: "Leave Allocation not found" });
    res.status(200).json(allocation);
  } catch (error) {
    console.error("Error in getLeaveAllocationById:", error);
    res.status(500).json({ error: "Failed to fetch Leave Allocation" });
  }
};

// Update Leave Allocation
export const updateLeaveAllocation = async (req, res) => {
  try {
    const updated = await LeaveAllocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated)
      return res.status(404).json({ error: "Leave Allocation not found" });
    res.status(200).json({ message: "Leave Allocation updated successfully", updated });
  } catch (error) {
    console.error("Error in updateLeaveAllocation:", error);
    res.status(500).json({ error: "Failed to update Leave Allocation" });
  }
};

// Delete Leave Allocation
export const deleteLeaveAllocation = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findByIdAndDelete(req.params.id);
    if (!allocation)
      return res.status(404).json({ error: "Leave Allocation not found" });
    res.status(200).json({ message: "Leave Allocation deleted successfully" });
  } catch (error) {
    console.error("Error in deleteLeaveAllocation:", error);
    res.status(500).json({ error: "Failed to delete Leave Allocation" });
  }
};

// Get All Leave Rules
export const getAllLeaveRules = async (req, res) => {
  try {
    const leaveRules = await LeaveRule.find(); // fetch all keys and values from leave rule
    res.status(200).json(leaveRules);
  } catch (err) {
    console.error("Error in getAllLeaveRules:", err);
    res.status(500).json({ message: "Failed to fetch leave rules", error: err.message });
  }
};
