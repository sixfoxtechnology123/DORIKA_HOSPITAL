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
        const res = await axios.get("http://localhost:5001/api/payslips");
        if (res.data.success) {
          setPaySlips(res.data.data);
        }
      } catch (err) {
        console.error(err);
       // toast.error("Failed to fetch payslips");
      }
    };

    fetchPaySlips();
  }, []);

  // DELETE payslip
  const deletePaySlip = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payslip?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/payslips/${id}`);
      setPaySlips(paySlips.filter((slip) => slip._id !== id));
      toast.success("Payslip deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete payslip");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">
          <div className="bg-blue-50 border w-full border-blue-300 rounded-lg shadow-md p-2 mb-4 
            flex flex-col md:flex-row items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-blue-800 whitespace-nowrap">
              Pay Slip History
            </h2>
            <div className="ml-auto">
              <BackButton />
            </div>
          </div>

          <table className="w-full table-auto border border-blue-500 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-blue-500 px-1 py-0 w-5">SL NO.</th>
                <th className="border border-blue-500 px-1 py-0">ID</th>
                <th className="border border-blue-500 px-1 py-0">Name</th>
                <th className="border border-blue-500 px-1 py-0">Mobile</th>
                <th className="border border-blue-500 px-1 py-0">Email</th>
                <th className="border border-blue-500 px-1 py-0">Month</th>
                <th className="border border-blue-500 px-1 py-0">Year</th>
                <th className="border border-blue-500 px-1 py-0">Earnings</th>
                <th className="border border-blue-500 px-1 py-0">Deductions</th>
                <th className="border border-blue-500 px-1 py-0">Gross</th>
                <th className="border border-blue-500 px-1 py-0 w-10">Total Deduction</th>
                <th className="border border-blue-500 px-1 py-0 w-10">LOP</th>
                <th className="border border-blue-500 px-1 py-0 w-10">IN-Hand</th>
                <th className="border border-blue-500 px-1 py-0">Action</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {paySlips.length > 0 ? (
                paySlips.map((slip, index) => (
                  <tr key={slip._id} className="even:bg-gray-50 hover:bg-gray-100 transition">
                    <td className="border border-blue-500 px-1 py-0">{index + 1}</td>
                    <td className="border border-blue-500 px-1 py-0">{slip.employeeId}</td>
                    <td className="border border-blue-500 px-1 py-0">{slip.employeeName}</td>
                     <td className="border border-blue-500 px-1 py-0">
                      {slip.mobile || "N/A"}
                    </td>
                    <td className="border border-blue-500 px-1 py-0">
                      {slip.email || "N/A"}
                    </td>
                    <td className="border border-blue-500 px-1 py-0">{slip.month}</td>
                    <td className="border border-blue-500 px-1 py-0">{slip.year}</td>
                    <td className="border border-blue-500 text-xs px-1 py-0">
                      {slip.earnings.map((e) => (
                        <div key={e._id}>{e.headName}: ₹{e.amount}</div>
                      ))}
                    </td>
                    <td className="border border-blue-500 text-xs  px-1 py-0">
                      {slip.deductions.map((d) => (
                        <div key={d._id}>{d.headName}: ₹{d.amount}</div>
                      ))}
                    </td>
                    <td className="border border-blue-500 px-1 py-0">₹{slip.grossSalary}</td>
                    <td className="border border-blue-500 px-1 py-0">₹{slip.totalDeduction}</td>
                    <td className="border border-blue-500 px-1 py-0">₹{slip.lopAmount}</td>
                    <td className="border border-blue-500 px-1 py-0">₹{slip.inHandSalary}</td>
                    <td className="border border-blue-500 px-1 py-0">
                      <div className="flex justify-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                         onClick={() => navigate("/GeneratePaySlip", { state: { editingData: slip } })}


                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => deletePaySlip(slip._id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-4 text-gray-500">
                    No payslips found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaySlipHistory;
