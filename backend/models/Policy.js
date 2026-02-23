const mongoose = require("mongoose");

const policySchema = new mongoose.Schema({
  policyID: { type: String, required: true, unique: true },
  policyName: { type: String, required: true },
  policyDocument: { type: String },   // filename stored here
  effectiveDate: { type: String, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
});

module.exports =
  mongoose.models.Policy_Master ||
  mongoose.model("Policy_Master", policySchema);

