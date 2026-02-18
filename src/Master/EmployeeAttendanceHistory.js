import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import Pagination from "./Pagination";
import toast from "react-hot-toast";

const formatOTDisplay = (otValue) => {
  const val = parseFloat(otValue);
  if (!val || val <= 0) return "0h 0m"; // Show 0 for the summary table
  
  const totalMinutes = Math.round(val * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  return `${h}h ${m}m`;
};
/* ===== SAME REMIX COLORS AS SHIFT MANAGEMENT ===== */
const EMP_COLORS = [
  "bg-dorika-blueLight",
  "bg-dorika-green/20",
  "bg-dorika-orange/20",
];

const getRowColor = (index) => EMP_COLORS[index % EMP_COLORS.length];

/* ===== ATTENDANCE TEXT COLORS ONLY ===== */
const getAttendanceTextColor = (val) => {
  switch (val) {
    case "P":
      return "text-green-600";
    case "P(L)":
      return "text-orange-500";
    case "A":
      return "text-red-600";
    case "SL":
    case "SL(OFF)":
      return "text-purple-600";
    case "CL":
    case "CL(OFF)":
      return "text-blue-600";
    case "OFF":
      return "text-black";
    default:
      return "";
  }
};

const EmployeeAttendanceHistory = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [designations, setDesignations] = useState([]);
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const tableContainerRef = React.useRef(null);

  /* ================= DAYS IN MONTH ================= */
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [selectedMonth]);

  /* ================= FETCH EMPLOYEES ================= */
  useEffect(() => {
    axios.get("http://localhost:5002/api/employees").then((res) => {
      setEmployees(res.data);
    });
  }, []);

  useEffect(() => {
  if (employees.length > 0) {

    let filteredEmployees = employees;

    // If department selected, filter by department
    if (selectedDepartment !== "ALL") {
      filteredEmployees = employees.filter(
        (emp) => emp.departmentName === selectedDepartment
      );
    }

    const uniqueDesignations = [
      "ALL",
      ...new Set(filteredEmployees.map((emp) => emp.designationName)),
    ];

    setDesignations(uniqueDesignations);
  }
}, [employees, selectedDepartment]);

  useEffect(() => {
  axios.get("http://localhost:5002/api/departments").then((res) => {
    setDepartments(["ALL", ...res.data.map((d) => d.deptName)]);
  });
}, []);

useEffect(() => {
  console.log(employees);
}, [employees]);

  /* ================= FETCH ATTENDANCE ================= */
  useEffect(() => {
    const [year, month] = selectedMonth.split("-");

    axios
      .get(
        `http://localhost:5002/api/attendance/history?month=${Number(
          month
        )}&year=${Number(year)}`
      )
      .then((res) => {
        const map = {};

        res.data.forEach((doc) => {
          const dayMap = {};

          doc.records.forEach((r) => {
            const day = new Date(r.date).getDate();

            let status = "";
            if (r.status === "Present" && r.isLate) status = "P(L)";
            else if (r.status === "Present") status = "P";
            else if (r.status === "Absent") status = "A";
            else status = r.status;

            dayMap[day] = {
              status,
              shiftCode: r.shiftCode || "-",
              shiftStartTime: r.shiftStartTime || "-",
              shiftEndTime: r.shiftEndTime || "-",
            };
          });

          // Store both daily records and the DB calculated totals
          map[doc.employeeUserId] = {
            days: dayMap,
            totalPresent: doc.totalPresent || 0,
            totalAbsent: doc.totalAbsent || 0,
            totalOff: doc.totalOff || 0,
            totalLeave: doc.totalLeave || 0,
            totalOTHours: doc.totalOTHours || 0,
          };
        });

        setAttendanceMap(map);
      });
  }, [selectedMonth]);

  /* ================= FILTER ================= */
  const filteredEmployees = employees.filter((emp) => {
  const departmentMatch =
    selectedDepartment === "ALL" ||
    emp.departmentName === selectedDepartment;

  const designationMatch =
    selectedDesignation === "ALL" ||
    emp.designationName === selectedDesignation;

  return departmentMatch && designationMatch;
});

    const startIndex = perPage === "all" ? 0 : (currentPage - 1) * perPage;

    const paginatedEmployees = perPage === "all" 
      ? filteredEmployees 
      : filteredEmployees.slice(startIndex, startIndex + perPage);


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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="p-3 bg-white shadow-md rounded-md">
          {/* ================= HEADER ================= */}
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">Attendance History</h2>
            <div className="flex gap-2">
              <BackButton />
            </div>
          </div>

{/* ================= TOP CONTROLS ================= */}
<div className="bg-dorika-blueLight p-4 rounded-lg shadow mb-3 border border-dorika-blue">

  {/* TOP SECTION */}
  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">

    {/* LEFT SIDE CONTROLS */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">

      {/* Month */}
      <div className="flex flex-col">
        <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
          Month
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-dorika-blue rounded px-3 py-2 bg-white text-sm focus:outline-none"
        />
      </div>

      {/* Department */}
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
          className="border border-dorika-blue rounded px-3 py-2 text-sm"
        >
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Designation */}
      <div className="flex flex-col">
        <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
          Designation
        </label>
        <select
          value={selectedDesignation}
          onChange={(e) => setSelectedDesignation(e.target.value)}
          className="border border-dorika-blue rounded px-3 py-2 text-sm"
        >
          {designations.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Show */}
      <div className="flex flex-col">
        <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
          Show
        </label>
        <select
          value={perPage}
          onChange={(e) => {
            const val = e.target.value;
            setPerPage(val === "all" ? "all" : parseInt(val));
            setCurrentPage(1);
          }}
          className="border border-dorika-blue rounded px-3 py-2 text-sm font-semibold bg-white text-dorika-blue"
        >
          <option value={8}>8</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="all">ALL</option>
        </select>
      </div>

    </div>
  </div>

  {/* LEGEND SECTION */}
  <div className="mt-4 border-t border-dorika-blue/20 pt-3">

    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold">
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-600 rounded-sm"></span>Present (P)</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500 rounded-sm"></span>Late (P(L))</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-600 rounded-sm"></span>Absent (A)</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-purple-600 rounded-sm"></span>Sick (SL)</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-600 rounded-sm"></span>Casual (CL)</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-black rounded-sm"></span>OFF</div>
    </div>

    <div className="flex flex-wrap gap-4 bg-gray-300/60 p-2 rounded-md text-xs font-bold mt-3">
      <span className="text-green-700">TP - Total Present</span>
      <span className="text-red-600">TA - Total Absent</span>
      <span className="text-gray-600">TO - Total OFF</span>
      <span className="text-orange-600">TL - Total Leave (SL+CL)</span>
      <span className="text-orange-600">TOT - Total Over Time</span>
    </div>

  </div>
</div>

        <div className="relative group flex-1 flex flex-col min-h-0"> 
          
        {/* Left Fixed Gray Arrow */}
        <button 
          type="button"
          onClick={() => scrollTable('left')}
          className="fixed left-[280px] top-1/2 -translate-y-1/2 z-50 bg-gray-800/40 hover:bg-gray-800/70 text-white p-4 rounded-full shadow-2xl backdrop-blur-md transition-all active:scale-90 hidden md:block"
          style={{ marginLeft: '10px' }} // Ensures it doesn't touch the sidebar
        >
          <span className="text-3xl font-bold">❮</span>
        </button>

        {/* Right Fixed Gray Arrow */}
        <button 
          type="button"
          onClick={() => scrollTable('right')}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-50 bg-gray-800/40 hover:bg-gray-800/70 text-white p-4 rounded-full shadow-2xl backdrop-blur-md transition-all active:scale-90 hidden md:block"
        >
          <span className="text-3xl font-bold">❯</span>
        </button>

          {/* The Scrollable Box - NOW WRAPS THE TABLE CORRECTLY */}
          <div 
            ref={tableContainerRef} 
            className="w-full overflow-x-auto bg-white rounded-lg shadow border scroll-smooth"
          >
      
            <table className="w-full border-collapse border-dorika-blue text-[10px] sm:text-xs">
              <thead className="bg-dorika-blue text-white sticky top-0">
                <tr>
                  <th className="border px-2 border-dorika-blue">SL</th>
                  <th className="border px-2 border-dorika-blue">Emp ID</th>
                  <th className="border px-2 border-dorika-blue">Name</th>
                  <th className="border px-2 border-dorika-blue">Department</th>
                  <th className="border px-2 border-dorika-blue">Designation</th>
                  {daysInMonth.map((d) => (
                    <th
                      key={d}
                      className="border border-dorika-blue text-center whitespace-nowrap"
                      style={{ width: "32px", minWidth: "32px", maxWidth: "32px" }}
                    >
                      {d}
                    </th>
                  ))}
                  <th className="border px-2 border-dorika-blue text-center bg-orange-500">TP</th>
                  <th className="border px-2 border-dorika-blue text-center bg-orange-500">TA</th>
                  <th className="border px-2 border-dorika-blue text-center bg-orange-500">TO</th>
                  <th className="border px-2 border-dorika-blue text-center bg-orange-500">TL</th>
                  <th className="border px-2 border-dorika-blue text-center bg-orange-500">TOT</th>
                </tr>
              </thead>


              <tbody>
                {paginatedEmployees.map((emp, i) => (
                  <tr key={emp.employeeUserId} className={`${getRowColor(startIndex + i)}`}>
                    <td className="border px-2 border-dorika-blue">{perPage === "all" ? i + 1 : startIndex + i + 1}</td>
                    <td className="border px-2 border-dorika-blue">{emp.employeeID}</td>
                    <td className="border px-2 border-dorika-blue font-medium">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="border px-2 border-dorika-blue">{emp.departmentName}</td>
                    <td className="border px-2 border-dorika-blue">{emp.designationName}</td>

                    {daysInMonth.map((day) => {
                      const valObj = attendanceMap?.[emp.employeeUserId]?.days?.[day];
                      const currentStatus = valObj?.status || "";

                      const editableStatuses = ["P", "P(L)", "A"];
                      const isEditable = editableStatuses.includes(currentStatus);

                      return (
                        <td
                          key={day}
                          className={`border border-dorika-blue text-center font-bold whitespace-nowrap overflow-hidden text-ellipsis ${getAttendanceTextColor(
                            currentStatus
                          )}`}
                          style={{
                            width: "32px",
                            minWidth: "32px",
                            maxWidth: "32px",
                            cursor: isEditable ? "pointer" : "not-allowed",
                          }}
                          title={
                            valObj
                              ? `Shift: ${valObj.shiftCode}\nStart: ${valObj.shiftStartTime}\nEnd: ${valObj.shiftEndTime}`
                              : ""
                          }
                        >
                          {isEditable ? (
                            <select
                              value={currentStatus}
                              onChange={async (e) => {
                                const newStatus = e.target.value;

                                toast(
                                  (t) => (
                                    <div className="flex flex-col gap-3 min-w-[220px]">
                                      <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-10 bg-green-500 rounded-full"></div>
                                        <p className="text-sm font-semibold text-gray-800">
                                          Set attendance to{" "}
                                          <span className="text-green-600 font-bold underline">
                                            {newStatus}
                                          </span>
                                          ?
                                        </p>
                                      </div>

                                      <div className="flex justify-end items-center gap-3 border-t border-gray-100 pt-3">
                                        <button
                                          className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-md transition-all uppercase tracking-wider"
                                          onClick={() => toast.dismiss(t.id)}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-4 py-1.5 rounded-md shadow-md shadow-green-100 transition-all active:scale-95 uppercase tracking-wider"
                                          onClick={async () => {
                                            toast.dismiss(t.id);

                                            const payload = {
                                              employeeUserId: emp.employeeUserId,
                                              date: `${selectedMonth}-${String(day).padStart(
                                                2,
                                                "0"
                                              )}`,
                                              status:
                                                newStatus === "P" || newStatus === "P(L)"
                                                  ? "Present"
                                                  : "Absent",
                                              isLate: newStatus === "P(L)",
                                            };

                                            try {
                                              await axios.put(
                                                "http://localhost:5002/api/attendance/update",
                                                payload
                                              );
                                              // Reload logic: Ideally you should refetch to get updated totals from DB
                                              window.location.reload(); 
                                            } catch (err) {
                                              toast.error("Update failed!");
                                            }
                                          }}
                                        >
                                          Confirm
                                        </button>
                                      </div>
                                    </div>
                                  ),
                                  {
                                    duration: 6000,
                                    position: "top-center",
                                    style: {
                                      padding: "16px",
                                      borderRadius: "12px",
                                      border: "1px solid #f1f5f9",
                                      background: "#ffffff",
                                    },
                                  }
                                );
                              }}
                              className={`bg-transparent text-center font-bold w-full cursor-pointer ${getAttendanceTextColor(
                                currentStatus
                              )}`}
                            >
                              <option value="P">P</option>
                              <option value="P(L)">P(L)</option>
                              <option value="A">A</option>
                            </select>
                          ) : (
                            currentStatus
                          )}
                        </td>
                      );
                    })}
                    {/* DISPLAY TOTALS DIRECTLY FROM DB */}
                    <td className="border border-dorika-blue text-center font-bold text-green-700">
                      {attendanceMap?.[emp.employeeUserId]?.totalPresent || 0}
                    </td>
                    <td className="border border-dorika-blue text-center font-bold text-red-600">
                      {attendanceMap?.[emp.employeeUserId]?.totalAbsent || 0}
                    </td>
                    <td className="border border-dorika-blue text-center font-bold text-gray-600">
                      {attendanceMap?.[emp.employeeUserId]?.totalOff || 0}
                    </td>
                    <td className="border border-dorika-blue text-center font-bold text-orange-600">
                      {attendanceMap?.[emp.employeeUserId]?.totalLeave || 0}
                    </td>
                    {/* Total OT Column */}
                    <td className="border border-dorika-blue text-center font-bold text-red-600">
                      {formatOTDisplay(attendanceMap?.[emp.employeeUserId]?.totalOTHours || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
             
        </div>

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

export default EmployeeAttendanceHistory;