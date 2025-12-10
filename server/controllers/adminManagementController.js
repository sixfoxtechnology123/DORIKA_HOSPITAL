// backend/controllers/adminManagementController.js
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
        name: "Main Admin", // <-- Always Main Admin
        password: hashedPassword,
        role: "Admin",
        permissions: ["ALL"], // Main admin can see all permissions
        isDefault: true,
      });
      // console.log("Default Main Admin created: admin / admin123");
    } else {
      // console.log("ℹDefault Main Admin already exists");
    }
  } catch (err) {
    console.error("Error creating default admin:", err.message);
  }
};

// Call it once when file loads
createDefaultAdmin();

// ======================= LOGIN =======================
const login = async (req, res) => {
  try {
    let { userId, password } = req.body;
    userId = userId?.trim();
    password = password?.trim();

    if (!userId || !password)
      return res
        .status(400)
        .json({ message: "User ID and password are required" });

    const user = await AdminManagement.findOne({ userId });
    if (!user) return res.status(404).json({ message: "Invalid User ID" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        role: user.role,
        permissions: user.permissions || [],
        isDefault: user.isDefault || false, // <-- Add flag for frontend
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ message: "Login failed", error: err.message });
  }
};

// ======================= GET ALL USERS =======================
// Include Main Admin in list, but mark with isDefault flag
const getUsers = async (req, res) => {
  try {
    const users = await AdminManagement.find().select("-password");
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: err.message });
  }
};

// ======================= CREATE USER =======================
const createUser = async (req, res) => {
  try {
    let { userId, name, password, role, permissions } = req.body;
    userId = userId?.trim();
    name = name?.trim();
    password = password?.trim();

    if (!userId || !name || !password)
      return res.status(400).json({ message: "Missing required fields" });

    const existing = await AdminManagement.findOne({ userId });
    if (existing)
      return res.status(400).json({ message: "User ID already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new AdminManagement({
      userId,
      name,
      password: hashed,
      role: role || "HR",
      permissions: permissions || [],
      createdBy: req.user?.id || null, // optional: track creator
      isDefault: false, // not main admin
    });
    await newUser.save();

    res.status(201).json({
      message: "New User Added",
      user: {
        _id: newUser._id,
        userId: newUser.userId,
        name: newUser.name,
        role: newUser.role,
        permissions: newUser.permissions,
        isDefault: false,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating user", error: err.message });
  }
};

// ======================= UPDATE USER =======================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, name, password, role, permissions } = req.body;

    const user = await AdminManagement.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent updating Main Admin
    if (user.isDefault)
      return res.status(403).json({ message: "Main Admin cannot be updated" });

    user.userId = userId?.trim() || user.userId;
    user.name = name?.trim() || user.name;
    user.role = role || user.role;
    user.permissions = permissions || user.permissions;

    if (password) user.password = await bcrypt.hash(password.trim(), 10);

    await user.save();

    res.json({
      message: "User updated",
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating user", error: err.message });
  }
};

// ======================= DELETE USER =======================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await AdminManagement.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent deleting Main Admin
    if (user.isDefault)
      return res.status(403).json({ message: "Main Admin cannot be deleted" });

    const deleted = await AdminManagement.findByIdAndDelete(id);

    res.json({ message: "User deleted", deleted });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
};

module.exports = { login, getUsers, createUser, updateUser, deleteUser };
