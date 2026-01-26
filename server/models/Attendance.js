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
      actualWorkDuration: { type: String, default: "--" },
      shiftCode: { type: String },
      shiftStartTime: { type: String, default: "--" },
      shiftEndTime: { type: String, default: "--" },
      isLate: { type: Boolean, default: false },
      source: { type: String, default: "Web" }
    }
  ],
  totalPresent: { type: Number, default: 0 },
  totalAbsent: { type: Number, default: 0 },
  totalOff: { type: Number, default: 0 },
  totalLeave: { type: Number, default: 0 }
}, { timestamps: true });

// Prevent duplicate month documents for same employee
attendanceSchema.index({ employeeUserId: 1, month: 1, year: 1 }, { unique: true });

attendanceSchema.pre("save", function (next) {
  const doc = this;
  if (doc.records && doc.records.length > 0) {
    let presentCount = 0;
    let absentCount = 0;
    let offCount = 0;
    let leaveCount = 0;
    let doubleShiftCredits = 0; // To track how many extra shifts were worked

    const processedDates = new Set();

    doc.records.forEach(record => {
      if (!record.date || processedDates.has(record.date)) return;
      processedDates.add(record.date);

      const status = record.status;
      const shift = record.shiftCode || "";
      
      // Detection for Double Shifts (EN, ME, MN, etc.)
      const isDoubleShift = shift.length === 2 && !["DD", "G", "OFF"].includes(shift);

      if (status === "Present") {
        if (isDoubleShift) {
          presentCount += 2;
          doubleShiftCredits += 1; // Mark that 1 extra day was covered
        } else {
          presentCount += 1;
        }
      } 
      else if (status === "Absent") {
        absentCount += 1;
      } 
      else if (status === "OFF") {
        offCount += 1;
      } 
      else if (["SL", "CL", "SL(OFF)", "CL(OFF)"].includes(status)) {
        leaveCount += 1;
      }
    });

    // --- The Logic you requested ---
    // Subtract the extra double-shift days from the absent total
    // so the total sum of days remains the same.
    doc.totalAbsent = Math.max(0, absentCount - doubleShiftCredits);
    
    doc.totalPresent = presentCount;
    doc.totalOff = offCount;
    doc.totalLeave = leaveCount;
  }
  next();
});
module.exports = mongoose.model("Attendance", attendanceSchema);