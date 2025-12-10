import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";

const LeaveRuleList = () => {
  const [leaveRules, setLeaveRules] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaveRules = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/leaveRule");
        setLeaveRules(res.data);
      } catch (err) {
        console.error("Fetch LeaveRules Error:", err);
        toast.error("Failed to fetch leave rules");
      }
    };
    fetchLeaveRules();
  }, []);

  // Delete leave rule
  const deleteLeaveRule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave rule?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/leaverules/${id}`);
      setLeaveRules(leaveRules.filter((rule) => rule._id !== id));
      toast.success("Leave rule deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete leave rule");
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">
          <div className="bg-green-50 border border-green-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-green-800">Leave Rules</h2>
            <div className="flex gap-2">
              <BackButton />
              <button
                onClick={() => navigate("/LeaveRuleMaster")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
              >
                Add New Leave Rule
              </button>
            </div>
          </div>

          <table className="w-full table-auto border border-green-500 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-green-500 px-2 py-1">S.No</th>
                <th className="border border-green-500 px-2 py-1">Leave Type</th>
                <th className="border border-green-500 px-2 py-1">Maximum No</th>
                <th className="border border-green-500 px-2 py-1">Entitled From Month</th>
                <th className="border border-green-500 px-2 py-1">Maximum Balance</th>
                <th className="border border-green-500 px-2 py-1">Effective From</th>
                <th className="border border-green-500 px-2 py-1">Effective To</th>
                <th className="border border-green-500 px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {leaveRules.length > 0 ? (
                leaveRules.map((rule, index) => (
                  <tr key={rule._id} className="hover:bg-gray-100 transition">
                    <td className="border border-green-500 px-2 py-1">{index + 1}</td>
                    <td className="border border-green-500 px-2 py-1">{rule.leaveType || "-"}</td>
                    <td className="border border-green-500 px-2 py-1">{rule.maximumNo || "-"}</td>
                    <td className="border border-green-500 px-2 py-1">{rule.entitledFromMonth || "-"}</td>
                    <td className="border border-green-500 px-2 py-1">{rule.maximumBalance || "-"}</td>
                    <td className="border border-green-500 px-2 py-1">{formatDate(rule.effectiveFrom)}</td>
                    <td className="border border-green-500 px-2 py-1">{formatDate(rule.effectiveTo)}</td>
                    <td className="border border-green-500 px-2 py-1">
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => navigate("/LeaveRuleMaster", { state: { editingData: rule } })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteLeaveRule(rule._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">
                    No leave rules found.
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

export default LeaveRuleList;
