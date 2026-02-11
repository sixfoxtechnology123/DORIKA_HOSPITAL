const EmployeeUserId = require("../models/EmployeeUserId");
const Employee = require("../models/Employee");
const LeaveType = require("../models/LeaveType");

exports.getAllLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.find().sort({ leaveName: 1 });
    res.json(types);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all EmployeeUserIds
exports.getAllEmployeeUserIds = async (req, res) => {
  try {
    const list = await EmployeeUserId.find().sort({ createdAt: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create new EmployeeUserId
exports.createEmployeeUserId = async (req, res) => {
  try {
    // FIXED: Added 'email' to the list below so it is defined
    const { employeeId, name, email, employeeUserId, password } = req.body; 
    
    const existing = await EmployeeUserId.findOne({ employeeId });
    if (existing) return res.status(400).json({ message: "Employee ID already exists" });

    const newUser = new EmployeeUserId({ 
      employeeId, 
      name, 
      email, // Now this works because it's defined above!
      employeeUserId, 
      password 
    });

    await newUser.save();
    res.json({ message: "Employee ID created", user: newUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update EmployeeUserId
exports.updateEmployeeUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = await EmployeeUserId.findByIdAndUpdate(id, updateData, { new: true });
    if (!user) return res.status(404).json({ message: "Employee ID not found" });
    res.json({ message: "Employee ID updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete EmployeeUserId
exports.deleteEmployeeUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await EmployeeUserId.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "Employee ID not found" });
    res.json({ message: "Employee ID deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Employee login
exports.employeeLogin = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: "Please provide userId and password" });
    }

    const user = await EmployeeUserId.findOne({ employeeUserId: userId });

    if (!user || user.password !== password) {
      return res.status(400).json({ message: "Invalid userId or password" });
    }

    // Return token or dummy token
    res.json({ token: "dummyToken", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const emp = await Employee.findOne({ employeeID: employeeId });
    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};