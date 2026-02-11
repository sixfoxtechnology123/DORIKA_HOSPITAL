const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AdminManagement = require("../models/adminManagementModel");

// ======================= CREATE DEFAULT MAIN ADMIN =======================
const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await AdminManagement.findOne({ userId: "dorika" });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("dorika123", 10);
      await AdminManagement.create({
        userId: "dorika",
        employeeID: "MASTER-001",
        employeeUserId: "SYSTEM-001",
        name: "Main Admin",
        password: hashedPassword,
        role: "Admin",
        permissions: ["ALL"],
        isDefault: true,
      });
    }
  } catch (err) { console.error("Default admin error:", err.message); }
};
createDefaultAdmin();

exports.login = async (req, res) => {
  try {
    let { userId, password } = req.body;
    const user = await AdminManagement.findOne({ userId: userId?.trim() });
    if (!user || !(await bcrypt.compare(password?.trim(), user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { _id: user._id, userId: user.userId, name: user.name, role: user.role, permissions: user.permissions, isDefault: user.isDefault } });
  } catch (err) { res.status(500).json({ message: "Login failed", error: err.message }); }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await AdminManagement.find().select("-password");
    res.json(users);
  } catch (err) { res.status(500).json({ message: "Error fetching users" }); }
};

exports.createUser = async (req, res) => {
  try {
    const { userId, employeeID, employeeUserId, name, password, role, permissions } = req.body;
    if (!userId || !name || !password) return res.status(400).json({ message: "Missing required fields" });
    
    const existing = await AdminManagement.findOne({ userId });
    if (existing) return res.status(400).json({ message: "User ID already exists" });

    const hashed = await bcrypt.hash(password.trim(), 10);
    const newUser = new AdminManagement({
      userId: userId.trim(),
      employeeID: employeeID || "",
      employeeUserId: employeeUserId || "",
      name: name.trim(),
      password: hashed,
      role: role || "HR",
      permissions: permissions || [],
      isDefault: false,
    });
    await newUser.save();
    res.status(201).json({ message: "User Created", user: newUser });
  } catch (err) { res.status(500).json({ message: "Error creating user", error: err.message }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, employeeID, employeeUserId, name, password, role, permissions } = req.body;
    const user = await AdminManagement.findById(id);
    if (!user || user.isDefault) return res.status(403).json({ message: "Update not allowed" });

    user.userId = userId || user.userId;
    user.employeeID = employeeID || user.employeeID;
    user.employeeUserId = employeeUserId || user.employeeUserId;
    user.name = name || user.name;
    user.role = role || user.role;
    user.permissions = permissions || user.permissions;
    if (password) user.password = await bcrypt.hash(password.trim(), 10);

    await user.save();
    res.json({ message: "User updated", user });
  } catch (err) { res.status(500).json({ message: "Error updating user" }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await AdminManagement.findById(req.params.id);
    if (!user || user.isDefault) return res.status(403).json({ message: "Delete not allowed" });
    await AdminManagement.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) { res.status(500).json({ message: "Error deleting user" }); }
};