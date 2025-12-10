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
  // mode can be 'edit' or 'generate'
  const mode = location.state?.mode || "generate"; // default to generate


  // Check if editing
  const editingData = location.state?.editingData || null;

  // Prepare selectedEmployee from editingData or passed state
  const selectedEmployee = editingData
    ? {
        employeeID: editingData.employeeId,
        salutation: "", 
        firstName: editingData.employeeName,
        permanentAddress: {
          mobile: editingData.mobile,
          email: editingData.email
        }
      }
    : location.state?.selectedEmployee || null;

  // Month & year
  const [month, setMonth] = useState(editingData?.month || location.state?.month || "");
  const [year, setYear] = useState(editingData?.year || location.state?.year || "");

  const [allHeads, setAllHeads] = useState([]);
  
  const [earningDetails, setEarningDetails] = useState(
    editingData?.earnings.map(e => ({
      headName: e.headName,
      headType: e.headType || "FIXED",
      value: e.amount || 0
    })) || [{ headName: "", headType: "FIXED", value: 0 }]
  );

  const [deductionDetails, setDeductionDetails] = useState(
    editingData?.deductions.map(d => ({
      headName: d.headName,
      headType: d.headType || "FIXED",
      value: d.amount || 0
    })) || [{ headName: "", headType: "FIXED", value: 0 }]
  );

  const [monthDays, setMonthDays] = useState(editingData?.monthDays || "");
  const [totalWorkingDays, setTotalWorkingDays] = useState(editingData?.totalWorkingDays || "");
  const [LOP, setLOP] = useState(editingData?.LOP || "");
  const [leaves, setLeaves] = useState(editingData?.leaves || "");

// Helper to get total days in a month
const getDaysInMonth = (monthName, year) => {
  if (!monthName || !year) return 0;
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth(); // Jan = 0
  return new Date(year, monthIndex + 1, 0).getDate(); // Last day of month
};

useEffect(() => {
  if (month && year) {
    const days = getDaysInMonth(month, year);
    setMonthDays(days);
  }
}, [month, year]);

  useEffect(() => {
    const fetchEmployeeSalary = async () => {
      if (!selectedEmployee?.employeeID || editingData) return;

      try {
        // Fetch latest payslip for this employee (with month/year)
        const res = await axios.get(
          `http://localhost:5001/api/payslips/employee/${selectedEmployee.employeeID}?month=${month}&year=${year}`
        );

        if (res.data.success && res.data.data) {
          const latestPayslip = res.data.data;

          setEarningDetails(
            latestPayslip.earnings?.map(e => ({
              headName: e.headName || "",
              headType: e.headType || "FIXED",
              value: e.value || 0
            })) || [{ headName: "", headType: "", value: "" }]
          );

          setDeductionDetails(
            latestPayslip.deductions?.map(d => ({
              headName: d.headName || "",
              headType: d.headType || "FIXED",
              value: d.value || 0
            })) || [{ headName: "", headType: "", value: "" }]
          );

        } else {
          setEarningDetails([{ headName: "", headType: "", value: "" }]);
          setDeductionDetails([{ headName: "", headType: "", value: "" }]);
        }

      } catch (err) {
        console.error("Error fetching payslip:", err);
        toast.error("Failed to fetch earnings and deductions");
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

  const calculateTotal = (arr) => arr.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const grossSalary = calculateTotal(earningDetails);
  const totalDeduction = calculateTotal(deductionDetails);
  const netSalary = grossSalary - totalDeduction;
  const md = Number(monthDays) || 0;
  const lopDays = Number(LOP) || 0;
  // LOP Amount = (Gross Salary / Total Calendar Days) * LOP Days
  const lopAmount = md > 0 ? (grossSalary / md) * lopDays : 0;
  // in-hand salary = netSalary - lopAmount
  const inHandSalary = netSalary - lopAmount;

const handleSave = async () => {
  if (!month || !year) {
    toast.error("Please select month & year");
    return;
  }

  const fullName = `${selectedEmployee.salutation} ${selectedEmployee.firstName} ${selectedEmployee.middleName || ""} ${selectedEmployee.lastName || ""}`.trim();

  // Map earnings and deductions to send 'amount' to backend
  const earningsPayload = earningDetails.map(e => ({
    headName: e.headName,
    type: e.headType || "FIXED",
    amount: Number(e.value) || 0
  }));

  const deductionsPayload = deductionDetails.map(d => ({
    headName: d.headName,
    type: d.headType || "FIXED",
    amount: Number(d.value) || 0
  }));

  // Prepare final payload including mobile, email, and summary totals
  const payload = {
    employeeId: selectedEmployee.employeeID,
    employeeName: fullName,
    mobile: selectedEmployee.permanentAddress?.mobile || "",
    email: selectedEmployee.permanentAddress?.email || "",
    month,
    year,
    earnings: earningsPayload,
    deductions: deductionsPayload,
    grossSalary: Number(grossSalary.toFixed(2)),
    totalDeduction: Number(totalDeduction.toFixed(2)),
    netSalary: Number(netSalary.toFixed(2)),
    lopAmount: Number(lopAmount.toFixed(2)),
    inHandSalary: Number(inHandSalary.toFixed(2)),
    monthDays: Number(monthDays),
    totalWorkingDays: Number(totalWorkingDays),
    LOP: Number(LOP),
    leaves: Number(leaves)
  };

  try {
    if (editingData?._id) {
      // Update existing payslip
      await axios.put(`http://localhost:5001/api/payslips/${editingData._id}`, payload);
      toast.success("Payslip Updated Successfully!");
    } else {
      // Create new payslip
      await axios.post("http://localhost:5001/api/payslips", payload);
      toast.success("Payslip Generated Successfully!");
    }
    // Optionally refresh or navigate
     navigate("/PaySlipGenerateEmployeeList");
  }catch (err) {
    console.error("Error saving payslip:", err);

    // Add duplicate error handling from backend
    if (err.response && err.response.status === 400 && err.response.data.message) {
      toast.error(err.response.data.message); // Payslip already exists
    } else {
      toast.error("Error saving payslip");
    }
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

          {/* EARNING TABLE */}
          <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm">EARNING</h4>
          <table className="w-full border border-gray-300 mb-6 text-sm font-medium">
            <thead className="bg-sky-100">
              <tr>
                <th className="border p-2 w-16">SL.NO.</th>
                <th className="border p-2">HEAD NAME</th>
                <th className="border p-2">HEAD TYPE</th>
                <th className="border p-2">VALUE</th>
                <th className="border p-2 w-20 text-center">ACTION</th>
              </tr>
            </thead>
           <tbody>
              {earningDetails.map((row, index) => (
                <tr key={index} className="even:bg-gray-50">
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">
                    <select
                      value={row.headName}
                      disabled
                      onChange={(e) => {
                        const updated = [...earningDetails];
                        updated[index].headName = e.target.value;
                        setEarningDetails(updated);
                      }}
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase cursor-not-allowed"
                    >
                      {row.headName && !earningHeads.find(h => h.headName === row.headName) && (
                        <option value={row.headName}>{row.headName}</option>
                      )}
                      <option value="">SELECT</option>
                      {earningHeads.map(head => (
                        <option key={head._id} value={head.headName}>{head.headName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border p-2">
                    <select
                      value={row.headType}
                      disabled
                      onChange={(e) => {
                        const updated = [...earningDetails];
                        updated[index].headType = e.target.value.toUpperCase();
                        setEarningDetails(updated);
                      }}
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase cursor-not-allowed"
                    >
                      <option value="">SELECT</option>
                      <option value="FIXED">FIXED</option>
                      <option value="VARIABLE">VARIABLE</option>
                    </select>
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.value}
                      disabled={mode === "edit"}
                      onChange={(e) => {
                        const updated = [...earningDetails];
                        updated[index].value = e.target.value;
                        setEarningDetails(updated);
                      }}
                      className={`w-full ${mode === "edit" ? "cursor-not-allowed bg-gray-100" : ""} pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150`}
                    />
                  </td>
                  <td className="border p-2 text-center">
                    <button type="button" disabled onClick={addEarningRow} className="bg-gray-300 text-white px-2 rounded mr-1 cursor-not-allowed ">+</button>
                    {earningDetails.length > 1 && (
                      <button type="button" disabled={mode === "edit"} onClick={() => setEarningDetails(earningDetails.filter((_, i) => i !== index))} className={`bg-red-500 hover:bg-red-600 text-white px-2 rounded ${mode === "edit" ? "cursor-not-allowed" : ""}`}>-</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* DEDUCTION TABLE */}
          <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm">DEDUCTION</h4>
          <table className="w-full border border-gray-300 mb-6 text-sm font-medium">
            <thead className="bg-sky-100">
              <tr>
                <th className="border p-2 w-16">SL.NO.</th>
                <th className="border p-2">HEAD NAME</th>
                <th className="border p-2">HEAD TYPE</th>
                <th className="border p-2">VALUE</th>
                <th className="border p-2 w-20 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {deductionDetails.map((row, index) => (
                <tr key={index} className="even:bg-gray-50">
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">
                    <select
                      value={row.headName}
                      disabled
                      onChange={(e) => {
                        const updated = [...deductionDetails];
                        updated[index].headName = e.target.value;
                        setDeductionDetails(updated);
                      }}
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase cursor-not-allowed"
                    >
                      {row.headName && !deductionHeads.find(h => h.headName === row.headName) && (
                        <option value={row.headName}>{row.headName}</option>
                      )}
                      <option value="">SELECT</option>
                      {deductionHeads.map(head => (
                        <option key={head._id} value={head.headName}>{head.headName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border p-2">
                    <select
                      value={row.headType}
                      disabled
                      onChange={(e) => {
                        const updated = [...deductionDetails];
                        updated[index].headType = e.target.value.toUpperCase();
                        setDeductionDetails(updated);
                      }}
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase cursor-not-allowed"
                    >
                      <option value="">SELECT</option>
                      <option value="FIXED">FIXED</option>
                      <option value="VARIABLE">VARIABLE</option>
                    </select>
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.value}
                      disabled={mode === "edit"}
                      onChange={(e) => {
                        const updated = [...deductionDetails];
                        updated[index].value = e.target.value;
                        setDeductionDetails(updated);
                      }}
                      className={`w-full ${mode === "edit" ? "cursor-not-allowed bg-gray-100" : ""} pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150`}
                    />
                  </td>
                  <td className="border p-2 text-center">
                    <button type="button" disabled onClick={addDeductionRow} className="bg-gray-300 text-white px-2 rounded mr-1 cursor-not-allowed">+</button>
                    {deductionDetails.length > 1 && (
                      <button type="button" disabled={mode === "edit"} onClick={() => setDeductionDetails(deductionDetails.filter((_, i) => i !== index))} className={`bg-red-500 hover:bg-red-600 text-white px-2 rounded ${mode === "edit" ? "cursor-not-allowed" : ""}`}>-</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* ADDITIONAL FIELDS */}
            {mode !== "edit" && (
          <>
              <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm">ADDITIONAL INFO</h4>
              <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
                <div>
                  <label className="font-semibold">Month Days</label>
                 <input
                    type="number"
                    value={monthDays}
                    readOnly
                     className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 cursor-not-allowed"
                  />

                </div>
                <div>
                  <label className="font-semibold">Total Working Days</label>
                  <input
                    type="number"
                    value={totalWorkingDays}
                    onChange={(e) => setTotalWorkingDays(Number(e.target.value))}
                     className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="font-semibold">LOP</label>
                  <input
                    type="number"
                    value={LOP}
                    onChange={(e) => setLOP(Number(e.target.value))}
                     className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="font-semibold">Leaves</label>
                  <input
                    type="number"
                    value={leaves}
                    onChange={(e) => setLeaves(Number(e.target.value))}
                     className="font-semibold w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                  />
                </div>
              </div>
              </>
            )}
                {/* Total Summary and Actions */}
      
          <div className="flex justify-between items-start mb-6">
              {mode !== "edit" && (
            <div className="border-2 border-gray-400 rounded-lg p-4 w-80">
              <div className="flex justify-between mb-2">
                <span className="text-gray-950 font-semibold w-40">Gross Salary:</span>
                <span className="font-medium text-gray-800 text-right w-24">₹{grossSalary.toFixed(2)}</span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-950 font-semibold w-40">Total Deduction:</span>
                <span className="font-medium text-gray-800 text-right w-24">₹{totalDeduction.toFixed(2)}</span>
              </div>

              <hr className="border-gray-500" />

              <div className="flex justify-between mb-2">
                <span className="text-gray-950 font-semibold w-40">Net Salary:</span>
                <span className="font-medium text-gray-800 text-right w-24">₹{netSalary.toFixed(2)}</span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-950 font-semibold w-40">LOP Deduction:</span>
                <span className="font-medium text-gray-800 text-right w-24">₹{lopAmount.toFixed(2)}</span>
              </div>

              <hr className="border-gray-500" />

              <div className="flex justify-between mt-2 font-semibold text-gray-950">
                <span className="w-40">In-Hand Total Salary:</span>
                <span className="text-right w-24">₹{inHandSalary.toFixed(2)}</span>
              </div>
            </div>
           )}
            {mode !== "edit" && (
            <div className="flex gap-3 mt-36">
             <button
              onClick={() => handleSave("submit")}
              className="px-4 py-1 rounded text-white bg-blue-600 hover:bg-blue-700">
              Submit
            </button>


              {/* {mode !== "edit" && (
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-1 rounded bg-green-500 hover:bg-green-600 text-white"
                >
                  Download PDF
                </button>
              )} */}
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
