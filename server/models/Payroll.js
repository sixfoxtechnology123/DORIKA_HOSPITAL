// models/PayrollComponent.js
const mongoose = require("mongoose");

const payrollComponentSchema = new mongoose.Schema({
  componentID: { type: String, required: true, unique: true },
  componentName: { type: String, required: true, unique: true },
  type: { type: String, enum: ["Earning", "Deduction"], required: true },
  calculationType: { type: String, enum: ["Fixed", "Percentage"], required: true },
  percentageOf: { type: String, default: "" },
  taxable: { type: String, enum: ["Yes", "No"], default: "Yes" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
});

module.exports = mongoose.model("Payroll_Component_Master", payrollComponentSchema);
