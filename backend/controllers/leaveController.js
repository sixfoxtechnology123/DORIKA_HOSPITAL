// controllers/leaveController.js
import LeaveApplication from "../models/LeaveApplication.js"; // Note the .js extension is required in ESM

export const getAllLeaveHistory = async (req, res) => {
  try {
    // Fetch all records from leaveapplicationmaster
    const history = await LeaveApplication.find().sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching leave history:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};