const DepartmentHead = require("../models/DepartmentHead");

const generateNextDepartmentHeadId = async () => {
  const rows = await DepartmentHead.find({}, { departmentHeadId: 1 }).lean();
  let maxNum = 0;
  rows.forEach((row) => {
    const match = String(row.departmentHeadId || "").match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const next = maxNum + 1;
  return `DHM-${String(next).padStart(5, "0")}`;
};

exports.getNextDepartmentHeadId = async (req, res) => {
  try {
    const departmentHeadId = await generateNextDepartmentHeadId();
    res.json({ departmentHeadId });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate department head id" });
  }
};

exports.createDepartmentHead = async (req, res) => {
  try {
    const {
      departmentHeadId,
      employeeUserId,
      employeeID,
      employeeName,
      departmentHeadName,
      departmentID,
      departmentName,
      designationData,
      designationIdArray,
      designationArray,
    } = req.body || {};

    if (!employeeUserId || !employeeID || !departmentName || !departmentID) {
      return res
        .status(400)
        .json({ message: "employeeUserId, employeeID, departmentID, departmentName are required" });
    }

    const nextId = departmentHeadId || (await generateNextDepartmentHeadId());

    const duplicate = await DepartmentHead.findOne({
      employeeUserId,
      departmentID,
    }).lean();
    if (duplicate) {
      return res.status(400).json({
        message: "Already exists: same employee user ID in this department",
      });
    }

    const normalizedDesignationData = Array.isArray(designationData)
      ? designationData
          .map((d) => ({ id: String(d?.id || ""), name: String(d?.name || "") }))
          .filter((d) => d.id || d.name)
      : (Array.isArray(designationIdArray) || Array.isArray(designationArray))
      ? (designationIdArray || []).map((id, idx) => ({
          id: String(id || ""),
          name: String((designationArray || [])[idx] || ""),
        }))
      : [];

    const saved = await DepartmentHead.create({
      departmentHeadId: nextId,
      employeeUserId,
      employeeID,
      employeeName: employeeName || "",
      departmentHeadName: departmentHeadName || employeeName || "",
      departmentID,
      departmentName,
      designationData: normalizedDesignationData,
    });

    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Department Head ID already exists" });
    }
    res.status(500).json({ message: err.message || "Failed to save department head" });
  }
};

exports.getDepartmentHeads = async (req, res) => {
  try {
    const rows = await DepartmentHead.find().sort({ createdAt: -1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch department heads" });
  }
};

exports.updateDepartmentHead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeeUserId,
      employeeID,
      employeeName,
      departmentHeadName,
      departmentID,
      departmentName,
      designationData,
      designationIdArray,
      designationArray,
    } = req.body || {};

    if (!employeeUserId || !employeeID || !departmentName || !departmentID) {
      return res
        .status(400)
        .json({ message: "employeeUserId, employeeID, departmentID, departmentName are required" });
    }

    const duplicate = await DepartmentHead.findOne({
      employeeUserId,
      departmentID,
      _id: { $ne: id },
    }).lean();
    if (duplicate) {
      return res.status(400).json({
        message: "Already exists: same employee user ID in this department",
      });
    }

    const normalizedDesignationData = Array.isArray(designationData)
      ? designationData
          .map((d) => ({ id: String(d?.id || ""), name: String(d?.name || "") }))
          .filter((d) => d.id || d.name)
      : (Array.isArray(designationIdArray) || Array.isArray(designationArray))
      ? (designationIdArray || []).map((id, idx) => ({
          id: String(id || ""),
          name: String((designationArray || [])[idx] || ""),
        }))
      : [];

    const updated = await DepartmentHead.findByIdAndUpdate(
      id,
      {
        $set: {
          employeeUserId,
          employeeID,
          employeeName: employeeName || "",
          departmentHeadName: departmentHeadName || employeeName || "",
          departmentID,
          departmentName,
          designationData: normalizedDesignationData,
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Department head record not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update department head" });
  }
};

exports.deleteDepartmentHead = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DepartmentHead.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Department head record not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete department head" });
  }
};
