import LeaveApplication from "../models/LeaveApplication.js";
import LeaveType from "../models/LeaveType.js";
import Employee from "../models/Employee.js";

// Helper to convert DD-MM-YYYY string to Date Object
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  // If the date is already an ISO string (contains T or - starting with Year)
  if (dateStr.includes("T") || (dateStr.split("-")[0].length === 4)) {
    return new Date(dateStr);
  }
  // Otherwise split DD-MM-YYYY
  const [day, month, year] = dateStr.split("-");
  return new Date(year, month - 1, day);
};

export const applyLeave = async (req, res) => {
  try {
    const { 
      employeeId, 
      employeeUserId, 
      leaveType, 
      fromDate, 
      noOfDays, 
      applicationDate, 
      employeeName, 
      toDate, 
      reason 
    } = req.body;

    // 1. Find Leave Master Data & Employee Profile
    const [leaveMaster, empProfile] = await Promise.all([
      LeaveType.findOne({ $or: [{ leaveName: leaveType }, { leaveCode: leaveType }] }),
      Employee.findOne({ employeeID: employeeId })
    ]);

    if (!leaveMaster) return res.status(400).json({ message: "Invalid leave type" });
    if (!empProfile) return res.status(404).json({ message: "Employee not found" });

    const totalYearlyAllowed = leaveMaster.totalDays;
    const isCasual = leaveType.toUpperCase().includes("CASUAL") || leaveType.toUpperCase() === "CL";

    // 2. Setup Date Objects
    const appDateObj = parseDate(applicationDate); 
    const leaveStartDate = parseDate(fromDate); 
    const year = leaveStartDate.getFullYear();
    const month = leaveStartDate.getMonth(); // 0-indexed (Jan=0, April=3)

    // 3. Define Financial Year (FY) Boundaries (April 1st to March 31st)
    const fyStartYear = month < 3 ? year - 1 : year;
    const fyStartDate = new Date(fyStartYear, 3, 1); // April 1st
    const fyEndDate = new Date(fyStartYear + 1, 2, 31); // March 31st

    // 4. REQUIREMENT: ACCRUAL LOGIC BASED ON JOINING/STATUS DATE
    let currentEarnedBalance;

    if (isCasual) {
      // RULE A: Max 5 days at a time
      if (noOfDays > 5) {
        return res.status(400).json({ message: "For Casual Leave, you can only apply for a maximum of 5 days at a time." });
      }

      // RULE B: Pro-Rata Starting Point
      // Use parseDate to handle the DD-MM-YYYY string from your DB ("11-02-2026")
      const empStatusDate = empProfile.statusChangeDate ? parseDate(empProfile.statusChangeDate) : fyStartDate;
      
      // Determine if we start counting from Join Date or the current FY Start (April 1st)
      const calculationStartDate = empStatusDate > fyStartDate ? empStatusDate : fyStartDate;

      // RULE C: Calculate Months Earned up to the Application Date
      let monthsEarned = (appDateObj.getFullYear() - calculationStartDate.getFullYear()) * 12 + 
                         (appDateObj.getMonth() - calculationStartDate.getMonth()) + 1;

      // Cap at yearly total (usually 12)
      currentEarnedBalance = Math.max(0, Math.min(totalYearlyAllowed, monthsEarned));
    } else {
      // For Sick Leave or others, use full yearly allocation
      currentEarnedBalance = totalYearlyAllowed;
    }

    // 5. GET APPROVED LEAVES IN CURRENT FINANCIAL YEAR
    const used = await LeaveApplication.aggregate([
      {
        $match: {
          employeeId,
          leaveType,
          approveRejectedStatus: "APPROVED", 
          $expr: {
            $and: [
              { $gte: [{ $toDate: "$fromDate" }, fyStartDate] },
              { $lte: [{ $toDate: "$fromDate" }, fyEndDate] }
            ]
          }
        }
      },
      { $group: { _id: null, total: { $sum: "$noOfDays" } } }
    ]);

    const usedDays = used[0]?.total || 0;
    
    // 6. CALCULATE FINAL STORED BALANCE
    const remainingStored = currentEarnedBalance - usedDays;

    // 7. FINAL VALIDATION
    if (noOfDays > remainingStored) {
      return res.status(400).json({ 
        message: `Insufficient balance. Based on your joining date and application month, you have only ${remainingStored} days accumulated.` 
      });
    }

    // 8. CREATE NEW APPLICATION
    const newLeave = new LeaveApplication({
      employeeId,
      employeeUserId,
      employeeName,
      applicationDate: applicationDate || new Date().toISOString().split("T")[0],
      leaveType,
      fromDate: leaveStartDate.toISOString().split("T")[0], 
      toDate: parseDate(toDate).toISOString().split("T")[0],
      noOfDays,
      reason: reason || "",
      leaveInHand: remainingStored - noOfDays, // Store the updated earned balance
      status: "PENDING",
      reportingManager: empProfile.reportingManager || null,
      reportingManagerEmployeeUserId: empProfile.reportingManagerEmployeeUserId || null,
      departmentHead: empProfile.departmentHead || null,
      departmentHeadEmployeeUserId: empProfile.departmentHeadEmployeeUserId || null,
    });

    await newLeave.save();
    res.status(201).json({ message: "Leave application submitted successfully", remaining: remainingStored - noOfDays });

  } catch (error) {
    console.error("Apply Leave Error:", error);
    res.status(500).json({ message: "Internal Server Error: " + error.message });
  }
};

export const getEmployeeLeaves = async (req, res) => {
  try {
    
    const userIdFromParams = req.params.employeeId; 
    const leaves = await LeaveApplication.find({ 
      employeeUserId: userIdFromParams 
    }).sort({ createdAt: -1 });
    
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaveAllocationsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await LeaveAllocation.find({ employeeID: employeeId });
    if (!records.length)
      return res.status(404).json({ message: "No leave allocations found" });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteLeaveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await LeaveApplication.findById(id);
    if (!leave)
      return res.status(404).json({ message: "Leave application not found" });
    await leave.deleteOne();
    res.status(200).json({ message: "Leave application deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateLeaveApplication = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { leaveType, fromDate, toDate, noOfDays, reason } = req.body;

    const existingLeave = await LeaveApplication.findById(leaveId);
    if (!existingLeave)
      return res.status(404).json({ message: "Leave not found" });

    existingLeave.leaveType = leaveType;
    existingLeave.fromDate = fromDate;
    existingLeave.toDate = toDate;
    existingLeave.noOfDays = noOfDays;
    existingLeave.reason = reason;

    await existingLeave.save();

    res.status(200).json({ message: "Leave updated successfully", leave: existingLeave });
  } catch (err) {
    res.status(500).json({ message: "Server error while updating leave" });
  }
};


export const getLeavesForManagerOrDH = async (req, res) => {
  try {
    const { employeeUserId } = req.params;
    const cleanId = employeeUserId.trim();

    const leaves = await LeaveApplication.find({
      $or: [
        // 1. Reporting Manager sees leaves assigned to them
        { reportingManagerEmployeeUserId: cleanId },

        // 2. Department Head ONLY sees leaves IF RM has already APPROVED
        { 
          departmentHeadEmployeeUserId: cleanId, 
          reportingManagerApproval: "APPROVED" 
        }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, loggedInUserId } = req.body;

    const leave = await LeaveApplication.findById(id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    // 1. Identify roles independently (remove else if)
    const isRM = leave.reportingManagerEmployeeUserId === loggedInUserId;
    const isDH = leave.departmentHeadEmployeeUserId === loggedInUserId;

    if (!isRM && !isDH) return res.status(403).json({ message: "Unauthorized" });

    // 2. Update status for both roles if the user is both
    if (isRM) {
      leave.reportingManagerApproval = status;
    }
    if (isDH) {
      leave.departmrntHeadApproval = status;
    }

    // 3. Track history
    leave.history.push({
      role: isRM && isDH ? "RM & DH" : isRM ? "Reporting Manager" : "Department Head",
      userId: loggedInUserId,
      status: status,
      date: new Date()
    });

    // 4. Calculate Final Decision
    // If RM and DH are the same person, this block will now see both as APPROVED/REJECTED instantly
    if (leave.reportingManagerApproval === "REJECTED" || leave.departmrntHeadApproval === "REJECTED") {
      leave.approveRejectedStatus = "REJECTED";
      leave.status = "REJECTED";
    } else if (leave.reportingManagerApproval === "APPROVED" && leave.departmrntHeadApproval === "APPROVED") {
      leave.approveRejectedStatus = "APPROVED";
      leave.status = "APPROVED";
    } else {
      leave.approveRejectedStatus = null;
      leave.status = "PENDING";
    }

    await leave.save();
    res.status(200).json({ message: "Decision updated", leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};