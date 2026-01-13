const mongoose = require("mongoose"); // ✅ ADD THIS LINE

const leaveApplicationSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },

    applicationDate: {
      type: Date,
      default: Date.now,
    },

    leaveType: { type: String, required: true },

    leaveInHand: {
      type: Number,
      default: 0,
    },

    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },

    noOfDays: { type: Number, required: true },

    reason: { type: String, default: "" },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    // Inside LeaveApplication Schema
      reportingManager: { type: String },
      departmentHead: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);
