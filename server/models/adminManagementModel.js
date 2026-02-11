const mongoose = require("mongoose");

const adminManagementSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true }, // "dorika" login
    employeeID: { type: String, default: "" },             // "P-00001"
    employeeUserId: { type: String, default: "" },         // "DH-00001"
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Admin", "HR", "Manager", "Employee"], default: "HR" },
    permissions: [{ type: String }],
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminManagement", default: null }
  },
  { timestamps: false }
);

module.exports = mongoose.models.AdminManagement || mongoose.model("AdminManagement", adminManagementSchema);