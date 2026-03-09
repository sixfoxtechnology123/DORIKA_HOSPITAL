const Activity = require("../models/Activity");

// Get activities with optional filtering
exports.getActivities = async (req, res) => {
  try {
    const { employeeUserId, startDate, endDate } = req.query;
    let query = {};

    // Filter by Date Range if provided
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (employeeUserId) query["changedBy.loginUserId"] = employeeUserId;

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(100);             // Increased limit for better visibility

    const normalized = activities.map((activity) => {
      const row = activity.toObject();
      return {
        ...row,
        employeeUserId: row.changedBy?.loginUserId || "",
        name: row.changedBy?.name || "",
        action: row.changedDetails?.action || "",
        module: row.changedDetails?.module || "",
        details: row.changedDetails?.details || row.text || "",
        targetUser: row.targetUser || {},
        changedSet: row.changedSet || {},
        metaData: row.metaData || null,
      };
    });

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};
