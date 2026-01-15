const mongoose = require("mongoose"); 
const Employee = require("../models/Employee");

const leaveApplicationSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    employeeUserId: { type: String, required: true },
    applicationDate: {
      type: String,
      default: Date.now,
    },

    leaveType: { type: String, required: true },

    leaveInHand: {
      type: Number,
      default: 0,
    },

    fromDate: { type: String, required: true }, // Change from Date to String
    toDate: { type: String, required: true },

    noOfDays: { type: Number, required: true },

    reason: { type: String, default: "" },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    // Inside LeaveApplication Schema
    reportingManager: { type: String },
    reportingManagerEmpID: { type: String },
    reportingManagerEmployeeUserId: { type: String },
    departmentHead: { type: String },
    departmentHeadEmpID: { type: String },
    departmentHeadEmployeeUserId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);
