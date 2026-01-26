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
    const { employeeId,employeeUserId, leaveType, fromDate, noOfDays, applicationDate, employeeName, toDate, reason } = req.body;

    // 1. Find Leave Master Data
    const leaveMaster = await LeaveType.findOne({
      $or: [{ leaveName: leaveType }, { leaveCode: leaveType }]
    });

    if (!leaveMaster) return res.status(400).json({ message: "Invalid leave type" });
    const totalAllowed = leaveMaster.totalDays;

    // 2. FIX: Setup Financial Year based on the LEAVE START DATE (fromDate)
    const leaveStartDate = parseDate(fromDate); 
    const month = leaveStartDate.getMonth(); // 0-indexed
    const year = leaveStartDate.getFullYear();
    
    // Logic: If Jan-Mar, the FY started April of the previous year
    const fyStartYear = month < 3 ? year - 1 : year;
    const fyStartDate = new Date(fyStartYear, 3, 1); // April 1st
    const fyEndDate = new Date(fyStartYear + 1, 2, 31); // March 31st next year

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
  {
    $group: {
      _id: null,
      total: { $sum: "$noOfDays" }
    }
  }
]);
    const usedDays = used[0]?.total || 0;
    const remaining = totalAllowed - usedDays;

    // 4. Validation
    if (remaining <= 0) return res.status(400).json({ message: "Leave limit exhausted for this session" });
    if (noOfDays > remaining) return res.status(400).json({ message: `Only ${remaining} days remaining for this session` });
    const empMaster = await Employee.findOne({ employeeID: employeeId });
    // 5. Create new application
    const newLeave = new LeaveApplication({
      employeeId,
      employeeUserId,
      employeeName,
      applicationDate: applicationDate || new Date().toISOString().split("T")[0],
      leaveType,
      fromDate: leaveStartDate.toISOString().split("T")[0], 
      toDate: parseDate(toDate).toISOString().split("T")[0],
      noOfDays,
      reason,
      leaveInHand: remaining - noOfDays,
      status: "PENDING",
      reportingManager: empMaster?.reportingManager || null, 
      reportingManagerEmpID: empMaster?.reportingManagerEmpID || null, 
      reportingManagerEmployeeUserId: empMaster?.reportingManagerEmployeeUserId || null, 
      departmentHead: empMaster?.departmentHead|| null,
      departmentHeadEmpID: empMaster?.departmentHeadEmpID|| null,
      departmentHeadEmployeeUserId: empMaster?.departmentHeadEmployeeUserId|| null,
    });

    await newLeave.save();
    res.status(201).json({ message: "Leave application submitted", remaining: remaining - noOfDays });
  } catch (error) {
    res.status(500).json({ message: error.message });
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