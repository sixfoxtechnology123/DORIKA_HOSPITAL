const express = require("express");
const router = express.Router();
const controller = require("../controllers/employeeUserIdController");

// Existing CRUD routes
router.get("/", controller.getAllEmployeeUserIds);
router.post("/", controller.createEmployeeUserId);
router.put("/:id", controller.updateEmployeeUserId);
router.delete("/:id", controller.deleteEmployeeUserId);

// Employee login route
router.post("/login", controller.employeeLogin);
router.get("/details/:employeeId", controller.getEmployeeDetails);


module.exports = router;
