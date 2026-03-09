const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  changedDetails: {
    action: { type: String, required: true, alias: "action" },
    module: { type: String, required: true, alias: "module" },
    details: { type: String, required: true, alias: "details" },
  },
  ipAddress: { type: String },
  changedBy: {
    loginUserId: { type: String, required: true, index: true, alias: "employeeUserId" },
    employeeUserId: { type: String, default: "" },
    employeeID: { type: String, default: "" },
    name: { type: String, required: true, alias: "name" },
    role: { type: String, default: "" },
    department: { type: String, default: "" },
    designation: { type: String, default: "" },
  },
  targetUser: {
    employeeUserId: { type: String, default: "" },
    employeeID: { type: String, default: "" },
    name: { type: String, default: "" },
    department: { type: String, default: "" },
    designation: { type: String, default: "" },
  },
  changedSet: {
    previous: { type: mongoose.Schema.Types.Mixed, default: null },
    current: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  metaData: { type: mongoose.Schema.Types.Mixed, default: null },
  text: { type: String, default: "" },
  actionDate: { type: String, default: "" },
  actionTime: { type: String, default: "" },
}, { 
  timestamps: true // Automatically adds precise createdAt and updatedAt
});

activitySchema.pre("validate", function (next) {
  if (!this.changedBy) this.changedBy = {};
  if (!this.changedDetails) this.changedDetails = {};
  if (!this.targetUser) this.targetUser = {};
  if (!this.changedSet) this.changedSet = {};

  if (!this.changedBy.loginUserId) this.changedBy.loginUserId = "SYSTEM";
  if (!this.changedBy.name) this.changedBy.name = "System";

  if (!this.changedDetails.details && this.text) {
    this.changedDetails.details = this.text;
  }

  if (!this.changedDetails.action) {
    const text = String(this.text || this.changedDetails.details || "").toUpperCase();
    if (text.includes("DELETE")) this.changedDetails.action = "DELETE";
    else if (text.includes("UPDATE")) this.changedDetails.action = "UPDATE";
    else if (text.includes("ADD") || text.includes("CREATE")) this.changedDetails.action = "CREATE";
    else this.changedDetails.action = "INFO";
  }

  if (!this.changedDetails.module) {
    this.changedDetails.module = "General";
  }

  if (!this.actionDate || !this.actionTime) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    this.actionDate = this.actionDate || `${dd}-${mm}-${yyyy}`;
    this.actionTime = this.actionTime || `${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${meridiem}`;
  }

  next();
});

module.exports = mongoose.model("Activity", activitySchema);
