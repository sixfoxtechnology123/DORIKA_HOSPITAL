import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";
import { FaEye, FaPlusCircle, FaPrint } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import EyeLogo from "../assets/EyeLogo.png";


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

    setMonth(payslip.month);
    setYear(payslip.year);
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
    const res = await axios.get(`http://localhost:5001/api/payslips/latest/${emp.employeeID}`);
    const payslip = res.data;

    // Map DB structure to print-friendly format
    const mappedEarnings = (payslip.earnings || []).map(e => ({
      headName: e.headName,
      headType: e.type || "FIXED",
      value: Number(e.amount || 0),
    }));

    const mappedDeductions = (payslip.deductions || []).map(d => ({
      headName: d.headName,
      headType: d.type || "FIXED",
      value: Number(d.amount || 0),
    }));

    setSelectedEmployee({
      ...emp,
      employeeName: payslip.employeeName, // for display
    });
    setMonth(payslip.month);
    setYear(payslip.year);
    setEarningDetails(mappedEarnings);
    setDeductionDetails(mappedDeductions);
    setGrossSalary(Number(payslip.grossSalary || 0));
    setTotalDeduction(Number(payslip.totalDeduction || 0));
    setNetSalary(Number(payslip.netSalary || 0));
    setLopAmount(Number(payslip.lopAmount || 0));
    setInHandSalary(Number(payslip.inHandSalary || 0));
    setTotalWorkingDays(Number(payslip.totalWorkingDays || 0));
    setLOP(Number(payslip.LOP || 0));
    setLeaves(Number(payslip.leaves || 0));

    return payslip;
  } catch (err) {
    console.error(err);
    toast.error("Failed to fetch latest payslip");
  }
};


  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/employees");
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

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Payslip-${selectedEmployee.employeeID}.pdf`);

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
                <button
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
                </button>

                {/* Generate Button */}
                <button
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
                 
                </button>

             <button
              onClick={async () => {
                await fetchLatestPayslip(emp); // fetch latest payslip
                handleDownloadPDF();           // then generate PDF
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
    className="hidden print:block border-2 border-black w-[210mm] max-w-full mx-auto py-4 px-3"
    style={{ fontFamily: "sans-serif", fontSize: "14px" }}
  >
  <div className="flex items-center justify-between mb-2 px-4">
  {/* Left Logo */}
  <img 
    src={EyeLogo}
    alt="Left Logo"
     className="w-24 h-24 rounded-full object-cover ml-1"
  />

  {/* Center Title + Address */}
  <div className="text-center flex-1">
    <h1 className="text-3xl font-semibold">Netrapedia Eye Hospital</h1>
    <p className="text-base">
      1/32 Sahid Nagar, PO - Dhakuria, PS - Garfa</p>
      <p className="text-base">Kolkata - 700031, West Bengal</p>
  </div>

  {/* Right Logo */}
  <img 
    src={EyeLogo}
    alt="Right Logo"
     className="w-24 h-24 rounded-full object-cover mr-1"
  />
</div>

<div className="text-center mb-4">
  <h2 className="text-2xl font-semibold">PAY SLIP</h2>
  {/* <p className="font-semibold text-lg">{month} - {year}</p> */}
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

  {/* Right Section (1/3) */}
  <div className="col-span-1 border border-gray-300 rounded p-4 bg-green-50 text-left">
    <p className="text-2xl font-semibold">₹{inHandSalary.toFixed(2)}</p>
    <p className="text-lg text-gray-800">Total Payable</p>
    <div className="mt-2 text-left space-y-1">
      <TwoColRow label1="Working Days" value1={totalWorkingDays} />
      <TwoColRow label1="LOP" value1={LOP} />
      <TwoColRow label1="Leaves" value1={leaves} />
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

  <div className="border border-black p-3 text-lg space-y-2">
    <TwoColRow label1="Gross Salary" value1={`₹${grossSalary.toFixed(2)}`} />
    <TwoColRow label1="Total Deduction" value1={`₹${totalDeduction.toFixed(2)}`} />

    <TwoColRow label1="Net Salary" value1={`₹${netSalary.toFixed(2)}`} />
    <TwoColRow label1="LOP Deduction" value1={`₹${lopAmount.toFixed(2)}`} />

    <div className="mt-2">
      <h3 className="text-2xl font-semibold">
        In-Hand Salary: ₹{inHandSalary.toFixed(2)}
      </h3>
    </div>
  </div>
</div>
)}
</>


  );
};

export default PaySlipGenerateEmployeeList;
