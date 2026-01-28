import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";
import Sidebar from "../component/Sidebar"; 
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";


const GeneratePaySlip = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.state?.mode || "generate";
  const editingData = location.state?.editingData || null;

  const selectedEmployee = editingData
    ? {
        employeeID: editingData.employeeId,
        employeeUserId: editingData.employeeUserId,
        salutation: "", 
        firstName: editingData.employeeName,
        permanentAddress: { mobile: editingData.mobile, email: editingData.email }
      }
    : location.state?.selectedEmployee || null;

  // 1. ALL STATES FIRST
  const [month, setMonth] = useState(editingData?.month || location.state?.month || "");
  const [year, setYear] = useState(editingData?.year || location.state?.year || "");
  const [allHeads, setAllHeads] = useState([]);
  const [earningDetails, setEarningDetails] = useState(
    editingData?.earnings.map(e => ({ headName: e.headName, headType: e.headType || "FIXED", value: e.amount || 0 })) || [{ headName: "", headType: "FIXED", value: 0 }]
  );
  const [deductionDetails, setDeductionDetails] = useState(
    editingData?.deductions.map(d => ({ headName: d.headName, headType: d.headType || "FIXED", value: d.amount || 0 })) || [{ headName: "", headType: "FIXED", value: 0 }]
  );
  const [monthDays, setMonthDays] = useState(editingData?.monthDays || "");
  const [totalWorkingDays, setTotalWorkingDays] = useState(editingData?.totalWorkingDays || "");
  const [LOP, setLOP] = useState(editingData?.lopDays || "");
  const [leaves, setLeaves] = useState(editingData?.leaves || "");
  const [totalOTHours, setTotalOTHours] = useState(editingData?.otHours ?? "");
  const [otAmount, setOtAmount] = useState(editingData?.otAmount ?? 0);
  const [totalOff, setTotalOff] = useState(editingData?.totalOff || 0);
  const [totalPaidDays, setTotalPaidDays] = useState(editingData?.totalPaidDays || 0);

const [isAlreadyGenerated, setIsAlreadyGenerated] = useState(false);
// --- ALL MATH CALCULATIONS (Top Level) ---
const calculateTotal = (arr) => arr.reduce((sum, item) => sum + Number(item.value || 0), 0);

// 1. Core Totals
const grossSalary = calculateTotal(earningDetails);
const totalEarning = grossSalary; 
const totalDeduction = calculateTotal(deductionDetails); // PF, PT, ESI only
const totalSalary = totalEarning - totalDeduction;
// 2. Paid Days Logic
const md = Number(monthDays) || 0;
const totalPaid = Number(totalPaidDays || 0);
const totalAfterDeduction = totalEarning - totalDeduction;

// paid days salary = (total / month days) * totalPaidDays
const paidDaysSalary = md > 0 ? (totalAfterDeduction / md) * totalPaid : 0;

// 3. Final Net Salary
// net salary = paid days salary + OT amount
const netSalary = paidDaysSalary + Number(otAmount || 0);

// 4. Compatibility Helpers (for your existing code)
const lopAmount = md > 0 ? (grossSalary / md) * Number(LOP || 0) : 0;
const inHandSalary = netSalary;


  const getDaysInMonth = (monthName, year) => {
    if (!monthName || !year) return 0;
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    return new Date(year, monthIndex + 1, 0).getDate();
  };

useEffect(() => {
  const checkExistingPayslip = async () => {
    setIsAlreadyGenerated(false); 

    // Use employeeUserId for the check
    if (mode === "edit" || !selectedEmployee?.employeeUserId || !month || !year) return;

    try {
      const res = await axios.get(
        `http://localhost:5002/api/payslips/employee?employeeUserId=${selectedEmployee.employeeUserId}&month=${month}&year=${year}`
      );

      if (res.data.success && res.data.data !== null) {
        setIsAlreadyGenerated(true);
      }
    } catch (err) {
      setIsAlreadyGenerated(false);
    }
  };

  checkExistingPayslip();
  // Listen for changes in employeeUserId
}, [selectedEmployee?.employeeUserId, month, year, mode]);

  // 4. NOW ALL YOUR EFFECTS
  useEffect(() => {
    if (month && year) {
      const days = getDaysInMonth(month, year);
      setMonthDays(days);
    }
  }, [month, year]);

// --- FIND AND REPLACE THIS SPECIFIC BLOCK ---
useEffect(() => {
  if (month && year && grossSalary > 0) {
    const daysInMonth = getDaysInMonth(month, year);
    let expectedHours = daysInMonth === 30 ? 205 : daysInMonth === 31 ? 212 : Math.round(daysInMonth * 6.85);
    
    // We calculate the value based on current hours
    const calculated = (grossSalary / expectedHours) * Number(totalOTHours || 0);
    
    // Logic: Always update otAmount whenever totalOTHours or grossSalary changes
    setOtAmount(Number(calculated.toFixed(2)));
  }
}, [totalOTHours, grossSalary, month, year]);

useEffect(() => {
  const loadMasterData = async () => {
    // Stop if we are in Edit Mode (data is already in editingData) or missing info
    if (editingData || mode === "edit" || !selectedEmployee?.employeeID || !month || !year) return;

    try {
      const monthMap = { "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6, "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12 };
      
      // 1. Fetch Salary and Attendance in parallel (Faster & Reliable)
      const [salaryRes, attendanceRes] = await Promise.all([
        axios.get(`http://localhost:5002/api/payslips/employee/${selectedEmployee.employeeID}?month=${month}&year=${year}`),
        axios.get(`http://localhost:5002/api/attendance/history?month=${monthMap[month]}&year=${year}`)
      ]);

      // 2. Process Salary Data (Earnings/Deductions)
      if (salaryRes.data.success && salaryRes.data.data) {
        const latest = salaryRes.data.data;
        setEarningDetails(latest.earnings.map(e => ({ headName: e.headName, headType: e.headType, value: e.amount || e.value })));
        setDeductionDetails(latest.deductions.map(d => ({ headName: d.headName, headType: d.headType, value: d.amount || d.value })));
      }

      // 3. Process Attendance Data (OT Hours)
      const empAtt = attendanceRes.data.find(doc => doc.employeeUserId === selectedEmployee.employeeUserId);
      if (empAtt) {
        setTotalWorkingDays(empAtt.totalPresent || 0);
        setLOP(empAtt.totalAbsent || 0);
        setLeaves(empAtt.totalLeave || 0);
        setTotalOff(empAtt.totalOff || 0); 
        setTotalPaidDays(empAtt.totalPaidDays || 0);
        // This is the key: set the hours immediately
        const otHoursValue = empAtt.totalOTHours || 0;
        setTotalOTHours(otHoursValue > 0 ? otHoursValue : "");
        if (otHoursValue > 0 && grossSalary > 0) {
          const daysInMonth = getDaysInMonth(month, year);
          let expectedHours = daysInMonth === 30 ? 205 : daysInMonth === 31 ? 212 : Math.round(daysInMonth * 6.85);
          const calculatedAmt = (grossSalary / expectedHours) * otHoursValue;
          setOtAmount(Number(calculatedAmt.toFixed(2)));
        }
      }
    } catch (err) {
      console.error("Error loading master data:", err);
    }
  };

  loadMasterData();
}, [selectedEmployee, month, year, mode, editingData, grossSalary]); 

useEffect(() => {
  const fetchEmployeeSalary = async () => {
   
    if (!selectedEmployee?.employeeID || editingData) return;

    try {
      const res = await axios.get(
        `http://localhost:5002/api/payslips/employee/${selectedEmployee.employeeID}?month=${month}&year=${year}`
      );

      if (res.data.success && res.data.data) {
        const latestPayslip = res.data.data;
        
      
        setOtAmount(latestPayslip.otAmount || 0);
        setTotalOTHours(latestPayslip.otHours || "");
        
        setEarningDetails(latestPayslip.earnings?.map(e => ({
            headName: e.headName || "",
            headType: e.headType || "FIXED",
            value: e.amount || e.value || 0 // Check if your DB uses 'amount' or 'value'
        })) || []);

        setDeductionDetails(latestPayslip.deductions?.map(d => ({
            headName: d.headName || "",
            headType: d.headType || "FIXED",
            value: d.amount || d.value || 0
        })) || []);
      }
    } catch (err) {
      console.error("Error fetching payslip:", err);
    }
  };

  fetchEmployeeSalary();
}, [selectedEmployee, editingData, month, year]);

  const earningHeads = Array.isArray(allHeads) ? allHeads.filter(h => h.headId.startsWith("EARN")) : [];
  const deductionHeads = Array.isArray(allHeads) ? allHeads.filter(h => h.headId.startsWith("DEDUCT")) : [];

  if (!selectedEmployee) {
    return (
      <div className="p-4 text-red-600 font-bold">
        ❌ No employee selected! Go back and select an employee.
        <BackButton />
      </div>
    );
  }

  const addEarningRow = () => setEarningDetails([...earningDetails, { headName: "", headType: "FIXED", value: 0 }]);
  const addDeductionRow = () => setDeductionDetails([...deductionDetails, { headName: "", headType: "FIXED", value: 0 }]);
  
const handleSave = async () => {
  if (!month || !year) {
    toast.error("Please select month & year");
    return;
  }

  const fullName = `${selectedEmployee.salutation || ""} ${selectedEmployee.firstName} ${selectedEmployee.middleName || ""} ${selectedEmployee.lastName || ""}`.trim();

  // Filter and map Earnings
  const earningsPayload = earningDetails
    .filter(e => e.headName && e.headName.trim() !== "")
    .map(e => ({
      headName: e.headName,
      type: e.headType || "FIXED",
      amount: Number(e.value) || 0
    }));

  // Filter and map Deductions
  const deductionsPayload = deductionDetails
    .filter(d => d.headName && d.headName.trim() !== "")
    .map(d => ({
      headName: d.headName,
      type: d.headType || "FIXED",
      amount: Number(d.value) || 0
    }));

  const payload = {
    employeeId: selectedEmployee.employeeID,
    employeeUserId: selectedEmployee.employeeUserId,
    employeeName: fullName,
    mobile: selectedEmployee.permanentAddress?.mobile || "",
    email: selectedEmployee.permanentAddress?.email || "",
    month,
    year,
    earnings: earningsPayload,
    deductions: deductionsPayload,
    grossSalary: Number(grossSalary.toFixed(2)),
    otHours: Number(totalOTHours || 0), 
    otAmount: Number(otAmount || 0),  
    
    // --- CALCULATIONS BASED ON YOUR STRICT RULES ---
    totalEarnings: Number(grossSalary.toFixed(2)),        // totalearnings = grosssalary
    totalDeduction: Number(totalDeduction.toFixed(2)),   // Only deduction heads (NO lopAmount)
    totalSalary: Number((grossSalary - totalDeduction).toFixed(2)), // earning - deduction
    
    paidDaysSalary: Number(paidDaysSalary.toFixed(2)),
    netSalary: Number(netSalary.toFixed(2)),             // paid days salary + OT
    inHandSalary: Number(netSalary.toFixed(2)),          // inHandSalary = net salary
    
    // --- STORAGE FIELDS ---
    lopDays: Number(LOP || 0),                           // Maps to dbs lopDays
    lopAmount: Number(lopAmount.toFixed(2)),
    monthDays: Number(monthDays),
    totalWorkingDays: Number(totalWorkingDays),
    totalOff: Number(totalOff), 
    totalPaidDays: Number(totalPaidDays),
    LOP: Number(LOP || 0),                               // Keeping for frontend compatibility
    leaves: Number(leaves)
  };

  try {
    if (editingData && editingData._id) {
      // Update existing record
      await axios.put(`http://localhost:5002/api/payslips/${editingData._id}`, payload);
      toast.success("Payslip Updated Successfully!");
    } else {
      // Create new record (Backend will check for duplicate month/employee)
      await axios.post("http://localhost:5002/api/payslips", payload);
      toast.success("Payslip Generated Successfully!");
    }
    navigate("/PaySlipGenerateEmployeeList");
  } catch (err) {
    // Extract specific validation message from backend (e.g., "Already exists")
    const backendMessage = err.response?.data?.message || "Error saving payslip";
    
    toast.error(backendMessage, {
      duration: 5000,
      style: {
        border: '1px solid #f87171',
        padding: '16px',
        color: '#991b1b',
      },
    });
    console.error("Save Error:", err);
  }
};

  const TwoColRow = ({ label1, value1, label2, value2 }) => (
     <div className="flex justify-between mb-1 text-xl"> {/* text-xl ensures all text is large */}
    {label1 && (
      <div className="flex flex-1">
        <div className="min-w-[170px]">{label1}</div>
        <div className="font-semibold">: {value1 || "N/A"}</div>
      </div>
    )}
      {label2 && (
        <div className="flex flex-1">
          <div className="min-w-[80px] font-semibold">{label2}</div>
          <div className="font-semibold">: {value2 || "N/A"}</div>
        </div>
      )}
    </div>
  );

    const ColRow = ({ label1, value1, label2, value2 }) => (
    <div className="flex text-sm mb-1">
      <div className="flex flex-1">
        <div className="min-w-[140px] font-semibold">{label1}</div>
        <div>: {value1 || "N/A"}</div>
      </div>
      {label2 && (
        <div className="flex flex-1">
          <div className="min-w-[80px] font-semibold">{label2}</div>
          <div>: {value2 || "N/A"}</div>
        </div>
      )}
    </div>
  );
  /* ------------------ PRINT FUNCTION ------------------ */
  const handlePrint = () => {
    window.print();
  };
  const handleDownloadPDF = async () => {
  const el = document.getElementById("print-section");

  if (!el) {
    console.error("print-section not found");
    return;
  }

  // Make element visible and apply print-like styles for screen
  el.style.display = "block";
  el.style.position = "absolute";
  el.style.top = "0";
  el.style.left = "0";
  el.style.width = "100%";
  el.style.background = "white"; // same as print background

  // Wait for styles to apply
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Capture the element
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Payslip-${selectedEmployee.employeeID}.pdf`);

  // Restore original display
  el.style.display = "";
};
  return (
    <>
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-4">
        <div className="bg-blue-50 border w-full border-blue-300 rounded-lg shadow-md p-2 mb-4 
            flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-800 whitespace-nowrap">
            Generate Pay Slip
          </h2>
          <div className="ml-auto">
            <BackButton />
          </div>
        </div>

        <div className="bg-yellow-100 p-2 rounded shadow mb-4">
          <ColRow
            label1="Employee Name"
            value1={`${selectedEmployee.salutation} ${selectedEmployee.firstName} ${selectedEmployee.middleName} ${selectedEmployee.lastName}`}
            label2="ID"
            value2={selectedEmployee.employeeID}
          />
          <ColRow
            label1="Mobile"
            value1={selectedEmployee.permanentAddress.mobile}
            label2="Email"
            value2={selectedEmployee.permanentAddress.email}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label>Month</label>
            <select
              className="border p-1 rounded font-semibold w-full cursor-not-allowed"
              value={month}
              disabled
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Select</option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Year</label>
            <input
              type="number"
              className="border p-1 rounded w-full cursor-not-allowed"
              value={year} 
              disabled
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
            />
          </div>
        </div>

        {/* PAY STRUCTURE */}
        <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
          <h3 className="text-xl font-semibold text-sky-600 col-span-full mb-2">PAY STRUCTURE</h3>

         {/* EARNING + DEDUCTION HORIZONTAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div>
              <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm">
                EARNING
              </h4>

              <table className="w-full border border-gray-300 mb-6 text-sm font-medium">
                <thead className="bg-sky-100">
                  <tr>
                    <th className="border p-2 w-16">SL.NO.</th>
                    <th className="border p-2">HEAD NAME</th>
                    <th className="border p-2">VALUE / HRS</th>
                    <th className="border p-2 w-20 text-center">ACTION / AMT</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Dynamic Earning Heads (Basic, HRA, etc.) */}
                  {earningDetails.map((row, index) => (
                    <tr key={index} className="even:bg-gray-50">
                      <td className="border p-2 text-center">{index + 1}</td>

                      <td className="border p-2">
                        <select
                          value={row.headName}
                          disabled
                          className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium uppercase cursor-not-allowed"
                        >
                          <option>{row.headName}</option>
                        </select>
                      </td>

                      <td className="border p-2">
                        <input
                          type="number"
                          value={row.value}
                          onChange={(e) => {
                            const updated = [...earningDetails];
                            updated[index].value = Number(e.target.value);
                            setEarningDetails(updated);
                          }}
                          className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm"
                        />
                      </td>

                      <td className="border p-2 text-center">
                        {earningDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setEarningDetails(
                                earningDetails.filter((_, i) => i !== index)
                              )
                            }
                            className={`bg-red-500 hover:bg-red-600 text-white px-2 rounded ${
                              mode === "edit" ? "cursor-not-allowed" : ""
                            }`}
                            disabled={mode === "edit"}
                          >
                            -
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* --- NEW OVERTIME (OT) SECTION --- */}
                  <tr className="bg-green-50 font-bold border-t-2 border-green-200">
                    <td className="border p-2 text-center text-green-700">
                      {earningDetails.length + 1}
                    </td>
                    <td className="border p-2 text-green-700 uppercase">
                      Overtime (OT)
                    </td>
                    <td className="border p-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={totalOTHours} 
                          onChange={(e) => setTotalOTHours(e.target.value)} 
                          placeholder="Hrs"
                          className="w-full pl-2 border border-green-300 rounded text-sm text-green-800 outline-none"
                        />
                        <span className="text-xs text-green-600 font-normal">Hrs</span>
                      </div>
                    </td>
                    <td className="border p-2 text-center text-black bg-white">
                      <input
                        type="number"
                        value={otAmount}
                        onChange={(e) => setOtAmount(Number(e.target.value))} // 🟢 This allows manual editing
                        className="w-full text-center bg-white border-none outline-none font-bold text-sm focus:ring-1 focus:ring-blue-400 rounded"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

        {/* DEDUCTION TABLE */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm">
              DEDUCTION
            </h4>

            <table className="w-full border border-gray-300 mb-6 text-sm font-medium">
              <thead className="bg-sky-100">
                <tr>
                  <th className="border p-2 w-16">SL.NO.</th>
                  <th className="border p-2">HEAD NAME</th>
                  <th className="border p-2 w-24">DAYS</th> {/* New Column for Days */}
                  <th className="border p-2">VALUE</th>
                  <th className="border p-2 w-20 text-center">ACTION</th>
                </tr>
              </thead>

              <tbody>
                {/* Dynamic Deduction Heads (PF, PT, ESI, etc.) */}
                {deductionDetails.map((row, index) => (
                  <tr key={index} className="even:bg-gray-50">
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-2 uppercase">{row.headName}</td>
                    <td className="border p-2 text-center text-gray-400">-</td> {/* Empty Days for regular deductions */}
                    <td className="border p-2">
                      <input
                        type="number"
                        value={row.value}
                        onChange={(e) => {
                          const updated = [...deductionDetails];
                          updated[index].value = Number(e.target.value);
                          setDeductionDetails(updated);
                        }}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none"
                      />
                    </td>
                    <td className="border p-2 text-center">
                      <button type="button" disabled className="bg-gray-300 text-white px-2 rounded mr-1 cursor-not-allowed">+</button>
                      {deductionDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDeductionDetails(deductionDetails.filter((_, i) => i !== index))}
                          className={`bg-red-500 hover:bg-red-600 text-white px-2 rounded ${mode === "edit" ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={mode === "edit"}
                        >
                          -
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* FIXED LOP DEDUCTION ROW */}
                <tr className="bg-red-50 font-bold border-t-2 border-red-200">
                  <td className="border p-2 text-center text-red-700">
                    {deductionDetails.length + 1}
                  </td>
                  <td className="border p-2 text-red-700 uppercase">
                    LOP
                  </td>
                  {/* Column 3: LOP Days */}
                  <td className="border p-2 text-center text-red-700 bg-red-100">
                    {LOP} days
                  </td>
                  {/* Column 4: LOP Amount */}
                  <td  colSpan="2" className="border p-2 text-center text-red-700">
                    ₹{lopAmount.toFixed(2)}
                  </td>
                </tr>
                
                {/* TOTAL DEDUCTION FOOTER */}
                {/* <tr className="bg-gray-100 font-bold">
                  <td colSpan="3" className="border p-2 text-right uppercase">
                    Total Deduction:
                  </td>
                  <td className="border p-2 text-center">
                    ₹{(totalDeduction + lopAmount).toFixed(2)}
                  </td>
                  <td className="border p-2"></td>
                </tr> */}
              </tbody>
            </table>
          </div>
          </div>

        {mode !== "edit" && (
          <>
            <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm uppercase">
              Additional Info
            </h4>
            {/* Changed grid-cols-4 to grid-cols-6 */}
            <div className="grid grid-cols-6 gap-4 mb-6 text-sm">
              <div>
                <label className="font-semibold">Month Days</label>
                <input
                  type="number"
                  value={monthDays}
                  readOnly
                  className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="font-semibold text-green-600">Total Working</label>
                <input
                  type="number"
                  value={totalWorkingDays}
                  readOnly
                  className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="font-semibold text-blue-600">Total OFF</label>
                <input
                  type="number"
                  value={totalOff}
                  readOnly
                  className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="font-semibold text-orange-600">Leaves</label>
                <input
                  type="number"
                  value={leaves}
                  readOnly
                  className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="font-semibold text-red-600">LOP (Absent)</label>
                <input
                  type="number"
                  value={LOP}
                  readOnly
                  className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="font-semibold text-indigo-700">Total Paid Days</label>
                <input
                  type="number"
                  value={totalPaidDays}
                  readOnly
                  className="font-bold w-full pl-2 pr-1 border border-indigo-300 bg-indigo-50 rounded text-sm cursor-not-allowed text-indigo-800"
                />
              </div>
            </div>
          </>
        )}
       <div className="flex justify-between items-start mb-6">
        {mode !== "edit" && (
          <div className="border-2 border-gray-400 rounded-lg p-4 w-80 bg-white shadow-sm">
            
            {/* 1. Gross Salary */}
            <div className="flex justify-between mb-2">
              <span className="text-gray-950 font-bold">Gross Salary</span>
              <span className="font-bold">₹{grossSalary.toFixed(2)}</span>
            </div>

            {/* 2. Total Earning */}
            <div className="flex justify-between mb-2 text-sm border-t pt-1">
              <span className="text-gray-950 font-bold">Total Earning</span>
              <span className="font-bold">: ₹{totalEarning.toFixed(2)}</span>
            </div>

            {/* 3. Total Deduction (PF, PT, ESI only) */}
            <div className="flex justify-between mb-2 text-sm text-red-600">
              <span className="font-medium">Total Deduction</span>
              <span className="font-semibold">: ₹{totalDeduction.toFixed(2)}</span>
            </div>

            <hr className="border-gray-400 my-2" />

            {/* 4. Total Salary (Earning - Deduction) */}
            <div className="flex justify-between mb-2">
              <span className="text-gray-950 font-bold text-sm">Total Salary</span>
              <span className="font-bold text-sm">₹{totalSalary.toFixed(2)}</span>
            </div>

            {/* 5. Paid Days Salary */}
            <div className="flex justify-between mb-2 bg-blue-50 p-1 rounded">
              <span className="text-gray-950 font-bold text-sm">Paid Days Salary</span>
              <span className="font-bold text-sm">
                ₹{paidDaysSalary.toFixed(2)}
              </span>
            </div>

            {/* 6. Net Salary (Paid Days Salary + OT) */}
            <div className="flex justify-between mt-2 font-bold text-blue-800 border-t-2 border-blue-200 pt-2 text-xl">
              <span>Net Salary</span>
              <span>₹{netSalary.toFixed(2)}</span>
            </div>
          </div>
        )}

        {mode !== "edit" && (
          <div className="flex flex-col items-end gap-2 mt-auto">
            {isAlreadyGenerated && (
              <span className="text-red-600 text-xs font-bold animate-pulse">
                ⚠️ Payslip already generated for {month} {year}
              </span>
            )}
            <button 
              onClick={() => handleSave("submit")} 
              disabled={isAlreadyGenerated}
              className={`px-6 py-2 rounded text-white font-bold shadow-md 
                ${isAlreadyGenerated ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isAlreadyGenerated ? "Already Generated" : "Submit"}
            </button>
          </div>
        )}
      </div>

        </div>
      </div>
      
    </div>
             
<div
  id="print-section"
  className="hidden print:block border-2  border-black w-[210mm] max-w-full mx-auto py-4 px-6"
  style={{ fontFamily: "sans-serif", fontSize: "14px" }}
>
  {/* HEADER */}
  <div className="text-center mb-1">
    <h1 className="text-3xl font-semibold">EYE HOSPITAL</h1>
    {/* <p className="text-base">123, Sample Road, India — 700001</p> */}
  </div>

  <div className="text-center mb-4">
    <h2 className="text-2xl font-semibold">PAY SLIP</h2>
    <p className="font-semibold text-lg">{month} - {year}</p>
  </div>


<div className="border border-black p-2 mb-4">
<div className="mb-4 grid grid-cols-3 gap-4 items-start text-xl">
  {/* Left Section (2/3) */}
  <div className="col-span-2 space-y-2">
    <TwoColRow label1="Employee Name" value1={`${selectedEmployee.salutation} ${selectedEmployee.firstName} ${selectedEmployee.middleName} ${selectedEmployee.lastName}`} />
    <TwoColRow label1="Employee ID" value1={selectedEmployee.employeeID} />
    <TwoColRow label1="Designation" value1={selectedEmployee.designationName} />
    <TwoColRow label1="Date of Joining" value1={selectedEmployee.doj} />
    <TwoColRow label1="Pay Month" value1={`${month} ${year}`} />
  </div>

{/* Right Section (1/3) of the Header info */}
<div className="col-span-1 border border-gray-300 rounded p-4 bg-green-50 text-left">
  <p className="text-2xl font-semibold">₹{inHandSalary.toFixed(2)}</p>
  <p className="text-lg text-gray-800">Total Payable</p>
  <div className="mt-2 text-left space-y-1">
    {/* Updated labels below */}
    <TwoColRow label1="Total Working Days(TP)" value1={totalWorkingDays} />
    <TwoColRow label1="LOP(TA)" value1={LOP} />
    <TwoColRow label1="Leaves(TL)" value1={leaves} />
  </div>
</div>
</div>
</div>


  {/* EARNINGS + DEDUCTIONS */}
  <div className="grid grid-cols-2 gap-4 mb-4">
    {/* Earnings */}
    <div className="border border-black p-2">
      <h3 className="text-xl font-semibold mb-2">Earnings</h3>
      <table className="w-full border border-black text-lg">
        <thead>
          <tr className="bg-gray-200 text-center">
            <th className="border p-1">SL No</th>
            <th className="border p-1">Head</th>
            <th className="border p-1">Type</th>
            <th className="border p-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {earningDetails.map((e, i) => (
            <tr key={i}>
              <td className="border p-2 text-center">{i + 1}</td>
              <td className="border p-2 text-center font-semibold">{e.headName}</td>
              <td className="border p-2 text-center font-semibold">{e.headType}</td>
              <td className="border p-2 text-center font-semibold">₹{Number(e.value).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Deductions */}
    <div className="border border-black p-2">
      <h3 className="text-xl font-semibold mb-2">Deductions</h3>
      <table className="w-full border border-black text-lg">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Sl No</th>
            <th className="border p-2">Head</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {deductionDetails.map((d, i) => (
            <tr key={i}>
              <td className="border p-2 text-center">{i + 1}</td>
              <td className="border p-2 text-center font-semibold">{d.headName}</td>
              <td className="border p-2 text-center font-semibold">{d.headType}</td>
              <td className="border p-2 text-center font-semibold">₹{Number(d.value).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>

  {/* SUMMARY */}
  <div className="border border-black p-3 text-lg space-y-2">
    <p><span className="font-semibold">Gross Salary:</span> ₹{grossSalary.toFixed(2)}</p>
    <p><span className="font-semibold">Total Deduction:</span> ₹{totalDeduction.toFixed(2)}</p>
    <p><span className="font-semibold">Net Salary:</span> ₹{netSalary.toFixed(2)}</p>
    <p><span className="font-semibold">LOP Deduction:</span> ₹{lopAmount.toFixed(2)}</p>

    <h3 className="text-2xl font-semibold mt-2">
      In-hand Salary: ₹{inHandSalary.toFixed(2)}
    </h3>
  </div>
</div>
    </>
  );
};


export default GeneratePaySlip;
