const Activity = require("../models/Activity");

/**
 * @param {Object} req - The request object to get current user info
 * @param {String} action - "ADD", "UPDATE", or "DELETE"
 * @param {String} module - e.g., "Employee Master", "Department"
 * @param {String} details - Detailed description of the change
 */
const logActivity = async (req, action, module, details) => {
  try {
    await Activity.create({
      employeeUserId: req.user?.employeeUserId || "SYSTEM",
      name: req.user?.name || "System Admin",
      action,
      module,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
    });
  } catch (err) {
    console.error("Critical: Activity Log failed", err.message);
  }
};

module.exports = logActivity;