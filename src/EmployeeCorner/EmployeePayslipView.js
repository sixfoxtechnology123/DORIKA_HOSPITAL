import React, { useEffect, useState } from "react";
import axios from "axios";
import EmployeeCornerSidebar from "../EmployeeCorner/EmployeeCornerSidebar"; 
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";
import { FaEye, FaDownload, FaTimes } from "react-icons/fa"; 
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import EyeLogo from "../assets/dorikaLogo.jpg";

const EmployeePayslipView = () => {
  const [allPayslips, setAllPayslips] = useState([]);
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [viewPayslip, setViewPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  const loggedInUser = JSON.parse(localStorage.getItem("employeeUser")) || {};
  const empUserId = loggedInUser.employeeUserId || loggedInUser._id;

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const generatePDF = async (ps) => {
    const el = document.getElementById("print-section");
    if (!el) return;

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const printableWidth = pdfWidth - margin * 2;
    const pdfHeight = (canvas.height * printableWidth) / canvas.width;
    const xOffset = (pdfWidth - printableWidth) / 2;

    pdf.addImage(imgData, "JPEG", xOffset, margin, printableWidth, pdfHeight);
    pdf.save(`Payslip_${ps.month}_${ps.year}.pdf`);
  };

  const handleDownloadPDF = async (ps) => {
    const wasClosed = !viewPayslip;
    if (wasClosed) setViewPayslip(ps);

    setTimeout(async () => {
      await generatePDF(ps);
    }, 600);
  };

  useEffect(() => {
    if (!empUserId) return;
    fetchPayslipsFromDB();
  }, [empUserId]);

  const fetchPayslipsFromDB = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5002/api/payslips/view-all/${empUserId}`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setAllPayslips(data);
      setFilteredPayslips(data);
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
        allPayslips.filter(
          ps => ps.month === monthName && String(ps.year) === String(year)
        )
      );
    }
  }, [selectedMonth, allPayslips]);

  const TwoColRow = ({ label1, value1 }) => (
    <div className="flex mb-1 text-xs">
      {/* Changed min-w to a percentage on mobile to stop overlap */}
      <div className="w-[120px] md:min-w-[140px] font-medium shrink-0">{label1}</div>
      <div className="font-semibold">: {value1 || "N/A"}</div>
    </div>
  );

  return (
    <>
      <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
        <EmployeeCornerSidebar />
        <div className="flex-1 overflow-x-hidden p-3">
          <div className="bg-white shadow-md rounded-md p-3">
            {/* Header: Stack vertically on mobile, row on desktop */}
            <div className="bg-blue-50 border border-gray-300 rounded-lg p-2 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <h2 className="text-lg font-bold text-blue-800">My Pay Slips</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="month"
                  className="flex-1 border border-gray-300 py-1 px-2 rounded text-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
                <BackButton />
              </div>
            </div>

            {/* Table wrapper for horizontal scroll on small screens */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] table-auto border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2">S.No</th>
                    <th className="border border-gray-300 px-2 py-2">Month / Year</th>
                    <th className="border border-gray-300 px-2 py-2">Net Payable</th>
                    <th className="border border-gray-300 px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  {filteredPayslips.map((ps, i) => (
                    <tr key={ps._id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-2">{i + 1}</td>
                      <td className="border border-gray-300 px-2 py-2">{ps.month} {ps.year}</td>
                      <td className="border border-gray-300 px-2 py-2 font-bold text-green-700">₹{ps.netSalary}</td>
                      <td className="border border-gray-300 py-2">
                        <div className="flex justify-center gap-4">
                          <button onClick={() => setViewPayslip(ps)} className="text-blue-600"><FaEye /></button>
                          <button onClick={() => handleDownloadPDF(ps)} className="text-green-600"><FaDownload /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {viewPayslip && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-start overflow-y-auto p-4 md:pt-6 md:pb-10">
          {/* Changed w-[210mm] to w-full with max-width so it fits mobile */}
          <div className="bg-white w-full max-w-[210mm] shadow-2xl relative">
            <button
              onClick={() => setViewPayslip(null)}
              className="absolute top-2 right-2 md:-top-2 md:-right-12 text-gray-800 md:text-white bg-white/20 rounded-full"
            >
              <FaTimes size={28} />
            </button>

            {/* Outer wrapper to allow inner section to maintain size for PDF while scrolling on mobile */}
            <div className="overflow-x-auto">
              <div
                id="print-section"
                className="border border-gray-800 m-2 md:m-10 px-4 py-2 min-w-[650px]"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                <div className="flex justify-between items-center border-b border-gray-300 pb-3 mb-3">
                  <img src={EyeLogo} className="w-16 h-16 md:w-20 md:h-20 rounded-full" alt="logo" />
                  <div className="text-center">
                    <h1 className="text-xl md:text-2xl font-bold">DORIKA HOSPITAL</h1>
                    <p className="text-[10px] md:text-xs">NH 715, Mazgaon, Tezpur-784154</p>
                  </div>
                  <img src={EyeLogo} className="w-16 h-16 md:w-20 md:h-20 rounded-full" alt="logo" />
                </div>

                <div className="text-center mb-1">
                  <h2 className="px-6 font-bold uppercase text-sm">Pay Slip</h2>
                </div>

                <div className="border border-gray-800 px-4 py-2 mb-4 text-sm">
                  <div className="mb-1 grid grid-cols-3 gap-4 items-start">
                    <div className="col-span-2 space-y-1">
                      <TwoColRow label1="Employee Name" value1={viewPayslip.employeeName} />
                      <TwoColRow label1="Employee ID" value1={viewPayslip.employeeId} />
                      <TwoColRow label1="Designation" value1={viewPayslip.designationName} />
                      <TwoColRow label1="Date of Joining" value1={viewPayslip.doj} />
                      <TwoColRow label1="Pay Month" value1={`${viewPayslip.month} ${viewPayslip.year}`} />
                    </div>

                    <div className="col-span-1 border border-gray-300 rounded px-4 py-2 bg-green-50 text-left">
                      <p className="font-semibold text-xs md:text-sm">Total Payable: ₹{viewPayslip.netSalary}</p>
                      <div className="flex justify-between text-[10px] md:text-xs mt-1">
                        <div className="flex-1">Work days: <span className="font-semibold">{viewPayslip.totalWorkingDays}</span></div>
                        <div className="flex-1 text-right">Lop: <span className="font-semibold">{viewPayslip.lopDays || 0}</span></div>
                      </div>
                      <div className="flex justify-between text-[10px] md:text-xs mt-1">
                        <span className="text-sm">Paid days: <b>{viewPayslip.totalPaidDays}</b></span>
                        <span className="text-sm">Leaves: <b>{viewPayslip.leaves || 0}</b></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border border-gray-800">
                    <h3 className="bg-gray-100 font-bold text-xs p-2 border-b border-gray-300">Earnings</h3>
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        {(viewPayslip.earnings || []).map((e, i) => (
                          <tr key={i}>
                            <td className="border border-gray-300 p-2">{e.headName}</td>
                            <td className="border border-gray-300 p-2 text-right">₹{e.amount}</td>
                          </tr>
                        ))}
                        <tr className="bg-green-50 font-bold">
                          <td className="border border-gray-300 p-2">OT ({viewPayslip.otHours || 0} hrs)</td>
                          <td className="border border-gray-300 p-2 text-right">₹{viewPayslip.otAmount || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-gray-800">
                    <h3 className="bg-gray-100 font-bold text-xs p-2 border-b border-gray-300">Deductions</h3>
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        {(viewPayslip.deductions || []).length ? (
                          viewPayslip.deductions.map((d, i) => (
                            <tr key={i}>
                              <td className="border border-gray-300 p-2">{d.headName}</td>
                              <td className="border border-gray-300 p-2 text-right">₹{d.amount}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="2" className="border border-gray-300 p-6 text-center text-gray-400">No Deductions</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-gray-800 pt-3">
                  <div className="border border-gray-800 px-3 py-1 rounded"> 
                    <div className="flex justify-between text-xs gap-4">
                      <span className="font-bold">Gross Salary</span>
                      <span>₹{viewPayslip.grossSalary}</span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base font-bold gap-4">
                      <span>Net Salary</span>
                      <span>₹{viewPayslip.netSalary}</span>
                    </div>
                  </div>
                  <p className="text-[9px] italic">Computer Generated - No Signature Required</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeePayslipView;