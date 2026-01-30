import React, { useEffect, useState } from "react";
import axios from "axios";
import EmployeeCornerSidebar from "../EmployeeCorner/EmployeeCornerSidebar"; // Replacing Admin Sidebar
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";
import { FaEye, FaPrint, FaTimes } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import EyeLogo from "../assets/dorikaLogo.jpg";

const EmployeePayslipView = () => {
  const [allPayslips, setAllPayslips] = useState([]);
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [viewPayslip, setViewPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  // User Auth
  const loggedInUser = JSON.parse(localStorage.getItem("employeeUser")) || {};
  const empUserId = loggedInUser.employeeUserId || loggedInUser._id;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!empUserId) {
      toast.error("User ID not found. Please log in again.");
      setLoading(false);
      return;
    }
    fetchPayslipsFromDB();
  }, [empUserId]);

  const fetchPayslipsFromDB = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5002/api/payslips/view-all/${empUserId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setAllPayslips(data);
      setFilteredPayslips(data);
    } catch (err) {
      toast.error("Error fetching payslips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedMonth) {
      setFilteredPayslips(allPayslips);
    } else {
      const [year, monthNum] = selectedMonth.split("-");
      const monthName = monthNames[Number(monthNum) - 1];
      setFilteredPayslips(
        allPayslips.filter((ps) => ps.month === monthName && String(ps.year) === String(year))
      );
    }
  }, [selectedMonth, allPayslips]);

  const handleDownloadPDF = async (ps) => {
    setViewPayslip(ps);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const el = document.getElementById("print-section");
    if (!el) return;

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Payslip_${ps.month}_${ps.year}.pdf`);
  };

  const TwoColRow = ({ label1, value1, label2, value2 }) => (
    <div className="flex justify-between mb-1 text-xl">
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

  return (
    <>
      <div className="flex min-h-screen flex-col md:flex-row">
        <EmployeeCornerSidebar />
        <div className="flex-1 overflow-y-auto p-3">
          <div className="bg-white shadow-md rounded-md p-3">
            
            {/* Header with Month Picker - EXACT STYLE AS PaySlipGenerateEmployeeList */}
            <div className="bg-blue-50 border w-full border-blue-300 rounded-lg shadow-md p-2 mb-4 
              flex flex-col md:flex-row items-center justify-between gap-2">

              <h2 className="text-xl font-bold text-blue-800 whitespace-nowrap">
                Generate Pay Slip – Employee List
              </h2>

              <div className="flex gap-2 items-center rounded">
                <input
                  type="month"
                  className="border-1 border-gray-600 py-0 pl-2 rounded"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div className="ml-auto">
                <BackButton />
              </div>
            </div>

            {/* Employee Table - EXACT STYLE AS PaySlipGenerateEmployeeList */}
            <table className="w-full table-auto border border-blue-500 text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border border-blue-500 px-2 py-1">S.No</th>
                  <th className="border border-blue-500 px-2 py-1">Month / Year</th>
                  <th className="border border-blue-500 px-2 py-1">Net Payable</th>
                  <th className="border border-blue-500 px-2 py-1">Action</th>
                </tr>
              </thead>

              <tbody className="text-center">
                {filteredPayslips.length > 0 ? (
                  filteredPayslips.map((ps, index) => (
                    <tr key={ps._id} className="hover:bg-gray-100 transition">
                      <td className="border border-blue-500 px-2 py-1">{index + 1}</td>
                      <td className="border border-blue-500 px-2 py-1 font-semibold">
                        {ps.month} {ps.year}
                      </td>
                      <td className="border border-blue-500 px-2 py-1 font-bold text-green-700">
                        ₹{Number(ps.netSalary || 0).toLocaleString()}
                      </td>
                      <td className="border border-blue-500 py-1">
                        <div className="flex justify-center gap-2">
                          {/* View Button mimicking FaEye in Admin */}
                          <button
                            onClick={() => setViewPayslip(ps)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaEye size={18} />
                          </button>
                          {/* Print Button mimicking FaPrint in Admin */}
                          <button
                            onClick={() => handleDownloadPDF(ps)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaPrint size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">
                      {loading ? "Fetching records..." : "No payslips available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODAL VIEW (PRINT SECTION FOLLOWS INDIVIDUAL PRINT FEATURE) --- */}
      {viewPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-[230mm] max-h-[95vh] overflow-y-auto p-4 relative shadow-2xl rounded-sm">
            <button
              onClick={() => setViewPayslip(null)}
              className="absolute top-2 right-2 text-red-600 z-10 print:hidden"
            >
              <FaTimes size={28} />
            </button>

            {/* START OF PRINT SECTION - COPIED FROM PaySlipGenerateEmployeeList */}
            <div id="print-section" className="border-2 border-black w-full mx-auto py-4 px-12 bg-white" style={{ fontFamily: "sans-serif", fontSize: "14px" }}>
              <div className="flex items-start justify-between px-4">
                <img src={EyeLogo} className="w-32 h-32 rounded-full object-cover" alt="Logo" />
                <div className="text-center flex-1 self-start">
                  <h1 className="text-3xl font-sans font-bold">DORIKA HOSPITAL</h1>
                  <p className="text-base font-normal font-serif tracking-wide">NH 715, Mazgaon, Tezpur- 784154</p>
                </div>
                <img src={EyeLogo} className="w-32 h-32 rounded-full object-cover" alt="Logo" />
              </div>

              <div className="text-center mb-4">
                <h2 className="text-2xl font-humanist font-semibold">PAY SLIP</h2>
              </div>

              <div className="border border-black px-4 py-2 mb-4">
                <div className="mb-4 grid grid-cols-3 gap-4 items-start text-xl">
                  <div className="col-span-2 space-y-2">
                    <TwoColRow label1="Employee Name" value1={viewPayslip.employeeName} />
                    <TwoColRow label1="Employee ID" value1={viewPayslip.employeeID} />
                    <TwoColRow label1="Designation" value1={viewPayslip.designationName || viewPayslip.designation} />
                    <TwoColRow label1="Pay Month" value1={`${viewPayslip.month} ${viewPayslip.year}`} />
                  </div>

                  <div className="col-span-1 border border-gray-300 rounded px-4 py-2 bg-green-50 text-left">
                    <p className="text-2xl font-semibold">₹{Number(viewPayslip.netSalary || 0).toFixed(2)}</p>
                    <p className="text-lg text-gray-800">Total Payable</p>
                    <div className="mt-2 text-left space-y-1">
                      <div className="flex justify-between text-lg">
                        <div className="flex-1">Working days: <span className="font-semibold">{viewPayslip.totalWorkingDays}</span></div>
                        <div className="flex-1 text-right">Lop: <span className="font-semibold">{viewPayslip.lopDays || viewPayslip.LOP || 0}</span></div>
                      </div>
                      <div className="flex justify-between text-lg">
                        <div className="flex-1">Total paid days: <span className="font-semibold">{viewPayslip.totalPaidDays}</span></div>
                        <div className="flex-1 text-right">Leaves: <span className="font-semibold">{viewPayslip.leaves}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
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
                      {(viewPayslip.earnings || []).map((e, i) => (
                        <tr key={i}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2 font-semibold text-left">{e.headName}</td>
                          <td className="border p-2 text-center font-semibold">₹{Number(e.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 font-bold border-t border-green-200 text-black">
                        <td className="border p-2 text-center">{(viewPayslip.earnings?.length || 0) + 1}</td>
                        <td className="border p-2 text-left">OT ({viewPayslip.otHours || 0} HRS)</td>
                        <td className="border p-2 text-center">₹{Number(viewPayslip.otAmount || 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

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
                      {(viewPayslip.deductions || []).map((d, i) => (
                        <tr key={i}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2 font-semibold uppercase text-left">{d.headName}</td>
                          <td className="border p-2 text-center font-semibold">₹{Number(d.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-2 border-gray-400 rounded-lg px-4 py-2 w-80 bg-white shadow-sm mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-950 font-bold">Gross Salary</span>
                  <span className="font-bold">₹{Number(viewPayslip.grossSalary || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2 text-sm border-t pt-1">
                  <span className="text-gray-950 font-bold text-sm">Total Earning</span>
                  <span className="font-bold text-sm">: ₹{Number(viewPayslip.grossSalary || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2 text-sm text-red-600">
                  <span className="font-medium">Total Deduction</span>
                  <span className="font-semibold">: ₹{Number(viewPayslip.totalDeduction || 0).toFixed(2)}</span>
                </div>
                <hr className="border-gray-400 my-2" />
                <div className="flex justify-between mb-2">
                  <span className="text-gray-950 font-bold text-sm">Total Salary</span>
                  <span className="font-bold text-sm">₹{(Number(viewPayslip.grossSalary || 0) - Number(viewPayslip.totalDeduction || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2 bg-blue-50 p-1 rounded">
                  <span className="text-gray-950 font-bold text-sm">Paid Days Salary</span>
                  <span className="font-bold text-sm">₹{(Number(viewPayslip.netSalary || 0) - Number(viewPayslip.otAmount || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2 font-bold text-blue-800 border-t-2 border-blue-200 pt-2 text-xl">
                  <span>Net Salary</span>
                  <span>₹{Number(viewPayslip.netSalary || 0).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-16 flex justify-between px-10 font-bold uppercase text-xs text-center">
                <div className="w-40 border-t-2 border-black pt-2">Employee Signature</div>
                <div className="w-40 border-t-2 border-black pt-2">Authorized Signatory</div>
              </div>
            </div>
            {/* END OF PRINT SECTION */}
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeePayslipView;