import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const PaySlipHistory = () => {
  const [paySlips, setPaySlips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPaySlips = async () => {
      try {
        const res = await axios.get("http://localhost:5002/api/payslips");
        if (res.data.success) {
          // MODIFIED LOGIC: Pull month and year from the Batch (parent) 
          // and spread them into each individual employee (child)
          const allEmployees = res.data.data.flatMap(batch => 
            batch.employeePayslips.map(slip => ({
              ...slip,
              month: batch.month, // Borrow from Parent
              year: batch.year,   // Borrow from Parent
              batchId: batch._id  // Reference for deletion
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

  const deletePaySlip = async (batchId) => {
    if (!window.confirm("Warning: This will delete the entire monthly batch. Continue?")) return;
    try {
      await axios.delete(`http://localhost:5002/api/payslips/${batchId}`);
      // Remove all employees belonging to this batch from the UI
      setPaySlips(prev => prev.filter((slip) => slip.batchId !== batchId));
      toast.success("Monthly batch deleted successfully");
    } catch (err) {
      toast.error("Failed to delete batch");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-3">
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

        
          <div className="overflow-x-auto w-full border rounded-md">
            <table className="w-full min-w-[800px] table-auto text-xs">
            <thead className="bg-blue-800 text-white uppercase tracking-tighter">
              <tr>
                <th className="border border-blue-500 p-1 w-8">SL</th>
                <th className="border border-blue-500 p-1">Emp ID</th>
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
              {paySlips.length > 0 ? (
                paySlips.map((slip, index) => (
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