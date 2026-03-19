const ShiftManagement = require("../models/ShiftManagement");
const Employee = require("../models/Employee");
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

    res.status(200).json(safeShifts);
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
    const data = await ShiftManagement.findOneAndUpdate(
      singleFilter,
      {
        employeeID,
        employeeUserId,
        designation,
        shifts,
      },
      { upsert: true, new: true }
    );

    const shiftDiff = diffKeyedObject(previousDoc?.shifts, data.shifts);
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
            designation:
              previousDoc.designation !== data.designation ? previousDoc.designation : undefined,
            shifts: Object.keys(shiftDiff.previousChanges).length > 0 ? shiftDiff.previousChanges : undefined,
          })
        : null,
      current: cleanObject({
        designation:
          previousDoc?.designation !== data.designation || !previousDoc ? data.designation : undefined,
        shifts: Object.keys(shiftDiff.currentChanges).length > 0 ? shiftDiff.currentChanges : undefined,
      }),
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Save Shift Error:", error);
    res.status(500).json({ message: error.message });
  }
};


exports.saveBulkShifts = async (req, res) => {
  try {
    const { month, data } = req.body;
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

    const ops = data.flatMap((item) => {
      const userId = String(item.employeeUserId || "").trim();
      const employeeId = String(item.employeeID || "").trim();

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
              shifts: item.shifts,
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
        const afterShifts = item.shifts || {};
        const shiftDiff = diffKeyedObject(beforeShifts, afterShifts);
        const fieldChanged =
          !previous ||
          previous.designation !== item.designation ||
          previous.department !== item.department ||
          Object.keys(shiftDiff.currentChanges).length > 0;

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
                designation: previous.designation !== item.designation ? previous.designation : undefined,
                department: previous.department !== item.department ? previous.department : undefined,
                shifts: Object.keys(shiftDiff.previousChanges).length > 0 ? shiftDiff.previousChanges : undefined,
              }
            : null,
          current: {
            designation: previous?.designation !== item.designation || !previous ? item.designation : undefined,
            department: previous?.department !== item.department || !previous ? item.department : undefined,
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

    res.status(200).json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
