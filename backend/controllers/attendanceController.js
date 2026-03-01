const Attendance = require("../models/Attendance");
const Leave = require("../models/LeaveApplication");
const ShiftMaster = require("../models/Shift");
const ShiftManagement = require("../models/ShiftManagement");

const OFFICE_LAT = 26.652061;
const OFFICE_LNG = 92.790961;
// const OFFICE_LAT = 22.965561;
// const OFFICE_LNG = 88.457227;
const ALLOWED_DISTANCE = 600;

const normalizeShiftCode = (value) => String(value || "").trim().toUpperCase();

const parseDoubleDutyCodes = (value) => {
  const code = normalizeShiftCode(value);
  if (!code.startsWith("DD:")) return null;
  const payload = code.slice(3);

  if (payload.includes("+")) {
    const [first = "", second = ""] = payload.split("+");
    return [first, second || first];
  }

  // Legacy DD payload support: DD:MN
  if (payload.length === 2) return [payload[0], payload[1]];
  return [payload, payload];
};

const getShiftTimingByCode = async (rawCode) => {
  const code = normalizeShiftCode(rawCode);
  if (!code || code === "OFF") {
    return { ok: false, code, reason: "EMPTY_OR_OFF" };
  }

  const ddCodes = parseDoubleDutyCodes(code);
  if (ddCodes) {
    const [firstCode, secondCode] = ddCodes;
    const firstShift = await ShiftMaster.findOne({ shiftCode: firstCode }).lean();
    const secondShift = await ShiftMaster.findOne({ shiftCode: secondCode }).lean();
    if (!firstShift || !secondShift) return { ok: false, code, reason: "DD_COMPONENT_MISSING" };
    return {
      ok: true,
      normalizedCode: `DD:${firstCode}+${secondCode}`,
      shiftStartTime: firstShift.startTime,
      shiftEndTime: secondShift.endTime,
      isDouble: true,
    };
  }

  // Prefer exact match first. This prevents codes like G4/G5 from being treated as DD.
  const singleShift = await ShiftMaster.findOne({ shiftCode: code }).lean();
  if (singleShift) {
    return {
      ok: true,
      normalizedCode: code,
      shiftStartTime: singleShift.startTime,
      shiftEndTime: singleShift.endTime,
      isDouble: false,
    };
  }

  // Legacy fallback: old DD payload may be stored as "MN" without DD prefix.
  if (code.length === 2) {
    const firstShift = await ShiftMaster.findOne({ shiftCode: code[0] }).lean();
    const secondShift = await ShiftMaster.findOne({ shiftCode: code[1] }).lean();
    if (firstShift && secondShift) {
      return {
        ok: true,
        normalizedCode: `DD:${code[0]}+${code[1]}`,
        shiftStartTime: firstShift.startTime,
        shiftEndTime: secondShift.endTime,
        isDouble: true,
      };
    }
  }

  return { ok: false, code, reason: "NOT_FOUND" };
};


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
  // 1. Count Present (Check for double-credit shift codes)
  const presentCount = records.reduce((total, r) => {
    if (r.status === "Present") {
      const shift = normalizeShiftCode(r.shiftCode);
      const isLegacyDouble = /^[A-Z]{2}$/.test(shift) && !["OFF", "DD"].includes(shift);
      const isDouble = shift.startsWith("DD:") || isLegacyDouble;
      return total + (isDouble ? 2 : 1);
    }
    return total;
  }, 0);

  // 2. Count Off
  const offCount = records.filter(r => r.status === "OFF" || r.status.includes("(OFF)")).length;

  // 3. Count Leaves
  const leaveCount = records.filter(r => r.status.includes("SL") || r.status.includes("CL")).length;

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
    const { employeeId, employeeUserId, employeeName, latitude, longitude, accuracy } = req.body;
    const role = String(req.user?.role || "").toLowerCase();
    const tokenUserId = req.user?.employeeUserId;
    const tokenEmpId = req.user?.employeeID;
    const safeEmployeeUserId = employeeUserId || tokenUserId;
    const safeEmployeeId = employeeId || tokenEmpId;
    const safeEmployeeName = (employeeName || "").trim() || safeEmployeeUserId;

    if (!safeEmployeeUserId) {
      return res.status(400).json({ message: "Employee user ID is required" });
    }

    if (role === "employee") {
      if (!tokenUserId || tokenUserId !== safeEmployeeUserId || (tokenEmpId && safeEmployeeId && tokenEmpId !== safeEmployeeId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "Location not received" });
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    const gpsAccuracy = Number(accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Invalid location coordinates" });
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

    const shiftMgmt = await ShiftManagement.findOne({ employeeUserId: safeEmployeeUserId, month: shiftMonthStr }).lean();
    if (!shiftMgmt) {
      return res.status(400).json({ message: "No shift schedule found for this month in Master." });
    }

    let attendance = await Attendance.findOne({ employeeUserId: safeEmployeeUserId, month: currentMonth, year: currentYear });
    if (!attendance) {
      attendance = new Attendance({
        employeeId: safeEmployeeId,
        employeeUserId: safeEmployeeUserId,
        employeeName: safeEmployeeName,
        month: currentMonth, year: currentYear, financialYear: fy,
        records: []
      });
    } else {
      if (!attendance.employeeId && safeEmployeeId) attendance.employeeId = safeEmployeeId;
      if (!attendance.employeeName) attendance.employeeName = safeEmployeeName;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    const yesterdayIndex = attendance.records.findIndex(r => r.date === yesterdayStr);
    const todayIndex = attendance.records.findIndex(r => r.date === todayStr);

    const distance = getDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
    // Some clients/frontends may not send accuracy. Use a safe default buffer to avoid false rejects.
    const accuracyBufferRaw = Number.isFinite(gpsAccuracy) && gpsAccuracy > 0 ? gpsAccuracy : 60;
    const accuracyBuffer = Math.min(accuracyBufferRaw, 150);
    const effectiveDistance = Math.max(0, distance - accuracyBuffer);
    if (effectiveDistance > ALLOWED_DISTANCE) {
      console.warn("ATTENDANCE_GEOFENCE_REJECT", {
        employeeUserId: safeEmployeeUserId,
        officeLat: OFFICE_LAT,
        officeLng: OFFICE_LNG,
        userLat: lat,
        userLng: lng,
        distance: Math.round(distance),
        accuracyBuffer: Math.round(accuracyBuffer),
        effectiveDistance: Math.round(effectiveDistance),
        allowedDistance: ALLOWED_DISTANCE
      });
      return res.status(400).json({ message: "You are Not inside office location" });
    }

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
        latitude: lat,
        longitude: lng
      };

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
        const isOffDay = normalizeShiftCode(gapShiftCode) === "OFF";

        let gapStartTime = "--", gapEndTime = "--";
        if (gapShiftCode && !isOffDay) {
          const timing = await getShiftTimingByCode(gapShiftCode);
          if (timing.ok) {
            gapStartTime = timing.shiftStartTime;
            gapEndTime = timing.shiftEndTime;
          }
        }

        const approvedLeave = await Leave.findOne({
          employeeUserId: safeEmployeeUserId,
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
    const assignedShiftCodeRaw = shiftMgmt.shifts[dayKey] || shiftMgmt.shifts[dayKey.toString()];
    const assignedShiftCode = normalizeShiftCode(assignedShiftCodeRaw);
    if (!assignedShiftCode || assignedShiftCode === "OFF") {
      return res.status(400).json({ message: assignedShiftCode === "OFF" ? "Today is your OFF day." : "No shift assigned for today." });
    }

    const assignedTiming = await getShiftTimingByCode(assignedShiftCode);
    if (!assignedTiming.ok) return res.status(400).json({ message: "Shift details not found." });
    const shiftStartTime = assignedTiming.shiftStartTime;
    const shiftEndTime = assignedTiming.shiftEndTime;

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
      shiftCode: assignedTiming.normalizedCode,
      shiftStartTime: shiftStartTime, 
      shiftEndTime: shiftEndTime,      
      isLate: lateEntry,
        geoTag: {
        latitude: lat,
        longitude: lng
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
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "employee" && req.user?.employeeUserId !== employeeUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

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
