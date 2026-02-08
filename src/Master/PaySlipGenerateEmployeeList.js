import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";
import { FaEye, FaPlusCircle, FaPrint } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import EyeLogo from "../assets/dorikaLogo.jpg";


const PaySlipGenerateEmployeeList = () => {
  
const [selectedEmployee, setSelectedEmployee] = useState(null); // selected employee for printing
const [month, setMonth] = useState("");
const [year, setYear] = useState("");

const [earningDetails, setEarningDetails] = useState([]);
const [deductionDetails, setDeductionDetails] = useState([]);

const [grossSalary, setGrossSalary] = useState(0);
const [totalDeduction, setTotalDeduction] = useState(0);
const [netSalary, setNetSalary] = useState(0);
const [lopAmount, setLopAmount] = useState(0);
const [inHandSalary, setInHandSalary] = useState(0);

const [totalWorkingDays, setTotalWorkingDays] = useState(0);
const [LOP, setLOP] = useState(0);
const [leaves, setLeaves] = useState(0);
const [otHours, setOtHours] = useState(0);
const [otAmount, setOtAmount] = useState(0);
const [paidDaysSalary, setPaidDaysSalary] = useState(0);
const [totalPaidDays, setTotalPaidDays] = useState(0); // Add this line 
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
  return localStorage.getItem("selectedMonth") || "";
});
const [selectedYear, setSelectedYear] = useState(() => {
  return localStorage.getItem("selectedYear") || "";
});

  const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
// Checkbox states
const [selectedEmployees, setSelectedEmployees] = useState([]); // array of selected employee IDs
const [selectAll, setSelectAll] = useState(false); // "Select All" checkbox
const navigate = useNavigate();
// Select All employees
const handleSelectAll = (e) => {
  const checked = e.target.checked;
  setSelectAll(checked);
  if (checked) {
    setSelectedEmployees(employees.map(emp => emp._id));
  } else {
    setSelectedEmployees([]);
  }
};

// Select individual employee
const handleSelectEmployee = (e, empId) => {
  const checked = e.target.checked;
  if (checked) {
    setSelectedEmployees(prev => [...prev, empId]);
  } else {
    setSelectedEmployees(prev => prev.filter(id => id !== empId));
    setSelectAll(false);
  }
};

const handlePrintAllOnePDF = async () => {

  const [tYear, tMonthNum] = selectedMonth.split("-");
  const tMonthName = monthNames[Number(tMonthNum) - 1];
  if (selectedEmployees.length === 0) {
    toast.error("Please select at least one employee");
    return;
  }

  const pdf = new jsPDF("p", "mm", "a4");

  for (let i = 0; i < selectedEmployees.length; i++) {
    const empId = selectedEmployees[i];
    const emp = employees.find(e => e._id === empId);
    if (!emp) continue;

    // Fetch latest payslip
    const payslip = await fetchLatestPayslip(emp);
    if (!payslip) continue;

    // Use temp object for printing
    const tempEmployee = {
      ...emp,
      employeeName: payslip.employeeName,
      designationName: payslip.designationName || emp.designationName || "",
      doj: payslip.doj || emp.doj || "",
    };

    setMonth(tMonthName);
    setYear(tYear);
    setEarningDetails((payslip.earnings || []).map(e => ({
      headName: e.headName,
      headType: e.type || "FIXED",
      value: Number(e.amount || 0)
    })));
    setDeductionDetails((payslip.deductions || []).map(d => ({
      headName: d.headName,
      headType: d.type || "FIXED",
      value: Number(d.amount || 0)
    })));
    setGrossSalary(Number(payslip.grossSalary || 0));
    setTotalDeduction(Number(payslip.totalDeduction || 0));
    setNetSalary(Number(payslip.netSalary || 0));
    setLopAmount(Number(payslip.lopAmount || 0));
    setInHandSalary(Number(payslip.inHandSalary || 0));
    setTotalWorkingDays(Number(payslip.totalWorkingDays || 0));
    setLOP(Number(payslip.LOP || 0));
    setLeaves(Number(payslip.leaves || 0));

    // Wait for React to update DOM
    await new Promise(resolve => setTimeout(resolve, 300));

    const el = document.getElementById("print-section");
    if (!el) continue;

    const clone = el.cloneNode(true);
    clone.style.display = "block";
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.width = "100%";
    clone.style.background = "white";
    document.body.appendChild(clone);

    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(clone, { scale: 2, useCORS: true, allowTaint: true });
    const imgData = canvas.toDataURL("image/jpeg", 1.0);

    if (i > 0) pdf.addPage();
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

    document.body.removeChild(clone);
  }

  pdf.save("Payslips.pdf");
};

const fetchLatestPayslip = async (emp) => {
  try {
    const [tYear, tMonthNum] = selectedMonth.split("-");
    const tMonthName = monthNames[Number(tMonthNum) - 1];

    // 1. Fetch the Batch
    const res = await axios.get(`http://localhost:5002/api/payslips/check-batch?month=${tMonthName}&year=${tYear}`);
    
    if (!res.data.exists || !res.data.data) {
      toast.error(`No payslip batch found for ${tMonthName} ${tYear}`);
      return null;
    }

    const batchHeader = res.data.data; // This contains the month/year

    // 2. FIND the specific employee in the array
    const employeeData = batchHeader.employeePayslips.find(
      (s) => s.employeeUserId === emp.employeeUserId
    );

    if (!employeeData) {
      toast.error(`Employee ${emp.firstName} not found in this batch.`);
      return null;
    }

    // 3. Update States
    setSelectedEmployee({ 
      ...emp, 
      employeeName: employeeData.employeeName, 
      employeeUserId: employeeData.employeeUserId,
      employeeID: employeeData.employeeId 
    });

    // FIX: Pull Month and Year from the Batch Header (Parent), not the employee
    setMonth(batchHeader.month); 
    setYear(batchHeader.year);

    setEarningDetails((employeeData.earnings || []).map(e => ({ headName: e.headName, value: e.amount })));
    setDeductionDetails((employeeData.deductions || []).map(d => ({ headName: d.headName, value: d.amount })));
    setGrossSalary(employeeData.grossSalary);
    setNetSalary(employeeData.netSalary);
    setInHandSalary(employeeData.inHandSalary);
    setTotalWorkingDays(employeeData.totalWorkingDays);
    setLOP(employeeData.lopDays);
    setTotalPaidDays(employeeData.totalPaidDays);
    setLeaves(employeeData.leaves);
    setOtHours(employeeData.otHours);
    setOtAmount(employeeData.otAmount);

    return employeeData;
  } catch (err) {
    console.error(err);
    toast.error("Database connection error.");
    return null;
  }
};

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get("http://localhost:5002/api/employees");
        setEmployees(res.data);
      } catch (err) {
        console.error("Fetch Employee Error:", err);
        toast.error("Failed to fetch employee list");
      }
    };
    fetchEmployees();
  }, []);

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

// --- Centering Logic ---
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const margin = 10; 
  const printableWidth = pdfWidth - (margin * 2);
  const pdfHeight = (canvas.height * printableWidth) / canvas.width;
  const xOffset = (pdfWidth - printableWidth) / 2; // This ensures equal left/right space

  pdf.addImage(imgData, "PNG", xOffset, margin, printableWidth, pdfHeight);

  // --- Dynamic File Name ---
  const fileName = `${selectedEmployee.employeeID}-${selectedEmployee.firstName}_${selectedEmployee.lastName}.pdf`;
  pdf.save(fileName);

  // Restore original display
  el.style.display = "";
};
  return (
    <>
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">

          {/* Header with Month Picker */}
          <div className="bg-blue-50 border w-full border-blue-300 rounded-lg shadow-md p-2 mb-4 
            flex flex-col md:flex-row items-center justify-between gap-2">

            <h2 className="text-xl font-bold text-blue-800 whitespace-nowrap">
              Generate Pay Slip – Employee List
            </h2>

            {/* Month-Year Calendar Picker */}
            <div className="flex gap-2 items-center rounded">
            <input
                type="month"
                className="border-1 border-gray-600 py-0 pl-2 rounded"
                value={selectedMonth}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedMonth(value);
                  localStorage.setItem("selectedMonth", value); // save month
                  if (value) {
                    const [year, month] = value.split("-");
                    setSelectedYear(year);
                    localStorage.setItem("selectedYear", year); // save year
                  }
                }}
              />
               <button
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
              onClick={handlePrintAllOnePDF} 
            >
              <FaPrint /> Print All
            </button>
            </div>
            <div className="ml-auto">
              <BackButton />
            </div>
          </div>

          {/* Employee Table */}
          <table className="w-full table-auto border border-blue-500 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-blue-500 px-2 py-1">
                  <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                </th>
                <th className="border border-blue-500 px-2 py-1">S.No</th>
                <th className="border border-blue-500 px-2 py-1">Employee ID</th>
                <th className="border border-blue-500 px-2 py-1">Employee Name</th>
                <th className="border border-blue-500 px-2 py-1">Mobile No</th>
                <th className="border border-blue-500 px-2 py-1">Email</th>
                <th className="border border-blue-500 px-2 py-1">Action</th>
              </tr>
            </thead>

            <tbody className="text-center">
              {employees && employees.length > 0 ? (
                employees.map((emp, index) => (
                  <tr key={emp._id} className="hover:bg-gray-100 transition">
                     <td className="border border-blue-500 px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp._id)}
                        onChange={(e) => handleSelectEmployee(e, emp._id)}
                      />
                    </td>
                    <td className="border border-blue-500 px-2 py-1">{index + 1}</td>
                    <td className="border border-blue-500 px-2 py-1">{emp.employeeID || "-"}</td>
                    <td className="border border-blue-500 px-2 py-1">
                      {`${emp.salutation || ""} ${emp.firstName || ""} ${emp.lastName || ""}`}
                    </td>
                    <td className="border border-blue-500 px-2 py-1">{emp.permanentAddress?.mobile || "-"}</td>
                    <td className="border border-blue-500 px-2 py-1">{emp.permanentAddress?.email || "-"}</td>
                    
              <td className="border border-blue-500 py-1">
                  <div className="flex justify-center gap-2">
                {/* Edit Button */}
                {/* <button
                  onClick={() =>
                    navigate("/GeneratePaySlip", {
                      state: {
                        selectedEmployee: emp,
                        month: selectedMonth
                          ? monthNames[Number(selectedMonth.split("-")[1]) - 1]
                          : "",
                        year: selectedMonth ? selectedMonth.split("-")[0] : "",
                        mode: "edit", // pass mode to show only update button
                      },
                    })
                  }
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FaEye />
                </button> */}

                {/* Generate Button */}
                {/* <button
                  onClick={() =>
                    navigate("/GeneratePaySlip", {
                      state: {
                        selectedEmployee: emp,
                        month: selectedMonth
                          ? monthNames[Number(selectedMonth.split("-")[1]) - 1]
                          : "",
                        year: selectedMonth ? selectedMonth.split("-")[0] : "",
                        mode: "generate", // pass mode to show only download button
                      },
                    })
                  }
                   className="text-green-600 hover:text-green-800"
                  //className="bg-green-600 hover:bg-green-700 text-white px-2 py-0 rounded text-sm"
                >
                  <FaPlusCircle />
                 
                </button> */}
          <button
              onClick={async () => {
                const payslip = await fetchLatestPayslip(emp); 
                if (payslip) {
                  handleDownloadPDF(); 
                }
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              <FaPrint />
            </button>
            </div>
              </td>
              </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        </div>
      </div>
    </div>

{selectedEmployee && (
  <div
    id="print-section"
    className="hidden print:block border-2 border-black w-[210mm] max-w-full mx-auto py-4 px-12"
    style={{ fontFamily: "sans-serif", fontSize: "14px" }}
>
  <div className="flex items-start justify-between px-4">

  {/* Left Logo */}
  <img 
    src={EyeLogo}
    alt="Left Logo"
    className="w-32 h-32 rounded-full object-cover"
  />

  {/* Center Title + Address */}
 <div className="text-center flex-1 self-start">
    <h1 className="text-3xl font-sans font-bold">DORIKA HOSPITAL</h1>
    <p className="text-base font-normal font-serif tracking-wide">NH 715, Mazgaon, Tezpur- 784154</p>
      {/* <p className="text-base font-normal font-serif tracking-wide">Kolkata - 700031, West Bengal</p> */}
  </div>

  {/* Right Logo */}
  <img 
    src={EyeLogo}
    alt="Right Logo"
     className="w-32 h-32 rounded-full object-cover"
  />
</div>

<div className="text-center mb-4">
  <h2 className="text-2xl font-humanist font-semibold">PAY SLIP</h2>
  {/* <p className="font-semibold text-lg">{month} - {year}</p> */}
</div>

<div className="border border-black px-4 py-2 mb-4">
<div className="mb-4 grid grid-cols-3 gap-4 items-start text-xl">
  {/* Left Section (2/3) */}
  <div className="col-span-2 space-y-2">
    <TwoColRow label1="Employee Name" value1={`${selectedEmployee.salutation} ${selectedEmployee.firstName} ${selectedEmployee.middleName} ${selectedEmployee.lastName}`} />
    <TwoColRow label1="Employee ID" value1={selectedEmployee.employeeID} />
    <TwoColRow label1="Designation" value1={selectedEmployee.designationName} />
    <TwoColRow label1="Date of Joining" value1={selectedEmployee.doj} />
    <TwoColRow label1="Pay Month" value1={`${month} ${year}`} />
  </div>

{/* Right Section (1/3) */}
<div className="col-span-1 border border-gray-300 rounded px-4 py-2 bg-green-50 text-left">
  <p className="text-2xl font-semibold">₹{inHandSalary}</p>
  <p className="text-lg text-gray-800">Total Payable</p>
  
  <div className="mt-2 text-left space-y-1">
    {/* Row 1: Working Days and LOP */}
    <div className="flex justify-between text-lg">
       <div className="flex-1">Working days: <span className="font-semibold">{totalWorkingDays}</span></div>
       <div className="flex-1 text-right">Lop: <span className="font-semibold">{LOP}</span></div>
    </div>

    {/* Row 2: Total Paid days and Leaves */}
    <div className="flex justify-between text-lg">
       <div className="flex-1">Total paid days: <span className="font-semibold">{totalPaidDays}</span></div>
       <div className="flex-1 text-right">Leaves: <span className="font-semibold">{leaves}</span></div>
    </div>
  </div>
</div>
</div>
</div>


  {/* EARNINGS + DEDUCTIONS */}
  <div className="grid grid-cols-2 gap-4 mb-4">
    {/* Earnings */}
  <div className="border border-black p-2">
      <h3 className="text-xl font-semibold mb-3">Earnings</h3>
      <table className="w-full border border-black text-lg">
        <thead>
          <tr className="bg-gray-200 text-center">
            <th className="border p-1">SL No</th>
            <th className="border p-1">Head</th>
            <th className="border p-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {earningDetails.map((e, i) => (
            <tr key={i}>
              <td className="border p-2 text-center">{i + 1}</td>
              <td className="border p-2 font-semibold text-left">{e.headName}</td>
              <td className="border p-2 text-center font-semibold">₹{Number(e.value)}</td>
            </tr>
          ))}

          {/* --- ADD THIS OT ROW BELOW --- */}
          <tr className="bg-green-50 font-bold border-t border-green-200 text-black">
            <td className="border p-2 text-center">
            {earningDetails.length + 1}
          </td>
          <td className="border p-2 text-left">
            OT ({otHours || 0} HRS)
          </td>
          <td className="border p-2 text-center">
            ₹{(otAmount || 0)}
          </td>
        </tr>
        {/* ----------------------------- */}
        
      </tbody>
    </table>
  </div>

  {/* Deductions */}
  <div className="border border-black p-2">
    <h3 className="text-xl font-semibold mb-3">Deductions</h3>
    <table className="w-full border border-black text-lg">
      <thead>
        <tr className="bg-gray-200 text-center">
          <th className="border p-1">Sl No</th>
          <th className="border p-1">Head</th>
          <th className="border p-1">Amount</th>
        </tr>
      </thead>
      <tbody>
        {deductionDetails.map((d, i) => (
          <tr key={i}>
            <td className="border p-2 text-center">{i + 1}</td>
            <td className="border p-2 font-semibold uppercase text-left">{d.headName}</td>
            <td className="border p-2 text-center font-semibold">₹{Number(d.value)}</td>
          </tr>
        ))}

        {/* LOP added at the bottom of the table body
        <tr className="bg-red-50 font-bold border-t border-red-200 text-black">
          <td className="border p-2 text-center">
            {deductionDetails.length + 1}
          </td>
          <td className="border p-2 text-left">
            LOP ({LOP} DAYS)
          </td>
          <td className="border p-2 text-center">
            ₹{lopAmount}
          </td>
        </tr> */}
      </tbody>
    </table>
  </div>
</div>


<div className="flex justify-between items-end mt-4">
  {/* Left Side: Salary Summary Box */}
  <div className="border-2 border-gray-400 rounded-lg px-4 py-2 w-96 bg-white shadow-sm">
    {/* 1. Gross Salary */}
    <div className="flex justify-between mb-2 text-xl">
      <span className="text-gray-950 font-bold">Gross Salary</span>
      <span className="font-bold">₹{grossSalary}</span>
    </div>

   
    {/* <div className="flex justify-between mb-2 text-lg border-t pt-1">
      <span className="text-gray-950 font-bold">Total Earning</span>
      <span className="font-bold">: ₹{grossSalary}</span>
    </div>

 
    <div className="flex justify-between mb-2 text-lg text-red-600">
      <span className="font-bold">Total Deduction</span>
      <span className="font-bold">: ₹{totalDeduction}</span>
    </div>

    <hr className="border-gray-400 my-2" />

    <div className="flex justify-between mb-2 text-lg">
      <span className="text-gray-950 font-bold">Total Salary</span>
      <span className="font-bold">₹{(grossSalary - totalDeduction)}</span>
    </div>

  
    <div className="flex justify-between mb-2 bg-blue-50 p-2 rounded text-lg">
      <span className="text-gray-950 font-bold">Paid Days Salary</span>
      <span className="font-bold">
        ₹{(netSalary - otAmount)}
      </span>
    </div> */}

    {/* 6. Net Salary */}
    <div className="flex justify-between my-2 font-bold text-blue-800 border-t-2 border-blue-200 pt-2 text-2xl">
      <span>Net Salary</span>
      <span>₹{netSalary}</span>
    </div>
  </div>

  {/* Right Side Bottom: Disclaimer Line */}
  <div className="text-right pb-1 pr-24">
    <p className="text-sm font-semibold italic text-gray-700 border-t border-gray-400 pt-1 ">
      This is a computer-generated payslip and does not require a physical signature.
    </p>
  </div>
</div>
</div>
)}
</>


  );
};

export default PaySlipGenerateEmployeeList;
