const Attendance = require("../models/Attendance");
const Leave = require("../models/LeaveApplication"); // Ensure you import your Leave model

const markDailyAttendance = async (req, res) => {
  try {
    const { employeeId, employeeUserId, employeeName } = req.body;
    
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // "YYYY-MM-DD"
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const fy = currentMonth <= 3 ? `${currentYear-1}-${currentYear}` : `${currentYear}-${currentYear+1}`;

    let attendance = await Attendance.findOne({ employeeUserId, month: currentMonth, year: currentYear });

    if (!attendance) {
      attendance = new Attendance({
        employeeId, employeeUserId, employeeName,
        month: currentMonth, year: currentYear, financialYear: fy,
        records: []
      });
    }

    // --- ENHANCED AUTOMATIC SCANNING LOGIC ---
    if (attendance.records.length > 0) {
      const lastRecord = attendance.records[attendance.records.length - 1];
      const lastDate = new Date(lastRecord.date);
      const todayDate = new Date(todayStr);

      const diffTime = todayDate - lastDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      for (let i = 1; i < diffDays; i++) {
        const gapDate = new Date(lastDate);
        gapDate.setDate(gapDate.getDate() + i);
        const gapDateStr = gapDate.toLocaleDateString('en-CA');

        // 1. Check if this gap day is a Sunday
        if (gapDate.getDay() === 0) {
          attendance.records.push({
            date: gapDateStr,
            status: "Holiday",
            checkInTime: "--",
          });
        } else {
          // 2. Check if there is an APPROVED leave for this gap date
          const approvedLeave = await Leave.findOne({
            employeeUserId: employeeUserId,
            approveRejectedStatus: "APPROVED",
            fromDate: { $lte: gapDateStr },
            toDate: { $gte: gapDateStr }
          });

          if (approvedLeave) {
            // Mark as SL or CL based on the leave type
            attendance.records.push({
              date: gapDateStr,
              status: approvedLeave.leaveType === "SICK" ? "SL" : "CL",
              checkInTime: "--",
            });
          } else {
            // 3. If no holiday and no leave, mark Absent
            attendance.records.push({
              date: gapDateStr,
              status: "Absent",
              checkInTime: "--",
            });
          }
        }
      }
    }

    // Mark today as Present
    const alreadyMarked = attendance.records.find(r => r.date === todayStr);
    if (!alreadyMarked) {
      attendance.records.push({
        date: todayStr,
        status: "Present",
        checkInTime: currentTime,
      });
    }

    await attendance.save();
    res.status(200).json({ message: "Attendance updated!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const { employeeUserId } = req.params;
    const history = await Attendance.find({ employeeUserId }).sort({ year: -1, month: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CRITICAL: Use module.exports for CommonJS
module.exports = {
  markDailyAttendance,
  getMyAttendance
};