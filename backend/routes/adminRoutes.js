const express = require("express");
const Admin = require("../models/adminManagementModel"); 
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

// Mask password
const maskAdmin = (adminDoc) => {
  if (!adminDoc) return null;
  const obj = adminDoc.toObject ? adminDoc.toObject() : adminDoc;
  delete obj.password;
  return obj;
};

// Auth middleware
const auth = (req, res, next) => {
  try {
    const hdr = req.header("Authorization") || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "_" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    const admin = await Admin.findOne({ userId });
    if (!admin) return res.status(400).json({ message: "Invalid User ID" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid Password" });

    const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: "1d" });

    // Send admin info including permissions
    res.json({
      success: true,
      token,
      admin: maskAdmin(admin),
      permissions: admin.permissions, // ✅ Add this
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// PROFILE
router.get("/profile", auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// EDIT PROFILE
router.put("/edit-profile", auth, upload.single("profileImage"), async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (req.body.name) admin.name = req.body.name;

    if (req.file) {
      // Delete old photo if exists
      if (admin.profileImage) {
        const oldPath = path.join(__dirname, "..", admin.profileImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      admin.profileImage = `uploads/${req.file.filename}`;
    }

    await admin.save();
    res.json({ success: true, message: "Profile updated", admin: maskAdmin(admin) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// CHANGE PASSWORD
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both current and new passwords required" });

    const admin = await Admin.findById(req.userId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Current password incorrect" });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
