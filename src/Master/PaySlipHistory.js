import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import { FaSearch } from "react-icons/fa";

const PaySlipHistory = () => {
  const [paySlips, setPaySlips] = useState([]);
  const [searchID, setSearchID] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState("");

  useEffect(() => {
    const fetchPaySlips = async () => {
      try {
        const res = await axios.get("http://localhost:5002/api/payslips");
        if (res.data.success) {
          const allEmployees = res.data.data.flatMap(batch => 
            batch.employeePayslips.map(slip => ({
              ...slip,
              month: batch.month, 
              year: batch.year,   
              batchId: batch._id  
            }))
          );
          setPaySlips(allEmployees);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };
    fetchPaySlips();
  }, []);

// Filter Logic Fixed
  const filteredSlips = paySlips.filter((slip) => {
    // 1. Employee UserID search: match with or without hyphens
    const targetID = (slip.employeeUserId || "").toLowerCase();
    const searchTerm = searchID.toLowerCase();
    
    // This checks for a direct match OR a match where hyphens are ignored
    const matchesID = targetID.includes(searchTerm) || 
                     targetID.replace(/-/g, "").includes(searchTerm.replace(/-/g, ""));
    
    // 2. Month/Year filter logic
    let matchesMonthYear = true;
    if (filterMonthYear) {
      const [y, m] = filterMonthYear.split("-");
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const selectedMonthName = monthNames[parseInt(m) - 1];
      
      matchesMonthYear = slip.month === selectedMonthName && slip.year.toString() === y;
    }

    return matchesID && matchesMonthYear;
  });

  // Automatic Hyphen Logic for UserID (DH-001)
  const handleSearchChange = (val) => {
    let formatted = val.toUpperCase();
    // If user types 'DH' and then a number, auto-add the hyphen
    if (formatted.startsWith("DH") && formatted.length > 2 && formatted[2] !== "-") {
      formatted = "DH-" + formatted.substring(2);
    }
    setSearchID(formatted);
  };

  return (
 <div className="flex h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="bg-white shadow-lg rounded-md p-3">
          
        <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-row justify-between items-center gap-2">
          {/* whitespace-nowrap ensures the text doesn't wrap and overlap */}
          <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
            Payslip History
          </h2>
          <div className="flex shrink-0">
            <BackButton />
          </div>
          </div>

          {/* MOBILE OPTIMIZED FILTERS: Full width stack on mobile, side-by-side on desktop */}
          <div className="flex flex-col md:flex-row gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="w-full md:flex-1 relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search UserID</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><FaSearch /></span>
                <input 
                  type="text" 
                  placeholder="e.g. DH-00101" 
                  className="w-full pl-9 p-2 border-2 rounded-md text-sm focus:border-blue-500 outline-none"
                  value={searchID}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Month</label>
              <input 
                type="month" 
                className="w-full p-2 border-2 rounded-md text-sm focus:border-blue-500 outline-none"
                value={filterMonthYear}
                onChange={(e) => setFilterMonthYear(e.target.value)}
              />
            </div>
          </div>

        
          <div className="overflow-x-auto w-full border rounded-md">
            <table className="w-full min-w-[800px] table-auto text-xs">
            <thead className="bg-blue-800 text-white uppercase tracking-tighter">
              <tr>
                <th className="border border-blue-500 p-1 w-8">SL</th>
                <th className="border border-blue-500 p-1">User ID</th>
                <th className="border border-blue-500 p-1 min-w-[120px]">Name</th>
                <th className="border border-blue-500 p-1 bg-blue-900">Month</th>
                <th className="border border-blue-500 p-1 bg-blue-900">Year</th>
                <th className="border border-blue-500 p-1">Earnings</th>
                <th className="border border-blue-500 p-1">Deductions</th>
                <th className="border border-blue-500 p-1">Gross</th>
                <th className="border border-blue-500 p-1">OT Amt</th>
                <th className="border border-blue-500 p-1 bg-green-700">Net Salary</th>
                {/* <th className="border border-blue-500 p-1">Action</th> */}
              </tr>
            </thead>
            <tbody className="text-center font-semibold text-gray-700">
              {filteredSlips.length > 0 ? (
                 filteredSlips.map((slip, index) => (
                  <tr key={`${slip.batchId}-${index}`} className="even:bg-blue-50/30 hover:bg-yellow-50 transition">
                    <td className="border border-blue-300 p-1">{index + 1}</td>
                    <td className="border border-blue-300 p-1 text-blue-900">{slip.employeeUserId || slip.employeeId}</td>
                    <td className="border border-blue-300 p-1 text-left px-2 uppercase">{slip.employeeName}</td>
                    <td className="border border-blue-300 p-1 font-bold">{slip.month}</td>
                    <td className="border border-blue-300 p-1 font-bold">{slip.year}</td>
                    
                    <td className="border border-blue-300 p-1 text-left">
                      {slip.earnings?.map((e, i) => (
                        <div key={i} className="flex justify-between border-b border-blue-100 last:border-0">
                          <span className="text-gray-900">{e.headName}:</span> <span>₹{e.amount}</span>
                        </div>
                      ))}
                    </td>
                                       
                    <td className="border border-blue-300 p-1 text-left">
                      {slip.deductions?.map((d, i) => (
                        <div key={i} className="flex justify-between border-b border-red-100 last:border-0">
                          <span className="text-gray-900">{d.headName}:</span> <span>₹{d.amount}</span>
                        </div>
                      ))}
                    </td>

                    <td className="border border-blue-300 p-1 text-blue-800 font-bold">₹{slip.grossSalary}</td>
                    <td className="border border-blue-300 p-1 text-green-700">₹{slip.otAmount}</td>
                    <td className="border border-blue-300 p-1 bg-green-50 text-green-900 font-black">₹{slip.netSalary}</td>
                    
                    {/* <td className="border border-blue-300 p-1">
                      <div className="flex justify-center gap-3">
                        <button
                          title="View/Edit"
                          className="text-blue-600 hover:text-blue-900 text-base transition-transform hover:scale-125"
                          onClick={() => navigate("/GeneratePaySlip", { state: { editingData: slip, mode: "edit" } })}
                        >
                          <FaEdit />
                        </button>
                        <button
                          title="Delete Month Batch"
                          className="text-red-500 hover:text-red-800 text-base transition-transform hover:scale-125"
                          onClick={() => deletePaySlip(slip.batchId)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-20 text-gray-400 italic font-medium">
                    No records found in the Monthly Batch History.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
};

export default PaySlipHistory;