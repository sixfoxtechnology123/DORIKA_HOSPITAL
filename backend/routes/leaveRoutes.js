// routes/leaveRoutes.js
const express = require("express");
const router = express.Router();
const { getAllLeaveHistory } = require("../controllers/leaveController");

// This matches the URL: http://localhost:5002/api/leave-application
router.get("/leave-application", getAllLeaveHistory);

module.exports = router;