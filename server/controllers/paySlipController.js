import PaySlip from "../models/PaySlip.js";
import Employee from "../models/Employee.js";

const updateEmployeePayDetails = async (employeeId, earnings, deductions) => {
  const searchId = typeof employeeId === 'string' ? employeeId.toUpperCase() : employeeId;
  
  const updatedEarnings = earnings.map(e => ({
    headName: e.headName,
    headType: e.type || "FIXED", 
    value: Number(e.amount) || 0  
  }));

  const updatedDeductions = deductions.map(d => ({
    headName: d.headName,
    headType: d.type || "FIXED",
    value: Number(d.amount) || 0
  }));

  await Employee.findOneAndUpdate(
    { employeeID: searchId }, 
    { $set: { earnings: updatedEarnings, deductions: updatedDeductions } },
    { new: true }
  );
};

export const createPaySlip = async (req, res) => {
  try {
    const {
      employeeId, employeeUserId, month, year, earnings, deductions,
      grossSalary, otHours, otAmount, totalDeduction, paidDaysSalary,
      netSalary, lopAmount, monthDays, totalWorkingDays, 
      totalOff, totalPaidDays, LOP, leaves 
    } = req.body;

    const existingPayslip = await PaySlip.findOne({ employeeUserId, month, year });
    if (existingPayslip) {
      return res.status(400).json({ 
        success: false, 
        message: `payslip for ${month} ${year} already exists for this employee.` 
      });
    }
    const newSlip = await PaySlip.create({
      ...req.body, 
      lopDays: Number(LOP || 0), 
      totalEarnings: Number(grossSalary || 0),
      totalDeduction: Number(totalDeduction || 0), // Only heads
      totalSalary: Number(grossSalary || 0) - Number(totalDeduction || 0),
      inHandSalary: Number(netSalary || 0),
      totalOff: Number(totalOff || 0),
      totalPaidDays: Number(totalPaidDays || 0)
    });

    await updateEmployeePayDetails(employeeId, earnings, deductions);
    res.status(201).json({ success: true, data: newSlip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updatePaySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Alignment for LOP naming
    if (data.LOP !== undefined) data.lopDays = Number(data.LOP);
    
    // Ensure the calculations update if the user changes values in the update form
    if (data.grossSalary) data.totalEarnings = Number(data.grossSalary);
    if (data.netSalary) data.inHandSalary = Number(data.netSalary);

    const updatedSlip = await PaySlip.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );

    if (!updatedSlip) return res.status(404).json({ success: false, message: "Not found" });

    await updateEmployeePayDetails(updatedSlip.employeeId, data.earnings, data.deductions);
    res.status(200).json({ success: true, data: updatedSlip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

export const getPaySlipByEmp = async (req, res) => {
  // Use employeeUserId here
  const { employeeUserId, month, year } = req.query;

  try {
    const slip = await PaySlip.findOne({ 
      employeeUserId: employeeUserId, 
      month: month, 
      year: year 
    });

    res.json({ success: true, data: slip });
  } catch (err) {
    res.status(500).json({ success: false, error: "Database error" });
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

    // Search by employeeUserId instead of employeeId
    const latestPayslip = await PaySlip.find({ 
      employeeUserId: employeeId.toUpperCase() 
    })
      .sort({ createdAt: -1 }) 
      .limit(1)
      .lean(); 

    if (!latestPayslip || latestPayslip.length === 0) {
      return res.status(404).json({ error: "No payslip found for this employee" });
    }

    res.json(latestPayslip[0]);
  } catch (err) {
    console.error("Error fetching latest payslip:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllPayslipsByEmployee = async (req, res) => {
  try {
    const { empUserId } = req.params; // This receives "DH-00004" from the URL

    // We search the 'employeeUserId' field in your MongoDB collection
    const slips = await PaySlip.find({ employeeUserId: empUserId })
      .sort({ year: -1, month: -1 });

    // Return the array directly to the frontend
    res.status(200).json(slips); 
  } catch (err) {
    console.error("Error in getAllPayslipsByEmployee:", err);
    res.status(500).json({ error: "Server error" });
  }
};