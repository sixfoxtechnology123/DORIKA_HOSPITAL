import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Sidebar from '../component/Sidebar';
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import Pagination from "./Pagination";
import toast from "react-hot-toast";

const normalizeEmployeeId = (value) => String(value || "").trim().toUpperCase();
const isExEmployeeId = (value) => normalizeEmployeeId(value).startsWith("EX-");
const getEmployeePrefix = (value) => {
  const normalized = normalizeEmployeeId(value);
  if (!normalized || isExEmployeeId(normalized)) return "";
  return normalized.split("-")[0] || "";
};

const ShiftManagement = () => {
  const PER_PAGE_STORAGE_KEY = "shiftManagement.perPage";
  const getStoredPerPage = () => {
    const raw = localStorage.getItem(PER_PAGE_STORAGE_KEY);
    if (!raw) return 20;
    if (raw === "all") return "all";
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 20;
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const tableContainerRef = React.useRef(null); 
  const [shiftOptions, setShiftOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [shifts, setShifts] = useState({});
  const [lockedDaysByUserId, setLockedDaysByUserId] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(getStoredPerPage);
  const [departments, setDepartments] = useState([]); // To store all departments
  const [selectedDepartment, setSelectedDepartment] = useState("ALL"); // Current selection
  const [selectedEmployeePrefix, setSelectedEmployeePrefix] = useState("ALL");
  const [deptWiseDesignations, setDeptWiseDesignations] = useState([]); // Raw data for filtering
  const [isDepartmentHeadScoped, setIsDepartmentHeadScoped] = useState(false);
  const [scopedDepartment, setScopedDepartment] = useState("");
  const [scopedDesignations, setScopedDesignations] = useState([]);

  const normalizeCode = (value) => String(value || "").trim().toUpperCase();
  const normalizeSearchInput = (value) => {
    let v = String(value || "").toUpperCase();
    if (/^[A-Z]+\d/.test(v)) {
      v = v.replace(/^([A-Z]+)-?(\d.*)$/, "$1-$2");
    }
    return v;
  };

  const parseDDCodes = (value) => {
    const code = normalizeCode(value);
    if (!code.startsWith("DD:")) return ["", ""];
    const payload = code.slice(3);

    if (payload.includes("+")) {
      const [first = "", second = ""] = payload.split("+");
      return [first, second || first];
    }

    // Legacy payload support: DD:MN
    if (payload.length === 2) return [payload[0], payload[1]];
    return [payload, payload];
  };

  const encodeDDCode = (first, second) =>
    `DD:${normalizeCode(first)}+${normalizeCode(second || first)}`;

useEffect(() => {
  localStorage.setItem(PER_PAGE_STORAGE_KEY, String(perPage));
}, [perPage]);

useEffect(() => {
  const loadDepartmentHeadScope = async () => {
    try {
      const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
      const possibleIds = [adminData?.employeeUserId, adminData?.userId]
        .filter(Boolean)
        .map((v) => String(v).trim());

      if (possibleIds.length === 0) return;

      const res = await axios.get("/api/department-heads");
      const records = Array.isArray(res.data) ? res.data : [];
      const matched = records.find((r) => possibleIds.includes(String(r.employeeUserId || "").trim()));
      if (!matched) return;

      const namesFromNew = Array.isArray(matched.designationData)
        ? matched.designationData.map((d) => d?.name).filter(Boolean)
        : [];
      const namesFromOld = Array.isArray(matched.designationArray) ? matched.designationArray : [];
      const uniqueDesignationNames = [...new Set([...namesFromNew, ...namesFromOld])];

      setIsDepartmentHeadScoped(true);
      setScopedDepartment(matched.departmentName || "");
      setScopedDesignations(uniqueDesignationNames);
      setSelectedDepartment(matched.departmentName || "ALL");
      setSelectedDesignation("ALL");
    } catch (err) {
      // Keep default unrestricted flow if scope fetch fails
    }
  };

  loadDepartmentHeadScope();
}, []);

useEffect(() => {
  const fetchShiftOptions = async () => {
    try {
      const res = await axios.get("/api/shifts"); // fetch all shifts
     const options = res.data
      .filter(s => s.status === "Active")
      .map(s => ({
       code: normalizeCode(s.shiftCode), // M, N, G4...
        name: s.shiftName,                         // MORNING
        start: s.startTime,                        // 02.36 AM
        end: s.endTime                             // 06.40 AM
      }));

    setShiftOptions([
    ...options,
    { code: "OFF", name: "OFF" },
    { code: "OFF(EXCH)", name: "OFF(EXCH)" },
    { code: "DD", name: "Double Duty" }
  ]);


    } catch (err) {
      toast.error("Failed to fetch shift options:", err);
    }
  };

  fetchShiftOptions();
}, []);



  useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/employees");
      setEmployees(res.data); // store all employees
    } catch (err) {
      toast.error("Failed to fetch employees:", err);
    }
  };

  fetchEmployees();
}, []);


/* ================= FETCH DEPARTMENTS & DESIGNATIONS ================= */
useEffect(() => {
  const fetchDeptData = async () => {
    try {
      // Assuming you have an endpoint that returns departments or designations with dept info
      const res = await axios.get("/api/designations");
      
      // 1. Store the raw data for filtering logic
      setDeptWiseDesignations(res.data);

      // 2. Extract unique department names
      const uniqueDepts = ["ALL", ...new Set(res.data.map(d => d.departmentName))];
      setDepartments(uniqueDepts);

      // 3. Initialize designations list
      setDesignations(["ALL", ...res.data.map((d) => d.designationName)]);
    } catch (err) {
      toast.error("Dept/Designation fetch error:", err);
    }
  };
  fetchDeptData();
}, []);

/* ================= FILTER DESIGNATIONS BY DEPT ================= */
const displayDesignations = useMemo(() => {
  if (isDepartmentHeadScoped) {
    if (scopedDesignations.length > 0) {
      return ["ALL", ...scopedDesignations];
    }
    const scopedFallback = deptWiseDesignations
      .filter(d => d.departmentName === scopedDepartment)
      .map(d => d.designationName);
    return ["ALL", ...scopedFallback];
  }
  if (selectedDepartment === "ALL") {
    return ["ALL", ...deptWiseDesignations.map(d => d.designationName)];
  }
  // Filter the designations that belong to the selected department
  const filtered = deptWiseDesignations
    .filter(d => d.departmentName === selectedDepartment)
    .map(d => d.designationName);
    
  return ["ALL", ...filtered];
}, [selectedDepartment, deptWiseDesignations, isDepartmentHeadScoped, scopedDepartment, scopedDesignations]);

const visibleDepartments = useMemo(() => {
  if (isDepartmentHeadScoped && scopedDepartment) return [scopedDepartment];
  return departments;
}, [departments, isDepartmentHeadScoped, scopedDepartment]);

const employeePrefixOptions = useMemo(() => {
  const prefixes = employees
    .map((emp) => getEmployeePrefix(emp.employeeID))
    .filter(Boolean);
  return ["ALL", ...new Set(prefixes)];
}, [employees]);

  const nonDDShiftOptions = useMemo(
  () =>
    shiftOptions.filter(
      (o) =>
        normalizeCode(o.code) !== "OFF" &&
        normalizeCode(o.code) !== "OFF(EXCH)" &&
        normalizeCode(o.code) !== "DD"
    ),
  [shiftOptions]
);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        if (shiftOptions.length === 0) return;
        const formatMonth = (ym) => {
          const [y, m] = ym.split("-");
          return new Date(y, m - 1).toLocaleString("en-US", { month: "short" }) + "-" + y;
        };
  
        const res = await axios.get(
          `/api/shift-management/${formatMonth(selectedMonth)}`
        );

        const formatted = {};
        const lockedMap = {};
        const validCodes = new Set(shiftOptions.map((opt) => normalizeCode(opt.code)));
        res.data.forEach((item) => {
          const processedShifts = {};
          Object.entries(item.shifts || {}).forEach(([day, rawCode]) => {
            const code = normalizeCode(rawCode);
            if (!code) return;

            if (code.startsWith("DD:")) {
              const [first, second] = parseDDCodes(code);
              processedShifts[day] = encodeDDCode(first, second);
            } else if (validCodes.has(code) || code === "OFF") {
              processedShifts[day] = code;
            } else if (code.length === 2) {
              // Legacy DD payload fallback: "MN" (no prefix in DB)
              processedShifts[day] = encodeDDCode(code[0], code[1]);
            } else {
              processedShifts[day] = code;
            }
          });
          formatted[item.employeeUserId] = processedShifts;
          lockedMap[item.employeeUserId] = Array.isArray(item.lockedDays) ? item.lockedDays : [];
        });
  
        setShifts(formatted);
        setLockedDaysByUserId(lockedMap);
      } catch (err) {
        toast.error("Shift fetch error:", err);
        setShifts({});
        setLockedDaysByUserId({});
      }
    };
    fetchShifts();
  }, [selectedMonth, shiftOptions]);


  /* ================= DAYS IN MONTH ================= */
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [selectedMonth]);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthMeta = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return { year, month };
  }, [selectedMonth]);
  const expiredDaysSet = useMemo(() => {
    if (!monthMeta.year || !monthMeta.month) return new Set();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (monthMeta.year < currentYear || (monthMeta.year === currentYear && monthMeta.month < currentMonth)) {
      const totalDays = new Date(monthMeta.year, monthMeta.month, 0).getDate();
      return new Set(Array.from({ length: totalDays }, (_, index) => index + 1));
    }

    if (monthMeta.year === currentYear && monthMeta.month === currentMonth) {
      return new Set(Array.from({ length: Math.max(0, now.getDate() - 1) }, (_, index) => index + 1));
    }

    return new Set();
  }, [monthMeta]);
  const getDayLabel = (day) => {
    if (!monthMeta.year || !monthMeta.month) return "";
    const idx = new Date(monthMeta.year, monthMeta.month - 1, day).getDay();
    return dayLabels[idx] || "";
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedDepartment, selectedDesignation, selectedEmployeePrefix, searchTerm, perPage]);

    const filteredEmployees = useMemo(() => {
      return employees.filter((emp) => {
        const employeeId = normalizeEmployeeId(emp.employeeID);
        if (isExEmployeeId(employeeId)) return false;

        const scopedDeptMatch =
          !isDepartmentHeadScoped || emp.departmentName === scopedDepartment;
      const scopedDesignationMatch =
          !isDepartmentHeadScoped ||
          scopedDesignations.length === 0 ||
          scopedDesignations.includes(emp.designationName);

        const deptMatch =
          selectedDepartment === "ALL" ||
          emp.departmentName === selectedDepartment;

        const designationMatch =
          selectedDesignation === "ALL" ||
          emp.designationName === selectedDesignation;
        const prefixMatch =
          selectedEmployeePrefix === "ALL" ||
          getEmployeePrefix(employeeId) === selectedEmployeePrefix;

        const q = String(searchTerm || "").toUpperCase().trim();
        if (!q) {
          return (
            scopedDeptMatch &&
            scopedDesignationMatch &&
            deptMatch &&
            designationMatch &&
            prefixMatch
          );
        }

        const fullName = `${emp.firstName || ""} ${emp.middleName || ""} ${emp.lastName || ""}`
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
        const searchEmployeeId = String(emp.employeeID || "").toUpperCase();
        const employeeUserId = String(emp.employeeUserId || "").toUpperCase();
        const searchMatch =
          fullName.includes(q) || searchEmployeeId.includes(q) || employeeUserId.includes(q);

        return (
          scopedDeptMatch &&
          scopedDesignationMatch &&
          deptMatch &&
          designationMatch &&
          prefixMatch &&
          searchMatch
        );
      });
    }, [
      employees,
      isDepartmentHeadScoped,
      scopedDepartment,
      scopedDesignations,
      selectedDepartment,
      selectedDesignation,
      selectedEmployeePrefix,
      searchTerm,
    ]);

       const handleShiftChange = (emp, day, value, isSecondHalf = null) => {
        if (expiredDaysSet.has(day) || (lockedDaysByUserId?.[emp.employeeUserId] || []).includes(day)) return;
        setShifts((prev) => {
          const empShifts = { ...(prev[emp.employeeUserId] || {}) };
          const currentVal = normalizeCode(empShifts[day] || "");
          const normalizedValue = normalizeCode(value);
          if (normalizedValue === "DD") {
            // Initialize DD
            const def = normalizeCode(nonDDShiftOptions[0]?.code || "M");
            empShifts[day] = encodeDDCode(def, def);
          } else if (isSecondHalf !== null && currentVal.startsWith("DD:")) {
            // Update specific sub-boxes
            const [first, second] = parseDDCodes(currentVal);
            if (isSecondHalf) {
              empShifts[day] = encodeDDCode(first, normalizedValue);
            } else {
              empShifts[day] = encodeDDCode(normalizedValue, second || normalizedValue);
            }
          } else {
            // NORMAL SHIFT SELECTION: This resets the DD state
            empShifts[day] = normalizedValue;
          }

          return { ...prev, [emp.employeeUserId]: empShifts };
        });
      };
       // Find and update these lines
      const startIndex = perPage === "all" ? 0 : (currentPage - 1) * perPage;
      const paginatedEmployees = useMemo(
        () =>
          perPage === "all"
            ? filteredEmployees
            : filteredEmployees.slice(startIndex, startIndex + perPage),
        [filteredEmployees, perPage, startIndex]
      );
      const selectedEmployeeSet = useMemo(
        () => new Set(selectedEmployees),
        [selectedEmployees]
      );

const handleSubmit = async () => {
  try {
    const formatMonth = (ym) => {
      const [y, m] = ym.split("-");
      return new Date(y, m - 1).toLocaleString("en-US", { month: "short" }) + "-" + y;
    };

const dataToSave = filteredEmployees
  .map(emp => {
    // CHANGE: Use employeeUserId
    const empShifts = shifts[emp.employeeUserId] || {}; 
    
    const nonEmptyShifts = Object.fromEntries(
      Object.entries(empShifts).map(([day, val]) => [
        day,
        normalizeCode(val)
      ]).filter(([_, shift]) => shift)
    );
    
    if (Object.keys(nonEmptyShifts).length === 0) return null;
    
    return {
      employeeID: emp.employeeID,
      employeeUserId: emp.employeeUserId, // Keep this
      employeeName: `${emp.firstName} ${emp.middleName} ${emp.lastName}`,
      designation: emp.designationName,
      department: emp.departmentName,
      shifts: nonEmptyShifts,
    };
  })
  .filter(Boolean);

    if (dataToSave.length === 0) {
      toast.error("No shifts to save ❌");
      return;
    }

    await axios.post("/api/shift-management/save-bulk", {
      month: formatMonth(selectedMonth), 
      data: dataToSave,
    });

    toast.success("Shift saved successfully ✅");
  } catch {
    toast.error("Failed to save shifts ❌");
  }
};
const EMP_COLORS = [
  "bg-dorika-blueLight",
  "bg-dorika-green/20",
  "bg-dorika-orange/20",
];

const getRowColor = (index) => EMP_COLORS[index % EMP_COLORS.length];

const getShiftColor = (shift, rowIndex) => {
  if (shift === "OFF" || shift === "OFF(EXCH)") return "bg-red-200 text-red-800"; 
  return getRowColor(rowIndex);
};

const handleExportExcel = () => {
  const exportRows =
    selectedEmployees.length > 0
      ? filteredEmployees.filter(emp =>
          selectedEmployees.includes(emp.employeeID)
        )
      : filteredEmployees;

  const exportData = exportRows.map((emp, index) => {
    const empShifts = shifts[emp.employeeUserId] || {};
    const row = {
      "SL No": index + 1,
      "Emp ID": emp.employeeID || "-",
      "User ID": emp.employeeUserId || "-",
      "Employee Name": `${emp.firstName || ""} ${emp.middleName || ""} ${emp.lastName || ""}`
        .replace(/\s+/g, " ")
        .trim(),
      "Department": emp.departmentName || "-",
      "Designation": emp.designationName || "-",
    };

    daysInMonth.forEach((day) => {
      const value = String(empShifts[day] || "").trim();
      row[`Day ${day}`] = value.startsWith("DD:") ? value.slice(3) : value || "-";
    });

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Shift Report");
  XLSX.writeFile(workbook, `Shift_Report_${selectedMonth}.xlsx`);
  toast.success("Excel exported successfully");
};

const scrollTable = (direction) => {
  if (tableContainerRef.current) {
    const scrollAmount = 400; // Move 400 pixels per click
    tableContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }
};

  return (
  <div className="flex h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3">
    <div className="flex-1 flex flex-col min-h-0">
      <MobileHeaderToggle>
      <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
        <h2 className="text-xl font-bold text-dorika-blue">Shift Management</h2>
        <div className="flex gap-2">
          <BackButton />
        </div>
      </div>
  
      {/* ================= TOP SECTION ================= */}
<div className="bg-dorika-blueLight p-3 rounded-lg shadow mb-3 border border-dorika-blue">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 items-end">
    <div className="flex flex-col">
      <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
        Month
      </label>
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
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
        disabled={isDepartmentHeadScoped}
        className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white"
      >
        {visibleDepartments.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
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
        disabled={isDepartmentHeadScoped}
        className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white"
      >
        {displayDesignations.map((des) => (
          <option key={des} value={des}>
            {des}
          </option>
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
        Show
      </label>
      <select
        value={perPage}
        onChange={(e) => {
          const val = e.target.value;
          setPerPage(val === "all" ? "all" : parseInt(val, 10));
          setCurrentPage(1);
        }}
        className="border border-dorika-blue rounded px-3 py-1 text-sm bg-white font-semibold text-dorika-blue"
      >
        <option value={8}>8</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={300}>300</option>
        <option value={400}>400</option>
        <option value="all">ALL</option>
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

    <div className="flex flex-col">
      <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
        Export
      </label>
      <button
        type="button"
        onClick={handleExportExcel}
        className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold text-sm whitespace-nowrap w-full"
      >
        Export Excel
      </button>
    </div>

    <div className="flex flex-col">
      <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
        Submit
      </label>
      <button
        onClick={handleSubmit}
        className="bg-dorika-blue hover:bg-dorika-orange text-white px-4 py-1 rounded font-semibold whitespace-nowrap w-full"
      >
        Submit
      </button>
    </div>
  </div>
</div>
      </MobileHeaderToggle>
<div className="relative group flex-1 flex flex-col min-h-0"> 
  
{/* Left Fixed Gray Arrow */}
<button 
  type="button"
  onClick={() => scrollTable('left')}
  className="fixed left-[280px] top-1/2 -translate-y-1/2 z-50  text-green-500 p-4 rounded-full  transition-all active:scale-90 hidden md:block"
  style={{ marginLeft: '10px' }} // Ensures it doesn't touch the sidebar
>
  <span className="text-3xl font-bold">❮</span>
</button>

{/* Right Fixed Gray Arrow */}
<button 
  type="button"
  onClick={() => scrollTable('right')}
  className="fixed right-6 top-1/2 -translate-y-1/2 z-50  text-green-500 p-4 rounded-full  transition-all active:scale-90 hidden md:block"
>
  <span className="text-3xl font-bold">❯</span>
</button>

  {/* The Scrollable Box - NOW WRAPS THE TABLE CORRECTLY */}
  <div 
    ref={tableContainerRef} 
    className="w-full flex-1 min-h-0 overflow-auto bg-white rounded-lg shadow border scroll-smooth"
  >
      
        <table className="border-collapse border-dorika-blue w-full text-xs">
          <thead className="bg-dorika-blue text-white sticky top-0">
            <tr>
              <th className="border px-2 py-1 border-dorika-blue text-center">
              <input
                type="checkbox"
                checked={
                  filteredEmployees.length > 0 &&
                  selectedEmployees.length === filteredEmployees.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    //  SELECT ALL EMPLOYEES FROM ALL PAGES
                    setSelectedEmployees(
                      filteredEmployees.map(emp => emp.employeeID)
                    );
                  } else {
                    setSelectedEmployees([]);
                  }
                }}
              />
            </th>
              <th className="border px-2 py-1 border-dorika-blue">SL No</th>
              <th className="border px-2 py-1 border-dorika-blue">Emp ID</th>
              <th className="border px-2 py-1 border-dorika-blue">User ID</th>
              <th className="border px-2 py-1 border-dorika-blue">Employee Name</th>
              <th className="border px-2 py-1 border-dorika-blue">Department</th>
              <th className="border px-2 py-1 border-dorika-blue">Designation</th>
              {daysInMonth.map((day) => (
                <th key={day} className="border px-2 py-1 border-dorika-blue text-center">
                  <div className="flex flex-col items-center leading-tight">
                    <span>{day}</span>
                    <span className="text-[10px] font-semibold text-blue-100">
                      {getDayLabel(day)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
        
                {paginatedEmployees.map((emp, index) => (
                  <tr key={emp.employeeUserId} className={`${getRowColor(index)} transition`}>
                     <td className="border px-2 py-1 border-dorika-blue text-center">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeSet.has(emp.employeeID)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees(prev => [...prev, emp.employeeID]);
                        } else {
                          setSelectedEmployees(prev =>
                            prev.filter(id => id !== emp.employeeID)
                          );
                        }
                      }}
                    />
                  </td>
                <td className="border px-2 py-1 border-dorika-blue"> {perPage === "all" ? index + 1 : startIndex + index + 1}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium uppercase">{emp.employeeID}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium uppercase">{emp.employeeUserId}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium uppercase">{emp.firstName} {emp.middleName} {emp.lastName}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium uppercase">{emp.departmentName}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium uppercase">{emp.designationName}</td>
                {daysInMonth.map((day) => {
                const currentShift = shifts?.[emp.employeeUserId]?.[day] || "";
                const isDD = currentShift.startsWith("DD:");
                const ddParts = isDD ? parseDDCodes(currentShift) : ["", ""];
                const isLocked =
                  expiredDaysSet.has(day) ||
                  (lockedDaysByUserId?.[emp.employeeUserId] || []).includes(day);

                return (
                  <td
                    key={day}
                    // Added min-width and horizontal padding
                    className={`border border-dorika-blue px-0.5 md:px-1 py-2 text-center min-w-[45px] md:min-w-[60px] ${getShiftColor(isDD ? "DD" : currentShift, index)}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                    <select
                        value={isDD ? "DD" : currentShift}
                        onChange={(e) => handleShiftChange(emp, day, e.target.value)}
                        disabled={isLocked}
                       className={`bg-transparent border rounded px-0 md:px-1 py-0.5 text-[10px] md:text-xs font-semibold w-full ${isLocked ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                        title={isLocked ? "Attendance already exists for this date. Shift cannot be changed." : ""}
                      >
                        <option value="">-</option>
                        {shiftOptions.map((opt) => (
                          <option 
                            key={opt.code} 
                            value={opt.code}
                            // ADD THIS TITLE TAG HERE
                            title={opt.name && opt.start ? `${opt.name}: ${opt.start} - ${opt.end}` : opt.name}
                          >
                            {opt.code}
                          </option>
                        ))}
                      </select>

                      {isDD && (
                        <div className="flex items-center gap-1 border-t pt-1 border-dorika-blue w-full justify-center">
                          {/* First DD Box */}
                          <select
                            value={ddParts[0]}
                            onChange={(e) => handleShiftChange(emp, day, e.target.value, false)}
                            disabled={isLocked}
                            className={`bg-white border rounded text-[10px] w-10 px-0.5 font-bold ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            {nonDDShiftOptions.map(opt => (
                              <option 
                                key={opt.code} 
                                value={opt.code} 
                                title={`${opt.name}: ${opt.start} - ${opt.end}`} // ADDED
                              >
                                {opt.code}
                              </option>
                            ))}
                          </select>

                          <span className="text-[10px] font-bold">+</span>

                          {/* Second DD Box */}
                          <select
                            value={ddParts[1]}
                            onChange={(e) => handleShiftChange(emp, day, e.target.value, true)}
                            disabled={isLocked}
                            className={`bg-white border rounded text-[10px] w-10 px-0.5 font-bold ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            {nonDDShiftOptions.map(opt => (
                              <option 
                                key={opt.code} 
                                value={opt.code} 
                                title={`${opt.name}: ${opt.start} - ${opt.end}`} // ADDED
                              >
                                {opt.code}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      {/* Wrap your Pagination tag like this: */}
      {perPage !== "all" && (
        <Pagination
          total={filteredEmployees.length}
          perPage={perPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
      </div>
    </div>
    </div>
    </div>
 
  );
};

export default ShiftManagement;

