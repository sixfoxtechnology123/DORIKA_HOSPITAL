const Employee = require("../models/Employee");
const Activity = require("../models/Activity");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const EmployeeUserId = require("../models/EmployeeUserId");
const LeaveApplication = require("../models/LeaveApplication");
const OtRate = require("../models/OtRate");
const AdminManagement = require("../models/adminManagementModel"); 
const Attendance = require("../models/Attendance");
const ShiftManagement = require("../models/ShiftManagement");
const DepartmentHead = require("../models/DepartmentHead");
const mongoose = require("mongoose");
const { createAuditLog, getEmployeeAuditTarget, pick } = require("../utils/auditLogger");

const normalizeForCompare = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeForCompare);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, v]) => key !== "_id" && key !== "__v" && v !== undefined)
        .map(([key, v]) => [key, normalizeForCompare(v)])
    );
  }
  return value;
};

const isEqual = (a, b) =>
  JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b));

const getByPath = (obj, path) => {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
};

const setByPath = (obj, path, value) => {
  const keys = path.split(".");
  let cursor = obj;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });
};

const employeeAuditSections = [
  {
    name: "Personal & Service details",
    fields: [
      "employeeID",
      "employeeUserId",
      "employmentStatus",
      "exEmployeeReason",
      "governmentRegistrationNumber",
      "registrationState",
      "salutation",
      "firstName",
      "middleName",
      "lastName",
      "fatherName",
      "spouseName",
      "caste",
      "subCaste",
      "religion",
      "gender",
      "maritalStatus",
      "personalEmail",
      "personalMobile",
      "departmentName",
      "designationName",
      "dob",
      "dor",
      "doj",
      "statusChangeDate",
      "confirmationDate",
      "nextIncrementDate",
      "eligiblePromotion",
      "employmentType",
      "reportingManager",
      "reportingManagerEmpID",
      "reportingManagerEmployeeUserId",
      "departmentHead",
      "departmentHeadEmpID",
      "departmentHeadEmployeeUserId",
    ],
  },
  { name: "Education", fields: ["educationDetails"] },
  { name: "Experience", fields: ["experienceDetails"] },
  {
    name: "Nominees/Medical/Address",
    fields: ["nominees", "medical", "emergencyContact", "permanentAddress", "presentAddress"],
  },
  { name: "Pay Details", fields: ["payDetails"] },
  { name: "Pay Structure", fields: ["payType", "grossSalary", "earnings", "deductions"] },
  { name: "Document", fields: ["hardCopyDocuments"] },
];

const collectEmployeeChanges = (previousEmployee, updatedEmployee) => {
  const previous = previousEmployee || {};
  const current = updatedEmployee?.toObject ? updatedEmployee.toObject() : updatedEmployee || {};
  const previousChanged = {};
  const currentChanged = {};
  const updatedSections = [];
  const updatedFields = new Set();

  employeeAuditSections.forEach((section) => {
    let sectionChanged = false;
    section.fields.forEach((field) => {
      const path = typeof field === "string" ? field : field.path;
      const label = typeof field === "string" ? field : field.label || field.path;
      const prevVal = getByPath(previous, path);
      const currVal = getByPath(current, path);
      if (!isEqual(prevVal, currVal)) {
        sectionChanged = true;
        updatedFields.add(label);
        setByPath(previousChanged, path, prevVal);
        setByPath(currentChanged, path, currVal);
      }
    });
    if (sectionChanged) {
      updatedSections.push(section.name);
    }
  });

  return {
    updatedSections,
    updatedFields: Array.from(updatedFields),
    previousChanged,
    currentChanged,
  };
};


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

    await createAuditLog({
      req,
      action: "CREATE",
      module: "Employee Management",
      details: `Created new employee record for ${saved.firstName} ${saved.lastName} (${saved.employeeID})`,
      target: getEmployeeAuditTarget(saved),
      previous: null,
      current: pick(saved.toObject ? saved.toObject() : saved, [
        "employeeID",
        "employeeUserId",
        "firstName",
        "middleName",
        "lastName",
        "departmentName",
        "designationName",
        "employmentStatus",
        "grossSalary",
      ]),
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
    const role = String(req.user?.role || "").toLowerCase();
    const projection = {
      employeeID: 1,
      employeeUserId: 1,
      salutation: 1,
      firstName: 1,
      middleName: 1,
      lastName: 1,
      departmentName: 1,
      designationName: 1,
      employmentStatus: 1,
      exEmployeeReason: 1,
      statusChangeDate: 1,
      reportingManagerEmployeeUserId: 1,
      departmentHeadEmployeeUserId: 1,
      reportingManagerEmpID: 1,
      departmentHeadEmpID: 1,
      doj: 1,
      payType: 1,
      grossSalary: 1,
      earnings: 1,
      deductions: 1,
      permanentAddress: 1,
      presentAddress: 1,
      payDetails: 1,
      createdAt: 1
    };

    let rows = [];
    if (role === "employee") {
      const self = await Employee.findOne({ employeeUserId: req.user?.employeeUserId }, projection).lean();
      rows = self ? [self] : [];
    } else {
      rows = await Employee.find({}, projection).lean();
    }

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
    const previousEmployee = employee.toObject();
    
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

    const {
      updatedSections,
      updatedFields,
      previousChanged,
      currentChanged,
    } = collectEmployeeChanges(previousEmployee, updated);

    const sectionNote = updatedSections.length
      ? ` Sections updated: ${updatedSections.join(", ")}.`
      : "";

    await createAuditLog({
      req,
      action: "UPDATE",
      module: "Employee Management",
      details: `Updated employee record for ${updated.firstName} ${updated.lastName} (${updated.employeeID}).${sectionNote}`,
      target: getEmployeeAuditTarget(updated),
      previous: previousChanged,
      current: currentChanged,
      metadata: {
        updatedSections,
        updatedFields,
      },
    });

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

    const targetUserId = employee.employeeUserId; // e.g., "DH-00518"
    const targetEmployeeID = employee.employeeID; // e.g., "P-00518"

    // 2. Delete from associated collections using employeeUserId + employeeID
    await Promise.all([
      EmployeeUserId.deleteMany({
        $or: [{ employeeUserId: targetUserId }, { employeeId: targetEmployeeID }],
      }),
      AdminManagement.deleteMany({
        $or: [{ employeeUserId: targetUserId }, { employeeID: targetEmployeeID }, { userId: targetUserId }],
      }),
      ShiftManagement.deleteMany({
        $or: [{ employeeUserId: targetUserId }, { employeeID: targetEmployeeID }],
      }),
      Attendance.deleteMany({
        $or: [{ employeeUserId: targetUserId }, { employeeId: targetEmployeeID }],
      }),
      LeaveApplication.deleteMany({
        $or: [{ employeeUserId: targetUserId }, { employeeId: targetEmployeeID }],
      }),
      OtRate.deleteMany({
        $or: [{ employeeUserId: targetUserId }, { employeeId: targetEmployeeID }],
      }),
      DepartmentHead.deleteMany({
        $or: [{ employeeUserId: targetUserId }, { employeeID: targetEmployeeID }],
      }),
      Activity.deleteMany({ employeeUserId: targetUserId }),
      // Remove this employee as reporting manager reference from other employee records
      Employee.updateMany(
        { reportingManagerEmpID: targetEmployeeID },
        { $set: { reportingManagerEmpID: "", reportingManagerEmployeeUserId: "" } }
      ),
      // Remove this employee as department head reference from other employee records
      Employee.updateMany(
        { departmentHeadEmpID: targetEmployeeID },
        { $set: { departmentHeadEmpID: "", departmentHeadEmployeeUserId: "" } }
      ),
    ]);

    // Collections implemented as ES modules are cleaned via native collection handles
    const db = mongoose.connection?.db;
    if (db) {
      try {
        await db.collection("leaveallocations").deleteMany({ employeeID: targetEmployeeID });
      } catch (_) {}

      try {
        await db.collection("payslips").updateMany(
          {},
          {
            $pull: {
              employeePayslips: {
                $or: [{ employeeUserId: targetUserId }, { employeeId: targetEmployeeID }],
              },
            },
          }
        );
      } catch (_) {}
    }

    // 3. Finally, delete the main employee record
    await Employee.findByIdAndDelete(req.params.id);

    // 4. Log the deletion activity
    await createAuditLog({
      req,
      action: "DELETE",
      module: "Employee Management",
      details: `Deleted employee ${employee.firstName} ${employee.lastName} (${employee.employeeID}) and linked records.`,
      target: getEmployeeAuditTarget(employee),
      previous: pick(employee.toObject ? employee.toObject() : employee, [
        "employeeID",
        "employeeUserId",
        "firstName",
        "middleName",
        "lastName",
        "departmentName",
        "designationName",
        "employmentStatus",
        "grossSalary",
      ]),
      current: null,
      metadata: {
        removedLinkedModules: [
          "Login",
          "Admin",
          "Duty Roaster",
          "Attendance",
          "Leave",
          "OT",
          "Department Head",
          "Activity",
          "Leave Allocation",
          "Payslip",
        ],
      },
    });

    res.json({ 
      message: "Employee and all associated linked records deleted successfully" 
    });

  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
};
// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const emp = await Employee.findById(req.params.id)
      .populate("departmentID", "deptName")
      .populate("designationID", "designationName");

    if (!emp) return res.status(404).json({ message: "Employee not found" });
    if (role === "employee" && emp.employeeUserId !== req.user?.employeeUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

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
