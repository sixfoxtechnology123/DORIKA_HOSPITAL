const Department = require("../models/Department");
const Activity = require("../models/Activity");

// Utility: Generate next department code
const generateDeptCode = async () => {
  const lastDept = await Department.findOne().sort({ deptCode: -1 });
  let nextNumber = 1;

  if (lastDept && lastDept.deptCode) {
    const match = lastDept.deptCode.match(/DEPT(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }

  return `DEPT${String(nextNumber).padStart(4, "0")}`;
};

// Get next department code
exports.getNextDeptCode = async (req, res) => {
  try {
    const code = await generateDeptCode();
    res.json({ deptCode: code });
  } catch (error) {
    console.error("Error generating dept code:", error);
    res.status(500).json({ error: "Failed to generate code" });
  }
};

// Create Department
exports.createDepartment = async (req, res) => {
  try {
    const { deptCode, deptName, description, status } = req.body;
    const department = new Department({ deptCode, deptName, description, status });
    const savedDept = await department.save();

    // 💡 SAFETY LOG: Even if this fails, the response still sends "success"
    try {
      await Activity.create({
        employeeUserId: req.user?.employeeUserId || req.user?.userId || "SYSTEM",
        name: req.user?.name || "Admin",
        action: "ADD",
        module: "Department Management",
        details: `Created new department: ${deptName} (${deptCode})`,
        ipAddress: req.ip
      });
    } catch (logErr) {
      console.error("Activity log failed:", logErr.message);
    }

    res.status(201).json(savedDept);
  } catch (err) {
    console.error("Error creating department:", err);
    res.status(500).json({ error: "Failed to save department" });
  }
};

// Get all Departments
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

// Update Department
exports.updateDepartment = async (req, res) => {
  try {
    const { deptCode, deptName, description, status } = req.body;
    const updated = await Department.findByIdAndUpdate(
      req.params.id,
      { deptCode, deptName, description, status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Department not found" });

    // 💡 SAFETY LOG
    try {
      await Activity.create({
        employeeUserId: req.user?.employeeUserId || req.user?.userId || "SYSTEM",
        name: req.user?.name || "Admin",
        action: "UPDATE",
        module: "Department Management",
        details: `Updated Department: ${updated.deptName} (${deptCode})`,
        ipAddress: req.ip
      });
    } catch (logErr) {
      console.error("Activity log failed:", logErr.message);
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating department:", err);
    res.status(500).json({ error: "Failed to update department" });
  }
};

// Delete Department
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) return res.status(404).json({ message: "Department not found" });

    // 💡 SAFETY LOG
    try {
      await Activity.create({
        employeeUserId: req.user?.employeeUserId || req.user?.userId || "SYSTEM",
        name: req.user?.name || "Admin",
        action: "DELETE",
        module: "Department Management",
        details: `Deleted department: ${department.deptName} (${department.deptCode})`,
        ipAddress: req.ip
      });
    } catch (logErr) {
      console.error("Activity log failed:", logErr.message);
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ error: "Failed to delete department" });
  }
};