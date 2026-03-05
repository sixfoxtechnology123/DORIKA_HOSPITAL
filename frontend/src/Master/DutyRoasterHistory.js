import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import Pagination from "./Pagination";

const pad = (n) => String(n).padStart(2, "0");

const toDDMMYYYY = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  }
  return raw;
};

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

const parseDDCodes = (value) => {
  const code = normalizeCode(value);
  if (code.startsWith("DD:")) {
    const payload = code.slice(3);
    if (payload.includes("+")) {
      const [first = "", second = ""] = payload.split("+");
      return [normalizeCode(first), normalizeCode(second || first)];
    }
    if (payload.length === 2) return [payload[0], payload[1]];
    return [normalizeCode(payload), normalizeCode(payload)];
  }
  // Legacy DD support only for 2-letter codes (e.g. "MN"), not alphanumeric codes like "G3"
  if (/^[A-Z]{2}$/.test(code) && !["OFF", "DD"].includes(code)) {
    return [code[0], code[1]];
  }
  return null;
};

const DutyRoasterHistory = () => {
  const PER_PAGE_STORAGE_KEY = "dutyRoasterHistory.perPage";
  const DATE_STORAGE_KEY = "dutyRoasterHistory.selectedDate";
  const SHIFT_STORAGE_KEY = "dutyRoasterHistory.selectedShift";

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
  const getStoredShift = () => localStorage.getItem(SHIFT_STORAGE_KEY) || "ALL";

  const [selectedDate, setSelectedDate] = useState(getStoredDate);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState(["ALL"]);
  const [designations, setDesignations] = useState(["ALL"]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [selectedShift, setSelectedShift] = useState(getStoredShift);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(getStoredPerPage);
  const [rows, setRows] = useState([]);
  const [shiftMap, setShiftMap] = useState({});

  const normalizeSearchInput = (value) => {
    let v = String(value || "").toUpperCase();
    if (/^[A-Z]+\d/.test(v)) {
      v = v.replace(/^([A-Z]+)-?(\d.*)$/, "$1-$2");
    }
    return v;
  };

  useEffect(() => {
    const fetchBaseData = async () => {
      const [empRes, deptRes, shiftRes] = await Promise.all([
        axios.get("/api/employees"),
        axios.get("/api/departments"),
        axios.get("/api/shifts"),
      ]);

      const empList = empRes.data || [];
      setEmployees(empList);
      setDepartments(["ALL", ...(deptRes.data || []).map((d) => d.deptName)]);

      const codeMap = {};
      (shiftRes.data || []).forEach((s) => {
        const code = normalizeCode(s.shiftCode);
        if (!code) return;
        codeMap[code] = {
          code,
          shiftName: s.shiftName || "-",
          startTime: s.startTime || "-",
          endTime: s.endTime || "-",
        };
      });
      setShiftMap(codeMap);
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
    setDesignations([
      "ALL",
      ...new Set(scopedEmployees.map((emp) => emp.designationName).filter(Boolean)),
    ]);
  }, [employees, selectedDepartment]);

  useEffect(() => {
    const fetchDutyRows = async () => {
      if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
        setRows([]);
        return;
      }

      const dateObj = new Date(selectedDate);
      const monthStr = dateObj.toLocaleString("en-US", { month: "short" });
      const year = dateObj.getFullYear();
      const day = dateObj.getDate();
      const roasterMonth = `${monthStr}-${year}`;

      const res = await axios.get(`/api/shift-management/${roasterMonth}`);
      const rosterMap = {};
      (res.data || []).forEach((doc) => {
        rosterMap[doc.employeeUserId] = doc;
      });

      const computedRows = (employees || []).map((emp) => {
        const doc = rosterMap[emp.employeeUserId];
        const rawShiftCode = normalizeCode(
          (doc && doc.shifts && (doc.shifts[day] || doc.shifts[String(day)])) || "-"
        );

        let shiftCode = rawShiftCode || "-";
        let shiftName = "-";
        let startTime = "-";
        let endTime = "-";

        if (shiftCode === "OFF") {
          shiftName = "OFF";
        } else {
          const ddParts = parseDDCodes(shiftCode);
          if (ddParts) {
            const [firstCode, secondCode] = ddParts;
            const first = shiftMap[firstCode];
            const second = shiftMap[secondCode];
            if (first || second) {
              const n1 = first?.shiftName || firstCode || "-";
              const n2 = second?.shiftName || secondCode || n1;
              shiftName = `${n1} + ${n2}`;
              startTime = first?.startTime || "-";
              endTime = second?.endTime || first?.endTime || "-";
              shiftCode = `DD:${firstCode}+${secondCode || firstCode}`;
            }
          } else if (shiftMap[shiftCode]) {
            shiftName = shiftMap[shiftCode].shiftName || "-";
            startTime = shiftMap[shiftCode].startTime || "-";
            endTime = shiftMap[shiftCode].endTime || "-";
          }
        }

        return {
          date: toDDMMYYYY(selectedDate),
          employeeId: emp.employeeID || "-",
          employeeUserId: emp.employeeUserId || "-",
          employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "-",
          departmentName: emp.departmentName || "-",
          designationName: emp.designationName || "-",
          shiftCode,
          shiftName,
          shiftStartTime: startTime,
          shiftEndTime: endTime,
        };
      });

      setRows(computedRows);
    };

    fetchDutyRows();
  }, [selectedDate, employees, shiftMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedDepartment, selectedDesignation, selectedShift, searchTerm, perPage]);

  useEffect(() => {
    localStorage.setItem(PER_PAGE_STORAGE_KEY, String(perPage));
  }, [perPage]);

  useEffect(() => {
    localStorage.setItem(DATE_STORAGE_KEY, selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem(SHIFT_STORAGE_KEY, selectedShift);
  }, [selectedShift]);

  const shiftOptions = useMemo(() => {
    const codes = Object.keys(shiftMap)
      .filter((c) => c && c !== "OFF")
      .sort();
    return ["ALL", "OFF", "DD", "---", ...codes];
  }, [shiftMap]);

  const filteredRows = useMemo(() => {
    const q = String(searchTerm || "").toUpperCase().trim();
    const selectedShiftCode = normalizeCode(selectedShift);
    return rows.filter((row) => {
      const rowShiftCode = normalizeCode(row.shiftCode);
      const departmentMatch =
        selectedDepartment === "ALL" || row.departmentName === selectedDepartment;
      const designationMatch =
        selectedDesignation === "ALL" || row.designationName === selectedDesignation;
      const shiftMatch =
        selectedShiftCode === "ALL"
          ? true
          : selectedShiftCode === "OFF"
          ? rowShiftCode === "OFF"
          : selectedShiftCode === "DD"
          ? rowShiftCode.startsWith("DD:")
          : selectedShiftCode === "---"
          ? !rowShiftCode || rowShiftCode === "-"
          : rowShiftCode === selectedShiftCode ||
            (rowShiftCode.startsWith("DD:") &&
              parseDDCodes(rowShiftCode)?.includes(selectedShiftCode));
      if (!departmentMatch || !designationMatch || !shiftMatch) return false;
      if (!q) return true;
      const name = String(row.employeeName || "").toUpperCase();
      const userId = String(row.employeeUserId || "").toUpperCase();
      const employeeId = String(row.employeeId || "").toUpperCase();
      return name.includes(q) || userId.includes(q) || employeeId.includes(q);
    });
  }, [rows, selectedDepartment, selectedDesignation, selectedShift, searchTerm]);

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
      "Shift Code": row.shiftCode,
      "Shift Name": row.shiftName,
      "Start Time": row.shiftStartTime,
      "End Time": row.shiftEndTime,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Duty Roaster History");
    XLSX.writeFile(workbook, `Duty_Roaster_History_${toDDMMYYYY(selectedDate)}.xlsx`);
  };

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3">
        <MobileHeaderToggle>
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">Duty Roaster History</h2>
            <div className="flex gap-2">
              <BackButton />
            </div>
          </div>

          <div className="bg-dorika-blueLight p-2 rounded-lg shadow mb-3 border border-dorika-blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
                Shift
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(normalizeCode(e.target.value) || "ALL")}
                className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white"
              >
                {shiftOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col lg:col-span-2">
              <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(normalizeSearchInput(e.target.value))}
                placeholder="SEARCH NAME / USER ID / EMP ID"
                className="border border-dorika-blue rounded px-3 py-1 text-sm uppercase focus:outline-none"
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
          <table className="min-w-[1200px] w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-dorika-blue text-white sticky top-0 z-10">
              <tr>
                <th className="border border-dorika-blue px-2 py-1">SL</th>
                <th className="border border-dorika-blue px-2 py-1">Date</th>
                <th className="border border-dorika-blue px-2 py-1">Employee ID</th>
                <th className="border border-dorika-blue px-2 py-1">User ID</th>
                <th className="border border-dorika-blue px-2 py-1">Name</th>
                <th className="border border-dorika-blue px-2 py-1">Department</th>
                <th className="border border-dorika-blue px-2 py-1">Designation</th>
                <th className="border border-dorika-blue px-2 py-1">Shift Code</th>
                <th className="border border-dorika-blue px-2 py-1">Shift Name</th>
                <th className="border border-dorika-blue px-2 py-1">Start Time</th>
                <th className="border border-dorika-blue px-2 py-1">End Time</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => (
                  <tr
                    key={`${row.employeeUserId}-${idx}`}
                    className={idx % 2 === 0 ? "bg-dorika-blueLight/40" : "bg-white"}
                  >
                    <td className="border border-dorika-blue px-2 py-1 text-center">
                      {perPage === "all" ? idx + 1 : startIndex + idx + 1}
                    </td>
                    <td className="border border-dorika-blue px-2 py-1">{row.date}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.employeeId}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.employeeUserId}</td>
                    <td className="border border-dorika-blue px-2 py-1 uppercase">{row.employeeName}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.departmentName}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.designationName}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.shiftCode}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.shiftName}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.shiftStartTime}</td>
                    <td className="border border-dorika-blue px-2 py-1">{row.shiftEndTime}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-6 text-gray-500 font-semibold">
                    No duty roaster history data found.
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

export default DutyRoasterHistory;
