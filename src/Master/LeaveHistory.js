// File: leaveHistory.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import toast from "react-hot-toast";

const LeaveHistory = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaveHistory = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/leave-application");
      const actualData = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.leaves || [];
      setLeaves(actualData);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to fetch leave history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveHistory();
  }, []);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-")
    : "-";

const formatDateTime = (date) =>
  date
    ? new Date(date)
        .toLocaleString("en-GB")
        .replace(/\//g, "-")
    : "-";


  const getByRole = (history = [], role) =>
    history.find((h) => h.role === role) || {};

  return (
     <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="bg-white shadow-md rounded-md p-2 sm:p-3 md:p-4">
        <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-row justify-between items-center gap-2">
            {/* whitespace-nowrap ensures the text doesn't wrap and overlap */}
            <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
              Employee Leave history
            </h2>
            
            <div className="flex shrink-0">
              <BackButton />
            </div>
          </div>


          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="min-w-[900px] w-full border border-dorika-blue text-xs sm:text-sm border-collapse">
            <thead className="bg-dorika-blue text-white text-[10px] sm:text-xs md:text-sm">
              <tr>
                <th className="border px-2 py-1">Emp ID</th>
                <th className="border px-2 py-1">Emp Name</th>

                <th className="border px-2 py-1">Apply Date</th>
                <th className="border px-2 py-1">From Date</th>
                <th className="border px-2 py-1">To Date</th>
                <th className="border px-2 py-1">Total Days</th>
                <th className="border px-2 py-1">RM</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Date & Time</th>

                <th className="border px-2 py-1 bg-dorika-orange">DH</th>
                <th className="border px-2 py-1 bg-dorika-orange">Status</th>
                <th className="border px-2 py-1 bg-dorika-orange">Date & Time</th>
                <th className="border px-2 py-1 bg-dorika-orange">Final Status</th>
              </tr>
            </thead>

            <tbody className="text-center">
              {loading ? (
                <tr>
                  <td colSpan="13" className="py-4">Loading...</td>
                </tr>
              ) : leaves.length > 0 ? (
                leaves.map((leave) => {
                  const rm = getByRole(leave.history, "Reporting Manager");
                  const dh = getByRole(leave.history, "Department Head");

                  return (
                    <tr key={leave._id} className="hover:bg-dorika-blueLight transition text-xs">
                      <td className="border px-2 py-1">{leave.employeeId}</td>
                      <td className="border px-2 py-1">{leave.employeeName}</td>

                      <td className="border px-2 py-1">{formatDate(leave.applicationDate)}</td>
                      <td className="border px-2 py-1">{formatDate(leave.fromDate)}</td>
                      <td className="border px-2 py-1">{formatDate(leave.toDate)}</td>
                      <td className="border px-2 py-1">{leave.noOfDays}</td>

                      <td className="border px-2 py-1">{leave.reportingManager}</td>
                      <td className="border px-2 py-1">{rm.status || "-"}</td>
                      <td className="border px-2 py-1">{formatDateTime(rm.date)}</td>

                      <td className="border px-2 py-1">{leave.departmentHead}</td>
                      <td className="border px-2 py-1">{dh.status || "-"}</td>
                      <td className="border px-2 py-1">{formatDateTime(dh.date)}</td>
                        <td className="border px-2 py-1 font-semibold">
                        {leave.approveRejectedStatus || leave.applyStatus}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="13" className="py-4 text-gray-500">
                    No leave history found
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

export default LeaveHistory;
