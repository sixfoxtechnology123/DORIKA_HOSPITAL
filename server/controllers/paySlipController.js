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
    const { month, year, employeePayslips } = req.body;

    // 1. Check if the batch for this month/year already exists
    const existingBatch = await PaySlip.findOne({ month, year });
    if (existingBatch) {
      return res.status(400).json({ 
        success: false, 
        message: `Batch for ${month} ${year} already exists.` 
      });
    }

    // 2. Create the Batch record
    const newBatch = await PaySlip.create({
      month,
      year,
      employeePayslips 
    });

    // 3. Update all individual employee master records
    if (employeePayslips && employeePayslips.length > 0) {
      for (const slip of employeePayslips) {
        await updateEmployeePayDetails(slip.employeeId, slip.earnings, slip.deductions);
      }
    }

    res.status(201).json({ success: true, data: newBatch });
  } catch (err) {
    console.error("Save Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const checkBatchStatus = async (req, res) => {
  try {
    const { month, year } = req.query;
    const batch = await PaySlip.findOne({ month, year });
    res.json({ 
      success: true, 
      exists: !!batch ,
      data: batch
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Database error" });
  }
};

// ... keep your other functions (getAllPaySlips, deletePaySlip, etc.) below ...
export const getAllPaySlips = async (req, res) => {
  try {
    const slips = await PaySlip.find().sort({ createdAt: -1 });
    res.json({ success: true, data: slips });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payslips" });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const employeeId = req.params.employeeId.toUpperCase();
    const employee = await Employee.findOne({ employeeID: employeeId });
    if (!employee) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

export const deletePaySlip = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedSlip = await PaySlip.findByIdAndDelete(id);
    if (!deletedSlip) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
};