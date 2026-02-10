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
  const loadingToast = toast.loading("Generating combined PDF... Please wait.");

  for (let i = 0; i < selectedEmployees.length; i++) {
    const empId = selectedEmployees[i];
    const emp = employees.find(e => e._id === empId);
    if (!emp) continue;

    // Fetch latest payslip data
    const payslip = await fetchLatestPayslip(emp);
    if (!payslip) continue;

    // Wait for React to update the DOM with new employee data
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const el = document.getElementById("print-section");
    if (!el) continue;

    // --- SILENCE CONTAINER START (Prevents Dancing/Blinking) ---
    const silenceContainer = document.createElement("div");
    silenceContainer.style.position = "fixed";
    silenceContainer.style.top = "0";
    silenceContainer.style.left = "0";
    silenceContainer.style.width = "100vw";
    silenceContainer.style.height = "0";
    silenceContainer.style.overflow = "hidden";
    silenceContainer.style.zIndex = "-9999";
    document.body.appendChild(silenceContainer);

    const clone = el.cloneNode(true);
    clone.style.display = "block";
    clone.style.position = "relative";
    clone.style.width = "100%";
    clone.style.background = "white";
    silenceContainer.appendChild(clone);

    const canvas = await html2canvas(clone, { 
      scale: 2, 
      useCORS: true, 
      allowTaint: true,
      logging: false,
      windowWidth: 1200, 
      windowHeight: clone.scrollHeight
    });

    document.body.removeChild(silenceContainer);
    // --- SILENCE CONTAINER END ---

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    if (i > 0) pdf.addPage();
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  }

  pdf.save(`All_Payslips_${tMonthName}_${tYear}.pdf`);
  toast.dismiss(loadingToast);
  toast.success("PDF Downloaded");
};

const fetchLatestPayslip = async (emp) => {
  try {
    const [tYear, tMonthNum] = selectedMonth.split("-");
    const tMonthName = monthNames[Number(tMonthNum) - 1];

    // Added filterDept to the URL to ensure it finds the correct batch
    const res = await axios.get(
      `http://localhost:5002/api/payslips/check-batch?month=${tMonthName}&year=${tYear}&filterDept=${emp.departmentName || "All"}`
    );
    
    if (!res.data.exists || !res.data.data) {
      toast.error(`No payslip batch found for ${tMonthName} ${tYear}`);
      return null;
    }

    const batchHeader = res.data.data;

    // Find the specific employee in the array
    const employeeData = batchHeader.employeePayslips.find(
      (s) => s.employeeUserId === emp.employeeUserId
    );

    if (!employeeData) {
      toast.error(`Employee ${emp.firstName} not found in this batch.`);
      return null;
    }

    // Update States for Printing
    setSelectedEmployee({ 
      ...emp, 
      employeeName: employeeData.employeeName, 
      employeeUserId: employeeData.employeeUserId,
      employeeID: employeeData.employeeId,
      designationName: employeeData.designationName || emp.designationName,
      doj: employeeData.doj || emp.doj
    });

    setMonth(batchHeader.month); 
    setYear(batchHeader.year);

    // Map DB 'amount' to Frontend 'value' so numbers show up
    setEarningDetails((employeeData.earnings || []).map(e => ({ headName: e.headName, value: e.amount || 0 })));
    setDeductionDetails((employeeData.deductions || []).map(d => ({ headName: d.headName, value: d.amount || 0 })));
    
    setGrossSalary(employeeData.grossSalary || 0);
    setNetSalary(employeeData.netSalary || 0);
    setInHandSalary(employeeData.inHandSalary || employeeData.netSalary || 0); 

    // --- FIXED ATTENDANCE MAPPING ---
    setTotalWorkingDays(employeeData.totalWorkingDays || 0); 
    setLOP(Number(employeeData.lopDays || 0));                    
    setTotalPaidDays(employeeData.totalPaidDays || 0);
    setLeaves(employeeData.leaves || 0);
    setOtHours(employeeData.otHours || 0);
    setOtAmount(employeeData.otAmount || 0);

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

  // --- SILENCE CONTAINER START ---
  const silenceContainer = document.createElement("div");
  silenceContainer.style.position = "fixed";
  silenceContainer.style.top = "0";
  silenceContainer.style.left = "0";
  silenceContainer.style.width = "100vw";
  silenceContainer.style.height = "0";
  silenceContainer.style.overflow = "hidden";
  silenceContainer.style.zIndex = "-9999";
  document.body.appendChild(silenceContainer);

  const clone = el.cloneNode(true);
  clone.style.display = "block";
  clone.style.position = "relative";
  clone.style.width = "100%";
  clone.style.background = "white";
  silenceContainer.appendChild(clone);

  await new Promise((resolve) => setTimeout(resolve, 200));

  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    windowWidth: 1200, 
    windowHeight: clone.scrollHeight
  });

  document.body.removeChild(silenceContainer);
  // --- SILENCE CONTAINER END ---

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const margin = 10; 
  const printableWidth = pdfWidth - (margin * 2);
  const pdfHeight = (canvas.height * printableWidth) / canvas.width;
  const xOffset = (pdfWidth - printableWidth) / 2;

  pdf.addImage(imgData, "PNG", xOffset, margin, printableWidth, pdfHeight);

  const fileName = `${selectedEmployee.employeeID}-${selectedEmployee.firstName}_${selectedEmployee.lastName}.pdf`;
  pdf.save(fileName);
};

const handlePrintAllSeparateFiles = async () => {
  const [tYear, tMonthNum] = selectedMonth.split("-");
  const tMonthName = monthNames[Number(tMonthNum) - 1];

  if (selectedEmployees.length === 0) {
    toast.error("Please select at least one employee");
    return;
  }

  const bulkToast = toast.loading(`Preparing files for ${selectedEmployees.length} employees...`);

  for (let i = 0; i < selectedEmployees.length; i++) {
    const empId = selectedEmployees[i];
    const emp = employees.find((e) => e._id === empId);
    if (!emp) continue;

    // 1. Fetch data for this specific employee
    const payslip = await fetchLatestPayslip(emp);
    if (!payslip) continue;

    // 2. Wait for React to render the data into the hidden div
    await new Promise((resolve) => setTimeout(resolve, 500));

    const el = document.getElementById("print-section");
    if (!el) continue;

    // 3. SILENCE CONTAINER (Prevents dancing and keeps layout perfect)
    const silenceContainer = document.createElement("div");
    silenceContainer.style.position = "fixed";
    silenceContainer.style.top = "0";
    silenceContainer.style.left = "0";
    silenceContainer.style.width = "100vw";
    silenceContainer.style.height = "0";
    silenceContainer.style.overflow = "hidden";
    silenceContainer.style.zIndex = "-9999";
    document.body.appendChild(silenceContainer);

    const clone = el.cloneNode(true);
    clone.style.display = "block";
    clone.style.position = "relative";
    clone.style.width = "100%"; // This keeps your original layout
    clone.style.background = "white";
    silenceContainer.appendChild(clone);

    // 4. Capture accurately
    const canvas = await html2canvas(clone, { 
      scale: 2, 
      useCORS: true, 
      allowTaint: true,
      logging: false,
      windowWidth: 1200, 
      windowHeight: clone.scrollHeight
    });

    // Cleanup container immediately
    document.body.removeChild(silenceContainer);

    // 5. PDF Generation
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10; 
    const printableWidth = pdfWidth - (margin * 2);
    const pdfHeight = (canvas.height * printableWidth) / canvas.width;
    const xOffset = (pdfWidth - printableWidth) / 2;

    pdf.addImage(imgData, "PNG", xOffset, margin, printableWidth, pdfHeight);

    // 6. Save individual file
    const fileName = `Payslip_${emp.employeeID || emp.firstName}_${tMonthName}_${tYear}.pdf`;
    pdf.save(fileName);

    // Small delay to prevent browser download blocking
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  
  toast.dismiss(bulkToast);
  toast.success("All individual files downloaded successfully");
};
  return (
    <>
<div className="flex min-h-screen flex-col md:flex-row">
  <Sidebar />

  <div className="flex-1 overflow-y-auto p-3 md:p-3">
    <div className="bg-white shadow-md rounded-md p-3 md:p-4">

      {/* Header with Month Picker */}
      <div className="
        bg-blue-50 border w-full border-blue-300 rounded-lg shadow-md 
        p-3 mb-4
        flex flex-wrap items-center justify-between gap-3
      ">

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-blue-800 whitespace-nowrap">
          Generate Pay Slip – Employee List
        </h2>

        {/* Right Side Controls */}
        <div className="
          flex flex-wrap items-center gap-2 
          w-full md:w-auto 
          justify-start md:justify-end
        ">

          {/* Month Picker */}
          <input
            type="month"
            className="
              border border-gray-600 
              py-1 px-2 rounded text-sm
              w-full sm:w-auto
            "
            value={selectedMonth}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedMonth(value);
              localStorage.setItem("selectedMonth", value);
              if (value) {
                const [year, month] = value.split("-");
                setSelectedYear(year);
                localStorage.setItem("selectedYear", year);
              }
            }}
          />

          {/* Print All */}
          <button
            className="
              bg-blue-600 text-white 
              px-3 py-1.5 rounded 
              hover:bg-blue-700 
              flex items-center justify-center gap-1
              text-xs sm:text-sm
              flex-1 sm:flex-none
            "
            onClick={handlePrintAllOnePDF}
          >
            <FaPrint /> Print All
          </button>

          {/* Print Separate */}
          <button
            className="
              bg-purple-600 text-white 
              px-3 py-1.5 rounded 
              hover:bg-purple-700 
              flex items-center justify-center gap-1
              text-xs sm:text-sm
              flex-1 sm:flex-none
            "
            onClick={handlePrintAllSeparateFiles}
          >
            <FaPrint /> Print Separate
          </button>

          {/* Back Button */}
          <div className="flex-1 sm:flex-none flex justify-end">
            <BackButton />
          </div>

        </div>
      </div>

      <div className="overflow-x-auto w-full border rounded-md">
        <table className="w-full min-w-[800px] table-auto text-sm">
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
    </div>

{selectedEmployee && (
  <div
    id="print-section"
    className="hidden print:block border-2 border-black w-[210mm] max-w-full mx-auto py-4 px-12"
    style={{ fontFamily: "sans-serif", fontSize: "14px",minWidth: "210mm" }}
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
