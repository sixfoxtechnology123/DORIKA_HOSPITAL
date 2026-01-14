// EmployeeHome.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";

const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return "-";

  let d;

  // If format is DD-MM-YYYY
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 2) {
    const [day, month, year] = dateStr.split("-");
    d = new Date(year, month - 1, day);
  } 
  // If format is YYYY-MM-DD
  else {
    d = new Date(dateStr);
  }

  if (isNaN(d)) return "-";

  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};


const EmployeeHome = () => {
  const [leaveApplications, setLeaveApplications] = useState([]);
  const navigate = useNavigate();

useEffect(() => {
  const fetchLeaveApplications = async () => {
    try {
      const employeeData = JSON.parse(localStorage.getItem("employeeUser"));
      
      // CHANGE HERE: Get employeeUserId instead of employeeID
      const userId = employeeData?.employeeUserId; 

      if (!userId) return setLeaveApplications([]);

      // CHANGE HERE: Pass userId to the URL
      const res = await axios.get(
        `http://localhost:5002/api/leave-application/employee/${userId}`
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
    await axios.delete(`http://localhost:5002/api/leave-application/${id}`);

    setLeaveApplications((prev) => prev.filter((leave) => leave._id === undefined ? leave.id !== id : leave._id !== id));
    toast.success("Leave application deleted successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete leave application");
  }
};


  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <EmployeeCornerSidebar />

      <div className="flex-1 overflow-y-auto p-2 sm:p-3">
        <div className="bg-white shadow-md rounded-md p-2 sm:p-3">
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-xl font-bold text-dorika-blue text-center sm:text-left">Leave Applications</h2>
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
        <div className="overflow-x-auto">
          <table className="w-full table-auto border border-dorika-blue text-xs sm:text-sm">
            <thead className="bg-dorika-blue text-white">
              <tr>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">S.No</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">Employee ID</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">Employee Name</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">Leave Apply</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">Leave Type</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">From</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">To</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">No. of Days</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">Reason</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">Status</th>
                <th className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {leaveApplications.length > 0 ? (
                leaveApplications.map((leave, index) => (
                  <tr key={leave._id} className="hover:bg-dorika-blueLight transition h-8 sm:h-auto">
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{index + 1}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{leave.employeeId}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{leave.employeeName}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">
                            {formatDDMMYYYY(leave.applicationDate)}
                          </td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{leave.leaveType || "-"}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{formatDDMMYYYY(leave.fromDate)}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{formatDDMMYYYY(leave.toDate)}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{leave.noOfDays || "-"}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{leave.reason || "-"}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">{leave.status}</td>
                    <td className="border border-dorika-blue px-1 sm:px-2 py-[2px] sm:py-1 whitespace-nowrap">
                      <div className="flex justify-center gap-2 sm:gap-4">
                       {/* <button
                       
                          onClick={() => navigate("/EmployeeLeaveApplication", { state: { editingData: leave } })}

                          className="text-dorika-blue hover:text-dorika-green"
                        >
                          <FaEdit />
                        </button>*/}
                        <button
                          onClick={() => deleteLeaveApplication(leave._id)}
                          className="text-dorika-orange hover:text-red-700"
                        >
                          <FaTrash className="text-sm sm:text-base" />

                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-3 sm:py-4 text-gray-500 text-sm">
                    No leave applications found.
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

export default EmployeeHome;



