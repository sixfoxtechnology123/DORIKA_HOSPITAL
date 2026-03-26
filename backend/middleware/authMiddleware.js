// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const AdminManagement = require("../models/adminManagementModel");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verify error:', err && err.message);
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = decoded;
      next();
    });
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(500).json({ message: 'Auth middleware error' });
  }
};

const normalizePerm = (value) => String(value || "").trim().toUpperCase();
const hasAdminPermission = (perms = []) => {
  const list = Array.isArray(perms) ? perms.map(normalizePerm) : [];
  return list.includes("ALL") || list.includes("ADMIN_MANAGEMENT_VIEW");
};

const adminOnly = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role === 'Admin') return next();

  try {
    if (req.user.id) {
      const user = await AdminManagement.findById(req.user.id).select("role permissions").lean();
      if (user?.role === "Admin" || hasAdminPermission(user?.permissions)) return next();
    }
  } catch (err) {
    console.error("adminOnly check error:", err);
  }

  return res.status(403).json({ message: 'Admins only' });
};

const requireNonEmployee = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (role === "employee") return res.status(403).json({ message: "Forbidden" });
  next();
};

const requireSelfOrNonEmployee = (paramName, claimName = "employeeUserId") => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const role = String(req.user.role || "").toLowerCase();
    if (role !== "employee") return next();

    const routeValue = String(req.params[paramName] || "").trim();
    const tokenValue = String(req.user[claimName] || "").trim();
    if (!routeValue || !tokenValue || routeValue !== tokenValue) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
};

module.exports = { authMiddleware, adminOnly, requireNonEmployee, requireSelfOrNonEmployee };
