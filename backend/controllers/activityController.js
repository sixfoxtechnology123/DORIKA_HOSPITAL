const Activity = require("../models/Activity");

// Get activities with optional filtering
exports.getActivities = async (req, res) => {
  try {
    const { employeeUserId, startDate, endDate } = req.query;
    let query = {};

    // Filter by User if provided
    if (employeeUserId) query.employeeUserId = employeeUserId;

    // Filter by Date Range if provided
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(100);             // Increased limit for better visibility
      
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};