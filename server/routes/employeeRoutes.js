const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");

//  Each route must pass a *function*, not an object
router.get("/next-id", employeeController.getNextEmployeeID);
router.post("/", employeeController.createEmployee);
router.get("/", employeeController.getAllEmployees);
router.get("/managers", employeeController.getManagers);
router.put("/:id", employeeController.updateEmployee);
router.delete("/:id", employeeController.deleteEmployee);
router.get("/employees/:id", employeeController.getEmployeeById);

module.exports = router;
