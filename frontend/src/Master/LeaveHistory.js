import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import toast from "react-hot-toast";

const LeaveHistory = () => {
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");

  const fetchLeaveHistory = async () => {
    try {
      const res = await axios.get("/api/leave-application");
      const actualData = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.leaves || [];
      setLeaves(actualData);
    } catch (error) {
      toast.error("Failed to fetch leave history");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get("/api/departments");
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error("Failed to fetch departments");
    }
  };

  useEffect(() => {
    fetchLeaveHistory();
    fetchDepartments();
  }, []);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-") : "-";

  const formatDateTime = (date) =>
    date ? new Date(date).toLocaleString("en-GB").replace(/\//g, "-") : "-";

  const parseDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{2}-\d{2}-\d{4}$/.test(value)) {
      const [dd, mm, yyyy] = value.split("-");
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getFinalStatus = (leave) =>
    String(leave.approveRejectedStatus || leave.applyStatus || "PENDING").toUpperCase();

  const getByRole = (history = [], role) =>
    history.find((h) => h.role === role) || {};

  const filteredLeaves = leaves.filter((leave) => {
    const finalStatus = getFinalStatus(leave);
    const leaveDate = parseDate(leave.applicationDate || leave.fromDate);
    const monthStr = leaveDate
      ? `${leaveDate.getFullYear()}-${String(leaveDate.getMonth() + 1).padStart(2, "0")}`
      : "";

    const monthMatch = !selectedMonth || monthStr === selectedMonth;
    const statusMatch = selectedStatus === "ALL" || finalStatus === selectedStatus;
    const departmentMatch =
      selectedDepartment === "ALL" || (leave.departmentName || "") === selectedDepartment;

    return monthMatch && statusMatch && departmentMatch;
  });

  const handleExportExcel = () => {
    try {
      const exportData = filteredLeaves.map((leave, index) => {
        const rm = getByRole(leave.history, "Reporting Manager");
        const dh = getByRole(leave.history, "Department Head");
        return {
          "SL No": index + 1,
          "Emp ID": String(leave.employeeId || ""),
          "Emp Name": String(leave.employeeName || ""),
          "Department": String(leave.departmentName || "-"),
          "Apply Date": String(formatDate(leave.applicationDate)),
          "From Date": String(formatDate(leave.fromDate)),
          "To Date": String(formatDate(leave.toDate)),
          "Total Days": String(leave.noOfDays ?? ""),
          "RM": String(leave.reportingManager || ""),
          "RM Status": String(rm.status || "-"),
          "RM Date & Time": String(formatDateTime(rm.date)),
          "DH": String(leave.departmentHead || ""),
          "DH Status": String(dh.status || "-"),
          "DH Date & Time": String(formatDateTime(dh.date)),
          "Final Status": String(getFinalStatus(leave)),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leave History");
      XLSX.writeFile(workbook, "LeaveHistory.xlsx");
      toast.success("Excel exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel");
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="bg-white shadow-md rounded-md p-2 sm:p-3 md:p-4 flex-1 flex flex-col min-h-0" id="leave-history-print-root">
          <MobileHeaderToggle>
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-row justify-between items-center gap-2">
            <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
              Employee Leave history
            </h2>

            <div className="flex shrink-0">
              <button
                onClick={handleExportExcel}
                className="bg-dorika-blue text-white px-3 py-1 rounded font-semibold text-xs sm:text-sm mr-2"
              >
           Excel
              </button>
              <BackButton />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            />

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            >
              <option value="ALL">All Final Status</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.deptName}>
                  {d.deptName}
                </option>
              ))}
            </select>
          </div>
          </MobileHeaderToggle>

          <div className="w-full flex-1 min-h-0 overflow-auto" id="leave-history-print">
            <table className="min-w-[900px] w-full border border-dorika-blue text-xs sm:text-sm border-collapse">
              <thead className="bg-dorika-blue text-white text-[10px] sm:text-xs md:text-sm sticky top-0 z-10">
                <tr>
                  <th className="border px-2 py-1">SL No</th>
                  <th className="border px-2 py-1">Emp ID</th>
                  <th className="border px-2 py-1">Emp Name</th>
                  <th className="border px-2 py-1">Department</th>
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
                    <td colSpan="15" className="py-4">Loading...</td>
                  </tr>
                ) : filteredLeaves.length > 0 ? (
                  filteredLeaves.map((leave, index) => {
                    const rm = getByRole(leave.history, "Reporting Manager");
                    const dh = getByRole(leave.history, "Department Head");

                    return (
                      <tr key={leave._id} className="hover:bg-dorika-blueLight transition text-xs">
                        <td className="border px-2 py-1">{index + 1}</td>
                        <td className="border px-2 py-1">{leave.employeeId}</td>
                        <td className="border px-2 py-1">{leave.employeeName}</td>
                        <td className="border px-2 py-1">{leave.departmentName || "-"}</td>
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
                        <td className="border px-2 py-1 font-semibold">{getFinalStatus(leave)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="15" className="py-4 text-gray-500">
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
