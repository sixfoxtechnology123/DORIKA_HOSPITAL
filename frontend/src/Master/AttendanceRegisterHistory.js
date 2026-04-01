import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import Pagination from "./Pagination";

const pad = (n) => String(n).padStart(2, "0");

const toDDMMYYYY = (value) => {
  if (!value || value === "-") return "-";
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  const dmyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) return raw;
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  }
  return raw;
};

const toISODate = (value) => {
  if (!value || value === "-") return "";
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return "";
};

const getStatusClass = (status, isLateEntry) => {
  if (isLateEntry && String(status || "").toUpperCase() === "PRESENT") {
    return "bg-orange-100 text-orange-700";
  }
  const s = String(status || "").toUpperCase();
  if (s === "PRESENT") return "bg-green-100 text-green-700";
  if (s === "ABSENT") return "bg-red-100 text-red-700";
  if (s === "OFF" || s === "OFF(EXCH)") return "bg-gray-100 text-gray-700";
  if (s.startsWith("CL")) return "bg-blue-100 text-blue-700";
  if (s.startsWith("SL")) return "bg-purple-100 text-purple-700";
  return "bg-yellow-100 text-yellow-700";
};

const getDisplayStatus = (status, isLateEntry) =>
  isLateEntry ? "LATE ENTRY" : status;

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();
const normalizeEmployeeId = (value) => String(value || "").trim().toUpperCase();
const isExEmployeeId = (value) => normalizeEmployeeId(value).startsWith("EX-");
const getEmployeePrefix = (value) => {
  const normalized = normalizeEmployeeId(value);
  if (!normalized || isExEmployeeId(normalized)) return "";
  return normalized.split("-")[0] || "";
};

const AttendanceRegisterHistory = () => {
  const PER_PAGE_STORAGE_KEY = "attendanceRegisterHistory.perPage";
  const DATE_STORAGE_KEY = "attendanceRegisterHistory.selectedDate";
  const getStoredPerPage = () => {
    const raw = localStorage.getItem(PER_PAGE_STORAGE_KEY);
    if (!raw) return 20;
    if (raw === "all") return "all";
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 20;
  };
  const getStoredDate = () => {
    const raw = localStorage.getItem(DATE_STORAGE_KEY);
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const [selectedDate, setSelectedDate] = useState(getStoredDate);
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState(["ALL"]);
  const [designations, setDesignations] = useState(["ALL"]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedEmployeePrefix, setSelectedEmployeePrefix] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(getStoredPerPage);

  const normalizeSearchInput = (value) => {
    let v = String(value || "").toUpperCase();
    if (/^[A-Z]+\d/.test(v)) {
      v = v.replace(/^([A-Z]+)-?(\d.*)$/, "$1-$2");
    }
    return v;
  };

  useEffect(() => {
    const fetchBaseData = async () => {
      const [empRes, deptRes] = await Promise.all([
        axios.get("/api/employees"),
        axios.get("/api/departments"),
      ]);
      const empList = empRes.data || [];
      setEmployees(empList.filter((emp) => !isExEmployeeId(emp.employeeID)));
      setDepartments(["ALL", ...(deptRes.data || []).map((d) => d.deptName)]);
    };

    fetchBaseData();
  }, []);

  useEffect(() => {
    let scopedEmployees = employees;
    if (selectedDepartment !== "ALL") {
      scopedEmployees = employees.filter(
        (emp) => emp.departmentName === selectedDepartment
      );
    }
    const uniqueDesignations = [
      "ALL",
      ...new Set(scopedEmployees.map((emp) => emp.designationName).filter(Boolean)),
    ];
    setDesignations(uniqueDesignations);
  }, [employees, selectedDepartment]);

  const employeePrefixOptions = useMemo(() => {
    const prefixes = employees
      .map((emp) => getEmployeePrefix(emp.employeeID))
      .filter(Boolean);
    return ["ALL", ...new Set(prefixes)];
  }, [employees]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
        setRows([]);
        return;
      }
      const [yearStr, monthStr] = selectedDate.split("-");
      const month = Number(monthStr);
      const year = Number(yearStr);
      const res = await axios.get(
        `/api/attendance/history?month=${month}&year=${year}`
      );

      const employeeMap = {};
      employees.forEach((emp) => {
        if (emp.employeeUserId) employeeMap[emp.employeeUserId] = emp;
        if (emp.employeeID) employeeMap[emp.employeeID] = emp;
      });

      const flattened = [];
      (res.data || []).forEach((doc) => {
        const mappedEmployee =
          employeeMap[doc.employeeUserId] || employeeMap[doc.employeeId] || {};

        (doc.records || []).forEach((record) => {
          const resolvedEmployeeId = doc.employeeId || mappedEmployee.employeeID || "-";
          if (isExEmployeeId(resolvedEmployeeId)) return;

          flattened.push({
            rawDate: record.date || "-",
            rawDateISO: toISODate(record.date),
            date: toDDMMYYYY(record.date || "-"),
            employeeId: resolvedEmployeeId,
            employeeUserId:
              doc.employeeUserId || mappedEmployee.employeeUserId || "-",
            employeeName:
              doc.employeeName ||
              `${mappedEmployee.firstName || ""} ${mappedEmployee.lastName || ""}`.trim() ||
              "-",
            departmentName: mappedEmployee.departmentName || "-",
            designationName: mappedEmployee.designationName || "-",
            shiftCode: record.shiftCode || "-",
            shiftStartTime: record.shiftStartTime || "-",
            shiftEndTime: record.shiftEndTime || "-",
            checkInTime: record.checkInTime || "-",
            checkOutTime: record.checkOutTime || "-",
            workDuration: record.workDuration || "-",
            actualWorkDuration: record.actualWorkDuration || "-",
            status: record.status || "-",
            isLateEntry: !!(record.isLateEntry || (record.status === "Present" && record.isLate)),
            otHours: Number(record.otHours || 0),
          });
        });
      });

      flattened.sort((a, b) => {
        const dateDiff = new Date(b.rawDate) - new Date(a.rawDate);
        if (dateDiff !== 0) return dateDiff;
        return String(a.employeeName).localeCompare(String(b.employeeName));
      });

      setRows(flattened);
    };

    fetchAttendance();
  }, [selectedDate, employees]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedDepartment, selectedDesignation, selectedStatus, selectedEmployeePrefix, searchTerm, perPage]);

  useEffect(() => {
    localStorage.setItem(PER_PAGE_STORAGE_KEY, String(perPage));
  }, [perPage]);

  useEffect(() => {
    localStorage.setItem(DATE_STORAGE_KEY, selectedDate);
  }, [selectedDate]);

  const filteredRows = useMemo(() => {
    const q = String(searchTerm || "").toUpperCase().trim();
    return rows.filter((row) => {
      const dateMatch = row.rawDateISO === selectedDate;
      const departmentMatch =
        selectedDepartment === "ALL" || row.departmentName === selectedDepartment;
      const designationMatch =
        selectedDesignation === "ALL" || row.designationName === selectedDesignation;
      const prefixMatch =
        selectedEmployeePrefix === "ALL" ||
        getEmployeePrefix(row.employeeId) === selectedEmployeePrefix;
      const statusUpper = normalizeStatus(row.status);
      const statusMatch =
        selectedStatus === "ALL" ||
        (selectedStatus === "PRESENT" &&
          (statusUpper === "PRESENT" || statusUpper === "P" || statusUpper === "P(L)")) ||
        (selectedStatus === "ABSENT" && (statusUpper === "ABSENT" || statusUpper === "A")) ||
        (selectedStatus === "OFF" && (statusUpper === "OFF" || statusUpper === "OFF(EXCH)")) ||
        (selectedStatus === "CL" && statusUpper.startsWith("CL")) ||
        (selectedStatus === "SL" && statusUpper.startsWith("SL")) ||
        (selectedStatus === "LATEENTRY" && row.isLateEntry);

      if (!dateMatch || !departmentMatch || !designationMatch || !prefixMatch || !statusMatch) return false;
      if (!q) return true;

      const name = String(row.employeeName || "").toUpperCase();
      const userId = String(row.employeeUserId || "").toUpperCase();
      const employeeId = String(row.employeeId || "").toUpperCase();
      return (
        name.includes(q) || userId.includes(q) || employeeId.includes(q)
      );
    });
  }, [rows, selectedDate, selectedDepartment, selectedDesignation, selectedStatus, selectedEmployeePrefix, searchTerm]);

  const startIndex = perPage === "all" ? 0 : (currentPage - 1) * perPage;
  const paginatedRows =
    perPage === "all"
      ? filteredRows
      : filteredRows.slice(startIndex, startIndex + perPage);

  const handleExportExcel = () => {
    const exportData = filteredRows.map((row, index) => ({
      "SL": index + 1,
      "Date": row.date,
      "Employee ID": row.employeeId,
      "User ID": row.employeeUserId,
      "Name": row.employeeName,
      "Department": row.departmentName,
      "Designation": row.designationName,
      "Shift": row.shiftCode,
      "Shift Start": row.shiftStartTime,
      "Shift End": row.shiftEndTime,
      "Punch In": row.checkInTime,
      "Punch Out": row.checkOutTime,
      "Work Time": row.workDuration,
      "Actual Work": row.actualWorkDuration,
      "Status": getDisplayStatus(row.status, row.isLateEntry),
      "OT Hours": row.otHours,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Register");
    XLSX.writeFile(workbook, `Attendance_Register_${toDDMMYYYY(selectedDate)}.xlsx`);
  };

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3">
        <MobileHeaderToggle>
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">Attendance Register History</h2>
            <div className="flex gap-2">
              <BackButton />
            </div>
          </div>

          <div className="bg-dorika-blueLight p-3 rounded-lg shadow mb-3 border border-dorika-blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
            <div className="flex flex-col">
              <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-dorika-blue rounded px-3 py-1 bg-white text-sm focus:outline-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedDesignation("ALL");
                }}
                className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white"
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
                Designation
              </label>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white"
              >
                {designations.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
                Status
              </label>
              <select
                value={selectedEmployeePrefix}
                onChange={(e) => setSelectedEmployeePrefix(e.target.value)}
                className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white"
              >
                {employeePrefixOptions.map((prefix) => (
                  <option key={prefix} value={prefix}>
                    {prefix}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
                Attendance
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white"
              >
                <option value="ALL">ALL</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="OFF">OFF</option>
                <option value="CL">CL</option>
                <option value="SL">SL</option>
                <option value="LATEENTRY">Late Entry</option>
              </select>
            </div>

             <div className="flex flex-col">
              <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(normalizeSearchInput(e.target.value))}
                placeholder="SEARCH NAME / USER ID / EMP ID"
                className="border border-dorika-blue rounded px-3 py-1 text-sm uppercase focus:outline-none bg-white shadow-sm"
              />
            </div>
          </div>

            <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold text-sm"
            >
              Export Excel
            </button>
            <label className="font-semibold text-dorika-blue text-xs uppercase">Show</label>
            <select
              value={perPage}
              onChange={(e) => {
                const val = e.target.value;
                setPerPage(val === "all" ? "all" : parseInt(val, 10));
              }}
              className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white font-semibold text-dorika-blue"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">ALL</option>
            </select>
            </div>
          </div>
        </MobileHeaderToggle>

        <div className="w-full flex-1 min-h-0 overflow-auto bg-white rounded-lg shadow border border-dorika-blue">
          <table className="min-w-[1500px] w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-dorika-blue text-white sticky top-0 z-10">
              <tr>
                <th className="border border-dorika-blue px-1 py-1">SL</th>
                <th className="border border-dorika-blue px-1 py-1">Date</th>
                <th className="border border-dorika-blue px-1 py-1">Employee ID</th>
                <th className="border border-dorika-blue px-1 py-1">User ID</th>
                <th className="border border-dorika-blue px-1 py-1">Name</th>
                <th className="border border-dorika-blue px-1 py-1">Department</th>
                <th className="border border-dorika-blue px-1 py-1">Designation</th>
                <th className="border border-dorika-blue px-1 py-1">Shift</th>
                <th className="border border-dorika-blue px-1 py-1">Shift Start</th>
                <th className="border border-dorika-blue px-1 py-1">Shift End</th>
                <th className="border border-dorika-blue px-1 py-1">Punch In</th>
                <th className="border border-dorika-blue px-1 py-1">Punch Out</th>
                <th className="border border-dorika-blue px-1 py-1">Work Time</th>
                <th className="border border-dorika-blue px-1 py-1">Actual Work</th>
                <th className="border border-dorika-blue px-1 py-1">Status</th>
                <th className="border border-dorika-blue px-1 py-1">OT Hours</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => (
                  <tr
                    key={`${row.employeeUserId}-${row.date}-${idx}`}
                    className={idx % 2 === 0 ? "bg-dorika-blueLight/40" : "bg-white"}
                  >
                    <td className="border border-dorika-blue px-1 py-1 text-center">
                      {perPage === "all" ? idx + 1 : startIndex + idx + 1}
                    </td>
                    <td className="border border-dorika-blue px-1 py-1">{row.date}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.employeeId}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.employeeUserId}</td>
                    <td className="border border-dorika-blue px-1 py-1 uppercase">{row.employeeName}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.departmentName}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.designationName}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.shiftCode}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.shiftStartTime}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.shiftEndTime}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.checkInTime}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.checkOutTime}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.workDuration}</td>
                    <td className="border border-dorika-blue px-1 py-1">{row.actualWorkDuration}</td>
                    <td className="border border-dorika-blue px-1 py-1">
                      <span className={`px-1 py-1 rounded text-xs font-bold uppercase ${getStatusClass(row.status, row.isLateEntry)}`}>
                        {getDisplayStatus(row.status, row.isLateEntry)}
                      </span>
                    </td>
                    <td className="border border-dorika-blue px-1 py-1 text-right">{row.otHours}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="16" className="text-center py-6 text-gray-500 font-semibold">
                    No attendance register data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {perPage !== "all" && (
          <Pagination
            total={filteredRows.length}
            perPage={perPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default AttendanceRegisterHistory;
