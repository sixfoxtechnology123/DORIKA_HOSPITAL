const Activity = require("../models/Activity");
const Employee = require("../models/Employee");
const AdminManagement = require("../models/adminManagementModel");

const cleanObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(cleanObject);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanObject(v)])
    );
  }
  return value;
};

const pick = (obj = {}, fields = []) =>
  fields.reduce((acc, field) => {
    if (obj[field] !== undefined) acc[field] = obj[field];
    return acc;
  }, {});

const buildActorSnapshot = async (req) => {
  const fallback = {
    loginUserId: String(req.user?.userId || req.user?.employeeUserId || "SYSTEM"),
    employeeUserId: String(req.user?.employeeUserId || ""),
    employeeID: String(req.user?.employeeID || ""),
    name: String(req.user?.name || "System"),
    role: String(req.user?.role || ""),
    department: "",
    designation: "",
  };

  try {
    let adminUser = null;
    if (req.user?.id) {
      adminUser = await AdminManagement.findById(req.user.id).lean();
    }

    const actor = {
      loginUserId: String(adminUser?.userId || fallback.loginUserId),
      employeeUserId: String(adminUser?.employeeUserId || fallback.employeeUserId),
      employeeID: String(adminUser?.employeeID || fallback.employeeID),
      name: String(adminUser?.name || fallback.name),
      role: String(adminUser?.role || fallback.role),
      department: "",
      designation: "",
    };

    const employeeRef =
      actor.employeeUserId ||
      actor.employeeID ||
      req.user?.employeeUserId ||
      req.user?.employeeID ||
      "";

    if (employeeRef) {
      const employee = await Employee.findOne({
        $or: [
          { employeeUserId: actor.employeeUserId || "__NO_MATCH__" },
          { employeeID: actor.employeeID || "__NO_MATCH__" },
        ],
      })
        .select("employeeID employeeUserId firstName middleName lastName departmentName designationName")
        .lean();

      if (employee) {
        actor.employeeUserId = String(employee.employeeUserId || actor.employeeUserId);
        actor.employeeID = String(employee.employeeID || actor.employeeID);
        actor.department = String(employee.departmentName || "");
        actor.designation = String(employee.designationName || "");
        if (!adminUser?.name) {
          actor.name = `${employee.firstName || ""} ${employee.middleName || ""} ${employee.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim() || actor.name;
        }
      }
    }

    return actor;
  } catch (_) {
    return fallback;
  }
};

const createAuditLog = async ({
  req,
  action,
  module,
  details,
  target = {},
  previous = null,
  current = null,
  metadata = null,
}) => {
  try {
    const changedBy = await buildActorSnapshot(req);
    await Activity.create({
      changedBy,
      changedDetails: {
        action,
        module,
        details,
      },
      ipAddress: req.ip || req.connection?.remoteAddress || "",
      targetUser: cleanObject(target),
      changedSet: {
        previous: previous == null ? null : cleanObject(previous),
        current: current == null ? null : cleanObject(current),
      },
      metaData: metadata == null ? null : cleanObject(metadata),
      text: details,
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

const getEmployeeAuditTarget = (employee = {}) =>
  cleanObject({
    employeeUserId: employee.employeeUserId || "",
    employeeID: employee.employeeID || "",
    name: `${employee.firstName || ""} ${employee.middleName || ""} ${employee.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim(),
    department: employee.departmentName || "",
    designation: employee.designationName || "",
  });

module.exports = {
  createAuditLog,
  buildActorSnapshot,
  getEmployeeAuditTarget,
  pick,
  cleanObject,
};
