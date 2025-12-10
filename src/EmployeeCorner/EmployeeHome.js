// EmployeeHome.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";

const EmployeeHome = () => {
  const [leaveApplications, setLeaveApplications] = useState([]);
  const navigate = useNavigate();

useEffect(() => {
  const fetchLeaveApplications = async () => {
    try {
      const employeeData = JSON.parse(localStorage.getItem("employeeUser"));
      const employeeId = employeeData?.employeeID;

      if (!employeeId) return setLeaveApplications([]); // no ID, show empty

      const res = await axios.get(
        `http://localhost:5001/api/leave-application/employee/${employeeId}`
      );
      setLeaveApplications(res.data);
    } catch (err) {
      console.error("Fetch Leave Applications Error:", err);
      toast.error("Failed to fetch leave applications");
    }
  };
  fetchLeaveApplications();
}, []);


const deleteLeaveApplication = async (id) => {
  if (!window.confirm("Are you sure you want to delete this leave application?")) return;
  try {
    await axios.delete(`http://localhost:5001/api/leave-application/${id}`);

    setLeaveApplications((prev) => prev.filter((leave) => leave._id === undefined ? leave.id !== id : leave._id !== id));
    toast.success("Leave application deleted successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete leave application");
  }
};

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <EmployeeCornerSidebar />

      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">
          <div className="bg-blue-50 border border-blue-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-blue-800">Leave Applications</h2>
            <div className="flex gap-2">
              <BackButton />
              {/* <button
                onClick={() => navigate("/LeaveApplicationForm")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
              >
                Add New Leave Application
              </button> */}
            </div>
          </div>

          <table className="w-full table-auto border border-blue-500 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-blue-500 px-2 py-1">S.No</th>
                <th className="border border-blue-500 px-2 py-1">Employee ID</th>
                <th className="border border-blue-500 px-2 py-1">Employee Name</th>
                <th className="border border-blue-500 px-2 py-1">Leave Type</th>
                <th className="border border-blue-500 px-2 py-1">From</th>
                <th className="border border-blue-500 px-2 py-1">To</th>
                <th className="border border-blue-500 px-2 py-1">No. of Days</th>
                <th className="border border-blue-500 px-2 py-1">Reason</th>
                <th className="border border-blue-500 px-2 py-1">Status</th>
                <th className="border border-blue-500 px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {leaveApplications.length > 0 ? (
                leaveApplications.map((leave, index) => (
                  <tr key={leave._id} className="hover:bg-gray-100 transition">
                    <td className="border border-blue-500 px-2 py-1">{index + 1}</td>
                    <td className="border border-blue-500 px-2 py-1">{leave.employeeId}</td>
                    <td className="border border-blue-500 px-2 py-1">{leave.employeeName}</td>
                    <td className="border border-blue-500 px-2 py-1">{leave.leaveType || "-"}</td>
                    <td className="border border-blue-500 px-2 py-1">{formatDate(leave.fromDate)}</td>
                    <td className="border border-blue-500 px-2 py-1">{formatDate(leave.toDate)}</td>
                    <td className="border border-blue-500 px-2 py-1">{leave.noOfDays || "-"}</td>
                    <td className="border border-blue-500 px-2 py-1">{leave.reason || "-"}</td>
                    <td className="border border-blue-500 px-2 py-1">{leave.status}</td>
                    <td className="border border-blue-500 px-2 py-1">
                      <div className="flex justify-center gap-4">
                        <button
                         // In EmployeeHome.js
                          onClick={() => navigate("/EmployeeLeaveApplication", { state: { editingData: leave } })}

                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteLeaveApplication(leave._id)}
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
                  <td colSpan="10" className="text-center py-4 text-gray-500">
                    No leave applications found.
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

export default EmployeeHome;



