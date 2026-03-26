import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import toast from "react-hot-toast";
import Pagination from "./Pagination";

const LeaveHistory = () => {
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const loggedInUserId = adminData.userId || adminData.employeeUserId || adminData._id || "";

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

  const getLeaveCode = (leaveType = "") => {
    const type = String(leaveType || "").toUpperCase();
    if (type.includes("SICK") || type === "SL") return "SL";
    if (type.includes("CASUAL") || type === "CL") return "CL";
    return type || "-";
  };

  const normalizeSearchInput = (value) => {
    let v = String(value || "").toUpperCase().replace(/\s+/g, "");
    if (/^[A-Z]+\d/.test(v)) {
      v = v.replace(/^([A-Z]+)-?(\d.*)$/, "$1-$2");
    }
    return v;
  };

  const getStatusClass = (status = "") => {
    const s = String(status || "").toUpperCase();
    if (s === "APPROVED") return "bg-green-100 text-green-700 border-green-300";
    if (s === "REJECTED") return "bg-red-100 text-red-700 border-red-300";
    return "bg-yellow-100 text-yellow-700 border-yellow-300";
  };

  const normalizeRoleToken = (value) =>
    String(value || "").toUpperCase().replace(/[^A-Z]/g, "");

  const isRMRole = (role) => {
    const r = normalizeRoleToken(role);
    return r.includes("REPORTINGMANAGER") || r === "RM" || r.startsWith("RM") || r.includes("RMDH");
  };

  const isDHRole = (role) => {
    const r = normalizeRoleToken(role);
    return r.includes("DEPARTMENTHEAD") || r === "DH" || r.endsWith("DH") || r.includes("RMDH");
  };

  const getByRole = (history = [], role) => {
    const list = Array.isArray(history) ? history.slice() : [];
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (role === "Reporting Manager") return list.find((h) => isRMRole(h.role)) || {};
    if (role === "Department Head") return list.find((h) => isDHRole(h.role)) || {};
    return list.find((h) => h.role === role) || {};
  };

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

    const q = String(searchTerm || "").toUpperCase().trim();
    const name = String(leave.employeeName || "").toUpperCase();
    const empId = String(leave.employeeId || "").toUpperCase();
    const empUserId = String(leave.employeeUserId || "").toUpperCase();
    const matchesSearch = !q || name.includes(q) || empId.includes(q) || empUserId.includes(q);

    return monthMatch && statusMatch && departmentMatch && matchesSearch;
  });

  const paginatedLeaves = perPage === "all"
    ? filteredLeaves
    : filteredLeaves.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMonth, selectedStatus, selectedDepartment, perPage]);

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
          "Leave Type": String(getLeaveCode(leave.leaveType)),
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

  const updateLeaveDecision = async (leaveId, roleKey, status) => {
    try {
      const res = await axios.put(`/api/leave-application/${leaveId}/status`, {
        status,
        loggedInUserId,
        decisionRole: roleKey,
      });
      const updated = res.data?.leave;
      if (updated) {
        setLeaves((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
      } else {
        fetchLeaveHistory();
      }
      toast.success(`Status updated`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
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

          <div className="mb-2">
            <input
              type="text"
              placeholder="SEARCH NAME / EMP ID / USER ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(normalizeSearchInput(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm uppercase w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
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
            <select
              value={perPage}
              onChange={(e) => setPerPage(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            >
              <option value={8}>Show 8</option>
              <option value={15}>Show 15</option>
              <option value={20}>Show 20</option>
              <option value={50}>Show 50</option>
              <option value="all">Show All</option>
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
                  <th className="border px-2 py-1">User ID</th>
                  <th className="border px-2 py-1">Department</th>
                  <th className="border px-2 py-1">Apply Date</th>
                  <th className="border px-2 py-1">Leave Type</th>
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
                    <td colSpan="17" className="py-4">Loading...</td>
                  </tr>
                ) : paginatedLeaves.length > 0 ? (
                  paginatedLeaves.map((leave, index) => {
                    const rm = getByRole(leave.history, "Reporting Manager");
                    const dh = getByRole(leave.history, "Department Head");
                    const rmStatus = String(leave.reportingManagerApproval || rm.status || "PENDING").toUpperCase();
                    const dhStatus = String(leave.departmrntHeadApproval || dh.status || "PENDING").toUpperCase();
                    const finalStatus = getFinalStatus(leave);

                    return (
                      <tr key={leave._id} className="hover:bg-dorika-blueLight transition text-xs">
                        <td className="border px-2 py-1">
                          {perPage === "all" ? index + 1 : (currentPage - 1) * perPage + index + 1}
                        </td>
                        <td className="border px-2 py-1">{leave.employeeId}</td>
                        <td className="border px-2 py-1">{leave.employeeName}</td>
                        <td className="border px-2 py-1">{leave.employeeUserId || "-"}</td>
                        <td className="border px-2 py-1">{leave.departmentName || "-"}</td>
                        <td className="border px-2 py-1">{formatDate(leave.applicationDate)}</td>
                        <td className="border px-2 py-1">{getLeaveCode(leave.leaveType)}</td>
                        <td className="border px-2 py-1">{formatDate(leave.fromDate)}</td>
                        <td className="border px-2 py-1">{formatDate(leave.toDate)}</td>
                        <td className="border px-2 py-1">{leave.noOfDays}</td>
                        <td className="border px-2 py-1">{leave.reportingManager}</td>
                        <td className="border px-2 py-1">
                          <select
                            value={rmStatus}
                            onChange={(e) => updateLeaveDecision(leave._id, "RM", e.target.value)}
                            className={`border rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${getStatusClass(rmStatus)}`}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </td>
                        <td className="border px-2 py-1">{formatDateTime(rm.date)}</td>
                        <td className="border px-2 py-1">{leave.departmentHead}</td>
                        <td className="border px-2 py-1">
                          <select
                            value={dhStatus}
                            onChange={(e) => updateLeaveDecision(leave._id, "DH", e.target.value)}
                            className={`border rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${getStatusClass(dhStatus)}`}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </td>
                        <td className="border px-2 py-1">{formatDateTime(dh.date)}</td>
                        <td className="border px-2 py-1 font-semibold">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase ${getStatusClass(finalStatus)}`}>
                            {finalStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="17" className="py-4 text-gray-500">
                      No leave history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {perPage !== "all" && !loading && filteredLeaves.length > 0 && (
            <div className="pt-3">
              <Pagination
                total={filteredLeaves.length}
                perPage={perPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveHistory;
