const Attendance = require("../models/Attendance");
const Leave = require("../models/LeaveApplication");
const ShiftMaster = require("../models/Shift");
const ShiftManagement = require("../models/ShiftManagement");

// --- HELPER FUNCTIONS ---

const parseTimeToMinutes = (t) => {
  if (!t || typeof t !== "string") return 0;
  try {
    const normalized = t.replace(".", ":");
    const [time, modifier] = normalized.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + (minutes || 0);
  } catch (e) {
    return 0;
  }
};

const calculateDuration = (inTime, outTime) => {
  if (!inTime || !outTime || inTime === "--" || outTime === "--") return "--";
  const start = parseTimeToMinutes(inTime);
  const end = parseTimeToMinutes(outTime);
  let diff = end - start;
  if (diff <= 0) return "--";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
};

// --- MAIN CONTROLLER ---

const markDailyAttendance = async (req, res) => {
  try {
    const { employeeId, employeeUserId, employeeName } = req.body;

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const dayKey = now.getDate();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const shiftMonthStr = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const fy = currentMonth <= 3 ? `${currentYear - 1}-${currentYear}` : `${currentYear}-${currentYear + 1}`;

    // 0. Fetch Shift Management for the month (Needed for Gap Filling and Today)
    const shiftMgmt = await ShiftManagement.findOne({ employeeUserId, month: shiftMonthStr }).lean();
    if (!shiftMgmt) {
      return res.status(400).json({ message: "No shift schedule found for this month in Master." });
    }

    // 1. Get/Create Attendance Record
    let attendance = await Attendance.findOne({ employeeUserId, month: currentMonth, year: currentYear });
    if (!attendance) {
      attendance = new Attendance({
        employeeId, employeeUserId, employeeName,
        month: currentMonth, year: currentYear, financialYear: fy,
        records: []
      });
    }

    // 2. CHECK FOR CHECK-OUT (Already checked in today?)
    const todayIndex = attendance.records.findIndex(r => r.date === todayStr);
    if (todayIndex !== -1) {
      const record = attendance.records[todayIndex];
      if (record.checkInTime && (!record.checkOutTime || record.checkOutTime === "" || record.checkOutTime === "--")) {
        record.checkOutTime = currentTime;
        record.workDuration = calculateDuration(record.checkInTime, currentTime);
        await attendance.save();
        return res.status(200).json({ message: "Check-out time recorded!" });
      } else {
        return res.status(400).json({ message: "Attendance for today is already completed." });
      }
    }
    // 3. GAP-FILLING LOGIC (Shift-based, no Holidays)
    if (attendance.records.length > 0) {
      const lastRecord = attendance.records[attendance.records.length - 1];
      const lastDate = new Date(lastRecord.date);
      const todayDate = new Date(todayStr);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      for (let i = 1; i < diffDays; i++) {
        const gapDate = new Date(lastDate);
        gapDate.setDate(gapDate.getDate() + i);
        const gapDateStr = gapDate.toLocaleDateString('en-CA');
        const gapDayNum = gapDate.getDate();

        // Get shift for this gap day from ShiftManagement
        const gapShiftCode = shiftMgmt.shifts[gapDayNum] || shiftMgmt.shifts[gapDayNum.toString()];
        const isOffDay = gapShiftCode === "OFF";

        // Check if employee was on approved leave during this gap day
        const approvedLeave = await Leave.findOne({
          employeeUserId,
          approveRejectedStatus: "APPROVED",
          fromDate: { $lte: gapDateStr },
          toDate: { $gte: gapDateStr }
        });

        let finalStatus = "Absent";
        if (approvedLeave) {
          const leaveCode = approvedLeave.leaveType === "SICK" ? "SL" : "CL";
          finalStatus = isOffDay ? `${leaveCode}(OFF)` : leaveCode;
        } else if (isOffDay) {
          finalStatus = "OFF";
        }

        attendance.records.push({
          date: gapDateStr,
          status: finalStatus,
          checkInTime: "--",
          checkOutTime: "--",
          workDuration: "--",
          shiftCode: gapShiftCode || "--"
        });
      }
    }
// 4. TODAY'S ATTENDANCE LOGIC
    const assignedShiftCode = shiftMgmt.shifts[dayKey] || shiftMgmt.shifts[dayKey.toString()];
    
    if (!assignedShiftCode || assignedShiftCode === "OFF") {
      return res.status(400).json({ 
        message: assignedShiftCode === "OFF" ? "Today is your OFF day." : "No shift assigned for today." 
      });
    }

    const shiftMaster = await ShiftMaster.findOne({ shiftCode: assignedShiftCode }).lean();
    if (!shiftMaster) {
      return res.status(400).json({ message: "Shift timing details not found." });
    }

    const startMin = parseTimeToMinutes(shiftMaster.startTime);
    const endMin = parseTimeToMinutes(shiftMaster.endTime);
    const currentMin = (now.getHours() * 60) + now.getMinutes();
    
    // Handle Night Shifts
    let adjustedEndMin = endMin < startMin ? endMin + 1440 : endMin;

    // --- 15 MIN EARLY LOGIC ---
    const earlyLimit = startMin - 15;
    if (currentMin < earlyLimit) {
      return res.status(400).json({ 
        message: `Too early! Shift starts at ${shiftMaster.startTime}. You can check in 15 mins before.` 
      });
    }

    // --- SHIFT ENDED LOGIC ---
    if (currentMin > adjustedEndMin) {
      return res.status(400).json({ 
        message: `Shift ended at ${shiftMaster.endTime}. You cannot mark attendance now.` 
      });
    }

    // --- STATUS & LATE ENTRY LOGIC ---
    let todayStatus = "Present";
    let lateEntry = false;
    const graceThreshold = startMin + 15;

    if (currentMin > graceThreshold) {
      lateEntry = true;
      // Note: Keep status "Present" but flag as late for the frontend
    }

    attendance.records.push({
      date: todayStr,
      status: todayStatus,
      checkInTime: currentTime,
      checkOutTime: "",
      workDuration: "--",
      shiftCode: assignedShiftCode,
      shiftStartTime: shiftMaster.startTime, // Storing start time
      shiftEndTime: shiftMaster.endTime,     // Storing end time
      isLate: lateEntry                      // Storing late flag
    });

    await attendance.save();

    return res.status(200).json({ 
      message: lateEntry ? "Late Entry Marked!" : "Check-in successful!",
      status: todayStatus,
      isLate: lateEntry
    });

  } catch (error) {
    console.error("ATTENDANCE_ERROR:", error); 
    return res.status(500).json({ message: "Server Error: " + error.message });
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