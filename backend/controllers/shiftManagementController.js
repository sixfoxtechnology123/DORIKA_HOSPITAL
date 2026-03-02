const ShiftManagement = require("../models/ShiftManagement");
const Employee = require("../models/Employee");

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

    const data = await ShiftManagement.findOneAndUpdate(
      { employeeID, month },
      { designation, shifts },
      { upsert: true, new: true }
    );

    res.status(200).json(data);
  } catch (error) {
    console.error("Save Shift Error:", error);
    res.status(500).json({ message: error.message });
  }
};


exports.saveBulkShifts = async (req, res) => {
  try {
    const { month, data } = req.body;

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
    res.status(200).json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
