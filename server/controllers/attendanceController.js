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

const calculateActualDuration = (inTime, outTime) => {
  if (!inTime || !outTime || inTime === "--" || outTime === "--" || outTime === "") return "--";
  const start = parseTimeToMinutes(inTime);
  let end = parseTimeToMinutes(outTime);
  
  // Handle midnight crossing for actual punch
  if (end < start) end += 1440;
  
  const diff = end - start;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
};

const calculateDuration = (shiftStart, shiftEnd) => {
  if (!shiftStart || !shiftEnd || shiftStart === "--" || shiftEnd === "--") return "--";

  const shStartMin = parseTimeToMinutes(shiftStart);
  let shEndMin = parseTimeToMinutes(shiftEnd);

  // Handle midnight crossing for Shift
  if (shEndMin < shStartMin) shEndMin += 1440;
  
  const diff = shEndMin - shStartMin;
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

    // 0. Fetch Shift Management for the month
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

// --- 2. UPDATED CHECK FOR CHECK-OUT (Night Shift Aware) ---

// A. First, check if there is an unclosed punch from YESTERDAY
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toLocaleDateString('en-CA');

const yesterdayIndex = attendance.records.findIndex(r => r.date === yesterdayStr);
const todayIndex = attendance.records.findIndex(r => r.date === todayStr);

let recordToUpdate = null;

if (yesterdayIndex !== -1) {
  const rec = attendance.records[yesterdayIndex];
  // If yesterday has a Check-In but NO Check-Out, this is the one we close
  if (rec.checkInTime && (!rec.checkOutTime || rec.checkOutTime === "" || rec.checkOutTime === "--")) {
    recordToUpdate = rec;
  }
}

// B. If no pending record yesterday, check today
if (!recordToUpdate && todayIndex !== -1) {
  const rec = attendance.records[todayIndex];
  if (rec.checkInTime && (!rec.checkOutTime || rec.checkOutTime === "" || rec.checkOutTime === "--")) {
    recordToUpdate = rec;
  }
}

// C. If we found a record to close (either yesterday's night shift or today's day shift)
if (recordToUpdate) {
  recordToUpdate.checkOutTime = currentTime;

  const shiftStartMin = parseTimeToMinutes(recordToUpdate.shiftStartTime);
  let shiftEndMin = parseTimeToMinutes(recordToUpdate.shiftEndTime);
  if (shiftEndMin < shiftStartMin) shiftEndMin += 1440; // Midnight cross for shift

  const scheduledMinutes = shiftEndMin - shiftStartMin;

  const punchInMin = parseTimeToMinutes(recordToUpdate.checkInTime);
  let punchOutMin = parseTimeToMinutes(currentTime);
  
  // If we are updating YESTERDAY'S record, the current time is on a new day
  // So we must add 24 hours to the punch-out time for duration calculation
  if (recordToUpdate.date === yesterdayStr) {
    punchOutMin += 1440;
  } else if (punchOutMin < punchInMin) {
    // Handling midnight cross for today's record (unlikely but safe)
    punchOutMin += 1440;
  }

  const actualMinutes = punchOutMin - punchInMin;
  const extraMinutes = actualMinutes - scheduledMinutes;

  if (extraMinutes > 240) {
    recordToUpdate.isOT = true;
    recordToUpdate.otHours = parseFloat((extraMinutes / 60).toFixed(4));
  } else {
    recordToUpdate.isOT = false;
    recordToUpdate.otHours = 0;
  }

  // Use the existing helper but ensure it handles cross-day
  recordToUpdate.workDuration = calculateDuration(recordToUpdate.shiftStartTime, recordToUpdate.shiftEndTime);
  
  // Recalculate Actual Duration manually to ensure night-shift accuracy
  const h = Math.floor(actualMinutes / 60);
  const m = actualMinutes % 60;
  recordToUpdate.actualWorkDuration = `${h}h ${m}m`;

  await attendance.save();
  return res.status(200).json({ message: "Check-out recorded successfully!" });
}

// --- 3. GAP-FILLING LOGIC ---
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

        const gapShiftCode = shiftMgmt.shifts[gapDayNum] || shiftMgmt.shifts[gapDayNum.toString()];
        const isOffDay = gapShiftCode === "OFF";

        // 🟢 NEW LOGIC FOR DD SHIFTS (EN, ME, etc.)
        let gapStartTime = "--";
        let gapEndTime = "--";

        if (gapShiftCode && gapShiftCode !== "OFF") {
            // Check if it is a Double Shift (2 characters and not 'DD')
            if (gapShiftCode.length === 2 && gapShiftCode !== "DD") {
                const firstCode = gapShiftCode[0];
                const secondCode = gapShiftCode[1];
                const firstShift = await ShiftMaster.findOne({ shiftCode: firstCode }).lean();
                const secondShift = await ShiftMaster.findOne({ shiftCode: secondCode }).lean();

                if (firstShift && secondShift) {
                    gapStartTime = firstShift.startTime;
                    gapEndTime = secondShift.endTime;
                }
            } else {
                // Single Shift logic
                const sMaster = await ShiftMaster.findOne({ shiftCode: gapShiftCode }).lean();
                if (sMaster) {
                    gapStartTime = sMaster.startTime;
                    gapEndTime = sMaster.endTime;
                }
            }
        }

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
            shiftCode: gapShiftCode || "--",
            shiftStartTime: gapStartTime,
            shiftEndTime: gapEndTime,
            workDuration: calculateDuration(gapStartTime, gapEndTime),
            actualWorkDuration: "--"
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

    let shiftStartTime, shiftEndTime;

    if (assignedShiftCode.length === 2 && assignedShiftCode !== "DD") {
      const firstCode = assignedShiftCode[0];
      const secondCode = assignedShiftCode[1];
      const firstShift = await ShiftMaster.findOne({ shiftCode: firstCode }).lean();
      const secondShift = await ShiftMaster.findOne({ shiftCode: secondCode }).lean();

      if (!firstShift || !secondShift) {
        return res.status(400).json({ message: `Shift components ${firstCode} or ${secondCode} not found.` });
      }
      shiftStartTime = firstShift.startTime;
      shiftEndTime = secondShift.endTime;
    } else {
      const shiftMaster = await ShiftMaster.findOne({ shiftCode: assignedShiftCode }).lean();
      if (!shiftMaster) {
        return res.status(400).json({ message: `Shift details for ${assignedShiftCode} not found.` });
      }
      shiftStartTime = shiftMaster.startTime;
      shiftEndTime = shiftMaster.endTime;
    }

    const startMin = parseTimeToMinutes(shiftStartTime);
    const endMin = parseTimeToMinutes(shiftEndTime);
    const currentMin = (now.getHours() * 60) + now.getMinutes();
    let adjustedEndMin = endMin < startMin ? endMin + 1440 : endMin;

    const earlyLimit = startMin - 15;
    if (currentMin < earlyLimit) {
      return res.status(400).json({ 
        message: `Too early! Shift starts at ${shiftStartTime}. You can check in 15 mins before.` 
      });
    }

    if (currentMin > adjustedEndMin) {
      return res.status(400).json({ 
        message: `Shift ended at ${shiftEndTime}. You cannot mark attendance now.` 
      });
    }

    let todayStatus = "Present";
    let lateEntry = false;
    const graceThreshold = startMin + 15;
    if (currentMin > graceThreshold) {
      lateEntry = true;
    }

    attendance.records.push({
      date: todayStr,
      status: todayStatus,
      checkInTime: currentTime,
      checkOutTime: "",
      workDuration: calculateDuration(shiftStartTime, shiftEndTime),
      actualWorkDuration: "--",
      shiftCode: assignedShiftCode,
      shiftStartTime: shiftStartTime, 
      shiftEndTime: shiftEndTime,      
      isLate: lateEntry                                      
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


/* ================= ATTENDANCE HISTORY ================= */
const getAttendanceHistory = async (req, res) => {
  try {
    const { month, year } = req.query;

    const data = await Attendance.find({
      month: Number(month),
      year: Number(year),
    }).lean();

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Attendance fetch failed" });
  }
};

const updateAttendanceRecord = async (req, res) => {
  try {
    const { employeeUserId, date, status, isLate } = req.body;

    const targetDate = new Date(date).toLocaleDateString("en-CA");
    const month = new Date(date).getMonth() + 1;
    const year = new Date(date).getFullYear();

    const attendanceDoc = await Attendance.findOne({ employeeUserId, month, year });
    if (!attendanceDoc) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const recordIndex = attendanceDoc.records.findIndex(r => r.date === targetDate);
    if (recordIndex === -1) {
      return res.status(404).json({ message: "Attendance date not found" });
    }

    const existingStatus = attendanceDoc.records[recordIndex].status;

    if (["SL", "CL", "SL(OFF)", "CL(OFF)", "OFF"].includes(existingStatus)) {
      return res.status(400).json({ message: "Leave / OFF records cannot be modified" });
    }

    let finalStatus = status;
    if (status === "P" || status === "P(L)") finalStatus = "Present";
    if (status === "A") finalStatus = "Absent";

    attendanceDoc.records[recordIndex].status = finalStatus;
    attendanceDoc.records[recordIndex].isLate = finalStatus === "Present" ? !!isLate : false;

    await attendanceDoc.save();

    res.status(200).json({ message: "Attendance updated successfully" });
  } catch (err) {
    console.error("UPDATE_ATTENDANCE_ERROR:", err);
    res.status(500).json({ message: "Failed to update attendance" });
  }
};

module.exports = { markDailyAttendance, getMyAttendance,getAttendanceHistory ,updateAttendanceRecord};