const ShiftManagement = require("../models/ShiftManagement");
const Employee = require("../models/Employee");
const { createAuditLog, cleanObject } = require("../utils/auditLogger");

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
      employeeRows.map(
        (e) =>
          `${String(e.employeeID || "").trim().toUpperCase()}|${String(
            e.employeeUserId || ""
          )
            .trim()
            .toUpperCase()}`
      )
    );

    const safeShifts = shifts.filter((s) => {
      const pairKey = `${String(s.employeeID || "").trim().toUpperCase()}|${String(
        s.employeeUserId || ""
      )
        .trim()
        .toUpperCase()}`;
      return validPairSet.has(pairKey);
    });

    res.status(200).json(safeShifts);
  } catch (error) {
    console.error("Get Shifts Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.saveShift = async (req, res) => {
  try {
    const { employeeID, designation, month, shifts } = req.body;

    if (!employeeID || !designation || !month) {
      return res.status(400).json({
        message: "employeeID, designation and month are required",
      });
    }

    const previousDoc = await ShiftManagement.findOne({ employeeID, month }).lean();
    const data = await ShiftManagement.findOneAndUpdate(
      { employeeID, month },
      { designation, shifts },
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
    const previousDocs = await ShiftManagement.find({ month, employeeID: { $in: employeeIds } }).lean();
    const previousMap = new Map(previousDocs.map((doc) => [String(doc.employeeID || "").trim(), doc]));

    const escapeRegex = (val) => String(val || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const ops = data.flatMap((item) => {
      const userId = String(item.employeeUserId || "").trim();
      const employeeId = String(item.employeeID || "").trim();

      const cleanupOp = {
        deleteMany: {
          filter: {
            month,
            employeeID: { $ne: employeeId },
            employeeUserId: { $regex: new RegExp(`^${escapeRegex(userId)}$`, "i") },
          },
        },
      };

      const upsertOp = {
        updateOne: {
          filter: { employeeID: employeeId, month },
          update: {
            $set: {
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
        const previous = previousMap.get(String(item.employeeID || "").trim()) || null;
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
