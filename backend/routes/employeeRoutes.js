const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { requireNonEmployee } = require("../middleware/authMiddleware");

//  Each route must pass a *function*, not an object
router.get("/next-id", requireNonEmployee, employeeController.getNextEmployeeID);
router.post("/", requireNonEmployee, employeeController.createEmployee);
router.get("/", employeeController.getAllEmployees);
router.get("/managers", requireNonEmployee, employeeController.getManagers);
router.put("/:id", requireNonEmployee, employeeController.updateEmployee);
router.delete("/:id", requireNonEmployee, employeeController.deleteEmployee);
router.get("/employees/:id", requireNonEmployee, employeeController.getEmployeeById);


router.delete("/:employeeID/history/:historyID", requireNonEmployee, employeeController.deleteEmployeeHistory);

module.exports = router;
