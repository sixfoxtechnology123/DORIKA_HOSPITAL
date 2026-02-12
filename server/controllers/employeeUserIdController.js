const EmployeeUserId = require("../models/EmployeeUserId");
const Employee = require("../models/Employee");
const LeaveType = require("../models/LeaveType");
const bcrypt = require("bcryptjs"); // Import bcrypt

// 1. GET ALL (Master + Credential status)
exports.getAllEmployeeUserIds = async (req, res) => {
  try {
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
        password: login ? login.password : "NOT GENERATED",
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

    res.json({ 
      token: "valid_session_token", 
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
    const emp = await Employee.findOne({ employeeID: employeeId });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteEmployeeUserId = async (req, res) => {
  try {
    await EmployeeUserId.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateEmployeeUserId = async (req, res) => {
  try {
    const user = await EmployeeUserId.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changeEmployeePassword = async (req, res) => {
  try {
    const { employeeID, currentPassword, newPassword } = req.body;

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

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server Error: " + err.message });
  }
};