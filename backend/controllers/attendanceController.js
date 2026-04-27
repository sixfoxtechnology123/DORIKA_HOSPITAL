const Attendance = require("../models/Attendance");
const Leave = require("../models/LeaveApplication");
const ShiftMaster = require("../models/Shift");
const ShiftManagement = require("../models/ShiftManagement");
const Employee = require("../models/Employee");
const { createAuditLog } = require("../utils/auditLogger");
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

//dorika location---
const OFFICE_LAT = 26.652061;
const OFFICE_LNG = 92.790961;

// our office location--
// const OFFICE_LAT =22.961448;
// const OFFICE_LNG = 88.459610;
const ALLOWED_DISTANCE = 300;

const normalizeShiftCode = (value) => String(value || "").trim().toUpperCase();
const isOffShiftCode = (value) => {
  const code = normalizeShiftCode(value);
  return code === "OFF" || code === "OFF(EXCH)";
};
const isOffStatus = (value) => {
  const status = String(value || "").trim().toUpperCase();
  return status === "OFF" || status === "OFF(EXCH)" || status.includes("(OFF)");
};
const getOffStatusFromShift = (value) =>
  normalizeShiftCode(value) === "OFF(EXCH)" ? "OFF(EXCH)" : "OFF";

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
  if (!code || isOffShiftCode(code)) {
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
      const isLegacyDouble = /^[A-Z]{2}$/.test(shift) && !["OFF", "OFF(EXCH)", "DD"].includes(shift);
      const isDouble = shift.startsWith("DD:") || isLegacyDouble;
      return total + (isDouble ? 2 : 1);
    }
    return total;
  }, 0);

  const offCount = uniqueRecords.filter(r => isOffStatus(r.status)).length;
  const leaveCount = uniqueRecords.filter(r => r.status.includes("SL") || r.status.includes("CL")).length;

  return presentCount + offCount + leaveCount;
};

const normalizeAttendanceRecords = (records = []) => {
  const cleaned = (records || []).filter((rec) => Boolean(rec?.date));
  sortAttendanceRecords(cleaned);
  return cleaned;
};

const deriveLeaveCode = (leaveType) => {
  const type = String(leaveType || "").toUpperCase();
  return type.includes("SICK") || type === "SL" ? "SL" : "CL";
};

const formatDateKey = (dateObj) => dateObj.toLocaleDateString("en-CA");

const getFinancialYearForMonth = (month, year) =>
  month <= 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

const sortAttendanceRecords = (records = []) =>
  records.sort((a, b) => {
    const aTime = parseDateFlexible(a?.date)?.getTime() || 0;
    const bTime = parseDateFlexible(b?.date)?.getTime() || 0;
    return aTime - bTime;
  });

const buildAttendanceRecordForDate = async ({
  dateObj,
  rawShiftCode,
  approvedLeaves = [],
}) => {
  const dateKey = formatDateKey(dateObj);
  const normalizedShift = normalizeShiftCode(rawShiftCode);
  const isOffDay = isOffShiftCode(normalizedShift);

  let shiftStartTime = "--";
  let shiftEndTime = "--";
  let workDuration = "--";

  if (rawShiftCode && !isOffDay) {
    const timing = await getShiftTimingByCode(rawShiftCode);
    if (timing.ok) {
      shiftStartTime = timing.shiftStartTime;
      shiftEndTime = timing.shiftEndTime;
      workDuration = timing.workDurationText || "--";
      rawShiftCode = timing.normalizedCode || rawShiftCode;
    }
  }

  const approvedLeave = approvedLeaves.find((leave) => {
    const from = parseDateFlexible(leave?.fromDate);
    const to = parseDateFlexible(leave?.toDate || leave?.fromDate);
    return from && to && from <= dateObj && to >= dateObj;
  });

  let finalStatus = "Absent";
  if (approvedLeave) {
    const leaveCode = deriveLeaveCode(approvedLeave.leaveType);
    finalStatus = isOffDay ? `${leaveCode}(OFF)` : leaveCode;
  } else if (isOffDay) {
    finalStatus = getOffStatusFromShift(rawShiftCode);
  }

  return {
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
  };
};

const ensureAutoAttendanceForDate = async ({
  attendanceDoc = null,
  employeeId = "",
  employeeUserId = "",
  employeeName = "",
  dateObj,
  shiftMgmt = null,
  approvedLeaves = [],
  now = new Date(),
}) => {
  if (!dateObj || !employeeUserId) return { changed: false, attendanceDoc };

  const dateKey = formatDateKey(dateObj);
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  if (!attendanceDoc) {
    attendanceDoc = new Attendance({
      employeeId,
      employeeUserId,
      employeeName,
      month,
      year,
      financialYear: getFinancialYearForMonth(month, year),
      records: [],
    });
  } else {
    if (!attendanceDoc.employeeId && employeeId) attendanceDoc.employeeId = employeeId;
    if (!attendanceDoc.employeeName && employeeName) attendanceDoc.employeeName = employeeName;
    if (!Array.isArray(attendanceDoc.records)) attendanceDoc.records = [];
  }

  if ((attendanceDoc.records || []).some((rec) => rec?.date === dateKey)) {
    return { changed: false, attendanceDoc };
  }

  if (!shiftMgmt?.shifts) return { changed: false, attendanceDoc };

  const dayKey = dateObj.getDate();
  const rawShiftCode = shiftMgmt.shifts[dayKey] || shiftMgmt.shifts[dayKey.toString()] || "--";
  const normalizedShift = normalizeShiftCode(rawShiftCode);
  if (!normalizedShift || normalizedShift === "--") {
    return { changed: false, attendanceDoc };
  }

  const approvedLeave = approvedLeaves.find((leave) => {
    const from = parseDateFlexible(leave?.fromDate);
    const to = parseDateFlexible(leave?.toDate || leave?.fromDate);
    return from && to && from <= dateObj && to >= dateObj;
  });

  if (!isOffShiftCode(normalizedShift) && !approvedLeave) {
    const timing = await getShiftTimingByCode(rawShiftCode);
    if (!timing.ok) return { changed: false, attendanceDoc };

    const shiftStartMin = parseTimeToMinutes(timing.shiftStartTime);
    const shiftEndMin =
      typeof timing.shiftWindowEndMin === "number"
        ? timing.shiftWindowEndMin
        : (() => {
            const parsedEnd = parseTimeToMinutes(timing.shiftEndTime);
            return parsedEnd < shiftStartMin ? parsedEnd + 1440 : parsedEnd;
          })();

    const shiftEndDateTime = new Date(dateObj);
    shiftEndDateTime.setHours(0, 0, 0, 0);
    shiftEndDateTime.setMinutes(shiftEndMin);
    if (now < shiftEndDateTime) {
      return { changed: false, attendanceDoc };
    }
  }

  attendanceDoc.records.push(
    await buildAttendanceRecordForDate({
      dateObj,
      rawShiftCode,
      approvedLeaves,
    })
  );
  sortAttendanceRecords(attendanceDoc.records);
  attendanceDoc.totalPaidDays = calculateTotalPaidDays(attendanceDoc.records);
  return { changed: true, attendanceDoc };
};

const backfillAttendanceGaps = async ({
  employeeId,
  employeeUserId,
  employeeName,
  uptoDate,
  currentAttendanceDoc = null,
  userIdRegex = null,
  employeeIdRegex = null,
}) => {
  if (!employeeUserId || !uptoDate) return new Map();

  const docCache = new Map();
  const changedDocs = new Map();
  const shiftCache = new Map();

  const allDocs = await Attendance.find({
    $or: [
      { employeeUserId: employeeUserId },
      ...(userIdRegex ? [{ employeeUserId: userIdRegex }] : []),
      ...(employeeIdRegex ? [{ employeeId: employeeIdRegex }] : []),
    ],
  }).sort({ year: 1, month: 1 });

  for (const doc of allDocs) {
    docCache.set(`${doc.year}-${doc.month}`, doc);
  }

  if (currentAttendanceDoc) {
    docCache.set(`${currentAttendanceDoc.year}-${currentAttendanceDoc.month}`, currentAttendanceDoc);
  }

  const approvedLeaves = await findApprovedLeavesForEmployee({
    employeeUserId,
    userRegex: userIdRegex,
    employeeIdRegex,
  });

  const lastFilledDate = new Date(uptoDate);
  lastFilledDate.setDate(lastFilledDate.getDate() - 1);
  if (Number.isNaN(lastFilledDate.getTime())) return changedDocs;

  const shiftDocs = await ShiftManagement.find({
    month: { $exists: true },
    $or: [
      { employeeUserId: employeeUserId },
      ...(userIdRegex ? [{ employeeUserId: userIdRegex }] : []),
      ...(employeeIdRegex ? [{ employeeID: employeeIdRegex }] : []),
    ],
  }).lean();

  if (!shiftDocs.length) return changedDocs;

  for (const shiftDoc of shiftDocs) {
    if (!shiftDoc?.month) continue;
    shiftCache.set(String(shiftDoc.month), shiftDoc);
  }

  const getAttendanceDocForDate = (dateObj) => {
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    const key = `${year}-${month}`;
    let doc = docCache.get(key);

    if (!doc) {
      doc = new Attendance({
        employeeId,
        employeeUserId,
        employeeName,
        month,
        year,
        financialYear: getFinancialYearForMonth(month, year),
        records: [],
      });
      docCache.set(key, doc);
    } else {
      if (!doc.employeeId && employeeId) doc.employeeId = employeeId;
      if (!doc.employeeName && employeeName) doc.employeeName = employeeName;
    }

    return doc;
  };

  for (const shiftDoc of shiftCache.values()) {
    const [monthName, yearText] = String(shiftDoc.month).split("-");
    const monthIndex = monthNames.findIndex((name) => name === monthName);
    const year = Number(yearText);
    if (monthIndex < 0 || !year) continue;

    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const effectiveEnd = monthEnd > lastFilledDate ? lastFilledDate : monthEnd;
    if (monthStart > effectiveEnd) continue;

    for (
      let gapDate = new Date(monthStart);
      gapDate <= effectiveEnd;
      gapDate.setDate(gapDate.getDate() + 1)
    ) {
      const gapDateObj = new Date(gapDate);
      const gapDateKey = formatDateKey(gapDateObj);
      const attendanceDoc = getAttendanceDocForDate(gapDateObj);

      if ((attendanceDoc.records || []).some((rec) => rec.date === gapDateKey)) continue;

      const dayKey = gapDateObj.getDate();
      const rawShiftCode = shiftDoc?.shifts?.[dayKey] || shiftDoc?.shifts?.[dayKey.toString()] || "--";
      const normalizedShift = normalizeShiftCode(rawShiftCode);
      if (!normalizedShift || normalizedShift === "--") continue;

      attendanceDoc.records.push(
        await buildAttendanceRecordForDate({
          dateObj: gapDateObj,
          rawShiftCode,
          approvedLeaves,
        })
      );
      sortAttendanceRecords(attendanceDoc.records);
      attendanceDoc.totalPaidDays = calculateTotalPaidDays(attendanceDoc.records);
      changedDocs.set(`${attendanceDoc.year}-${attendanceDoc.month}`, attendanceDoc);
    }
  }

  for (const doc of changedDocs.values()) {
    await doc.save();
  }

  return changedDocs;
};

const syncAttendanceMonthFromShifts = async ({ month, year, now = new Date() }) => {
  const monthLabel = `${monthNames[month - 1]}-${year}`;
  if (!monthLabel || !monthNames[month - 1]) return;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const fillEndDate = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    : monthEnd;

  const shiftDocs = await ShiftManagement.find({ month: monthLabel }).lean();
  if (!shiftDocs.length) return;

  const attendanceDocs = await Attendance.find({ month, year });
  const attendanceByUserId = new Map(
    attendanceDocs.map((doc) => [String(doc.employeeUserId || "").trim(), doc])
  );

  for (const shiftDoc of shiftDocs) {
    const employeeUserId = String(shiftDoc.employeeUserId || "").trim();
    if (!employeeUserId) continue;

    let attendanceDoc = attendanceByUserId.get(employeeUserId);
    if (!attendanceDoc) {
      attendanceDoc = new Attendance({
        employeeId: shiftDoc.employeeID || "",
        employeeUserId,
        employeeName: shiftDoc.employeeName || employeeUserId,
        month,
        year,
        financialYear: getFinancialYearForMonth(month, year),
        records: [],
      });
      attendanceByUserId.set(employeeUserId, attendanceDoc);
    } else {
      if (!attendanceDoc.employeeId && shiftDoc.employeeID) attendanceDoc.employeeId = shiftDoc.employeeID;
      if (!attendanceDoc.employeeName && shiftDoc.employeeName) attendanceDoc.employeeName = shiftDoc.employeeName;
      if (!Array.isArray(attendanceDoc.records)) attendanceDoc.records = [];
    }

    let docChanged = false;
    const approvedLeaves = await findApprovedLeavesForEmployee({
      employeeUserId,
      employeeIdRegex: shiftDoc.employeeID ? new RegExp(`^${String(shiftDoc.employeeID).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") : null,
    });

    if (fillEndDate >= monthStart) {
      const effectiveEnd = fillEndDate < monthEnd ? fillEndDate : monthEnd;
      for (let d = new Date(monthStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
        const dateObj = new Date(d);
        const dateKey = formatDateKey(dateObj);
        if ((attendanceDoc.records || []).some((rec) => rec?.date === dateKey)) continue;

        const dayKey = dateObj.getDate();
        const rawShiftCode = shiftDoc?.shifts?.[dayKey] || shiftDoc?.shifts?.[dayKey.toString()] || "--";
        const normalizedShift = normalizeShiftCode(rawShiftCode);
        if (!normalizedShift || normalizedShift === "--") continue;

        attendanceDoc.records.push(
          await buildAttendanceRecordForDate({
            dateObj,
            rawShiftCode,
            approvedLeaves,
          })
        );
        docChanged = true;
      }
    }

    if (isCurrentMonth) {
      const autoTodaySync = await ensureAutoAttendanceForDate({
        attendanceDoc,
        employeeId: shiftDoc.employeeID || "",
        employeeUserId,
        employeeName: shiftDoc.employeeName || employeeUserId,
        dateObj: now,
        shiftMgmt: shiftDoc,
        approvedLeaves,
        now,
      });
      attendanceDoc = autoTodaySync.attendanceDoc || attendanceDoc;
      if (autoTodaySync.changed) docChanged = true;
    }

    if (await applyApprovedLeavesToAttendance(attendanceDoc, approvedLeaves)) {
      docChanged = true;
    }
    if (autoCloseAttendanceRecords(attendanceDoc, now)) {
      docChanged = true;
    }

    const normalizedRecords = normalizeAttendanceRecords(attendanceDoc.records);
    if (normalizedRecords.length !== (attendanceDoc.records || []).length) {
      attendanceDoc.records = normalizedRecords;
      docChanged = true;
    } else {
      attendanceDoc.records = normalizedRecords;
    }

    const recomputedPaidDays = calculateTotalPaidDays(attendanceDoc.records || []);
    if (attendanceDoc.totalPaidDays !== recomputedPaidDays) {
      attendanceDoc.totalPaidDays = recomputedPaidDays;
      docChanged = true;
    }

    if (docChanged) {
      await attendanceDoc.save();
    }
  }
};

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

const findApprovedLeavesForEmployee = async ({
  employeeUserId = "",
  userRegex = null,
  employeeIdRegex = null,
}) => {
  if (!employeeUserId && !userRegex && !employeeIdRegex) return [];
  return Leave.find({
    $and: [
      {
        $or: [
          ...(employeeUserId ? [{ employeeUserId }] : []),
          ...(userRegex ? [{ employeeUserId: userRegex }] : []),
          ...(employeeIdRegex ? [{ employeeId: employeeIdRegex }] : []),
        ],
      },
      {
        $or: [
          { approveRejectedStatus: "APPROVED" },
          { status: "APPROVED" },
          { reportingManagerApproval: "APPROVED", departmrntHeadApproval: "APPROVED" },
        ],
      },
    ],
  }).lean();
};

const applyApprovedLeavesToAttendance = async (attendanceDoc, approvedLeaves = []) => {
  if (!attendanceDoc || !Array.isArray(attendanceDoc.records)) return false;
  if (!approvedLeaves.length) return false;

  const recordIndexByDate = new Map(
    attendanceDoc.records
      .map((rec, idx) => [rec.date, idx])
      .filter(([date]) => Boolean(date))
  );

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
      const isOffDay = isOffShiftCode(normalizedShift);
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
      const isOff = isOffStatus(statusText) || isOffShiftCode(shiftCode);
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
        if (isOffShiftCode(normalizedShift)) {
          finalStatus = getOffStatusFromShift(rawShiftCode);
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
  const isLegacyDouble = /^[A-Z]{2}$/.test(shift) && !["OFF", "OFF(EXCH)", "DD"].includes(shift);
  return shift.startsWith("DD:") || isLegacyDouble;
};

const getWorkDurationText = (shiftCode, shiftStartTime, shiftEndTime, existingWorkDuration = "") => {
  if (existingWorkDuration && existingWorkDuration !== "--") return existingWorkDuration;
  return calculateDuration(shiftStartTime, shiftEndTime);
};

const sanitizeRecordForStatus = (record = {}) => {
  const status = String(record.status || "").trim().toUpperCase();
  if (isOffStatus(status) || status === "ABSENT" || status.startsWith("SL") || status.startsWith("CL")) {
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

    const escapeRegex = (value = "") =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const normalizeKey = (value = "") =>
      String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    const normalizeEmployeeCode = (value = "") => {
      const v = String(value || "").trim().toUpperCase();
      if (!v) return "";
      if (v.includes("-")) return v;
      const match = v.match(/^([A-Z]+)(\d+)$/);
      if (match) return `${match[1]}-${match[2]}`;
      return v;
    };

    if (!safeEmployeeUserId) {
      return res.status(400).json({ message: "Employee user ID is required" });
    }

    if (role === "employee") {
      const tokenUserNorm = normalizeKey(tokenUserId);
      const safeUserNorm = normalizeKey(safeEmployeeUserId);
      const tokenEmpNorm = normalizeKey(tokenEmpId);
      const safeEmpNorm = normalizeKey(safeEmployeeId);
      if (
        !tokenUserId ||
        tokenUserNorm !== safeUserNorm ||
        (tokenEmpId && safeEmployeeId && tokenEmpNorm !== safeEmpNorm)
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const normalizedUserId = normalizeEmployeeCode(safeEmployeeUserId);
    const normalizedEmpId = normalizeEmployeeCode(safeEmployeeId);

    const employeeDoc = await Employee.findOne({
      $or: [
        { employeeUserId: new RegExp(`^${escapeRegex(normalizedUserId || safeEmployeeUserId)}$`, "i") },
        ...(safeEmployeeId ? [{ employeeID: new RegExp(`^${escapeRegex(safeEmployeeId)}$`, "i") }] : []),
        ...(normalizedEmpId ? [{ employeeID: new RegExp(`^${escapeRegex(normalizedEmpId)}$`, "i") }] : []),
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
    const shiftMonthStr = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const fy = currentMonth <= 3 ? `${currentYear - 1}-${currentYear}` : `${currentYear}-${currentYear + 1}`;

    const userIdRegex = normalizedUserId
      ? new RegExp(`^${escapeRegex(String(normalizedUserId).trim())}$`, "i")
      : safeEmployeeUserId
      ? new RegExp(`^${escapeRegex(String(safeEmployeeUserId).trim())}$`, "i")
      : null;
    const employeeIdRegex = normalizedEmpId
      ? new RegExp(`^${escapeRegex(String(normalizedEmpId).trim())}$`, "i")
      : safeEmployeeId
      ? new RegExp(`^${escapeRegex(String(safeEmployeeId).trim())}$`, "i")
      : null;
    let shiftMgmt = await ShiftManagement.findOne({
      employeeUserId: userIdRegex,
      month: shiftMonthStr,
    }).lean();
    if (!shiftMgmt && employeeIdRegex) {
      shiftMgmt = await ShiftManagement.findOne({
        employeeID: employeeIdRegex,
        month: shiftMonthStr,
      }).lean();
    }
    if (!shiftMgmt && (safeEmployeeUserId || safeEmployeeId)) {
      const normalizedUserIdKey = normalizeKey(safeEmployeeUserId);
      const normalizedEmployeeIdKey = normalizeKey(safeEmployeeId);
      shiftMgmt = await ShiftManagement.findOne({
        month: shiftMonthStr,
        $or: [
          {
            employeeUserId: {
              $regex: new RegExp(`^${escapeRegex(normalizedUserIdKey)}$`, "i"),
            },
          },
          normalizedEmployeeIdKey
            ? {
                employeeID: {
                  $regex: new RegExp(`^${escapeRegex(normalizedEmployeeIdKey)}$`, "i"),
                },
              }
            : null,
        ].filter(Boolean),
      }).lean();
    }
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

    const approvedLeaves = await findApprovedLeavesForEmployee({
      employeeUserId: safeEmployeeUserId,
      userRegex: userIdRegex,
      employeeIdRegex,
    });

    const autoTodaySync = await ensureAutoAttendanceForDate({
      attendanceDoc: attendance,
      employeeId: safeEmployeeId,
      employeeUserId: safeEmployeeUserId,
      employeeName: safeEmployeeName,
      dateObj: now,
      shiftMgmt,
      approvedLeaves,
      now,
    });
    attendance = autoTodaySync.attendanceDoc || attendance;
    if (autoTodaySync.changed) {
      await attendance.save();
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    const yesterdayIndex = attendance.records.findIndex(r => r.date === yesterdayStr);
    const todayIndex = attendance.records.findIndex(r => r.date === todayStr);
    const hasYesterdayOpenRecord =
      yesterdayIndex !== -1 && isOpenPunchRecord(attendance.records[yesterdayIndex]);
    const existingTodayRecord = todayIndex !== -1 ? attendance.records[todayIndex] : null;

    if (existingTodayRecord && !hasYesterdayOpenRecord && !isOpenPunchRecord(existingTodayRecord)) {
      const todayStatus = String(existingTodayRecord?.status || "").trim().toUpperCase();
      if (todayStatus === "ABSENT") {
        return res.status(400).json({ message: "Shift ended and today's attendance was marked Absent automatically." });
      }
      if (todayStatus === "OFF" || todayStatus === "OFF(EXCH)") {
        return res.status(400).json({ message: "Today is your OFF day." });
      }
      if (todayStatus.startsWith("SL") || todayStatus.startsWith("CL")) {
        return res.status(400).json({ message: `Today is already marked as ${existingTodayRecord.status}.` });
      }
      if (todayStatus === "PRESENT") {
        return res.status(400).json({ message: "Attendance already marked for today." });
      }
    }

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
    await backfillAttendanceGaps({
      employeeId: safeEmployeeId,
      employeeUserId: safeEmployeeUserId,
      employeeName: safeEmployeeName,
      uptoDate: now,
      currentAttendanceDoc: attendance,
      userIdRegex,
      employeeIdRegex,
    });

    // --- 4. TODAY'S CHECK-IN LOGIC ---
    const assignedShiftCodeRaw = shiftMgmt.shifts[dayKey] || shiftMgmt.shifts[dayKey.toString()];
    const assignedShiftCode = normalizeShiftCode(assignedShiftCodeRaw);
    if (!assignedShiftCode || isOffShiftCode(assignedShiftCode)) {
      return res.status(400).json({ message: isOffShiftCode(assignedShiftCode) ? "Today is your OFF day." : "No shift assigned for today." });
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
    if (["SL", "CL", "SL(OFF)", "CL(OFF)", "OFF", "OFF(EXCH)"].includes(existingStatus)) {
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
    if (finalStatus === "OFF" || finalStatus === "OFF(EXCH)" || finalStatus === "Absent") {
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
    const escapeRegex = (value = "") =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const normalizeKey = (value = "") =>
      String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    const normalizeEmployeeCode = (value = "") => {
      const v = String(value || "").trim().toUpperCase();
      if (!v) return "";
      if (v.includes("-")) return v;
      const match = v.match(/^([A-Z]+)(\d+)$/);
      if (match) return `${match[1]}-${match[2]}`;
      return v;
    };

    if (role === "employee") {
      const tokenNorm = normalizeKey(req.user?.employeeUserId);
      const paramNorm = normalizeKey(employeeUserId);
      if (!tokenNorm || tokenNorm !== paramNorm) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const normalizedUserId = normalizeEmployeeCode(employeeUserId);
    const userRegex = new RegExp(`^${escapeRegex(normalizedUserId || employeeUserId)}$`, "i");
    const now = new Date();
    const employeeDoc = await Employee.findOne({ employeeUserId: userRegex })
      .select("employeeID employeeUserId firstName middleName lastName name")
      .lean();

    if (employeeDoc) {
      await backfillAttendanceGaps({
        employeeId: employeeDoc.employeeID || "",
        employeeUserId: employeeDoc.employeeUserId || employeeUserId,
        employeeName: buildEmployeeDisplayName(employeeDoc) || employeeDoc.employeeUserId || employeeUserId,
        uptoDate: now,
        userIdRegex: userRegex,
        employeeIdRegex: employeeDoc.employeeID
          ? new RegExp(`^${escapeRegex(employeeDoc.employeeID)}$`, "i")
          : null,
      });
    }

    const history = await Attendance.find({ employeeUserId: userRegex }).sort({ year: -1, month: -1 });
    const sanitized = [];
    for (const doc of history) {
      let docChanged = false;
      const { start, end } = getMonthRange(doc.year, doc.month);
      const approvedLeavesRaw = await Leave.find({
        employeeUserId: userRegex,
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
        if (await applyApprovedLeavesToAttendance(doc, approvedLeaves)) docChanged = true;
      } catch (e) {
        console.error("APPLY_LEAVE_SYNC_ERROR(getMyAttendance):", e);
      }
      try {
        if (autoCloseAttendanceRecords(doc, now)) docChanged = true;
      } catch (e) {
        console.error("AUTO_CLOSE_ERROR(getMyAttendance):", e);
      }
      try {
        const normalizedRecords = normalizeAttendanceRecords(doc.records);
        if (normalizedRecords.length !== (doc.records || []).length) {
          doc.records = normalizedRecords;
          docChanged = true;
        } else {
          doc.records = normalizedRecords;
        }
        const recomputedPaidDays = calculateTotalPaidDays(doc.records || []);
        if (doc.totalPaidDays !== recomputedPaidDays) {
          doc.totalPaidDays = recomputedPaidDays;
          docChanged = true;
        }
      } catch (e) {
        console.error("PAID_DAYS_RECALC_ERROR(getMyAttendance):", e);
      }
      if (docChanged) {
        await doc.save();
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
    const now = new Date();

    if (!(skipSync === "1" || skipSync === "true")) {
      await syncAttendanceMonthFromShifts({
        month: query.month,
        year: query.year,
        now,
      });
    }

    // Fast path for summary-only requests (e.g., payslip generation)
    if (summary === "1" || summary === "true") {
      const data = await Attendance.find(query)
        .select("employeeUserId totalPresent totalAbsent totalOff totalLeave totalOTHours totalPaidDays")
        .lean();
      return res.json(data || []);
    }

    const data = await Attendance.find(query);
    const normalizedDocs = [];
    for (const doc of data) {
      if (!(skipSync === "1" || skipSync === "true")) {
        let docChanged = false;
        const { start, end } = getMonthRange(doc.year, doc.month);
        const approvedLeavesRaw = await findApprovedLeavesForEmployee({
          employeeUserId: doc.employeeUserId,
        });
        const approvedLeaves = approvedLeavesRaw.filter((leave) =>
          doesLeaveOverlapRange(leave, start, end)
        );

        try {
          if (await applyApprovedLeavesToAttendance(doc, approvedLeaves)) docChanged = true;
        } catch (e) {
          console.error("APPLY_LEAVE_SYNC_ERROR(getAttendanceHistory):", e);
        }
        try {
          if (autoCloseAttendanceRecords(doc, now)) docChanged = true;
        } catch (e) {
          console.error("AUTO_CLOSE_ERROR(getAttendanceHistory):", e);
        }
        try {
          const normalizedRecords = normalizeAttendanceRecords(doc.records);
          if (normalizedRecords.length !== (doc.records || []).length) {
            doc.records = normalizedRecords;
            docChanged = true;
          } else {
            doc.records = normalizedRecords;
          }
          const recomputedPaidDays = calculateTotalPaidDays(doc.records || []);
          if (doc.totalPaidDays !== recomputedPaidDays) {
            doc.totalPaidDays = recomputedPaidDays;
            docChanged = true;
          }
        } catch (e) {
          console.error("PAID_DAYS_RECALC_ERROR(getAttendanceHistory):", e);
        }
        if (docChanged) {
          await doc.save();
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
