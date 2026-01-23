import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from '../component/Sidebar';
import BackButton from "../component/BackButton";
import { useNavigate } from "react-router-dom";
import Pagination from "./Pagination";
import toast from "react-hot-toast";

const ShiftManagement = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
    const navigate = useNavigate();
  const [shiftOptions, setShiftOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [shifts, setShifts] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8; // employees per page

useEffect(() => {
  const fetchShiftOptions = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/shifts"); // fetch all shifts
     const options = res.data
      .filter(s => s.status === "Active")
      .map(s => ({
       code: s.shiftCode, // M, N
        name: s.shiftName,                         // MORNING
        start: s.startTime,                        // 02.36 AM
        end: s.endTime                             // 06.40 AM
      }));

    setShiftOptions([
    ...options,
    { code: "OFF", name: "OFF" },
    { code: "DD", name: "Double Duty" }
  ]);


    } catch (err) {
      console.error("Failed to fetch shift options:", err);
    }
  };

  fetchShiftOptions();
}, []);



  useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/employees");
      setEmployees(res.data); // store all employees
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  fetchEmployees();
}, []);


  /* ================= FETCH DESIGNATIONS (DESIGNATION MASTER) ================= */
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5002/api/designations"
        );
        setDesignations([
          "ALL",
          ...res.data.map((d) => d.designationName),
        ]);
      } catch (err) {
        console.error("Designation fetch error:", err);
      }
    };

    fetchDesignations();
  }, []);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const formatMonth = (ym) => {
          const [y, m] = ym.split("-");
          return new Date(y, m - 1).toLocaleString("en-US", { month: "short" }) + "-" + y;
        };
  
        const res = await axios.get(
          `http://localhost:5002/api/shift-management/${formatMonth(selectedMonth)}`
        );
  
        const formatted = {};
        res.data.forEach((item) => {
          const processedShifts = {};
          // Convert stored "MG" back to "DD:MG" for the UI
          Object.entries(item.shifts || {}).forEach(([day, code]) => {
            if (code.length === 2 && code !== "DD" && code !== "OFF") {
              processedShifts[day] = `DD:${code}`;
            } else {
              processedShifts[day] = code;
            }
          });
          formatted[item.employeeUserId] = processedShifts;
        });
  
        setShifts(formatted);
      } catch (err) {
        console.error("Shift fetch error:", err);
        setShifts({});
      }
    };
    fetchShifts();
  }, [selectedMonth]);


  /* ================= DAYS IN MONTH ================= */
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [selectedMonth]);

  /* ================= FILTER EMPLOYEES BY DESIGNATION ================= */
  const filteredEmployees =
    selectedDesignation === "ALL"
      ? employees
      : employees.filter(
          (emp) => emp.designationName === selectedDesignation
        );

    const handleShiftChange = (emp, day, value, isSecondHalf = false) => {
      setShifts((prev) => {
        const empShifts = { ...(prev[emp.employeeUserId] || {}) };
        let currentVal = empShifts[day] || "";

        if (value === "DD") {
          // Logic for selecting DD
          const def = shiftOptions[0]?.code || "M";
          empShifts[day] = `DD:${def}${def}`;
        } else if (isSecondHalf === true || isSecondHalf === false && currentVal.startsWith("DD:") && arguments[3] === undefined) {
          /** * If we are specifically clicking the tiny sub-dropdowns, 
           * we update the pair. 
           */
          const codes = currentVal.replace("DD:", "").split("");
          if (isSecondHalf) {
            empShifts[day] = `DD:${codes[0]}${value}`; // Update second box
          } else {
            empShifts[day] = `DD:${value}${codes[1] || value}`; // Update first box
          }
        } else {
          // NORMAL SHIFT SELECTION (M, G, A, OFF, etc.)
          // Overwrites everything, removing the DD state.
          empShifts[day] = value;
        }

        return { ...prev, [emp.employeeUserId]: empShifts };
      });
    };
        const startIndex = (currentPage - 1) * perPage;
        const paginatedEmployees = filteredEmployees.slice(
        startIndex,
        startIndex + perPage
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
        val.startsWith("DD:") ? val.replace("DD:", "") : val
      ]).filter(([_, shift]) => shift)
    );
    
    if (Object.keys(nonEmptyShifts).length === 0) return null;
    
    return {
      employeeID: emp.employeeID,
      employeeUserId: emp.employeeUserId, // Keep this
      employeeName: `${emp.firstName} ${emp.middleName} ${emp.lastName}`,
      designation: emp.designationName,
      shifts: nonEmptyShifts,
    };
  })
  .filter(Boolean);

    if (dataToSave.length === 0) {
      toast.error("No shifts to save ❌");
      return;
    }

    await axios.post("http://localhost:5002/api/shift-management/save-bulk", {
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
  if (shift === "OFF") return "bg-red-200 text-red-800"; 
  return getRowColor(rowIndex);
};

const handlePrint = () => {
  const printData =
    selectedEmployees.length > 0
      ? filteredEmployees.filter(emp =>
          selectedEmployees.includes(emp.employeeID)
        )
      : filteredEmployees;

  const printWindow = window.open("", "", "width=1200,height=800");
  printWindow.document.write(`
    <html>
    <head>
      <title>Shift Report</title>
      <style>
        body { font-family: Arial; }
        table { border-collapse: collapse; width: 100%; font-size: 10px; }
        th, td { border: 1px solid #000; padding: 4px; text-align: center; }
        th { background: #e6f0ff; }
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head>
    <body>
    <h3>
      Shift Report : ${
        new Date(
          selectedMonth.split("-")[0],
          selectedMonth.split("-")[1] - 1
        ).toLocaleString("en-US", { month: "short" })
      } - ${selectedMonth.split("-")[0]}
    </h3>

      <table>
        <tr>
          <th>SL</th>
          <th>Emp ID</th>
          <th>Name</th>
          <th>Designation</th>
          ${daysInMonth.map(d => `<th>${d}</th>`).join("")}
        </tr>
        ${printData
          .map((emp, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${emp.employeeID}</td>
              <td>${emp.firstName} ${emp.middleName} ${emp.lastName}</td>
              <td>${emp.designationName}</td>
              ${daysInMonth
                .map(
                  d =>
                    `<td>${shifts?.[emp.employeeID]?.[d] || ""}</td>`
                )
                .join("")}
            </tr>
          `)
          .join("")}
      </table>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};


  return (
  <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 overflow-y-auto">
    <div className="p-3 bg-white shadow-md rounded-md">
      <div className="bg-dorika-blueLight borderborder-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
        <h2 className="text-xl font-bold text-dorika-blue">Shift Management</h2>
        <div className="flex gap-2">
          <BackButton />
          {/* <button
            onClick={() => navigate("/EmployeeMaster")}
            className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Add Employee
          </button> */}
        </div>
      </div>

     {/* ================= TOP SECTION ================= */}
     <div className="bg-dorika-blueLight p-3 rounded-lg shadow mb-4 flex items-center justify-between border border-dorika-blue">
  <div className="flex items-center gap-6">
          <label className="font-semibold text-dorika-blue">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-dorika-blue rounded px-3 py-1 text-dorika-blue focus:outline-none focus:ring-1 focus:ring-dorika-orange"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="font-semibold text-dorika-blue">Designation:</label>
          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="border border-dorika-blue rounded px-3 py-1 text-dorika-blue focus:outline-none focus:ring-1 focus:ring-dorika-green"
          >
            {designations.map((des) => (
              <option key={des} value={des}>
                {des}
              </option>
            ))}
          </select>
        </div>
          <div>

          <button
            onClick={handlePrint}
            className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold"
          >
            Print Report
          </button>
        </div>

        </div>

    
      {/* ================= SHIFT TABLE ================= */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
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
              <th className="border px-2 py-1 border-dorika-blue">Employee Name</th>
              <th className="border px-2 py-1 border-dorika-blue">Designation</th>
              {daysInMonth.map((day) => (
                <th key={day} className="border px-2 py-1 border-dorika-blue text-center">
                  {day}
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
                      checked={selectedEmployees.includes(emp.employeeID)}
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
                <td className="border px-2 py-1 border-dorika-blue"> {startIndex + index + 1}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium">{emp.employeeID}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium">{emp.firstName} {emp.middleName} {emp.lastName}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium">{emp.designationName}</td>
                {daysInMonth.map((day) => {
                const currentShift = shifts?.[emp.employeeUserId]?.[day] || "";
                const isDD = currentShift.startsWith("DD:");
                const ddParts = isDD ? currentShift.replace("DD:", "").split("") : ["", ""];

                return (
                  <td
                    key={day}
                    // Added min-width and horizontal padding
                    className={`border border-dorika-blue px-1 py-2 text-center min-w-[60px] ${getShiftColor(isDD ? "DD" : currentShift, index)}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                    <select
                        value={isDD ? "DD" : currentShift}
                        onChange={(e) => handleShiftChange(emp, day, e.target.value)}
                        className="bg-transparent border rounded px-1 py-0.5 text-xs font-semibold w-full cursor-pointer"
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
                            className="bg-white border rounded text-[10px] w-10 px-0.5 font-bold"
                          >
                            {shiftOptions.filter(o => o.code !== "OFF" && o.code !== "DD").map(opt => (
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
                            className="bg-white border rounded text-[10px] w-10 px-0.5 font-bold"
                          >
                            {shiftOptions.filter(o => o.code !== "OFF" && o.code !== "DD").map(opt => (
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
       <Pagination
            total={filteredEmployees.length}
            perPage={perPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            />
            <div className="absolute right-3 bottom-3">
              <button
                onClick={handleSubmit}
                className="bg-dorika-blue hover:bg-dorika-orange text-white px-4 py-1 rounded font-semibold"
              >
                Submit
              </button>
            </div>
      </div>
    </div>
    </div>
    </div>
 
  );
};

export default ShiftManagement;
