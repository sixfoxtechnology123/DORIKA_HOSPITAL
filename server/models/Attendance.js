const mongoose = require("mongoose");
const moment = require("moment"); // Ensure moment is installed: npm install moment

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeUserId: { type: String, required: true },
  employeeName: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  financialYear: { type: String, required: true },
  
  records: [
    {
      date: { type: String },
      status: { type: String, default: "Present" }, 
      checkInTime: { type: String },
      checkOutTime: { type: String },
      workDuration: { type: String, default: "--" },
      actualWorkDuration: { type: String, default: "--" },
      shiftCode: { type: String },
      shiftStartTime: { type: String, default: "--" },
      shiftEndTime: { type: String, default: "--" },
      isLate: { type: Boolean, default: false },
      isOT: { type: Boolean, default: false }, // Store if OT triggered
      otHours: { type: Number, default: 0 },   // Store day-wise OT hours
      source: { type: String, default: "Web" }
    }
  ],
  totalPresent: { type: Number, default: 0 },
  totalAbsent: { type: Number, default: 0 },
  totalOff: { type: Number, default: 0 },
  totalLeave: { type: Number, default: 0 },
  totalOTHours: { type: Number, default: 0 },
  totalPaidDays: { type: Number, default: 0 },
}, { timestamps: true });

attendanceSchema.index({ employeeUserId: 1, month: 1, year: 1 }, { unique: true });

attendanceSchema.pre("save", function (next) {
  const doc = this;
  if (doc.records && doc.records.length > 0) {
    let presentCount = 0;
    let absentCount = 0;
    let offCount = 0;
    let leaveCount = 0;
    let doubleShiftCredits = 0;
    let monthlyOTSum = 0;

    const processedDates = new Set();

    const durationToMinutes = (durStr) => {
      if (!durStr || durStr === "--") return 0;
      const match = durStr.match(/(\d+)h\s*(\d+)m/);
      if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      }
      return 0;
    };

    doc.records.forEach(record => {
      // --- START UPDATED OT LOGIC ---
      if (record.status === "Present" && record.actualWorkDuration !== "--" && record.workDuration !== "--") {
        
        const actualMins = durationToMinutes(record.actualWorkDuration);
        const shiftMins = durationToMinutes(record.workDuration);

        const extraMins = actualMins - shiftMins;

        if (extraMins > 240) {
          record.isOT = true;
          // Store the exact difference (3 mins / 60 = 0.05 hours)
          record.otHours = parseFloat((extraMins / 60).toFixed(4));
        } else {
          record.isOT = false;
          record.otHours = 0;
        }
      } else {
        record.isOT = false;
        record.otHours = 0;
      }

      monthlyOTSum += record.otHours || 0;
      // --- END UPDATED OT LOGIC ---

      if (!record.date || processedDates.has(record.date)) return;
      processedDates.add(record.date);

      const status = record.status;
      const shift = record.shiftCode || "";
      const isDoubleShift = shift.length === 2 && !["DD", "G", "OFF"].includes(shift);

      if (status === "Present") {
        if (isDoubleShift) {
          presentCount += 2;
          doubleShiftCredits += 1;
        } else {
          presentCount += 1;
        }
      } else if (status === "Absent") {
        absentCount += 1;
      } else if (status === "OFF") {
        offCount += 1;
      } else if (["SL", "CL", "SL(OFF)", "CL(OFF)"].includes(status)) {
        leaveCount += 1;
      }
    });

    doc.totalAbsent = Math.max(0, absentCount - doubleShiftCredits);
    doc.totalPresent = presentCount;
    doc.totalOff = offCount;
    doc.totalLeave = leaveCount;
    // Store monthly total with 2 decimal precision for display
    doc.totalOTHours = parseFloat(monthlyOTSum.toFixed(2));
  }
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);