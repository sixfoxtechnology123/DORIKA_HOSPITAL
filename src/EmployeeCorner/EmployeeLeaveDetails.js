import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";
import BackButton from "../component/BackButton";

const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return "-";

  let d;

  if (dateStr.includes("-") && dateStr.split("-")[0].length === 2) {
    const [day, month, year] = dateStr.split("-");
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d)) return "-";

  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

const EmployeeLeaveDetails = () => {
  const [leaveList, setLeaveList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loggedInUser = JSON.parse(localStorage.getItem("employeeUser"));
  const loggedInEmployeeUserId = loggedInUser?.employeeUserId;

  useEffect(() => {
    if (loggedInEmployeeUserId) fetchLeaveApplications();
  }, [loggedInEmployeeUserId]);
const fetchLeaveApplications = async () => {
  try {
    setLoading(true);
    // Use GET to fetch data, not PUT
    const res = await axios.get(
      `http://localhost:5002/api/leave-application/manager/${loggedInEmployeeUserId}`
    );
    setLeaveList(res.data);
  } catch (error) {
    console.error("Fetch Error:", error);
    toast.error("Failed to load leave applications");
  } finally {
    setLoading(false);
  }
};
const updateLeaveStatus = async (id, status) => {
  try {
    await axios.put(
      `http://localhost:5002/api/leave-application/${id}/status`,
      { 
        status, 
        loggedInUserId: loggedInEmployeeUserId // This ensures backend knows WHO is approving
      }
    );
    toast.success(`Leave ${status}`);
    fetchLeaveApplications();
  } catch (error) {
    toast.error("Failed to update status");
  }
};

  // if (loading) {
  //   return <div className="p-4">Loading...</div>;
  // }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <EmployeeCornerSidebar />

      <div className="flex-1 overflow-y-auto p-2 sm:p-3">
        <div className="bg-white shadow-md rounded-md p-2 sm:p-3">
          {/* Header */}
           <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-xl font-bold text-dorika-blue text-center sm:text-left">Leave Approval Panel</h2>
            <div className="flex gap-2">
              <BackButton />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto border border-dorika-blue text-xs sm:text-sm">
              <thead className="bg-dorika-blue text-white">
                <tr>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">S.No</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Employee ID</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Employee Name</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Apply Date</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Leave Type</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">From</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">To</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Days</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Reason</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Status</th>
                  <th className="border border-dorika-blue px-1 py-[2px] whitespace-nowrap">Action</th>
                </tr>
              </thead>

              <tbody className="text-center">
              {leaveList.length > 0 ? (
                leaveList.map((leave, index) => {
                  const isRM = leave.reportingManagerEmployeeUserId === loggedInEmployeeUserId;
                  const isDH = leave.departmentHeadEmployeeUserId === loggedInEmployeeUserId;
                  const myDecision = isRM ? leave.reportingManagerApproval : leave.departmrntHeadApproval;
                  const showButtons = myDecision === "PENDING";

                  return (
                    <tr key={leave._id} className="hover:bg-dorika-blueLight transition h-8">
                      <td className="border border-dorika-blue px-1 py-[2px]">{index + 1}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{leave.employeeId}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{leave.employeeName}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{formatDDMMYYYY(leave.applicationDate)}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{leave.leaveType}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{formatDDMMYYYY(leave.fromDate)}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{formatDDMMYYYY(leave.toDate)}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{leave.noOfDays}</td>
                      <td className="border border-dorika-blue px-1 py-[2px]">{leave.reason}</td>

                      {/* STATUS COLUMN WITH COLOR LOGIC */}
                      <td className="border border-dorika-blue px-1 py-[2px] text-left">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px]">
                            RM: <b className={
                              leave.reportingManagerApproval === 'APPROVED' ? 'text-green-600' : 
                              leave.reportingManagerApproval === 'REJECTED' ? 'text-red-600' : 'text-orange-500'
                            }>
                              {leave.reportingManagerApproval}
                            </b>
                          </span>

                          {/* Only show DH Status if RM has approved */}
                          {leave.reportingManagerApproval === "APPROVED" && (
                            <span className="text-[10px]">
                              DH: <b className={
                                leave.departmrntHeadApproval === 'APPROVED' ? 'text-green-600' : 
                                leave.departmrntHeadApproval === 'REJECTED' ? 'text-red-600' : 'text-orange-500'
                              }>
                                {leave.departmrntHeadApproval}
                              </b>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-dorika-blue px-1 py-[2px]">
                        {(() => {
                          const isRM = leave.reportingManagerEmployeeUserId === loggedInEmployeeUserId;
                          const isDH = leave.departmentHeadEmployeeUserId === loggedInEmployeeUserId;
                          
                          // Identify what THIS manager decided
                          const myDecision = isRM ? leave.reportingManagerApproval : leave.departmrntHeadApproval;

                          // Date Expiry Logic
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          const leaveEndDate = new Date(leave.toDate); 
                          leaveEndDate.setHours(0,0,0,0);
                          const isExpired = today > leaveEndDate;

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex justify-center gap-1">
                                <button
                                  disabled={isExpired}
                                  onClick={() => updateLeaveStatus(leave._id, "APPROVED")}
                                  className={`px-2 py-[1px] rounded text-[10px] text-white transition ${
                                    isExpired ? "bg-gray-400 cursor-not-allowed" : "bg-dorika-green hover:bg-green-700"
                                  }`}
                                >
                                  Approve
                                </button>
                                <button
                                  disabled={isExpired}
                                  onClick={() => updateLeaveStatus(leave._id, "REJECTED")}
                                  className={`px-2 py-[1px] rounded text-[10px] text-white transition ${
                                    isExpired ? "bg-gray-400 cursor-not-allowed" : "bg-dorika-orange hover:bg-red-700"
                                  }`}
                                >
                                  Reject
                                </button>
                              </div>

                              {/* FEEDBACK: Show what you decided in color */}
                              {myDecision !== "PENDING" && (
                                <span className={`text-[9px] font-bold uppercase ${
                                  myDecision === 'REJECTED' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  You {myDecision}
                                </span>
                              )}

                              {isExpired && (
                                <span className="text-[9px] text-gray-500 font-bold">EXPIRED</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-4 text-gray-500">No applications found</td>
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

export default EmployeeLeaveDetails;
