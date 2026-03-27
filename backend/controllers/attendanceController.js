const Attendance = require("../models/Attendance");
const Leave = require("../models/LeaveApplication");
const ShiftMaster = require("../models/Shift");
const ShiftManagement = require("../models/ShiftManagement");
const Employee = require("../models/Employee");
const { createAuditLog } = require("../utils/auditLogger");

//dorika location---
// const OFFICE_LAT = 26.652061;
// const OFFICE_LNG = 92.790961;

// our ofice location--
const OFFICE_LAT = 22.965561;
const OFFICE_LNG = 88.457227;
const ALLOWED_DISTANCE = 300;

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

  const parseTime = (t) => {
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

  const spanMinutes = (startTime, endTime) => {
    const startMin = parseTime(startTime);
    let endMin = parseTime(endTime);
    if (endMin < startMin) endMin += 1440;
    return Math.max(0, endMin - startMin);
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const ddCodes = parseDoubleDutyCodes(code);
  if (ddCodes) {
    const [firstCode, secondCode] = ddCodes;
    const firstShift = await ShiftMaster.findOne({ shiftCode: firstCode }).lean();
    const secondShift = await ShiftMaster.findOne({ shiftCode: secondCode }).lean();
    if (!firstShift || !secondShift) return { ok: false, code, reason: "DD_COMPONENT_MISSING" };

    const firstStartMin = parseTime(firstShift.startTime);
    const secondStartRaw = parseTime(secondShift.startTime);
    const secondEndRaw = parseTime(secondShift.endTime);
    const secondStartAbs = secondStartRaw < firstStartMin ? secondStartRaw + 1440 : secondStartRaw;
    let secondEndAbs = secondEndRaw;
    if (secondEndRaw < secondStartRaw) secondEndAbs += 1440;
    secondEndAbs += (secondStartAbs - secondStartRaw);

    const totalDutyMinutes =
      spanMinutes(firstShift.startTime, firstShift.endTime) +
      spanMinutes(secondShift.startTime, secondShift.endTime);

    return {
      ok: true,
      normalizedCode: `DD:${firstCode}+${secondCode}`,
      shiftStartTime: firstShift.startTime,
      shiftEndTime: secondShift.endTime,
      isDouble: true,
      shiftWindowEndMin: secondEndAbs,
      workDurationMinutes: totalDutyMinutes,
      workDurationText: formatDuration(totalDutyMinutes),
    };
  }

  // Prefer exact match first. This prevents codes like G4/G5 from being treated as DD.
  const singleShift = await ShiftMaster.findOne({ shiftCode: code }).lean();
  if (singleShift) {
    const singleStartMin = parseTime(singleShift.startTime);
    const singleEndRaw = parseTime(singleShift.endTime);
    const singleEndAbs = singleEndRaw < singleStartMin ? singleEndRaw + 1440 : singleEndRaw;
    const singleMinutes = spanMinutes(singleShift.startTime, singleShift.endTime);

    return {
      ok: true,
      normalizedCode: code,
      shiftStartTime: singleShift.startTime,
      shiftEndTime: singleShift.endTime,
      isDouble: false,
      shiftWindowEndMin: singleEndAbs,
      workDurationMinutes: singleMinutes,
      workDurationText: formatDuration(singleMinutes),
    };
  }

  // Legacy fallback: old DD payload may be stored as "MN" without DD prefix.
  if (/^[A-Z]{2}$/.test(code)) {
    const firstShift = await ShiftMaster.findOne({ shiftCode: code[0] }).lean();
    const secondShift = await ShiftMaster.findOne({ shiftCode: code[1] }).lean();
    if (firstShift && secondShift) {
      const firstStartMin = parseTime(firstShift.startTime);
      const secondStartRaw = parseTime(secondShift.startTime);
      const secondEndRaw = parseTime(secondShift.endTime);
      const secondStartAbs = secondStartRaw < firstStartMin ? secondStartRaw + 1440 : secondStartRaw;
      let secondEndAbs = secondEndRaw;
      if (secondEndRaw < secondStartRaw) secondEndAbs += 1440;
      secondEndAbs += (secondStartAbs - secondStartRaw);

      const totalDutyMinutes =
        spanMinutes(firstShift.startTime, firstShift.endTime) +
        spanMinutes(secondShift.startTime, secondShift.endTime);

      return {
        ok: true,
        normalizedCode: `DD:${code[0]}+${code[1]}`,
        shiftStartTime: firstShift.startTime,
        shiftEndTime: secondShift.endTime,
        isDouble: true,
        shiftWindowEndMin: secondEndAbs,
        workDurationMinutes: totalDutyMinutes,
        workDurationText: formatDuration(totalDutyMinutes),
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
  const byDate = new Map();
  (records || []).forEach((rec) => {
    if (!rec?.date) return;
    byDate.set(rec.date, rec);
  });
  const uniqueRecords = Array.from(byDate.values());

  const presentCount = uniqueRecords.reduce((total, r) => {
    if (r.status === "Present") {
      const shift = normalizeShiftCode(r.shiftCode);
      const isLegacyDouble = /^[A-Z]{2}$/.test(shift) && !["OFF", "DD"].includes(shift);
      const isDouble = shift.startsWith("DD:") || isLegacyDouble;
      return total + (isDouble ? 2 : 1);
    }
    return total;
  }, 0);

  const offCount = uniqueRecords.filter(r => r.status === "OFF" || r.status.includes("(OFF)")).length;
  const leaveCount = uniqueRecords.filter(r => r.status.includes("SL") || r.status.includes("CL")).length;

  return presentCount + offCount + leaveCount;
};

const deriveLeaveCode = (leaveType) => {
  const type = String(leaveType || "").toUpperCase();
  return type.includes("SICK") || type === "SL" ? "SL" : "CL";
};

const formatDateKey = (dateObj) => dateObj.toLocaleDateString("en-CA");

const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
};

const parseDateFlexible = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("-").map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
};

const doesLeaveOverlapRange = (leave, rangeStart, rangeEnd) => {
  const from = parseDateFlexible(leave?.fromDate);
  const to = parseDateFlexible(leave?.toDate || leave?.fromDate);
  if (!from || !to) return false;
  return from <= rangeEnd && to >= rangeStart;
};

const applyApprovedLeavesToAttendance = async (attendanceDoc, approvedLeaves = []) => {
  if (!attendanceDoc || !Array.isArray(attendanceDoc.records)) return false;
  if (!approvedLeaves.length) return false;

  const recordIndexByDate = new Map(
    attendanceDoc.records
      .map((rec, idx) => [rec.date, idx])
      .filter(([date]) => Boolean(date))
  );

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const shiftMonthStr = `${monthNames[attendanceDoc.month - 1]}-${attendanceDoc.year}`;
  const shiftMgmt = await ShiftManagement.findOne({
    employeeUserId: attendanceDoc.employeeUserId,
    month: shiftMonthStr,
  }).lean();

  let changed = false;

  const approvedDateKeys = new Set();

  for (const leave of approvedLeaves) {
    const leaveCode = deriveLeaveCode(leave.leaveType);
    const start = parseDateFlexible(leave.fromDate);
    const end = parseDateFlexible(leave.toDate || leave.fromDate);
    if (!start || !end) continue;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() + 1 !== attendanceDoc.month || d.getFullYear() !== attendanceDoc.year) continue;
      const dateKey = formatDateKey(d);
      approvedDateKeys.add(dateKey);
      const idx = recordIndexByDate.get(dateKey);

      const dayKey = d.getDate();
      const rawShiftCode = shiftMgmt?.shifts?.[dayKey] || shiftMgmt?.shifts?.[dayKey.toString()] || "--";
      const normalizedShift = normalizeShiftCode(rawShiftCode);
      const isOffDay = normalizedShift === "OFF";
      const finalStatus = isOffDay ? `${leaveCode}(OFF)` : leaveCode;

      if (idx == null) {
        let shiftStartTime = "--";
        let shiftEndTime = "--";
        let workDuration = "--";
        if (!isOffDay && normalizedShift && normalizedShift !== "--") {
          const timing = await getShiftTimingByCode(rawShiftCode);
          if (timing.ok) {
            shiftStartTime = timing.shiftStartTime;
            shiftEndTime = timing.shiftEndTime;
            workDuration = timing.workDurationText || "--";
          }
        }

        attendanceDoc.records.push({
          date: dateKey,
          status: finalStatus,
          checkInTime: "--",
          checkOutTime: "--",
          workDuration,
          actualWorkDuration: "--",
          shiftCode: rawShiftCode || "--",
          shiftStartTime,
          shiftEndTime,
          isLate: false,
          isOT: false,
          otHours: 0,
        });
        recordIndexByDate.set(dateKey, attendanceDoc.records.length - 1);
        changed = true;
        continue;
      }

      const rec = attendanceDoc.records[idx];
      const statusText = String(rec.status || "");
      if (statusText === "Present") continue;

      const shiftCode = normalizeShiftCode(rec.shiftCode);
      const isOff = statusText === "OFF" || statusText.includes("(OFF)") || shiftCode === "OFF";
      const updatedStatus = isOff ? `${leaveCode}(OFF)` : leaveCode;

      if (rec.status !== updatedStatus) {
        rec.status = updatedStatus;
        rec.checkInTime = "--";
        rec.checkOutTime = "--";
        rec.actualWorkDuration = "--";
        rec.isOT = false;
        rec.otHours = 0;
        changed = true;
      }
    }
  }

  // Revert SL/CL dates that are no longer approved
  for (const rec of attendanceDoc.records) {
    const statusText = String(rec.status || "");
    if (!statusText.includes("SL") && !statusText.includes("CL")) continue;
    if (!rec.date) continue;
    if (approvedDateKeys.has(rec.date)) continue;

    let finalStatus = "Absent";
    let shiftCode = rec.shiftCode;
    let shiftStartTime = rec.shiftStartTime;
    let shiftEndTime = rec.shiftEndTime;
    let workDuration = rec.workDuration;

    if (shiftMgmt?.shifts && rec.date) {
      const d = parseDateFlexible(rec.date);
      if (d) {
        const dayKey = d.getDate();
        const rawShiftCode = shiftMgmt.shifts[dayKey] || shiftMgmt.shifts[dayKey.toString()];
        if (rawShiftCode) shiftCode = rawShiftCode;
        const normalizedShift = normalizeShiftCode(rawShiftCode);
        if (normalizedShift === "OFF") {
          finalStatus = "OFF";
        } else if (normalizedShift && normalizedShift !== "--") {
          const timing = await getShiftTimingByCode(rawShiftCode);
          if (timing.ok) {
            shiftStartTime = shiftStartTime || timing.shiftStartTime;
            shiftEndTime = shiftEndTime || timing.shiftEndTime;
            workDuration = workDuration || timing.workDurationText || "--";
          }
        }
      }
    }

    rec.status = finalStatus;
    rec.checkInTime = "--";
    rec.checkOutTime = "--";
    rec.actualWorkDuration = "--";
    rec.isOT = false;
    rec.otHours = 0;
    rec.shiftCode = shiftCode || rec.shiftCode || "--";
    rec.shiftStartTime = shiftStartTime || rec.shiftStartTime || "--";
    rec.shiftEndTime = shiftEndTime || rec.shiftEndTime || "--";
    rec.workDuration = workDuration || rec.workDuration || "--";
    changed = true;
  }

  if (changed) {
    attendanceDoc.totalPaidDays = calculateTotalPaidDays(attendanceDoc.records);
  }
  return changed;
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

const isOpenPunchRecord = (rec) => {
  const status = String(rec?.status || "").trim().toUpperCase();
  const inTime = String(rec?.checkInTime || "").trim();
  const outTime = String(rec?.checkOutTime || "").trim();
  if (!inTime || inTime === "--") return false;
  if (outTime && outTime !== "--") return false;
  return status === "PRESENT" || status === "P" || status === "P(L)";
};

const isDoubleShiftCode = (value) => {
  const shift = normalizeShiftCode(value);
  const isLegacyDouble = /^[A-Z]{2}$/.test(shift) && !["OFF", "DD"].includes(shift);
  return shift.startsWith("DD:") || isLegacyDouble;
};

const getWorkDurationText = (shiftCode, shiftStartTime, shiftEndTime, existingWorkDuration = "") => {
  if (existingWorkDuration && existingWorkDuration !== "--") return existingWorkDuration;
  return calculateDuration(shiftStartTime, shiftEndTime);
};

const sanitizeRecordForStatus = (record = {}) => {
  const status = String(record.status || "").trim().toUpperCase();
  if (status === "OFF" || status === "ABSENT" || status.startsWith("SL") || status.startsWith("CL")) {
    return {
      ...record,
      checkInTime: "--",
      checkOutTime: "--",
      actualWorkDuration: "--",
      isOT: false,
      otHours: 0,
    };
  }
  return record;
};

const autoCloseOpenRecordAtShiftEnd = (record = {}, now = new Date()) => {
  if (!isOpenPunchRecord(record)) return false;
  if (!record.shiftStartTime || !record.shiftEndTime || record.shiftStartTime === "--" || record.shiftEndTime === "--") {
    return false;
  }
  if (!record.date) return false;

  const shiftStartMin = parseTimeToMinutes(record.shiftStartTime);
  let shiftEndMin = parseTimeToMinutes(record.shiftEndTime);
  if (shiftEndMin < shiftStartMin || (isDoubleShiftCode(record.shiftCode) && shiftEndMin === shiftStartMin)) {
    shiftEndMin += 1440;
  }

  const cutoff = new Date(`${record.date}T00:00:00`);
  cutoff.setMinutes(cutoff.getMinutes() + shiftEndMin + 120);
  if (now < cutoff) return false;

  record.checkOutTime = record.shiftEndTime;
  record.workDuration = getWorkDurationText(
    record.shiftCode,
    record.shiftStartTime,
    record.shiftEndTime,
    record.workDuration
  );
  record.actualWorkDuration = calculateActualDuration(record.checkInTime, record.shiftEndTime);
  record.isOT = false;
  record.otHours = 0;
  return true;
};

const autoCloseAttendanceRecords = (attendanceDoc, now = new Date()) => {
  if (!attendanceDoc || !Array.isArray(attendanceDoc.records)) return false;
  let changed = false;
  for (const rec of attendanceDoc.records) {
    if (autoCloseOpenRecordAtShiftEnd(rec, now)) changed = true;
  }
  if (changed) attendanceDoc.totalPaidDays = calculateTotalPaidDays(attendanceDoc.records);
  return changed;
};

const buildEmployeeDisplayName = (employeeDoc = {}) => {
  const fullName = `${employeeDoc.firstName || ""} ${employeeDoc.middleName || ""} ${employeeDoc.lastName || ""}`
    .replace(/\s+/g, " ")
    .trim();
  return fullName || String(employeeDoc.name || "").trim();
};

// --- MAIN CONTROLLER ---

const markDailyAttendance = async (req, res) => {
  try {
    const { employeeId, employeeUserId, employeeName, latitude, longitude, accuracy } = req.body;
    const role = String(req.user?.role || "").toLowerCase();
    const tokenUserId = req.user?.employeeUserId;
    const tokenEmpId = req.user?.employeeID;
    let safeEmployeeUserId = employeeUserId || tokenUserId;
    let safeEmployeeId = employeeId || tokenEmpId;
    let safeEmployeeName = (employeeName || "").trim() || safeEmployeeUserId;

    if (!safeEmployeeUserId) {
      return res.status(400).json({ message: "Employee user ID is required" });
    }

    if (role === "employee") {
      if (!tokenUserId || tokenUserId !== safeEmployeeUserId || (tokenEmpId && safeEmployeeId && tokenEmpId !== safeEmployeeId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const employeeDoc = await Employee.findOne({
      $or: [
        { employeeUserId: safeEmployeeUserId },
        ...(safeEmployeeId ? [{ employeeID: safeEmployeeId }] : []),
      ],
    })
      .select("employeeID employeeUserId firstName middleName lastName name")
      .lean();

    if (employeeDoc) {
      safeEmployeeUserId = employeeDoc.employeeUserId || safeEmployeeUserId;
      safeEmployeeId = employeeDoc.employeeID || safeEmployeeId;
      const displayName = buildEmployeeDisplayName(employeeDoc);
      if (displayName) safeEmployeeName = displayName;
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

    if (autoCloseAttendanceRecords(attendance, now)) {
      await attendance.save();
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    const yesterdayIndex = attendance.records.findIndex(r => r.date === yesterdayStr);
    const todayIndex = attendance.records.findIndex(r => r.date === todayStr);

    const distance = getDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
    // Some clients/frontends may not send accuracy. Use a safe default buffer to avoid false rejects.
    const accuracyBufferRaw = Number.isFinite(gpsAccuracy) && gpsAccuracy > 0 ? gpsAccuracy : 60;
    // Mobile browsers can report noisy GPS accuracy (especially indoors).
    // Use a larger capped buffer to reduce false geofence rejections.
    const accuracyBuffer = Math.min(accuracyBufferRaw, 500);
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
      if (isOpenPunchRecord(rec)) {
        recordToUpdate = rec;
      }
    }

    if (!recordToUpdate && todayIndex !== -1) {
      const rec = attendance.records[todayIndex];
      if (isOpenPunchRecord(rec)) {
        recordToUpdate = rec;
      }
    }

    // --- 2. CHECK-OUT LOGIC ---
    if (recordToUpdate) {
      recordToUpdate.checkOutTime = currentTime;
      const shiftStartMin = parseTimeToMinutes(recordToUpdate.shiftStartTime);
      let shiftEndMin = parseTimeToMinutes(recordToUpdate.shiftEndTime);
      if (shiftEndMin < shiftStartMin || (isDoubleShiftCode(recordToUpdate.shiftCode) && shiftEndMin === shiftStartMin)) {
        shiftEndMin += 1440;
      }
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

      recordToUpdate.workDuration = getWorkDurationText(
        recordToUpdate.shiftCode,
        recordToUpdate.shiftStartTime,
        recordToUpdate.shiftEndTime,
        recordToUpdate.workDuration
      );
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

        let gapStartTime = "--", gapEndTime = "--", gapWorkDuration = "--";
        if (gapShiftCode && !isOffDay) {
          const timing = await getShiftTimingByCode(gapShiftCode);
          if (timing.ok) {
            gapStartTime = timing.shiftStartTime;
            gapEndTime = timing.shiftEndTime;
            gapWorkDuration = timing.workDurationText || "--";
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
          workDuration: gapWorkDuration,
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
    const currentMin = (now.getHours() * 60) + now.getMinutes();
    const adjustedEndMin =
      typeof assignedTiming.shiftWindowEndMin === "number"
        ? assignedTiming.shiftWindowEndMin
        : (() => {
            const endMin = parseTimeToMinutes(shiftEndTime);
            return endMin < startMin ? endMin + 1440 : endMin;
          })();

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
      workDuration:
        assignedTiming.workDurationText ||
        getWorkDurationText(assignedTiming.normalizedCode, shiftStartTime, shiftEndTime),
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

    const target = attendanceDoc.records[recordIndex];
    const previousRecord = {
      date: target.date,
      status: target.status,
      isLate: target.isLate,
      checkInTime: target.checkInTime,
      checkOutTime: target.checkOutTime,
      workDuration: target.workDuration,
      actualWorkDuration: target.actualWorkDuration,
      shiftCode: target.shiftCode,
      shiftStartTime: target.shiftStartTime,
      shiftEndTime: target.shiftEndTime,
      isOT: target.isOT,
      otHours: target.otHours,
    };
    target.status = finalStatus;
    target.isLate = finalStatus === "Present" ? !!isLate : false;

    // Keep OFF/ABSENT records time-free to prevent invalid punch-out display.
    if (finalStatus === "OFF" || finalStatus === "Absent") {
      target.checkInTime = "--";
      target.checkOutTime = "--";
      target.actualWorkDuration = "--";
      target.isOT = false;
      target.otHours = 0;
    }
    
    // Update Paid Days on manual edit
    attendanceDoc.totalPaidDays = calculateTotalPaidDays(attendanceDoc.records);
    await attendanceDoc.save();

    await createAuditLog({
      req,
      action: "UPDATE",
      module: "Employee Attendance History",
      details: `Updated attendance for ${employeeUserId} on ${targetDate}.`,
      target: {
        employeeUserId,
        employeeID: attendanceDoc.employeeId || "",
        name: attendanceDoc.employeeName || "",
      },
      previous: previousRecord,
      current: {
        date: target.date,
        status: target.status,
        isLate: target.isLate,
        checkInTime: target.checkInTime,
        checkOutTime: target.checkOutTime,
        workDuration: target.workDuration,
        actualWorkDuration: target.actualWorkDuration,
        shiftCode: target.shiftCode,
        shiftStartTime: target.shiftStartTime,
        shiftEndTime: target.shiftEndTime,
        isOT: target.isOT,
        otHours: target.otHours,
      },
    });

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
    const now = new Date();
    const sanitized = [];
    for (const doc of history) {
      const { start, end } = getMonthRange(doc.year, doc.month);
      const approvedLeavesRaw = await Leave.find({
        employeeUserId,
        $or: [
          { approveRejectedStatus: "APPROVED" },
          { status: "APPROVED" },
          { reportingManagerApproval: "APPROVED", departmrntHeadApproval: "APPROVED" },
        ],
      }).lean();
      const approvedLeaves = approvedLeavesRaw.filter((leave) =>
        doesLeaveOverlapRange(leave, start, end)
      );

      try {
        if (await applyApprovedLeavesToAttendance(doc, approvedLeaves)) {
          await doc.save();
        }
      } catch (e) {
        console.error("APPLY_LEAVE_SYNC_ERROR(getMyAttendance):", e);
      }
      try {
        if (autoCloseAttendanceRecords(doc, now)) {
          await doc.save();
        }
      } catch (e) {
        console.error("AUTO_CLOSE_ERROR(getMyAttendance):", e);
      }
      try {
        const recomputedPaidDays = calculateTotalPaidDays(doc.records || []);
        if (doc.totalPaidDays !== recomputedPaidDays) {
          doc.totalPaidDays = recomputedPaidDays;
          doc.markModified("records");
          await doc.save();
        }
      } catch (e) {
        console.error("PAID_DAYS_RECALC_ERROR(getMyAttendance):", e);
      }
      const plain = doc.toObject();
      sanitized.push({
        ...plain,
        records: Array.isArray(plain.records) ? plain.records.map(sanitizeRecordForStatus) : [],
      });
    }
    res.status(200).json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const { month, year, summary, skipSync } = req.query;
    const query = { month: Number(month), year: Number(year) };

    // Fast path for summary-only requests (e.g., payslip generation)
    if (summary === "1" || summary === "true") {
      const data = await Attendance.find(query)
        .select("employeeUserId totalPresent totalAbsent totalOff totalLeave totalOTHours totalPaidDays")
        .lean();
      return res.json(data || []);
    }

    const data = await Attendance.find(query);
    const now = new Date();
    const normalizedDocs = [];
    for (const doc of data) {
      if (!(skipSync === "1" || skipSync === "true")) {
        const { start, end } = getMonthRange(doc.year, doc.month);
        const approvedLeavesRaw = await Leave.find({
          employeeUserId: doc.employeeUserId,
          $or: [
            { approveRejectedStatus: "APPROVED" },
            { status: "APPROVED" },
            { reportingManagerApproval: "APPROVED", departmrntHeadApproval: "APPROVED" },
          ],
        }).lean();
        const approvedLeaves = approvedLeavesRaw.filter((leave) =>
          doesLeaveOverlapRange(leave, start, end)
        );

        try {
          if (await applyApprovedLeavesToAttendance(doc, approvedLeaves)) {
            await doc.save();
          }
        } catch (e) {
          console.error("APPLY_LEAVE_SYNC_ERROR(getAttendanceHistory):", e);
        }
        try {
          if (autoCloseAttendanceRecords(doc, now)) {
            await doc.save();
          }
        } catch (e) {
          console.error("AUTO_CLOSE_ERROR(getAttendanceHistory):", e);
        }
        try {
          const recomputedPaidDays = calculateTotalPaidDays(doc.records || []);
          if (doc.totalPaidDays !== recomputedPaidDays) {
            doc.totalPaidDays = recomputedPaidDays;
            doc.markModified("records");
            await doc.save();
          }
        } catch (e) {
          console.error("PAID_DAYS_RECALC_ERROR(getAttendanceHistory):", e);
        }
      }
      normalizedDocs.push(doc.toObject());
    }

    const employeeUserIds = normalizedDocs.map((d) => d.employeeUserId).filter(Boolean);
    const employees = await Employee.find(
      { employeeUserId: { $in: employeeUserIds } },
      { employeeUserId: 1, firstName: 1, middleName: 1, lastName: 1, name: 1 }
    ).lean();

    const employeeMap = new Map(
      employees.map((e) => [e.employeeUserId, buildEmployeeDisplayName(e)])
    );

    const patched = normalizedDocs.map((doc) => {
      const masterName = employeeMap.get(doc.employeeUserId) || "";
      const storedName = String(doc.employeeName || "").trim();
      const shouldPatchName =
        !storedName ||
        storedName === "-" ||
        storedName.toUpperCase() === String(doc.employeeUserId || "").toUpperCase();

      const normalizedDoc = {
        ...doc,
        records: Array.isArray(doc.records) ? doc.records.map(sanitizeRecordForStatus) : [],
      };

      if (!shouldPatchName) return normalizedDoc;
      return {
        ...normalizedDoc,
        employeeName: masterName || storedName || doc.employeeUserId || "-",
      };
    });

    res.json(patched);
  } catch (err) {
    res.status(500).json({ message: "Attendance fetch failed" });
  }
};

module.exports = { markDailyAttendance, getMyAttendance, getAttendanceHistory, updateAttendanceRecord };
