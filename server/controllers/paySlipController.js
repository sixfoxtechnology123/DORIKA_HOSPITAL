// paySlipController.js
import PaySlip from "../models/PaySlip.js";
import Employee from "../models/Employee.js";

// Helper function to update employee earnings and deductions
const updateEmployeePayDetails = async (employeeId, earnings, deductions) => {
  const updatedEarnings = earnings.map(e => ({
    _id: e._id || undefined, // preserve _id if exists
    headName: e.headName,
    headType: e.type || "",
    value: Number(e.amount) || 0
  }));

  const updatedDeductions = deductions.map(d => ({
    _id: d._id || undefined,
    headName: d.headName,
    headType: d.type || "",
    value: Number(d.amount) || 0
  }));

  await Employee.findByIdAndUpdate(
    employeeId,
    {
      $set: {
        earnings: updatedEarnings,
        deductions: updatedDeductions
      }
    },
    { new: true, upsert: true }
  );
};

// CREATE Payslip
export const createPaySlip = async (req, res) => {
  try {
    const {
      employeeId,
      earnings,
      deductions,
      month,
      year,
      grossSalary,
      totalDeduction,
      netSalary,
      lopAmount,
      inHandSalary,
      mobile,
      email,
      monthDays,
      totalWorkingDays,
      LOP,
      leaves
    } = req.body;

    if (!month || !year) return res.status(400).json({ error: "Month & Year required" });

    const employee = await Employee.findOne({ employeeID: employeeId.toUpperCase() });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const mappedEarnings = earnings.map(e => ({
      headName: e.headName,
      type: e.type || "FIXED",
      amount: Number(e.amount || 0)
    }));

    const mappedDeductions = deductions.map(d => ({
      headName: d.headName,
      type: d.type || "FIXED",
      amount: Number(d.amount || 0)
    }));


    //validation
     const existingPayslip = await PaySlip.findOne({
      employeeId: employee.employeeID,
      month,
      year
    });

    if (existingPayslip) {
      return res.status(400).json({ message: "Payslip for this employee, month and year already exists." });
    }


    const newSlip = await PaySlip.create({
      employeeId: employee.employeeID,
      employeeName: `${employee.salutation} ${employee.firstName} ${employee.lastName || ""}`.trim(),
      mobile: mobile || employee.permanentAddress?.mobile || "",
      email: email || employee.permanentAddress?.email || "",
      month,
      year,
      earnings: mappedEarnings,
      deductions: mappedDeductions,
      grossSalary: Number(grossSalary || 0),
      totalDeduction: Number(totalDeduction || 0),
      netSalary: Number(netSalary || 0),
      lopAmount: Number(lopAmount || 0),
      inHandSalary: Number(inHandSalary || 0),
      monthDays: Number(monthDays || 0),
      totalWorkingDays: Number(totalWorkingDays || 0),
      LOP: Number(LOP || 0),
      leaves: Number(leaves || 0)
    });

    // Optionally update employee's top-level pay info
    await updateEmployeePayDetails(employee._id, mappedEarnings, mappedDeductions);

    res.json({ success: true, data: newSlip });

  } catch (err) {
    console.error("Error creating payslip:", err);
    res.status(500).json({ error: err.message || "Failed to create payslip" });
  }
};

// UPDATE Payslip
export const updatePaySlip = async (req, res) => {
  try {
    const { payslipId } = req.params;
    const {
      earnings,
      deductions,
      month,
      year,
      grossSalary,
      totalDeduction,
      netSalary,
      lopAmount,
      inHandSalary,
      mobile,
      email,
      monthDays,
      totalWorkingDays,
      LOP,
      leaves
    } = req.body;

    if (!month || !year) return res.status(400).json({ error: "Month & Year required" });

    const payslip = await PaySlip.findById(payslipId);
    if (!payslip) return res.status(404).json({ error: "PaySlip not found" });

    const mappedEarnings = earnings.map(e => ({
      headName: e.headName,
      type: e.type || "FIXED",
      amount: Number(e.amount || 0)
    }));

    const mappedDeductions = deductions.map(d => ({
      headName: d.headName,
      type: d.type || "FIXED",
      amount: Number(d.amount || 0)
    }));

    // Update fields
    payslip.earnings = mappedEarnings;
    payslip.deductions = mappedDeductions;
    payslip.month = month;
    payslip.year = year;
    payslip.mobile = mobile || payslip.mobile;
    payslip.email = email || payslip.email;
    payslip.grossSalary = Number(grossSalary || 0);
    payslip.totalDeduction = Number(totalDeduction || 0);
    payslip.netSalary = Number(netSalary || 0);
    payslip.lopAmount = Number(lopAmount || 0);
    payslip.inHandSalary = Number(inHandSalary || 0);
    payslip.monthDays = Number(monthDays || 0);
    payslip.totalWorkingDays = Number(totalWorkingDays || 0);
    payslip.LOP = Number(LOP || 0);
    payslip.leaves = Number(leaves || 0);

    await payslip.save();

    // Optionally update employee's top-level pay info
    await updateEmployeePayDetails(payslip.employeeId, mappedEarnings, mappedDeductions);

    res.json({ success: true, data: payslip });

  } catch (err) {
    console.error("Error updating payslip:", err);
    res.status(500).json({ error: err.message || "Failed to update payslip" });
  }
};


// GET all payslips
export const getAllPaySlips = async (req, res) => {
  try {
    const slips = await PaySlip.find().sort({ createdAt: 1 });
    res.json({ success: true, data: slips });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payslips" });
  }
};

// GET payslip by employee + month + year
export const getPaySlipByEmp = async (req, res) => {
  const { employeeId, month, year } = req.query;

  try {
    const slip = await PaySlip.findOne({ employeeId, month, year });
    res.json({ success: true, data: slip });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employee payslip" });
  }
};

// DELETE payslip by ID
export const deletePaySlip = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedSlip = await PaySlip.findByIdAndDelete(id);
    if (!deletedSlip) {
      return res.status(404).json({ error: "Payslip not found" });
    }
    res.json({ success: true, message: "Payslip deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete payslip" });
  }
};

// GET employee by employeeID (for frontend prefill)
export const getEmployeeById = async (req, res) => {
  try {
    const employeeId = req.params.employeeId.toUpperCase();

    const employee = await Employee.findOne({ employeeID: employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, data: employee });
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
export const getLatestPayslipByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const latestPayslip = await PaySlip.find({ employeeId: employeeId.toUpperCase() })
      .sort({ createdAt: -1 }) // latest first
      .limit(1)
      .lean(); // return plain JS object

    if (!latestPayslip || latestPayslip.length === 0) {
      return res.status(404).json({ error: "No payslip found for this employee" });
    }

    res.json(latestPayslip[0]);
  } catch (err) {
    console.error("Error fetching latest payslip:", err);
    res.status(500).json({ error: err.message });
  }
};
