const express = require("express");
const router = express.Router();
const controller = require("../controllers/employeeUserIdController");
const { requireNonEmployee } = require("../middleware/authMiddleware");

// --- 1. Table & Bulk Actions ---
router.get("/", requireNonEmployee, controller.getAllEmployeeUserIds);
router.post("/generate-all-passwords", requireNonEmployee, controller.generateAllPasswords);

// --- 2. Authentication ---
router.post("/login", controller.employeeLogin);

/** * CRITICAL: Specific/Static routes MUST be defined BEFORE dynamic routes.
 * We move "/change-password" above "/:id" so Express doesn't think 
 * the word "change-password" is a database ID.
 */
router.put("/change-password", controller.changeEmployeePassword);

// --- 3. Support & Details ---
router.get("/leave-types", controller.getAllLeaveTypes);
router.get("/details/:employeeId", controller.getEmployeeDetails);

// --- 4. Individual CRUD (Dynamic Routes last) ---
router.put("/:id", requireNonEmployee, controller.updateEmployeeUserId);
router.delete("/:id", requireNonEmployee, controller.deleteEmployeeUserId);
router.patch("/toggle-status/:id", requireNonEmployee, controller.toggleStatus);

module.exports = router;
