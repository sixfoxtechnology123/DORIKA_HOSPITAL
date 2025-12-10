import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";

const LeaveAllocationList = () => {
  const [allocations, setAllocations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/leaveAllocations");
      setAllocations(res.data);
    } catch (err) {
      console.error("Failed to fetch allocations:", err);
      toast.error("Failed to load Leave Allocation List");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/leaveAllocations/${id}`);
      setAllocations(allocations.filter((alloc) => alloc._id !== id));
      toast.success("Record deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete record!");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">
          <div className="bg-green-50 border border-green-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-green-800">Leave Allocations</h2>
            <div className="flex gap-2">
              <BackButton />
              <button
                onClick={() => navigate("/LeaveAllocationForm")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
              >
                Manage new Leave Allocation
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border border-green-500 text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border border-green-500 px-3 py-1">Sl.No</th>
                  <th className="border border-green-500 px-3 py-1">Employee</th>
                  <th className="border border-green-500 px-3 py-1">Leave Type</th>
                  <th className="border border-green-500 px-3 py-1">Max Leave</th>
                  <th className="border border-green-500 px-3 py-1">Opening Balance</th>
                  <th className="border border-green-500 px-3 py-1">Leave in Hand</th>
                  <th className="border border-green-500 px-3 py-1">Month/Year</th>
                  <th className="border border-green-500 px-3 py-1">Action</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {allocations.length > 0 ? (
                  allocations.map((alloc, index) => (
                    <tr key={alloc._id} className="hover:bg-gray-100 transition">
                      <td className="border border-green-500 px-3 py-1">{index + 1}</td>
                      <td className="border border-green-500 px-3 py-1">{alloc.employee}</td>
                      <td className="border border-green-500 px-3 py-1">{alloc.leaveType}</td>
                      <td className="border border-green-500 px-3 py-1">{alloc.maxLeave}</td>
                      <td className="border border-green-500 px-3 py-1">{alloc.openingBalance}</td>
                      <td className="border border-green-500 px-3 py-1">{alloc.leaveInHand}</td>
                      <td className="border border-green-500 px-3 py-1">{alloc.monthYear}</td>
                      <td className="border border-green-500 px-3 py-1">
                        <div className="flex justify-center gap-4">
                         <button
                            onClick={() => navigate("/LeaveAllocationForm", { state: { allocation: alloc } })}
                            className="text-green-600 hover:text-green-800"
                          >
                            <FaEdit />
                          </button>

                          <button
                            onClick={() => handleDelete(alloc._id)}
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
                      No leave allocations found.
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

export default LeaveAllocationList;
