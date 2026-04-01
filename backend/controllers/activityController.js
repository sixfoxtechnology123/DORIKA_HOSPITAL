const Activity = require("../models/Activity");

exports.getActivities = async (req, res) => {
  try {
    const { employeeUserId, startDate, endDate, page, limit } = req.query;
    let query = {};

    // 1. FIX DATE RANGE (Include the full end day)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    if (employeeUserId) query["changedBy.loginUserId"] = employeeUserId;

    const shouldPaginate = Number.isFinite(Number(page)) && Number.isFinite(Number(limit));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
    const total = shouldPaginate ? await Activity.countDocuments(query) : null;

    let activityQuery = Activity.find(query).sort({ createdAt: -1 });
    if (shouldPaginate) {
      activityQuery = activityQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }
    const activities = await activityQuery;

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

    if (shouldPaginate) {
      res.json({ rows: normalized, total, page: safePage, limit: safeLimit });
      return;
    }
    res.json(normalized);
  } catch (err) {
    console.error("Activity Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};
