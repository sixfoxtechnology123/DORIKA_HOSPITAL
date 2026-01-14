const Employee = require("../models/Employee");
const Activity = require("../models/Activity");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const EmployeeUserId = require("../models/EmployeeUserId");

const generateEmployeeUserId = async () => {
  try {
    // Find the last employee created
    const lastEmp = await Employee.findOne().sort({ createdAt: -1 }).lean();
    let next = 1;

    // Check the dedicated serial field, NOT the employeeID
    if (lastEmp?.employeeUserId) {
      const match = lastEmp.employeeUserId.match(/EMP(\d+)/);
      if (match) next = parseInt(match[1], 10) + 1;
    } 

    return `EMP${next}`;
  } catch (err) {
    console.error("Error generating serial number:", err);
    return "EMP1";
  }
};


// Auto-generate EmployeeID with continuous serial and prefix
const generateEmployeeID = async (employmentStatus) => {
  try {
    const prefix = employmentStatus;

    // Get last employee by createdAt (global last, ignore prefix)
    const lastEmp = await Employee.findOne().sort({ createdAt: -1 }).lean();

    let next = 1;

    if (lastEmp?.employeeID) {
      const match = lastEmp.employeeID.match(/-(\d+)$/);
      if (match) next = parseInt(match[1], 10) + 1;
    }

    const nextID = String(next).padStart(5, "0"); // 5 digits
    return `${prefix}-${nextID}`;
  } catch (err) {
    return `${employmentStatus}-00001`;
  }
};



// GET /api/employees/next-id
exports.getNextEmployeeID = async (req, res) => {
  try {
const employeeID = await generateEmployeeID(req.query.employmentStatus);
const employeeUserId = await generateEmployeeUserId();

    res.json({ employeeID,employeeUserId });
    
  } catch (err) {
    res.status(500).json({ error: "Failed to generate employee ID" });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    if (!req.body) req.body = {};
    if (!req.body.employmentStatus) {
      return res.status(400).json({ error: "Please select Employment Status" });
    }

    // --- ADD THIS: LOOKUP NAMES FOR THE IDs ---
    if (req.body.reportingManagerEmpID) {
      const mgr = await Employee.findOne({ employeeID: req.body.reportingManagerEmpID }).lean();
      if (mgr) {
        req.body.reportingManager = `${mgr.firstName} ${mgr.lastName}`.trim();
        req.body.reportingManagerEmployeeUserId = mgr.employeeUserId;
      }
    }
    if (req.body.departmentHeadEmpID) {
      const head = await Employee.findOne({ employeeID: req.body.departmentHeadEmpID }).lean();
      if (head) {
        req.body.departmentHead = `${head.firstName} ${head.lastName}`.trim();
        req.body.departmentHeadEmployeeUserId = head.employeeUserId;
      }
    }
    // ------------------------------------------

    if (!req.body.employeeID) {
      req.body.employeeID = await generateEmployeeID(req.body.employmentStatus);
    }
   if (!req.body.employeeUserId) {
    req.body.employeeUserId = await generateEmployeeUserId();
  }

    const { departmentID, designationID } = req.body;
    const department = departmentID ? await Department.findById(departmentID).lean() : null;
    const designation = designationID ? await Designation.findById(designationID).lean() : null;

    if (req.body.hardCopyDocuments) {
      req.body.hardCopyDocuments = Object.keys(req.body.hardCopyDocuments)
        .filter(k => req.body.hardCopyDocuments[k] === true);
    }

    const emp = new Employee({
      ...req.body,
      departmentName: department ? department.deptName : "",
      designationName: designation ? designation.designationName : "",
    });

    const saved = await emp.save();

    await Activity.create({
      text: `Employee Added: ${saved.firstName} ${saved.lastName} (${saved.employeeID})`,
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error("Create employee error:", err);
    res.status(500).json({ error: err.message || "Failed to save employee" });
  }
};

// GET /api/employees
exports.getAllEmployees = async (req, res) => {
  try {
    const rows = await Employee.find().sort({ createdAt: 1 });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

// GET /api/employees/managers
exports.getManagers = async (req, res) => {
  try {
    const rows = await Employee.find({}, "employeeID firstName lastName").sort({ createdAt: 1 });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch managers" });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const { departmentID, designationID } = req.body;

    // 1. If Manager IDs are provided, look up their new names to store them
    if (req.body.reportingManagerEmpID) {
      const mgr = await Employee.findOne({ employeeID: req.body.reportingManagerEmpID }).lean();
      if (mgr) {
        req.body.reportingManager = `${mgr.firstName} ${mgr.lastName}`.trim();
        req.body.reportingManagerEmployeeUserId = mgr.employeeUserId;
      }
    }
    if (req.body.departmentHeadEmpID) {
      const head = await Employee.findOne({ employeeID: req.body.departmentHeadEmpID }).lean();
      if (head) 
        {
          req.body.departmentHead = `${head.firstName} ${head.lastName}`.trim();
          req.body.departmentHeadEmployeeUserId = head.employeeUserId;
        }
    }

    if (departmentID) {
      const department = await Department.findById(departmentID).lean();
      req.body.departmentName = department ? department.deptName : "";
    }

    if (designationID) {
      const designation = await Designation.findById(designationID).lean();
      req.body.designationName = designation ? designation.designationName : "";
    }

    if (req.body.hardCopyDocuments) {
      req.body.hardCopyDocuments = Object.keys(req.body.hardCopyDocuments)
        .filter(k => req.body.hardCopyDocuments[k] === true);
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    
    const oldEmployeeID = employee.employeeID;

    // Handle Status/ID Prefix change history
    if (req.body.employmentStatus && employee.employmentStatus !== req.body.employmentStatus) {
      const lastHistory = employee.statusHistory.length > 0
          ? employee.statusHistory[employee.statusHistory.length - 1]
          : null;

      const beforeDate = lastHistory?.currentDate || employee.statusChangeDate || employee.createdAt;

      employee.statusHistory.push({
        beforeStatus: employee.employmentStatus,
        beforeDate: beforeDate,
        currentStatus: req.body.employmentStatus,
        currentDate: req.body.statusChangeDate,
      });

      employee.statusChangeDate = req.body.statusChangeDate;
    }

    // Apply all updates from req.body
    Object.assign(employee, req.body);
    const updated = await employee.save();

    // 2. IMPORTANT: If THIS employee's ID changed (prefix change), 
    // update everyone who reports to them so they don't get a blank manager field.
    if (oldEmployeeID !== updated.employeeID) {
      // Update Login Table
      await EmployeeUserId.findOneAndUpdate(
        { employeeId: oldEmployeeID }, 
        { employeeId: updated.employeeID }
      );

      // Update Reporting Manager ID for all subordinates
      await Employee.updateMany(
        { reportingManagerEmpID: oldEmployeeID },
        { reportingManagerEmpID: updated.employeeID }
      );

      // Update Department Head ID for all subordinates
      await Employee.updateMany(
        { departmentHeadEmpID: oldEmployeeID },
        { departmentHeadEmpID: updated.employeeID }
      );
    }

    try {
      await Activity.create({
        text: `Employee Updated: ${updated.firstName} ${updated.lastName} (${updated.employeeID})`,
      });
    } catch (logErr) {
      console.error("Activity log error (updateEmployee):", logErr);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    const del = await Employee.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: "Employee not found" });

    try {
      await Activity.create({
        text: `Employee Deleted: ${del.firstName} ${del.lastName} (${del.employeeID})`,
      });
    } catch (logErr) {
      console.error("Activity log error (deleteEmployee):", logErr);
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id)
      .populate("departmentID", "deptName")
      .populate("designationID", "designationName");

    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({
      ...emp.toObject(),
      departmentID: emp.departmentID?._id || null,
      designationID: emp.designationID?._id || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Delete a single status history entry
exports.deleteEmployeeHistory = async (req, res) => {
  try {
    const { employeeID, historyID } = req.params;

    // Find employee by employeeID
    const employee = await Employee.findOne({ employeeID });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Find the index of the history entry
    const index = employee.statusHistory.findIndex(h => h._id.toString() === historyID);
    if (index === -1) return res.status(404).json({ message: "History entry not found" });

    // Remove that history entry
    employee.statusHistory.splice(index, 1);
    await employee.save();

    res.json({ message: "History entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
