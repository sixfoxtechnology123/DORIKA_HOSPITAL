const EmployeeUserId = require("../models/EmployeeUserId");
const Employee = require("../models/Employee");
const LeaveType = require("../models/LeaveType");
const bcrypt = require("bcryptjs"); // Import bcrypt
const jwt = require("jsonwebtoken");
const { createAuditLog, cleanObject } = require("../utils/auditLogger");

const maskLastFour = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  if (raw.length <= 4) return "*".repeat(raw.length);
  return `${"*".repeat(raw.length - 4)}${raw.slice(-4)}`;
};

const maskEmail = (value) => {
  const raw = String(value || "").trim();
  if (!raw || !raw.includes("@")) return raw;
  const [name, domain] = raw.split("@");
  if (!name) return raw;
  if (name.length <= 2) return `${name[0] || "*"}*@${domain}`;
  return `${name.slice(0, 2)}${"*".repeat(name.length - 2)}@${domain}`;
};

const maskMobile = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  if (raw.length <= 4) return "*".repeat(raw.length);
  return `${"*".repeat(raw.length - 4)}${raw.slice(-4)}`;
};

// 1. GET ALL (Master + Credential status)
exports.getAllEmployeeUserIds = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const master = await Employee.find().sort({ employeeID: 1 });
    const creds = await EmployeeUserId.find();

    const fullList = master.map(emp => {
      const login = creds.find(c => c.employeeId === emp.employeeID);
      return {
        employeeId: emp.employeeID,
        employeeUserId: emp.employeeUserId,
        name: `${emp.firstName} ${emp.lastName}`,
        designation: emp.designationName,
        // We show the status from the DB
        status: login ? login.status : "active", 
        hasPassword: !!(login && login.password),
        _id: login ? login._id : null
      };
    });
    res.json(fullList);
  } catch (err) {
    res.status(500).json({ message: "Error fetching list: " + err.message });
  }
};

// 2. GENERATE PASSWORDS (WITH HASHING)
exports.generateAllPasswords = async (req, res) => {
  try {
    const { customPassword, targetEmployeeIds } = req.body;
    if (!customPassword) return res.status(400).json({ message: "Password is required" });

    // HASH THE PASSWORD
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(customPassword, salt);

    let query = {};
    if (targetEmployeeIds && Array.isArray(targetEmployeeIds)) {
      query = { employeeID: { $in: targetEmployeeIds } };
    }

    const employeesToUpdate = await Employee.find(query);

    const updatePromises = employeesToUpdate.map(emp => {
      return EmployeeUserId.findOneAndUpdate(
        { employeeId: emp.employeeID },
        {
          employeeId: emp.employeeID,
          employeeUserId: emp.employeeUserId,
          name: `${emp.firstName} ${emp.lastName}`,
          designation: emp.designationName,
          password: hashedPassword, // Store Secure Hash
          email: emp.permanentAddress?.email || "",
          // Ensure new records start as active
          $setOnInsert: { status: "active" } 
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(updatePromises);
    let auditTarget = {};
    if (employeesToUpdate.length === 1) {
      const emp = employeesToUpdate[0];
      auditTarget = {
        employeeUserId: emp.employeeUserId || "",
        employeeID: emp.employeeID || "",
        name: `${emp.firstName || ""} ${emp.middleName || ""} ${emp.lastName || ""}`.replace(/\s+/g, " ").trim(),
        designation: emp.designationName || "",
      };
    } else if (employeesToUpdate.length > 1) {
      auditTarget = {
        employeeUserId: "",
        employeeID: "",
        name: `${employeesToUpdate.length} Employees`,
        designation: "",
      };
    }

    await createAuditLog({
      req,
      action: "UPDATE",
      module: "Employee User ID",
      details: `Generated or updated login credentials for ${employeesToUpdate.length} employees.`,
      target: auditTarget,
      current: {
        passwordChanged: true,
        employeeIds: employeesToUpdate.map((emp) => emp.employeeID),
        employeeUserIds: employeesToUpdate.map((emp) => emp.employeeUserId),
      },
      metadata: {
        count: employeesToUpdate.length,
      },
    });
    res.json({ message: "Update successful with password encryption" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. TOGGLE ENABLE/DISABLE STATUS
exports.toggleStatus = async (req, res) => {
  try {
    const user = await EmployeeUserId.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Switch between active and disabled
    user.status = user.status === "active" ? "disabled" : "active";
    await user.save();
    await createAuditLog({
      req,
      action: "UPDATE",
      module: "Employee User ID",
      details: `Changed login status for ${user.employeeUserId} to ${user.status}.`,
      target: {
        employeeUserId: user.employeeUserId || "",
        employeeID: user.employeeId || "",
        name: user.name || "",
        designation: user.designation || "",
      },
      current: { status: user.status },
    });
    
    res.json({ message: `User is now ${user.status}`, status: user.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. SECURE EMPLOYEE LOGIN
exports.employeeLogin = async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await EmployeeUserId.findOne({ employeeUserId: userId });
    
    if (!user) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // CHECK IF DISABLED
    if (user.status === "disabled") {
      return res.status(403).json({ message: "Your account is disabled. Please contact Admin." });
    }

    // COMPARE HASHED PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: "employee",
        employeeID: user.employeeId,
        employeeUserId: user.employeeUserId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        employeeID: user.employeeId,
        employeeUserId: user.employeeUserId,
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1] || "",
        designation: user.designation,
        role: "employee"
      } 
    });
  } catch (err) {
    res.status(500).json({ message: "Login error" });
  }
};

// --- REST OF YOUR FUNCTIONS ---

exports.getAllLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.find().sort({ leaveName: 1 });
    res.json(types);
  } catch (err) {
    res.status(500).json({ message: "Leave types fetch failed" });
  }
};

exports.getEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "employee" && req.user?.employeeID !== employeeId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const emp = await Employee.findOne({ employeeID: employeeId }).lean();
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    if (role === "employee") {
      const safeEmployee = {
        ...emp,
        permanentAddress: {
          ...(emp.permanentAddress || {}),
          mobile: maskMobile(emp.permanentAddress?.mobile),
          email: maskEmail(emp.permanentAddress?.email),
        },
        presentAddress: {
          ...(emp.presentAddress || {}),
          mobile: maskMobile(emp.presentAddress?.mobile),
          email: maskEmail(emp.presentAddress?.email),
        },
        payDetails: {
          ...(emp.payDetails || {}),
          aadhaarNo: maskLastFour(emp.payDetails?.aadhaarNo),
          panNo: maskLastFour(emp.payDetails?.panNo),
          accountNo: maskLastFour(emp.payDetails?.accountNo),
          passportNo: maskLastFour(emp.payDetails?.passportNo),
          uanNo: maskLastFour(emp.payDetails?.uanNo),
          ifscCode: maskLastFour(emp.payDetails?.ifscCode),
        },
      };
      return res.json(safeEmployee);
    }

    return res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteEmployeeUserId = async (req, res) => {
  try {
    const deleted = await EmployeeUserId.findByIdAndDelete(req.params.id);
    await createAuditLog({
      req,
      action: "DELETE",
      module: "Employee User ID",
      details: `Deleted login credentials for ${deleted?.employeeUserId || req.params.id}.`,
      target: {
        employeeUserId: deleted?.employeeUserId || "",
        employeeID: deleted?.employeeId || "",
        name: deleted?.name || "",
        designation: deleted?.designation || "",
      },
      previous: cleanObject(deleted?.toObject ? deleted.toObject() : deleted),
      current: null,
    });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateEmployeeUserId = async (req, res) => {
  try {
    const previous = await EmployeeUserId.findById(req.params.id).lean();
    const user = await EmployeeUserId.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    const userObj = user.toObject();
    delete userObj.password;
    const passwordChanged = !!req.body?.password;
    await createAuditLog({
      req,
      action: "UPDATE",
      module: "Employee User ID",
      details: `Updated login credentials for ${user.employeeUserId}.`,
      target: {
        employeeUserId: user.employeeUserId || "",
        employeeID: user.employeeId || "",
        name: user.name || "",
        designation: user.designation || "",
      },
      previous: cleanObject({ ...previous, password: undefined }),
      current: cleanObject({ ...userObj, ...(passwordChanged ? { passwordChanged: true } : {}) }),
    });
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changeEmployeePassword = async (req, res) => {
  try {
    const { employeeID, currentPassword, newPassword } = req.body;
    const role = String(req.user?.role || "").toLowerCase();

    if (role === "employee" && req.user?.employeeID !== employeeID) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await EmployeeUserId.findOne({ employeeId: employeeID });
    if (!user) {
      return res.status(404).json({ message: "User credentials not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    await createAuditLog({
      req,
      action: "UPDATE",
      module: "Employee User ID",
      details: `Changed password for ${user.employeeUserId}.`,
      target: {
        employeeUserId: user.employeeUserId || "",
        employeeID: user.employeeId || "",
        name: user.name || "",
        designation: user.designation || "",
      },
      current: { passwordChanged: true },
    });

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server Error: " + err.message });
  }
};
