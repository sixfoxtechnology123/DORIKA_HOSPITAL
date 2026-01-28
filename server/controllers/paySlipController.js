// paySlipController.js
import PaySlip from "../models/PaySlip.js";
import Employee from "../models/Employee.js";

const updateEmployeePayDetails = async (employeeId, earnings, deductions) => {
  const searchId = typeof employeeId === 'string' ? employeeId.toUpperCase() : employeeId;

  // We map the incoming payload to match the Employee Master Schema keys
  const updatedEarnings = earnings.map(e => ({
    headName: e.headName,
    headType: e.type || "FIXED", // Maps 'type' to 'headType'
    value: Number(e.amount) || 0  // Maps 'amount' to 'value'
  }));

  const updatedDeductions = deductions.map(d => ({
    headName: d.headName,
    headType: d.type || "FIXED",
    value: Number(d.amount) || 0
  }));

  // $set replaces the whole array, so deleted rows are now gone from the Master DB
  await Employee.findOneAndUpdate(
    { employeeID: searchId }, 
    { $set: { earnings: updatedEarnings, deductions: updatedDeductions } },
    { new: true }
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
      leaves,
      otHours,  
      otAmount,  
      totalEarnings,
    } = req.body;

    if (!month || !year) return res.status(400).json({ error: "Month & Year required" });

    const employee = await Employee.findOne({ employeeID: employeeId.toUpperCase() });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

  const mappedEarnings = earnings
  .filter(e => e.headName && e.headName.trim() !== "") // 👈 This filters out empty rows
  .map(e => ({
    headName: e.headName,
    type: e.type || "FIXED",
    amount: Number(e.amount || 0)
  }));

  const mappedDeductions = deductions
    .filter(d => d.headName && d.headName.trim() !== "")
    .map(d => ({
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
      netSalary: Number(netSalary || 0),
      lopAmount: Number(lopAmount || 0),
      inHandSalary: Number(inHandSalary || 0),
      monthDays: Number(monthDays || 0),
      totalWorkingDays: Number(totalWorkingDays || 0),
      LOP: Number(LOP || 0),
      leaves: Number(leaves || 0),
      otHours: Number(otHours || 0),  
      otAmount: Number(otAmount || 0), 
      totalEarnings: Number(totalEarnings|| 0),
      totalDeduction: Number(totalDeduction || 0),
    });

 
    await updateEmployeePayDetails(employee.employeeID, mappedEarnings, mappedDeductions);

    res.json({ success: true, data: newSlip });

  } catch (err) {
    console.error("Error creating payslip:", err);
    res.status(500).json({ error: err.message || "Failed to create payslip" });
  }
};

// paySlipController.js
export const updatePaySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      earnings,
      deductions,
      grossSalary,
      totalDeduction,
      netSalary,
      lopAmount,
      inHandSalary,
      monthDays,
      totalWorkingDays,
      LOP,
      leaves,
      otHours,      
      otAmount,     
      totalEarnings,
    } = req.body;

    // 1. Update the Payslip Document
    const updatedSlip = await PaySlip.findByIdAndUpdate(
      id,
      {
        $set: {
          earnings,
          deductions,
          otHours,       
          otAmount,      
          totalEarnings,
          grossSalary,
          totalDeduction,
          netSalary,
          lopAmount,
          inHandSalary,
          monthDays,
          totalWorkingDays,
          LOP,
          leaves
        }
      },
      { new: true } // Returns the document after update
    );

    if (!updatedSlip) {
      return res.status(404).json({ success: false, message: "Payslip record not found" });
    }

    // 2. Sync changes to Employee Master Data
    // We reuse your existing updateEmployeePayDetails helper
    await updateEmployeePayDetails(updatedSlip.employeeId, earnings, deductions);

    res.status(200).json({
      success: true,
      message: "Payslip and Master record updated",
      data: updatedSlip
    });

  } catch (err) {
    console.error("Update Controller Error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Internal Server Error" 
    });
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
