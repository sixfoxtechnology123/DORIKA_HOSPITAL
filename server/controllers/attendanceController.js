const Attendance = require("../models/Attendance");
const Leave = require("../models/LeaveApplication");
const ShiftMaster = require("../models/Shift");
const ShiftManagement = require("../models/ShiftManagement");

const OFFICE_LAT = 22.965624;
const OFFICE_LNG = 88.457152;
// const OFFICE_LAT = 22.158725;
// const OFFICE_LNG = 87.675912;
const ALLOWED_DISTANCE = 100;

const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


const calculateTotalPaidDays = (records) => {
  // 1. Count Present
  const presentCount = records.filter(r => r.status === "Present").length;

  // 2. Count Off (Matches "OFF", "SL(OFF)", "CL(OFF)")
  const offCount = records.filter(r => r.status === "OFF" || r.status.includes("(OFF)")).length;

  // 3. Count Leaves (Matches "SL", "CL", "SL(OFF)", "CL(OFF)")
  const leaveCount = records.filter(r => r.status.includes("SL") || r.status.includes("CL")).length;

  // 4. Final Sum: 4 + 2 + 8 = 14
  return presentCount + offCount + leaveCount;
};

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
    const { employeeId, employeeUserId, employeeName, latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "Location not received" });
    }

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const dayKey = now.getDate();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const shiftMonthStr = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const fy = currentMonth <= 3 ? `${currentYear - 1}-${currentYear}` : `${currentYear}-${currentYear + 1}`;

    const shiftMgmt = await ShiftManagement.findOne({ employeeUserId, month: shiftMonthStr }).lean();
    if (!shiftMgmt) {
      return res.status(400).json({ message: "No shift schedule found for this month in Master." });
    }

    let attendance = await Attendance.findOne({ employeeUserId, month: currentMonth, year: currentYear });
    if (!attendance) {
      attendance = new Attendance({
        employeeId, employeeUserId, employeeName,
        month: currentMonth, year: currentYear, financialYear: fy,
        records: []
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    const yesterdayIndex = attendance.records.findIndex(r => r.date === yesterdayStr);
    const todayIndex = attendance.records.findIndex(r => r.date === todayStr);

    let recordToUpdate = null;
    if (yesterdayIndex !== -1) {
      const rec = attendance.records[yesterdayIndex];
      if (rec.checkInTime && (!rec.checkOutTime || rec.checkOutTime === "" || rec.checkOutTime === "--")) {
        recordToUpdate = rec;
      }
    }

    if (!recordToUpdate && todayIndex !== -1) {
      const rec = attendance.records[todayIndex];
      if (rec.checkInTime && (!rec.checkOutTime || rec.checkOutTime === "" || rec.checkOutTime === "--")) {
        recordToUpdate = rec;
      }
    }

    // --- 2. CHECK-OUT LOGIC ---
    if (recordToUpdate) {
      recordToUpdate.checkOutTime = currentTime;
      const shiftStartMin = parseTimeToMinutes(recordToUpdate.shiftStartTime);
      let shiftEndMin = parseTimeToMinutes(recordToUpdate.shiftEndTime);
      if (shiftEndMin < shiftStartMin) shiftEndMin += 1440;
      const scheduledMinutes = shiftEndMin - shiftStartMin;
      const punchInMin = parseTimeToMinutes(recordToUpdate.checkInTime);
      let punchOutMin = parseTimeToMinutes(currentTime);
      
      if (recordToUpdate.date === yesterdayStr) {
        punchOutMin += 1440;
      } else if (punchOutMin < punchInMin) {
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

      recordToUpdate.workDuration = calculateDuration(recordToUpdate.shiftStartTime, recordToUpdate.shiftEndTime);
      const h = Math.floor(actualMinutes / 60);
      const m = actualMinutes % 60;
      recordToUpdate.actualWorkDuration = `${h}h ${m}m`;

      // Update Paid Days before save
      attendance.totalPaidDays = calculateTotalPaidDays(attendance.records);
      recordToUpdate.geoTag = {
        latitude,
        longitude
      };

      await attendance.save();
      return res.status(200).json({ message: "Check-out recorded successfully!" });
    }

      const distance = getDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);

      if (distance > ALLOWED_DISTANCE) {
        return res.status(400).json({ message: "You are Not inside office location" });
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

        let gapStartTime = "--", gapEndTime = "--";
        if (gapShiftCode && gapShiftCode !== "OFF") {
          if (gapShiftCode.length === 2 && gapShiftCode !== "DD") {
            const firstShift = await ShiftMaster.findOne({ shiftCode: gapShiftCode[0] }).lean();
            const secondShift = await ShiftMaster.findOne({ shiftCode: gapShiftCode[1] }).lean();
            if (firstShift && secondShift) {
              gapStartTime = firstShift.startTime;
              gapEndTime = secondShift.endTime;
            }
          } else {
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
      // Update total paid days after the gap-filling loop
      attendance.totalPaidDays = calculateTotalPaidDays(attendance.records);
    }

    // --- 4. TODAY'S CHECK-IN LOGIC ---
    const assignedShiftCode = shiftMgmt.shifts[dayKey] || shiftMgmt.shifts[dayKey.toString()];
    if (!assignedShiftCode || assignedShiftCode === "OFF") {
      return res.status(400).json({ message: assignedShiftCode === "OFF" ? "Today is your OFF day." : "No shift assigned for today." });
    }

    let shiftStartTime, shiftEndTime;
    if (assignedShiftCode.length === 2 && assignedShiftCode !== "DD") {
      const firstShift = await ShiftMaster.findOne({ shiftCode: assignedShiftCode[0] }).lean();
      const secondShift = await ShiftMaster.findOne({ shiftCode: assignedShiftCode[1] }).lean();
      if (!firstShift || !secondShift) return res.status(400).json({ message: "Shift components not found." });
      shiftStartTime = firstShift.startTime;
      shiftEndTime = secondShift.endTime;
    } else {
      const shiftMaster = await ShiftMaster.findOne({ shiftCode: assignedShiftCode }).lean();
      if (!shiftMaster) return res.status(400).json({ message: "Shift details not found." });
      shiftStartTime = shiftMaster.startTime;
      shiftEndTime = shiftMaster.endTime;
    }

    const startMin = parseTimeToMinutes(shiftStartTime);
    const endMin = parseTimeToMinutes(shiftEndTime);
    const currentMin = (now.getHours() * 60) + now.getMinutes();
    let adjustedEndMin = endMin < startMin ? endMin + 1440 : endMin;

    if (currentMin < (startMin - 15)) {
      return res.status(400).json({ message: `Too early! Shift starts at ${shiftStartTime}.` });
    }
    if (currentMin > adjustedEndMin) {
      return res.status(400).json({ message: `Shift ended at ${shiftEndTime}.` });
    }

    let lateEntry = currentMin > (startMin + 15);
    attendance.records.push({
      date: todayStr,
      status: "Present",
      checkInTime: currentTime,
      checkOutTime: "",
      workDuration: calculateDuration(shiftStartTime, shiftEndTime),
      actualWorkDuration: "--",
      shiftCode: assignedShiftCode,
      shiftStartTime: shiftStartTime, 
      shiftEndTime: shiftEndTime,      
      isLate: lateEntry,
        geoTag: {
        latitude,
        longitude
      }                                     
    });

    attendance.totalPaidDays = calculateTotalPaidDays(attendance.records);

    await attendance.save();

    return res.status(200).json({ 
      message: lateEntry ? "Late Entry Marked!" : "Check-in successful!",
      status: "Present",
      isLate: lateEntry
    });

  } catch (error) {
    console.error("ATTENDANCE_ERROR:", error); 
    return res.status(500).json({ message: "Server Error: " + error.message });
  }
};

const updateAttendanceRecord = async (req, res) => {
  try {
    const { employeeUserId, date, status, isLate } = req.body;
    const targetDate = new Date(date).toLocaleDateString("en-CA");
    const month = new Date(date).getMonth() + 1;
    const year = new Date(date).getFullYear();

    const attendanceDoc = await Attendance.findOne({ employeeUserId, month, year });
    if (!attendanceDoc) return res.status(404).json({ message: "Attendance record not found" });

    const recordIndex = attendanceDoc.records.findIndex(r => r.date === targetDate);
    if (recordIndex === -1) return res.status(404).json({ message: "Attendance date not found" });

    const existingStatus = attendanceDoc.records[recordIndex].status;
    if (["SL", "CL", "SL(OFF)", "CL(OFF)", "OFF"].includes(existingStatus)) {
      return res.status(400).json({ message: "Leave / OFF records cannot be modified" });
    }

    let finalStatus = status;
    if (status === "P" || status === "P(L)") finalStatus = "Present";
    if (status === "A") finalStatus = "Absent";

    attendanceDoc.records[recordIndex].status = finalStatus;
    attendanceDoc.records[recordIndex].isLate = finalStatus === "Present" ? !!isLate : false;
    
    // Update Paid Days on manual edit
    attendanceDoc.totalPaidDays = calculateTotalPaidDays(attendanceDoc.records);
    await attendanceDoc.save();

    res.status(200).json({ message: "Attendance updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update attendance" });
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

const getAttendanceHistory = async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await Attendance.find({ month: Number(month), year: Number(year) }).lean();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Attendance fetch failed" });
  }
};

module.exports = { markDailyAttendance, getMyAttendance, getAttendanceHistory, updateAttendanceRecord };