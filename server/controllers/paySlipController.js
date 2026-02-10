import PaySlip from "../models/PaySlip.js";
import Employee from "../models/Employee.js";

// 1. Create or Update Payslip Batch + Direct Master Sync
export const createPaySlip = async (req, res) => {
  try {
    const { month, year, employeePayslips, status, filterDept } = req.body;

    // --- 1. HIERARCHY LOCK CHECK ---
    if (filterDept !== "All") {
      const masterBatch = await PaySlip.findOne({ month, year, filterDept: "All" });
      if (masterBatch && masterBatch.status === "Finalized") {
        return res.status(403).json({ 
          success: false, 
          message: `Entire month of ${month} ${year} is Locked by Master (All Departments).` 
        });
      }
    }

    // --- 2. INDIVIDUAL BATCH LOCK CHECK ---
    const existingBatch = await PaySlip.findOne({ month, year, filterDept });
    if (existingBatch && existingBatch.status === "Finalized") {
      return res.status(403).json({ success: false, message: "This selection is locked." });
    }

    // --- 3. SMART LOGIC FOR 'ALL' DEPARTMENTS ---
    let finalDataToSave = employeePayslips;
    if (filterDept === "All") {
      const otherBatches = await PaySlip.find({ month, year, filterDept: { $ne: "All" } });
      const doneIds = otherBatches.flatMap(b => b.employeePayslips.map(s => s.employeeId));
      finalDataToSave = employeePayslips.filter(emp => !doneIds.includes(emp.employeeId));
    }

    // --- 4. SAVE TO PAYSLIP COLLECTION (History) ---
    const updatedBatch = await PaySlip.findOneAndUpdate(
      { month, year, filterDept },
      { 
        month, 
        year, 
        employeePayslips: finalDataToSave, 
        status, 
        filterDept, 
        updatedAt: new Date() 
      },
      { upsert: true, new: true }
    );

// --- 5. THE MASTER SYNC (TRANSLATION BLOCK) ---
    const masterSyncPromises = finalDataToSave.map(slip => {
      return Employee.findOneAndUpdate(
        { employeeID: slip.employeeId },
        { 
          $set: { 
            grossSalary: slip.grossSalary,
            
            // Translate Payslip 'amount' to Employee Master 'value'
            // Translate Payslip 'type' to Employee Master 'headType'
            earnings: slip.earnings.map(e => ({
              headName: e.headName,
              headType: e.type || "Fixed", 
              value: Number(e.amount || 0) 
            })),
            
            deductions: slip.deductions.map(d => ({
              headName: d.headName,
              headType: d.type || "Fixed",
              value: Number(d.amount || 0)
            }))
          } 
        },
        { new: true }
      );
    });

    await Promise.all(masterSyncPromises);

    // --- 6. SUCCESS RESPONSE ---
    res.status(201).json({ 
      success: true, 
      message: `Payslip saved and Employee Master updated directly for ${filterDept}.`,
      data: updatedBatch 
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// 2. Clear Month Data
export const clearMonthData = async (req, res) => {
  try {
    const { month, year, filterDept } = req.query;
    await PaySlip.findOneAndDelete({ month, year, filterDept });
    res.json({ success: true, message: `${filterDept} history cleared.` });
  } catch (err) { res.status(500).json({ error: "Clear failed" }); }
};

export const checkBatchStatus = async (req, res) => {
  try {
    const { month, year, filterDept } = req.query;
    
    // 1. Try to find the exact batch requested
    let batch = await PaySlip.findOne({ month, year, filterDept });

    // 2. If not found and the request was for a specific dept, fallback to "All"
    if (!batch && filterDept !== "All") {
      batch = await PaySlip.findOne({ month, year, filterDept: "All" });
    }

    res.json({ success: true, exists: !!batch, data: batch });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 4. Fetch All
export const getAllPaySlips = async (req, res) => {
  try {
    const slips = await PaySlip.find().sort({ createdAt: -1 });
    res.json({ success: true, data: slips });
  } catch (err) { res.status(500).json({ error: "Failed to fetch" }); }
};

// 5. Get Single Employee
export const getEmployeeById = async (req, res) => {
  try {
    const employeeId = req.params.employeeId.toUpperCase();
    const employee = await Employee.findOne({ employeeID: employeeId });
    if (!employee) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: employee });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

// 6. Delete Batch ID
export const deletePaySlip = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedSlip = await PaySlip.findByIdAndDelete(id);
    if (!deletedSlip) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) { res.status(500).json({ error: "Failed to delete" }); }
};