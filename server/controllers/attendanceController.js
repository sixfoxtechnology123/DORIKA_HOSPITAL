const Attendance = require("../models/Attendance");
const Leave = require("../models/LeaveApplication");

const markDailyAttendance = async (req, res) => {
  try {
    const { employeeId, employeeUserId, employeeName } = req.body;
    
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); 
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
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

    // 1. CHECK IF USER IS MARKING "OUT" FOR TODAY
    const todayIndex = attendance.records.findIndex(r => r.date === todayStr);

    if (todayIndex !== -1) {
      if (attendance.records[todayIndex].checkInTime && !attendance.records[todayIndex].checkOutTime) {
        attendance.records[todayIndex].checkOutTime = currentTime;
        await attendance.save();
        return res.status(200).json({ message: "Check-out time recorded!" });
      } else {
        return res.status(400).json({ message: "Attendance for today is already completed." });
      }
    }

    // 2. MARKING "IN" (GAP-FILLING LOGIC)
    if (attendance.records.length > 0) {
      const lastRecord = attendance.records[attendance.records.length - 1];
      const lastDate = new Date(lastRecord.date);
      const todayDate = new Date(todayStr);

      const diffTime = todayDate - lastDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // This loop checks every day between the last entry and today
      for (let i = 1; i < diffDays; i++) {
        const gapDate = new Date(lastDate);
        gapDate.setDate(gapDate.getDate() + i);
        const gapDateStr = gapDate.toLocaleDateString('en-CA');
        
        const isSunday = gapDate.getDay() === 0;

        // Check if there is an APPROVED leave for this specific gap date
        const approvedLeave = await Leave.findOne({
          employeeUserId: employeeUserId,
          approveRejectedStatus: "APPROVED",
          fromDate: { $lte: gapDateStr },
          toDate: { $gte: gapDateStr }
        });

        let finalStatus = "";
        if (approvedLeave) {
          const leaveCode = approvedLeave.leaveType === "SICK" ? "SL" : "CL";
          // If it's Sunday AND employee is on Leave -> SL(Holiday)
          finalStatus = isSunday ? `${leaveCode}(Holiday)` : leaveCode;
        } else if (isSunday) {
          // If it's just Sunday and NO leave -> Holiday
          finalStatus = "Holiday";
        } else {
          // No leave and no Sunday -> Absent
          finalStatus = "Absent";
        }

        attendance.records.push({
          date: gapDateStr,
          status: finalStatus,
          checkInTime: "--",
          checkOutTime: "--"
        });
      }
    }

    // 3. FINALLY MARK TODAY AS PRESENT (IN-TIME)
    attendance.records.push({
      date: todayStr,
      status: "Present",
      checkInTime: currentTime,
      checkOutTime: "" 
    });

    await attendance.save();
    res.status(200).json({ message: "Check-in time recorded!" });
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

module.exports = { markDailyAttendance, getMyAttendance };