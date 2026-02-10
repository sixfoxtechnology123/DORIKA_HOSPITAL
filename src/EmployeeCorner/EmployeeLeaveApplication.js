import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";
import { useLocation,useNavigate } from "react-router-dom";

const formatDDMMYYYY = (date) => {
  if (!date) return "";
  if (typeof date === 'string' && date.includes('-')) {
    const parts = date.split('-');
    if (parts[0].length === 4) { // YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseDDMMYYYY = (dateStr) => {
  if (!dateStr) return null;
  // This correctly parses "DD-MM-YYYY" into a Local Date object
  const [d, m, y] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d); // Using year, monthIndex, day constructor uses LOCAL time
};

const EmployeeLeaveApplication = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editingData = location.state?.editingData || null;
  const [empStatus, setEmpStatus] = useState(""); 
  const [statusChangeDate, setStatusChangeDate] = useState(null);
  const [usedLeaves, setUsedLeaves] = useState({ sick: 0, casual: 0 });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);


  const loggedUser = JSON.parse(localStorage.getItem("employeeUser")) || {};
  const token = localStorage.getItem("employeeToken");

  const [formData, setFormData] = useState({
    employeeId: loggedUser.employeeID || "",
    employeeUserId: loggedUser.employeeUserId || "",
    employeeName: `${loggedUser.firstName || ""} ${loggedUser.lastName || ""}`.trim(),
    applicationDate: new Date().toISOString().split("T")[0],
    leaveType: "",
    leaveInHand: 0,
    fromDate: "",
    toDate: "",
    noOfDays: 0,
    reason: "",
    reportingManagerEmployeeUserId: "",
    departmentHeadEmployeeUserId: ""
  });

  const formatDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : "");

useEffect(() => {
  if (!loggedUser?.employeeID) return;

// STEP A: Fetch Profile & Employment Status
axios
  .get(`http://localhost:5002/api/employee-ids/details/${loggedUser.employeeID}`)
  .then((profileRes) => {
    const emp = profileRes.data;
    setEmpStatus(emp.employmentStatus || "");
    setStatusChangeDate(emp.statusChangeDate);
    
    const fullName = `${emp.firstName || ""} ${emp.middleName || ""} ${emp.lastName || ""}`.trim();
    
    setFormData((prev) => ({ 
      ...prev, 
      employeeName: fullName,
      // CRITICAL FIX: This ensures employeeUserId (e.g., EMP8) is added to the form
      employeeUserId: emp.employeeUserId || prev.employeeUserId 
    }));
  })
  .catch((err) => console.error("Profile Fetch Error:", err));

  
  // STEP C: Fetch Leave Types
  axios
    .get(`http://localhost:5002/api/employee-ids/leave-types`)
    .then((res) => setLeaveTypes(res.data || []));

  // STEP D: Prefill Data for Editing
  if (editingData) {
    setIsEditMode(true);
    setEditingId(editingData._id);
    
    setFormData({
      employeeId: editingData.employeeId,
      employeeName: editingData.employeeName,
      applicationDate: formatDate(editingData.applicationDate), 
      leaveType: editingData.leaveType,
      leaveInHand: editingData.leaveInHand,
      fromDate: editingData.fromDate, 
      toDate: editingData.toDate,
      noOfDays: editingData.noOfDays,
      reason: editingData.reason || "",
      reportingManagerEmployeeUserId: editingData.reportingManagerEmployeeUserId || "",
      departmentHeadEmployeeUserId: editingData.departmentHeadEmployeeUserId || ""
    });
  }
}, [loggedUser.employeeID, editingData]);

// This block ensures Sick and Casual history updates
useEffect(() => {
  if (!formData.employeeUserId || !formData.applicationDate) return;

  const appDate = new Date(formData.applicationDate);
  const fyYear = appDate.getMonth() < 3 ? appDate.getFullYear() - 1 : appDate.getFullYear();
  const fyStart = new Date(fyYear, 3, 1); 
  const fyEnd = new Date(fyYear + 1, 2, 31);

// Locate this block in your EmployeeLeaveApplication.js
axios
  .get(`http://localhost:5002/api/leave-application/employee/${formData.employeeUserId}`)
  .then((res) => {
    const allLeaves = res.data || [];
    const otherLeaves = editingData ? allLeaves.filter(l => l._id !== editingData._id) : allLeaves;

    // ADD THIS NEW FILTER LOGIC HERE:
    const sickUsed = otherLeaves
      .filter(l => 
        // 1. Count if it is Approved OR still Waiting (Pending)
        (l.approveRejectedStatus === "APPROVED" || l.approveRejectedStatus === null) && 
        // 2. Match the Leave Type
        (l.leaveType.toUpperCase().includes("SICK") || l.leaveType.toUpperCase() === "SL") && 
        // 3. Match the current Financial Year
        new Date(l.fromDate) >= fyStart && new Date(l.fromDate) <= fyEnd
      )
      .reduce((sum, l) => sum + l.noOfDays, 0);

    const casualUsed = otherLeaves
      .filter(l => 
        // 1. Count if it is Approved OR still Waiting (Pending)
        (l.approveRejectedStatus === "APPROVED" || l.approveRejectedStatus === null) && 
        // 2. Match the Leave Type
        (l.leaveType.toUpperCase().includes("CASUAL") || l.leaveType.toUpperCase() === "CL") && 
        // 3. Match the current Financial Year
        new Date(l.fromDate) >= fyStart && new Date(l.fromDate) <= fyEnd
      )
      .reduce((sum, l) => sum + l.noOfDays, 0);

    setUsedLeaves({ sick: sickUsed, casual: casualUsed });
  })
    .catch((err) => console.error("History Fetch Error:", err));
}, [formData.employeeUserId, formData.applicationDate, editingData]);

useEffect(() => {
  if (!formData.leaveType || leaveTypes.length === 0 || !empStatus) return;

  const status = empStatus.toUpperCase();
  const name = formData.leaveType.toUpperCase();
  const master = leaveTypes.find(lt => lt.leaveName === formData.leaveType);
  
  // Note the variable name here:
  const totalYearlyAllowed = master ? master.totalDays : 0; 

  let calculatedInHand = 0;
  const selectedAppDate = new Date(formData.applicationDate);
  const fyData = getDynamicFY(formData.applicationDate);

  // --- SICK LEAVE LOGIC ---
  if (name.includes("SICK") || name === "SL") {
    if (["T", "TEP", "P", "PD", "TR"].includes(status)) {
      // FIX: Use totalYearlyAllowed
      calculatedInHand = Math.max(0, totalYearlyAllowed - usedLeaves.sick); 
    }
  } 
  
  // --- CASUAL LEAVE LOGIC ---
  else if (name.includes("CASUAL") || name === "CL") {
    if (["P", "PD"].includes(status)) {
      const changeDate = statusChangeDate ? new Date(statusChangeDate) : selectedAppDate;
      const calculationStartDate = changeDate > fyData.startDate ? changeDate : fyData.startDate;

      let monthsEarned = (selectedAppDate.getFullYear() - calculationStartDate.getFullYear()) * 12 + 
                         (selectedAppDate.getMonth() - calculationStartDate.getMonth()) + 1;

      const allowedSoFar = Math.min(totalYearlyAllowed, monthsEarned);
      calculatedInHand = Math.max(0, allowedSoFar - usedLeaves.casual);
    }
  }

  setFormData(prev => ({ ...prev, leaveInHand: calculatedInHand }));
}, [formData.leaveType, formData.applicationDate, usedLeaves, leaveTypes, empStatus, statusChangeDate]);


  // Auto-Calculate Days
  useEffect(() => {
    if (formData.fromDate && formData.toDate) {
     const from = parseDDMMYYYY(formData.fromDate);
      const to = parseDDMMYYYY(formData.toDate);

      if (to >= from) {
        const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
        setFormData((prev) => ({ ...prev, noOfDays: diff }));
      } else {
        setFormData((prev) => ({ ...prev, noOfDays: 0 }));
      }
    }
  }, [formData.fromDate, formData.toDate]);

const handleLeaveTypeChange = (value) => {
 const status = empStatus?.toUpperCase();
const name = value?.toUpperCase();
 const today = new Date();
 const currentMonth = today.getMonth(); 

  // Get total days from Master for the selected leave
  const masterType = leaveTypes.find(lt => lt.leaveName === value);
  const totalAllowed = masterType ? masterType.totalDays : 0;

 let monthsPassed = (currentMonth >= 3) ? (currentMonth - 3 + 1) : (currentMonth + 9 + 1);
 let calculatedInHand = 0;

 if (name.includes("SICK") || name === "SL") {
 if (["P", "PD", "TR", "TEP"].includes(status)) {
 calculatedInHand = Math.max(0, totalAllowed - usedLeaves.sick);
}
 } else if (name.includes("CASUAL") || name === "CL") {
 if (["P", "PD"].includes(status)) {
 calculatedInHand = Math.max(0, Math.min(totalAllowed, monthsPassed) - usedLeaves.casual);
 }
}

 setFormData((prev) => ({
 ...prev,
 leaveType: value,
 leaveInHand: calculatedInHand,
 }));
};


const getDynamicFY = (inputDate) => {
  const date = inputDate ? new Date(inputDate) : new Date();
  const month = date.getMonth(); // 0 = Jan, 3 = April
  const year = date.getFullYear();

  // If Jan, Feb, or March, FY started the previous year
  const fyStartYear = month < 3 ? year - 1 : year;
  const fyEndYear = fyStartYear + 1;

  return {
    min: `${fyStartYear}-04-01`, 
    max: `${fyEndYear}-03-31`,
    startDate: new Date(fyStartYear, 3, 1), // April 1st for calculations
    sessionName: `${fyStartYear}-${fyEndYear}`
  };
};

// Locate this line in your component and update it:
const fy = getDynamicFY(formData.applicationDate);

const handleSubmit = async () => {
  if (formData.noOfDays <= 0) return toast.error("Invalid leave duration");
  
  // A. Check if they have enough balance (already in your code)
  if (formData.noOfDays > formData.leaveInHand) {
    return toast.error(`Insufficient balance. You only have ${formData.leaveInHand} days available.`);
  }

  const type = formData.leaveType.toUpperCase();
  const isCasualLeave = type.includes("CASUAL") || type === "CL";
  
  if (isCasualLeave && formData.noOfDays > 5) {
    return toast.error("For Casual Leave, you can only apply for a maximum of 5 days at a time.");
  }
    
  if (formData.leaveInHand === 0) return toast.error("You are not eligible for this leave type");

  // ADD THIS HELPER HERE: Converts "15-01-2026" back to "2026-01-15" for database
  const toISO = (dateStr) => {
    if (!dateStr || !dateStr.includes("-")) return dateStr;
    const parts = dateStr.split("-");
    if (parts[0].length === 4) return dateStr; // Already YYYY-MM-DD
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const dataToSubmit = {
    employeeId: formData.employeeId,
    employeeUserId: formData.employeeUserId,
    employeeName: formData.employeeName,
    applicationDate: formData.applicationDate, 
    leaveType: formData.leaveType,
    leaveInHand: formData.leaveInHand,
    // REPLACE THESE TWO LINES:
    fromDate: toISO(formData.fromDate),
    toDate: toISO(formData.toDate),
    noOfDays: formData.noOfDays,
    reason: formData.reason ? formData.reason.trim() : "",
    reportingManagerEmployeeUserId: formData.reportingManagerEmployeeUserId,
    departmentHeadEmployeeUserId: formData.departmentHeadEmployeeUserId
  };

  try {
    const url = isEditMode 
      ? `http://localhost:5002/api/leave-application/${editingId}`
      : "http://localhost:5002/api/leave-application";
    
    await axios[isEditMode ? "put" : "post"](url, dataToSubmit, {
      headers: { Authorization: `Bearer ${token}` }
    });

    toast.success("Submitted successfully!");
    navigate("/EmployeeHome");
  } catch (error) {
    toast.error(error.response?.data?.message || "Submission failed");
  }
};

  const inputClass =
  "w-full pl-2 pr-2 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150";

  return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        <EmployeeCornerSidebar />
        
        {/* Add mt-16 or similar if your sidebar is fixed on mobile to avoid overlap */}
        <div className="flex-1 p-2 sm:p-3 md:p-6"> 
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-lg w-full mx-auto">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 border-b pb-2">
            {isEditMode ? "Edit Leave Application" : "New Leave Application"}
          </h2>

          {/* Status Alert for No-Leave categories */}
          {["TP", "PB", "PDB"].includes(empStatus?.toUpperCase()) && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm italic">
              Note: Status "{empStatus}" does not have any allocated leaves.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700">Employee ID</label>
              <input type="text" className={`${inputClass} bg-gray-50`} value={formData.employeeId} readOnly />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700">Employee Name</label>
              <input type="text" className={`${inputClass} bg-gray-100`} value={formData.employeeName || "Loading..."} readOnly />
            </div>

          {/* <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700">Application Date</label>
          
            <input 
              type="date" 
              id="appDatePicker"
              className="hidden" 
              value={formData.applicationDate} 
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  applicationDate: e.target.value,
                  fromDate: "", 
                  toDate: "" 
                }));
              }}
            />

            <input
              type="text"
              readOnly
              className={inputClass}
              value={formatDDMMYYYY(formData.applicationDate)} // Displays with slashes
              onClick={() => document.getElementById("appDatePicker").showPicker()}
            />
          </div> */}


          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700">Application Date</label>
            {/* The real (hidden) picker remains as is */}
            <input 
              type="date" 
              id="appDatePicker"
              className="hidden" 
              value={formData.applicationDate} 
              readOnly // Added readOnly here too for safety
            />
            {/* The visible text box: Click removed, disabled added */}
            <input
              type="text"
              disabled // This prevents any interaction
              className={`${inputClass} cursor-not-allowed bg-gray-100 opacity-80`} // Styles it as locked
              value={formatDDMMYYYY(formData.applicationDate)} 
              // REMOVED: onClick={() => document.getElementById("appDatePicker").showPicker()}
            />
          </div>
            <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700">Leave Type</label>
            <select 
              className={inputClass} 
              value={formData.leaveType} 
              onChange={(e) => handleLeaveTypeChange(e.target.value)}
            >
              <option value="">-- Select Leave --</option>
              {leaveTypes.map((lt) => {
                const status = empStatus?.toUpperCase();
                const name = lt.leaveName?.toUpperCase();
                const code = lt.leaveCode?.toUpperCase();
                
                // 1. ELIGIBILITY CHECK
                // P/PD can take anything. TR/TEP can ONLY take Sick Leave.
                const isSick = name.includes("SICK") || code === "SL";
                const isCasual = name.includes("CASUAL") || code === "CL";

                let isEligible = (status === "P" || status === "PD") || 
                                ((status === "TR" || status === "TEP") && isSick);

                // 2. DYNAMIC BALANCE CHECK (Using lt.totalDays from your Master Data)
                let hasBalance = true;
                let reason = "";

                if (isSick) {
                  // If used leaves (e.g. 6) >= Master totalDays (e.g. 6)
                  if (usedLeaves.sick >= lt.totalDays) {
                    hasBalance = false;
                    reason = "(Limit Reached)";
                  }
                } else if (isCasual) {
                  const today = new Date();
                  const m = today.getMonth();
                  // Calculate monthly accrual (April is start of FY)
                  let monthsAccrued = (m >= 3) ? (m - 3 + 1) : (m + 9 + 1);
                  
                  // Cannot exceed 12 total OR the months passed so far
                  const allowedSoFar = Math.min(lt.totalDays, monthsAccrued);
                  
                  if (usedLeaves.casual >= allowedSoFar) {
                    hasBalance = false;
                    reason = "(Limit Reached)";
                  }
                }

            return (
              <option 
                key={lt._id} 
                value={lt.leaveName} 
                disabled={!isEligible || !hasBalance}
                className={!hasBalance || !isEligible ? "text-gray-400 bg-gray-100" : "text-black"}
              >
                {lt.leaveName} {reason} {!isEligible ? "(Ineligible)" : ""}
              </option>
            );
          })}
        </select>
      </div>


          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700">From Date</label>
            <input
              type="date"
              className="hidden"
              id="fromDatePicker"
              min={fy.min} // e.g., "2025-04-01"
              max={fy.max} // e.g., "2026-03-31"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fromDate: formatDDMMYYYY(e.target.value),
                })
              }
            />
            <input
              type="text"
              readOnly
              className={inputClass}
              value={formData.fromDate}
              onClick={() => document.getElementById("fromDatePicker").showPicker()}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700">To Date</label>
            <input
              type="date"
              className="hidden"
              id="toDatePicker"
              min={fy.min}
              max={fy.max}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  toDate: formatDDMMYYYY(e.target.value),
                })
              }
            />
            <input
              type="text"
              readOnly
              className={inputClass}
              value={formData.toDate}
              onClick={() => document.getElementById("toDatePicker").showPicker()}
            />
          </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200 text-sm">
              <p className="text-blue-800 font-bold">Total Days: {formData.noOfDays}</p>
              <p className="text-sm text-blue-600">Allocation: {formData.leaveInHand} Days</p>
              {formData.noOfDays > 5 && (formData.leaveType.toUpperCase().includes("CASUAL")) && (
              <p className="text-[10px] text-red-600 font-bold mt-1 bg-red-50 p-1 rounded border border-red-200">
                ⚠️ Limit: Max 5 days per application
              </p>
            )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-xs sm:text-sm font-bold text-gray-700">Reason (Optional)</label>
            <textarea className={`${inputClass} h-16 sm:h-12 p-2`} value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            {/* <button className="bg-gray-400 text-white px-6 py-2 rounded-lg">Cancel</button> */}
            <button 
              onClick={handleSubmit}
              disabled={["TP", "PB", "PDB"].includes(empStatus?.toUpperCase())}
              className="disabled:bg-gray-300 bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 rounded-lg font-bold transition-colors"
            >
              {isEditMode ? "Update Application" : "Submit Application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaveApplication;