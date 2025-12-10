const express = require("express");
const router = express.Router();

const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const LeaveType = require("../models/leavetype");
const Holiday = require("../models/holiday");
const Shift = require("../models/Shift");
const Policy = require("../models/Policy");
const Location = require("../models/Location");
const PayrollComponent = require("../models/Payroll");

// GET dashboard counts
router.get("/counts", async (req, res) => {
  try {
    const counts = {
      employees: await Employee.countDocuments(),
      departments: await Department.countDocuments(),
      designations: await Designation.countDocuments(),
      leaveTypes: await LeaveType.countDocuments(),
      holidays: await Holiday.countDocuments(),
      shifts: await Shift.countDocuments(),
      policies: await Policy.countDocuments(),
      locations: await Location.countDocuments(),
      payrollComponents: await PayrollComponent.countDocuments(),
    };

    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching dashboard counts", error: err.message });
  }
});


module.exports = router;
