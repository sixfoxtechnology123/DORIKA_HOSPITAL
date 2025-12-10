const mongoose = require("mongoose");

const EmployeeUserIdSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeeUserId", EmployeeUserIdSchema);
