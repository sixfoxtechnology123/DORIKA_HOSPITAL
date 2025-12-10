const mongoose = require("mongoose");

const leaveRuleSchema = new mongoose.Schema({
  leaveType: { type: String, required: true }, // store leaveName
  maximumNo: { type: Number, required: true },
  entitledFromMonth: { type: String, required: true },
  maximumBalance: { type: Number, required: true },
  effectiveFrom: { type: String, required: true },
  effectiveTo: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.Leave_Rule_Master ||
  mongoose.model("Leave_Rule_Master", leaveRuleSchema);
