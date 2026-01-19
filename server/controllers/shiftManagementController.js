const ShiftManagement = require("../models/ShiftManagement");

/* ================= GET SHIFTS BY MONTH ================= */
exports.getShiftsByMonth = async (req, res) => {
  try {
    const { month } = req.params;

    const shifts = await ShiftManagement.find({ month });

    res.status(200).json(shifts);
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

    const ops = data.map(item => ({
      updateOne: {
        filter: { employeeID: item.employeeID, month },
        update: {
          $set: {
            employeeName: item.employeeName,
            employeeUserId: item.employeeUserId,
            designation: item.designation,
            shifts: item.shifts,
          },
        },
        upsert: true,
      },
    }));

    await ShiftManagement.bulkWrite(ops);
    res.status(200).json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
