const ShiftManagement = require("../models/ShiftManagement");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const { createAuditLog, cleanObject } = require("../utils/auditLogger");

const normalizeKey = (value) => String(value || "").trim().toUpperCase();
const escapeRegex = (val) => String(val || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mapLikeToObject = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value.toObject === "function") return value.toObject();
  return { ...value };
};

const diffKeyedObject = (previous = {}, current = {}) => {
  const prev = mapLikeToObject(previous);
  const curr = mapLikeToObject(current);
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(curr)])];
  const previousChanges = {};
  const currentChanges = {};

  keys.forEach((key) => {
    const before = prev[key] ?? "";
    const after = curr[key] ?? "";
    if (String(before) !== String(after)) {
      previousChanges[key] = before;
      currentChanges[key] = after;
    }
  });

  return { previousChanges, currentChanges };
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parseShiftMonth = (value = "") => {
  const [monthName = "", yearText = ""] = String(value || "").split("-");
  const month = monthNames.findIndex((item) => item === monthName) + 1;
  const year = Number(yearText);
  if (!month || !year) return null;
  return { month, year };
};

const getExpiredDaysForMonth = (monthLabel = "", now = new Date()) => {
  const parsed = parseShiftMonth(monthLabel);
  if (!parsed) return [];

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (parsed.year < currentYear || (parsed.year === currentYear && parsed.month < currentMonth)) {
    const totalDays = new Date(parsed.year, parsed.month, 0).getDate();
    return Array.from({ length: totalDays }, (_, index) => index + 1);
  }
  if (parsed.year === currentYear && parsed.month === currentMonth) {
    return Array.from({ length: Math.max(0, now.getDate() - 1) }, (_, index) => index + 1);
  }
  return [];
};

const getLockedDaysMapForMonth = async ({ monthLabel = "", employeeUserIds = [], employeeIds = [] }) => {
  const parsed = parseShiftMonth(monthLabel);
  if (!parsed) return new Map();

  const safeUserIds = employeeUserIds.map((value) => String(value || "").trim()).filter(Boolean);
  const safeEmployeeIds = employeeIds.map((value) => String(value || "").trim()).filter(Boolean);
  if (!safeUserIds.length && !safeEmployeeIds.length) return new Map();

  const attendanceDocs = await Attendance.find({
    month: parsed.month,
    year: parsed.year,
    $or: [
      ...(safeUserIds.length ? [{ employeeUserId: { $in: safeUserIds } }] : []),
      ...(safeEmployeeIds.length ? [{ employeeId: { $in: safeEmployeeIds } }] : []),
    ],
  })
    .select("employeeUserId employeeId records.date")
    .lean();

  const lockedMap = new Map();
  for (const doc of attendanceDocs) {
    const lockedDays = Array.from(
      new Set(
        (doc.records || [])
          .map((rec) => String(rec?.date || ""))
          .filter(Boolean)
          .map((dateText) => Number(String(dateText).split("-")[2]))
          .filter((day) => Number.isInteger(day) && day > 0)
      )
    ).sort((a, b) => a - b);

    if (lockedDays.length === 0) continue;
    if (doc.employeeUserId) lockedMap.set(`USR:${normalizeKey(doc.employeeUserId)}`, lockedDays);
    if (doc.employeeId) lockedMap.set(`EMP:${normalizeKey(doc.employeeId)}`, lockedDays);
  }

  return lockedMap;
};

const preserveLockedShiftDays = ({ previousShifts = {}, nextShifts = {}, lockedDays = [] }) => {
  const prev = mapLikeToObject(previousShifts);
  const next = mapLikeToObject(nextShifts);
  const blockedDays = [];

  for (const day of lockedDays || []) {
    const key = String(day);
    const before = String(prev?.[key] ?? "");
    const after = String(next?.[key] ?? "");
    if (before !== after) {
      blockedDays.push(Number(day));
      if (before) next[key] = before;
      else delete next[key];
    }
  }

  return {
    shifts: next,
    blockedDays: blockedDays.sort((a, b) => a - b),
  };
};

const mergeLockedDays = (...collections) =>
  Array.from(
    new Set(
      collections
        .flat()
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day > 0)
    )
  ).sort((a, b) => a - b);

/* ================= GET SHIFTS BY MONTH ================= */
exports.getShiftsByMonth = async (req, res) => {
  try {
    const { month } = req.params;
    const role = String(req.user?.role || "").toLowerCase();
    const filter = { month };
    if (role === "employee") {
      filter.employeeUserId = req.user?.employeeUserId || "__NO_MATCH__";
    }
    const [shifts, employeeRows] = await Promise.all([
      ShiftManagement.find(filter).lean(),
      Employee.find({}, { employeeID: 1, employeeUserId: 1 }).lean(),
    ]);

    // Return only records that still belong to an existing employee pair.
    const validPairSet = new Set(
      employeeRows.map((e) => `${normalizeKey(e.employeeID)}|${normalizeKey(e.employeeUserId)}`)
    );
    const validEmployeeIdSet = new Set(employeeRows.map((e) => normalizeKey(e.employeeID)).filter(Boolean));
    const validUserIdSet = new Set(employeeRows.map((e) => normalizeKey(e.employeeUserId)).filter(Boolean));

    const safeShifts = shifts.filter((s) => {
      const employeeId = normalizeKey(s.employeeID);
      const userId = normalizeKey(s.employeeUserId);
      const pairKey = `${employeeId}|${userId}`;
      return (
        (userId && validUserIdSet.has(userId)) ||
        (employeeId && validEmployeeIdSet.has(employeeId)) ||
        validPairSet.has(pairKey)
      );
    });

    const lockedDaysMap = await getLockedDaysMapForMonth({
      monthLabel: month,
      employeeUserIds: safeShifts.map((s) => s.employeeUserId),
      employeeIds: safeShifts.map((s) => s.employeeID),
    });
    const expiredDays = getExpiredDaysForMonth(month);

    res.status(200).json(
      safeShifts.map((item) => {
        const userKey = `USR:${normalizeKey(item.employeeUserId)}`;
        const empKey = `EMP:${normalizeKey(item.employeeID)}`;
        return {
          ...item,
          lockedDays: mergeLockedDays(
            expiredDays,
            lockedDaysMap.get(userKey) || lockedDaysMap.get(empKey) || []
          ),
        };
      })
    );
  } catch (error) {
    console.error("Get Shifts Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.saveShift = async (req, res) => {
  try {
    const { employeeID, employeeUserId, designation, month, shifts } = req.body;

    if (!employeeID || !designation || !month) {
      return res.status(400).json({
        message: "employeeID, designation and month are required",
      });
    }

    const singleFilter = employeeUserId
      ? { employeeUserId: { $regex: new RegExp(`^${escapeRegex(employeeUserId)}$`, "i") }, month }
      : { employeeID, month };
    const previousDoc = await ShiftManagement.findOne(singleFilter).lean();
    const lockedDaysMap = await getLockedDaysMapForMonth({
      monthLabel: month,
      employeeUserIds: [employeeUserId || previousDoc?.employeeUserId].filter(Boolean),
      employeeIds: [employeeID || previousDoc?.employeeID].filter(Boolean),
    });
    const lockedDays =
      mergeLockedDays(
        getExpiredDaysForMonth(month),
        lockedDaysMap.get(`USR:${normalizeKey(employeeUserId || previousDoc?.employeeUserId)}`) ||
          lockedDaysMap.get(`EMP:${normalizeKey(employeeID || previousDoc?.employeeID)}`) ||
          []
      );
    const protectedResult = preserveLockedShiftDays({
      previousShifts: previousDoc?.shifts || {},
      nextShifts: shifts || {},
      lockedDays,
    });
    const data = await ShiftManagement.findOneAndUpdate(
      singleFilter,
      {
        employeeID,
        employeeUserId,
        designation,
        month,
        shifts: protectedResult.shifts,
      },
      { upsert: true, new: true }
    );

    const shiftDiff = diffKeyedObject(previousDoc?.shifts, data.shifts);
    const hasShiftChanges = Object.keys(shiftDiff.currentChanges).length > 0;
    if (!previousDoc || hasShiftChanges) {
      await createAuditLog({
        req,
        action: previousDoc ? "UPDATE" : "CREATE",
        module: "Shift Management",
        details: `${previousDoc ? "Updated" : "Created"} shift roster for ${data.employeeName || data.employeeID} (${month}).`,
        target: {
          employeeUserId: data.employeeUserId || "",
          employeeID: data.employeeID || "",
          name: data.employeeName || "",
          department: data.department || "",
          designation: data.designation || "",
        },
        previous: previousDoc
          ? cleanObject({
              shifts: Object.keys(shiftDiff.previousChanges).length > 0 ? shiftDiff.previousChanges : undefined,
            })
          : null,
        current: cleanObject({
          shifts: Object.keys(shiftDiff.currentChanges).length > 0 ? shiftDiff.currentChanges : undefined,
        }),
      });
    }

    res.status(200).json({
      ...data.toObject(),
      lockedDays,
      blockedDays: protectedResult.blockedDays,
    });
  } catch (error) {
    console.error("Save Shift Error:", error);
    res.status(500).json({ message: error.message });
  }
};


exports.saveBulkShifts = async (req, res) => {
  try {
    const { month, data } = req.body;
    const rows = Array.isArray(data) ? data : [];
    const lockedDaysMap = await getLockedDaysMapForMonth({
      monthLabel: month,
      employeeUserIds: rows.map((item) => item.employeeUserId),
      employeeIds: rows.map((item) => item.employeeID),
    });
    const employeeIds = (Array.isArray(data) ? data : []).map((item) => String(item.employeeID || "").trim()).filter(Boolean);
    const employeeUserIds = (Array.isArray(data) ? data : []).map((item) => String(item.employeeUserId || "").trim()).filter(Boolean);
    const previousDocs = await ShiftManagement.find({
      month,
      $or: [
        { employeeID: { $in: employeeIds } },
        { employeeUserId: { $in: employeeUserIds } },
      ],
    }).lean();
    const previousMap = new Map(
      previousDocs.flatMap((doc) => {
        const keys = [];
        if (doc.employeeID) keys.push([`EMP:${String(doc.employeeID).trim().toUpperCase()}`, doc]);
        if (doc.employeeUserId) keys.push([`USR:${String(doc.employeeUserId).trim().toUpperCase()}`, doc]);
        return keys;
      })
    );

    const blockedChanges = [];
    const ops = data.flatMap((item) => {
      const userId = String(item.employeeUserId || "").trim();
      const employeeId = String(item.employeeID || "").trim();
      const previous =
        previousMap.get(`USR:${userId.toUpperCase()}`) ||
        previousMap.get(`EMP:${employeeId.toUpperCase()}`) ||
        null;
      const lockedDays =
        mergeLockedDays(
          getExpiredDaysForMonth(month),
          lockedDaysMap.get(`USR:${normalizeKey(userId)}`) ||
            lockedDaysMap.get(`EMP:${normalizeKey(employeeId)}`) ||
            []
        );
      const protectedResult = preserveLockedShiftDays({
        previousShifts: previous?.shifts || {},
        nextShifts: item.shifts || {},
        lockedDays,
      });
      if (protectedResult.blockedDays.length > 0) {
        blockedChanges.push({
          employeeID: employeeId,
          employeeUserId: userId,
          blockedDays: protectedResult.blockedDays,
        });
      }

      const cleanupOp = {
        deleteMany: {
          filter: {
            month,
            $or: [
              userId
                ? {
                    employeeUserId: { $regex: new RegExp(`^${escapeRegex(userId)}$`, "i") },
                    employeeID: { $ne: employeeId },
                  }
                : null,
              employeeId
                ? {
                    employeeID: employeeId,
                    employeeUserId: { $ne: userId },
                  }
                : null,
            ].filter(Boolean),
          },
        },
      };

      const upsertOp = {
        updateOne: {
          filter: userId
            ? {
                month,
                employeeUserId: { $regex: new RegExp(`^${escapeRegex(userId)}$`, "i") },
              }
            : { employeeID: employeeId, month },
          update: {
            $set: {
              employeeID: employeeId,
              employeeName: item.employeeName,
              employeeUserId: userId,
              designation: item.designation,
              department: item.department,
              month,
              shifts: protectedResult.shifts,
            },
          },
          upsert: true,
        },
      };

      return [cleanupOp, upsertOp];
    });

    await ShiftManagement.bulkWrite(ops, { ordered: false });
    const changedItems = (Array.isArray(data) ? data : [])
      .map((item) => {
        const previous =
          previousMap.get(`USR:${String(item.employeeUserId || "").trim().toUpperCase()}`) ||
          previousMap.get(`EMP:${String(item.employeeID || "").trim().toUpperCase()}`) ||
          null;
        const beforeShifts = mapLikeToObject(previous?.shifts);
        const lockedDays =
          mergeLockedDays(
            getExpiredDaysForMonth(month),
            lockedDaysMap.get(`USR:${normalizeKey(item.employeeUserId)}`) ||
              lockedDaysMap.get(`EMP:${normalizeKey(item.employeeID)}`) ||
              []
          );
        const afterShifts = preserveLockedShiftDays({
          previousShifts: beforeShifts,
          nextShifts: item.shifts || {},
          lockedDays,
        }).shifts;
        const shiftDiff = diffKeyedObject(beforeShifts, afterShifts);
        const fieldChanged =
          !previous || Object.keys(shiftDiff.currentChanges).length > 0;

        if (!fieldChanged) return null;
        return {
          employeeID: item.employeeID,
          employeeUserId: item.employeeUserId,
          employeeName: item.employeeName,
          department: item.department,
          designation: item.designation,
          shiftDiff,
          previous: previous
            ? {
                shifts: Object.keys(shiftDiff.previousChanges).length > 0 ? shiftDiff.previousChanges : undefined,
              }
            : null,
          current: {
            shifts: Object.keys(shiftDiff.currentChanges).length > 0 ? shiftDiff.currentChanges : undefined,
          },
        };
      })
      .filter(Boolean);

    if (changedItems.length > 0) {
      await Promise.all(
        changedItems.map((item) =>
          createAuditLog({
            req,
            action: item.previous ? "UPDATE" : "CREATE",
            module: "Shift Management",
            details: `${item.previous ? "Updated" : "Created"} shift roster for ${item.employeeName || item.employeeID} (${month}).`,
            target: {
              employeeUserId: item.employeeUserId || "",
              employeeID: item.employeeID || "",
              name: item.employeeName || "",
              department: item.department || "",
              designation: item.designation || "",
            },
            previous: item.previous,
            current: item.current,
            metadata: {
              month,
              changedDays: Object.keys(item.shiftDiff.currentChanges || {}),
            },
          })
        )
      );
    }

    res.status(200).json({ message: "Saved", blockedChanges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
