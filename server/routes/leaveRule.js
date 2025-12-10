// routes/leaveRule.js
const express = require("express");
const router = express.Router();
const leaveRuleController = require("../controllers/leaveRuleController");

router.post("/", leaveRuleController.createLeaveRule);
router.get("/:id", leaveRuleController.getLeaveRuleById);
router.put("/:id", leaveRuleController.updateLeaveRule);
router.delete("/:id", leaveRuleController.deleteLeaveRule);
router.get("/leavetypes/all", leaveRuleController.getAllLeaveTypes);
router.get("/", leaveRuleController.getAllLeaveRules);

module.exports = router;
