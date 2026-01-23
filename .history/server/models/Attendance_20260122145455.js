const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  // Link to Employee Master
  employeeId: { type: String, required: true },     // e.g., "101"
  employeeUserId: { type: String, required: true }, // e.g., "EMP1"
  employeeName: { type: String, required: true },
  
  month: { type: Number, required: true },          // 1-12
  year: { type: Number, required: true },           // 2026
  financialYear: { type: String, required: true },  // "2025-2026"
  
  // Daily records stored in an array
  records: [
    {
      date: { type: String },         // "2026-01-15"
      status: { type: String, default: "Present" }, 
      checkInTime: { type: String },
      checkOutTime: { type: String },
      workDuration: { type: String, default: "--" },
      shiftCode: { type: String },
      shiftStartTime: { type: String, default: "--" },
      shiftEndTime: { type: String, default: "--" },
      isLate: { type: Boolean, default: false },
      source: { type: String, default: "Web" }
    }
  ]
}, { timestamps: true });

// Prevent duplicate month documents for same employee
attendanceSchema.index({ employeeUserId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);