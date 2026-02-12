const express = require("express");
const router = express.Router();
const controller = require("../controllers/employeeUserIdController");

// Table & Bulk Actions
router.get("/", controller.getAllEmployeeUserIds);
router.post("/generate-all-passwords", controller.generateAllPasswords);

// Auth
router.post("/login", controller.employeeLogin);

// Leave Application Support (Critical for fixing 404/500)
router.get("/leave-types", controller.getAllLeaveTypes);
router.get("/details/:employeeId", controller.getEmployeeDetails);

// Individual CRUD
router.put("/:id", controller.updateEmployeeUserId);
router.delete("/:id", controller.deleteEmployeeUserId);
router.patch("/toggle-status/:id", controller.toggleStatus);

module.exports = router;