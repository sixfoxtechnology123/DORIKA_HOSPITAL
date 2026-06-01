const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    changedBy: {
      loginUserId: String,
      name: String,
      role: String,
    },
    targetUser: {
      employeeID: String,
      name: String,
    },
    changedDetails: {
      module: { type: String, required: true },
      action: { type: String, required: true },
      details: { type: String, required: true },
      ipAddress: String,
    },
    changedSet: {
      previous: mongoose.Schema.Types.Mixed,
      current: mongoose.Schema.Types.Mixed,
    },
    metaData: { type: mongoose.Schema.Types.Mixed, default: null },
    text: String,
    actionAt: { type: Date, default: Date.now, index: true },
    actionDate: String,
    actionTime: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
