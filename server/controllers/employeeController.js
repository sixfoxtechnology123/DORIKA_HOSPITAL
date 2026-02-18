const Employee = require("../models/Employee");
const Activity = require("../models/Activity");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const EmployeeUserId = require("../models/EmployeeUserId");
const LeaveApplication = require("../models/LeaveApplication");
const OtRate = require("../models/OtRate");
const AdminManagement = require("../models/adminManagementModel"); 


const generateEmployeeUserId = async () => {
  try {
    const prefix = "DH";
    // 1. Get all user IDs from the database
    const employees = await Employee.find({}, { employeeUserId: 1 }).lean();
    
    let maxNum = 0;

    // 2. Loop through all to find the REAL highest number
    employees.forEach(emp => {
      if (emp.employeeUserId) {
        const match = emp.employeeUserId.match(/\d+/); // Finds the numbers in DH-00558
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    // 3. If no employees exist, start at 101, otherwise increment max
    const next = maxNum === 0 ? 101 : maxNum + 1;
    return `${prefix}-${String(next).padStart(5, "0")}`;
  } catch (err) {
    return "DH-00101"; 
  }
};

const generateEmployeeID = async (employmentStatus) => {
  try {
    const prefix = employmentStatus;
    // We look for the highest number across ALL employees to keep it continuous
    const employees = await Employee.find({}, { employeeID: 1 }).lean();

    let maxNum = 0;

    employees.forEach(emp => {
      if (emp.employeeID) {
        const match = emp.employeeID.match(/\d+/); // Finds the numeric part
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const next = maxNum === 0 ? 101 : maxNum + 1;
    return `${prefix}-${String(next).padStart(5, "0")}`;
  } catch (err) {
    return `${employmentStatus}-00101`;
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

    // Replace the old Activity.create block with this:
    await Activity.create({
      name: `${saved.firstName} ${saved.lastName}`,
      employeeUserId: saved.employeeUserId,
      module: "Employee Management",
      action: "Create",
      details: `Created new employee record for ${saved.firstName} ${saved.lastName} (${saved.employeeID})`,
      text: `Employee Added: ${saved.firstName} ${saved.lastName} (${saved.employeeID})`, // Keep if still in schema
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
    const rows = await Employee.find().lean();

    // This sorts the list 1, 2, 3... 100, 101...
    const sortedRows = rows.sort((a, b) => {
      // It takes "DH-00101", pulls out 101, and compares it to the next one
      const numA = parseInt(a.employeeUserId?.replace(/\D/g, "") || 0, 10);
      const numB = parseInt(b.employeeUserId?.replace(/\D/g, "") || 0, 10);
      return numA - numB;
    });

    res.json(sortedRows);
  } catch (err) {
    console.error("Fetch employees error:", err);
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

    if (oldEmployeeID !== updated.employeeID) {

  
 await OtRate.updateMany(
        { employeeId: oldEmployeeID }, // Find the old ID (e.g., TR-001)
        { employeeId: updated.employeeID } // Change it to new ID (e.g., PER-001)
      );
      // Update Login Table
      await EmployeeUserId.findOneAndUpdate(
        { employeeId: oldEmployeeID }, 
        { employeeId: updated.employeeID }
      );
      await AdminManagement.updateMany(
        { employeeID: oldEmployeeID }, 
        { employeeID: updated.employeeID }
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
      name: `${updated.firstName} ${updated.lastName}`,
      employeeUserId: updated.employeeUserId,
      module: "Employee Management",
      action: "Update",
      details: `Updated profile information for ${updated.firstName} ${updated.lastName}`,
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
    // 1. Find the employee first to get their unique identifiers
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const targetUserId = employee.employeeUserId; // e.g., "EMP8"

    // 2. Delete from associated collections using employeeUserId
    await Promise.all([
      // Delete login credentials/user session data
      EmployeeUserId.deleteMany({ employeeUserId: targetUserId }),
      
      // Delete all leave applications for this user
      LeaveApplication.deleteMany({ employeeUserId: targetUserId }),
      OtRate.deleteMany({ employeeId: employee.employeeID }),
      
    ]);

    // 3. Finally, delete the main employee record
    await Employee.findByIdAndDelete(req.params.id);

    // 4. Log the deletion activity
    try {
 // Replace the old Activity.create block with this:
    await Activity.create({
      name: `${employee.firstName} ${employee.lastName}`,
      employeeUserId: employee.employeeUserId,
      module: "Employee Management",
      action: "Delete",
      details: `Permanently deleted employee and associated records (Leaves, OT Rates, Login).`,
      text: `Permanent Deletion: ${employee.firstName} ${employee.lastName} (${employee.employeeID})`,
    });
    } catch (logErr) {
      console.error("Activity log error (deleteEmployee):", logErr);
    }

    res.json({ 
      message: "Employee and all associated records (Login, Leaves) deleted successfully" 
    });

  } catch (err) {
    console.error("Delete error:", err);
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
