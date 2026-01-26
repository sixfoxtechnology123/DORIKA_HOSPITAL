import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import Pagination from "./Pagination";
import toast from "react-hot-toast";


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

/* ===== CALCULATE TOTALS ===== */
const calculateTotals = (records = {}) => {
  let totalPresent = 0; // P + PL
  let totalAbsent = 0;  // A
  let totalOff = 0;     // OFF
  let totalLeave = 0;   // SL + CL

  Object.values(records).forEach((val) => {
    if (val?.status === "P" || val?.status === "P(L)") totalPresent++;
    else if (val?.status === "A") totalAbsent++;
    else if (val?.status === "OFF") totalOff++;
    else if (
      val?.status === "SL" ||
      val?.status === "SL(OFF)" ||
      val?.status === "CL(OFF)" ||
      val?.status === "CL"
    )
      totalLeave++;
  });

  return { totalPresent, totalAbsent, totalOff, totalLeave };
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
  const [currentPage, setCurrentPage] = useState(1);

  const perPage = 8;

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

  /* ================= FETCH DESIGNATIONS ================= */
  useEffect(() => {
    axios.get("http://localhost:5002/api/designations").then((res) => {
      setDesignations(["ALL", ...res.data.map((d) => d.designationName)]);
    });
  }, []);

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

            // Store full object for hover tooltip
            let status = "";
            if (r.status === "Present" && r.isLate) status = "P(L)";
            else if (r.status === "Present") status = "P";
            else if (r.status === "Absent") status = "A";
            else status = r.status; // SL / CL / OFF

            dayMap[day] = {
              status,
              shiftCode: r.shiftCode || "-",
              shiftStartTime: r.shiftStartTime || "-",
              shiftEndTime: r.shiftEndTime || "-",
            };
          });

          map[doc.employeeUserId] = dayMap;
        });

        setAttendanceMap(map);
      });
  }, [selectedMonth]);

  /* ================= FILTER ================= */
  const filteredEmployees =
    selectedDesignation === "ALL"
      ? employees
      : employees.filter((e) => e.designationName === selectedDesignation);

  const startIndex = (currentPage - 1) * perPage;
  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + perPage
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 bg-white shadow-md rounded-md">
          {/* ================= HEADER ================= */}
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">Attendance History</h2>
            <div className="flex gap-2">
              <BackButton />
            </div>
          </div>

          {/* ================= TOP CONTROLS ================= */}
          <div className="bg-dorika-blueLight p-3 rounded-lg shadow mb-3 flex flex-col md:flex-row md:justify-between md:items-start gap-3 border border-dorika-blue">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center mr-5">
              <label className="font-semibold text-dorika-blue">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-dorika-blue rounded px-3 py-1"
              />

              <label className="font-semibold text-dorika-blue">Designation:</label>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="border border-dorika-blue rounded px-3 py-1"
              >
                {designations.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

           <div className="flex flex-col gap-1 text-xs font-bold mb-2">
            {/* First line: color codes */}
        <div className="flex flex-wrap gap-3 text-xs font-bold justify-start">
            {/* Present */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-600 rounded-sm"></span>
              <span>Present (P)</span>
            </div>

            {/* Late Present */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-sm"></span>
              <span>Late Present (P(L))</span>
            </div>

            {/* Absent */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded-sm"></span>
              <span>Absent (A)</span>
            </div>

            {/* Sick Leave */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-600 rounded-sm"></span>
              <span>Sick Leave (SL)</span>
            </div>

            {/* Casual Leave */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-600 rounded-sm"></span>
              <span>Casual Leave (CL)</span>
            </div>

            {/* OFF */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-black rounded-sm"></span>
              <span>OFF</span>
            </div>
          </div>


            {/* Second line: full form / totals */}
            <div className="flex flex-wrap gap-2 bg-gray-300 p-1 rounded-md mt-2 text-[10px] sm:text-xs">
                <span className="text-green-700">TP - Total Present</span>
                <span className="text-red-600">TA - Total Absent</span>
                <span className="text-gray-600">TO - Total OFF</span>
                <span className="text-orange-600">TL - Total Leave (SL+CL)</span>
            </div>
            </div>
          </div>

          {/* ================= TABLE ================= */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border-collapse border-dorika-blue text-[10px] sm:text-xs">
              <thead className="bg-dorika-blue text-white sticky top-0">
                <tr>
                  <th className="border px-2 border-dorika-blue">SL</th>
                  <th className="border px-2 border-dorika-blue">Emp ID</th>
                  <th className="border px-2 border-dorika-blue">Name</th>
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
                </tr>
              </thead>

              <tbody>
                {paginatedEmployees.map((emp, i) => (
                  <tr key={emp.employeeUserId} className={`${getRowColor(startIndex + i)}`}>
                    <td className="border px-2 border-dorika-blue">{startIndex + i + 1}</td>
                    <td className="border px-2 border-dorika-blue">{emp.employeeID}</td>
                    <td className="border px-2 border-dorika-blue font-medium">{emp.firstName} {emp.lastName}</td>
                    <td className="border px-2 border-dorika-blue">{emp.designationName}</td>

                    {daysInMonth.map((day) => {
                      const valObj = attendanceMap?.[emp.employeeUserId]?.[day];
                      const currentStatus = valObj?.status || "";

                      // Only allow dropdown for P, P(L), A
                      const editableStatuses = ["P", "P(L)", "A"];
                      const isEditable = editableStatuses.includes(currentStatus);

                      const handleChange = async (e) => {
                        const newStatus = e.target.value;
                        if (!isEditable || newStatus === currentStatus) return;

                        // Confirm before updating
                        const confirmChange = window.confirm(`Change attendance from ${currentStatus} to ${newStatus}?`);
                        if (!confirmChange) return;

                        try {
                          await axios.put("http://localhost:5002/api/attendance/update", {
                            employeeUserId: emp.employeeUserId,
                            date: `2026-${String(day).padStart(2, "0")}`, // format YYYY-MM-DD, adjust month/year dynamically
                            status: newStatus,
                            isLate: newStatus === "P(L)"
                          });

                          // Update local state immediately
                          setAttendanceMap((prev) => ({
                            ...prev,
                            [emp.employeeUserId]: {
                              ...prev[emp.employeeUserId],
                              [day]: {
                                ...prev[emp.employeeUserId][day],
                                status: newStatus,
                                isLate: newStatus === "P(L)"
                              }
                            }
                          }));
                        } catch (err) {
                          toast.error("Failed to update attendance!");
                          console.error(err);
                        }
                      };

                      return (
                        <td
                          key={day}
                           className={`border border-dorika-blue text-center font-bold whitespace-nowrap overflow-hidden text-ellipsis ${getAttendanceTextColor(currentStatus)}`}
                           style={{
                            width: "32px",
                            minWidth: "32px",
                            maxWidth: "32px",
                            cursor: isEditable ? "pointer" : "not-allowed",
                          }}
                          title={valObj ? `Shift: ${valObj.shiftCode}\nStart: ${valObj.shiftStartTime}\nEnd: ${valObj.shiftEndTime}` : ""}
                        >
                          {isEditable ? (
                        <select
                            value={currentStatus} 
                            onChange={async (e) => {
                              const newStatus = e.target.value;

                              const confirmChange = window.confirm(
                                `Change attendance to ${newStatus}?`
                              );
                              if (!confirmChange) return;

                              const payload = {
                                employeeUserId: emp.employeeUserId,
                                date: `${selectedMonth}-${String(day).padStart(2, "0")}`,
                                status: (newStatus === "P" || newStatus === "P(L)") ? "Present" : "Absent",
                                isLate: newStatus === "P(L)", 
                              };

                              try {
                                await axios.put("http://localhost:5002/api/attendance/update", payload);

                                setAttendanceMap((prev) => ({
                                  ...prev,
                                  [emp.employeeUserId]: {
                                    ...prev[emp.employeeUserId],
                                    [day]: {
                                      ...prev[emp.employeeUserId][day],
                                      status: newStatus,
                                      isLate: newStatus === "P(L)", 
                                    },
                                  },
                                }));
                                toast.success("Updated!");
                              } catch (err) {
                                toast.error("Error updating");
                              }
                            }}
                            className={`bg-transparent text-center font-bold w-full cursor-pointer ${getAttendanceTextColor(currentStatus)}`}
                          >
                            <option value="P">P</option>
                            <option value="P(L)">P(L)</option> {/* Changed from PL to P(L) */}
                            <option value="A">A</option>
                          </select>
                          ) : (
                            currentStatus
                          )}
                        </td>
                      );
                    })}
                    {(() => {
                      const totals = calculateTotals(attendanceMap?.[emp.employeeUserId]);
                      return (
                        <>
                          <td className="border border-dorika-blue text-center font-bold text-green-700">{totals.totalPresent}</td>
                          <td className="border border-dorika-blue text-center font-bold text-red-600">{totals.totalAbsent}</td>
                          <td className="border border-dorika-blue text-center font-bold text-gray-600">{totals.totalOff}</td>
                          <td className="border border-dorika-blue text-center font-bold text-orange-600">{totals.totalLeave}</td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              total={filteredEmployees.length}
              perPage={perPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceHistory;
