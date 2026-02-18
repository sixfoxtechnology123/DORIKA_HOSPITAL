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
  const tableContainerRef = React.useRef(null); 
  const [shiftOptions, setShiftOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [shifts, setShifts] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [departments, setDepartments] = useState([]); // To store all departments
  const [selectedDepartment, setSelectedDepartment] = useState("ALL"); // Current selection
  const [deptWiseDesignations, setDeptWiseDesignations] = useState([]); // Raw data for filtering

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


/* ================= FETCH DEPARTMENTS & DESIGNATIONS ================= */
useEffect(() => {
  const fetchDeptData = async () => {
    try {
      // Assuming you have an endpoint that returns departments or designations with dept info
      const res = await axios.get("http://localhost:5002/api/designations");
      
      // 1. Store the raw data for filtering logic
      setDeptWiseDesignations(res.data);

      // 2. Extract unique department names
      const uniqueDepts = ["ALL", ...new Set(res.data.map(d => d.departmentName))];
      setDepartments(uniqueDepts);

      // 3. Initialize designations list
      setDesignations(["ALL", ...res.data.map((d) => d.designationName)]);
    } catch (err) {
      console.error("Dept/Designation fetch error:", err);
    }
  };
  fetchDeptData();
}, []);

/* ================= FILTER DESIGNATIONS BY DEPT ================= */
const displayDesignations = useMemo(() => {
  if (selectedDepartment === "ALL") {
    return ["ALL", ...deptWiseDesignations.map(d => d.designationName)];
  }
  // Filter the designations that belong to the selected department
  const filtered = deptWiseDesignations
    .filter(d => d.departmentName === selectedDepartment)
    .map(d => d.designationName);
    
  return ["ALL", ...filtered];
}, [selectedDepartment, deptWiseDesignations]);

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

    const filteredEmployees = employees.filter((emp) => {
      const deptMatch =
        selectedDepartment === "ALL" ||
        emp.departmentName === selectedDepartment;

      const designationMatch =
        selectedDesignation === "ALL" ||
        emp.designationName === selectedDesignation;

      return deptMatch && designationMatch;
    });

       const handleShiftChange = (emp, day, value, isSecondHalf = null) => {
        setShifts((prev) => {
          const empShifts = { ...(prev[emp.employeeUserId] || {}) };
          let currentVal = empShifts[day] || "";

          if (value === "DD") {
            // Initialize DD
            const def = shiftOptions[0]?.code || "M";
            empShifts[day] = `DD:${def}${def}`;
          } else if (isSecondHalf !== null && currentVal.startsWith("DD:")) {
            // Update specific sub-boxes
            const codes = currentVal.replace("DD:", "").split("");
            if (isSecondHalf) {
              empShifts[day] = `DD:${codes[0]}${value}`; // Update second
            } else {
              empShifts[day] = `DD:${value}${codes[1] || value}`; // Update first
            }
          } else {
            // NORMAL SHIFT SELECTION: This resets the DD state
            empShifts[day] = value;
          }

          return { ...prev, [emp.employeeUserId]: empShifts };
        });
      };
       // Find and update these lines
      const startIndex = perPage === "all" ? 0 : (currentPage - 1) * perPage;
      const paginatedEmployees = perPage === "all" 
        ? filteredEmployees 
        : filteredEmployees.slice(startIndex, startIndex + perPage);

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
      department: emp.departmentName,
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
  
  // Prepare the HTML content
  printWindow.document.write(`
    <html>
    <head>
      <title>Shift Report - ${selectedMonth}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
        h3 { text-align: center; color: #333; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        th, td { 
          border: 1px solid #ccc; 
          padding: 4px 2px; 
          text-align: center; 
          font-size: 9px; 
          word-wrap: break-word;
        }
        th { background-color: #f2f2f2; font-weight: bold; }
        .emp-info { text-align: left; padding-left: 5px; font-size: 10px; }
        @page { size: A4 landscape; margin: 5mm; }
        @media print {
          button { display: none; }
          body { margin: 0; }
          table { width: 100%; }
        }
      </style>
    </head>
    <body>
      <h3>
        Shift Report: ${
          new Date(
            selectedMonth.split("-")[0],
            selectedMonth.split("-")[1] - 1
          ).toLocaleString("en-US", { month: "long", year: "numeric" })
        }
      </h3>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">SL</th>
            <th style="width: 50px;">ID</th>
            <th style="width: 120px;">Name</th>
            <th style="width: 100px;">Designation</th>
            ${daysInMonth.map(d => `<th style="width: 25px;">${d}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${printData
            .map((emp, i) => {
              // Get the shift data using employeeUserId (which matches your state)
              const empShifts = shifts[emp.employeeUserId] || {};
              
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${emp.employeeID}</td>
                  <td class="emp-info">${emp.firstName} ${emp.lastName}</td>
                  <td class="emp-info">${emp.designationName}</td>
                  ${daysInMonth
                    .map(d => {
                      let displayVal = empShifts[d] || "";
                      // If it's a Double Duty (DD:MN), show it clearly in the PDF
                      if (displayVal.startsWith("DD:")) {
                        displayVal = displayVal.replace("DD:", "");
                      }
                      return `<td>${displayVal}</td>`;
                    })
                    .join("")}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  // Small delay to ensure styles are loaded before print dialog opens
  setTimeout(() => {
    printWindow.print();
  }, 500);
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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
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
<div className="bg-dorika-blueLight p-3 rounded-lg shadow mb-4 
flex flex-col gap-4 border border-dorika-blue">



  {/* BOTTOM ROW (Desktop) — Department + Designation */}
  <div className="flex flex-col lg:flex-row lg:items-center gap-4">

    {/* Department */}
    <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full lg:w-auto">
      <label className="font-semibold text-dorika-blue">Department:</label>
      <select
        value={selectedDepartment}
        onChange={(e) => {
          setSelectedDepartment(e.target.value);
          setSelectedDesignation("ALL");
        }}
        className="w-full lg:w-auto border border-dorika-blue rounded px-3 py-1 
        text-dorika-blue focus:outline-none focus:ring-1 focus:ring-dorika-green"
      >
        {departments.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>
    </div>

    {/* Designation */}
    <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full lg:w-auto">
      <label className="font-semibold text-dorika-blue">Designation:</label>
      <select
        value={selectedDesignation}
        onChange={(e) => setSelectedDesignation(e.target.value)}
        className="w-full lg:w-auto border border-dorika-blue rounded px-3 py-1 
        text-dorika-blue focus:outline-none focus:ring-1 focus:ring-dorika-green"
      >
        {displayDesignations.map((des) => (
          <option key={des} value={des}>
            {des}
          </option>
        ))}
      </select>
    </div>

  </div>
    {/* TOP ROW (Desktop) — Month + Show + Print */}
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

    {/* Month */}
    <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full lg:w-auto">
      <label className="font-semibold text-dorika-blue">Month:</label>
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-full lg:w-auto border border-dorika-blue rounded px-3 py-1 
        text-dorika-blue focus:outline-none focus:ring-1 focus:ring-dorika-orange"
      />
    </div>

    {/* Show + Print */}
    <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">

      <div className="flex items-center gap-2 w-full md:w-auto">
        <label className="text-xs font-bold text-dorika-blue uppercase whitespace-nowrap">
          Show:
        </label>
        <select
          value={perPage}
          onChange={(e) => {
            const val = e.target.value;
            setPerPage(val === "all" ? "all" : parseInt(val));
            setCurrentPage(1);
          }}
          className="flex-1 md:flex-none border border-dorika-blue rounded px-3 py-1 text-sm bg-white font-semibold text-dorika-blue"
        >
          <option value={8}>8</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="all">ALL</option>
        </select>
      </div>

      <button
        onClick={handlePrint}
        className="w-full md:w-auto bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1.5 rounded font-semibold whitespace-nowrap text-sm"
      >
        Print Report
      </button>

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
              <th className="border px-2 py-1 border-dorika-blue">Department</th>
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
                <td className="border px-2 py-1 border-dorika-blue"> {perPage === "all" ? index + 1 : startIndex + index + 1}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium">{emp.employeeID}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium">{emp.firstName} {emp.middleName} {emp.lastName}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium">{emp.departmentName}</td>
                <td className="border px-2 py-1 border-dorika-blue font-medium">{emp.designationName}</td>
                {daysInMonth.map((day) => {
                const currentShift = shifts?.[emp.employeeUserId]?.[day] || "";
                const isDD = currentShift.startsWith("DD:");
                const ddParts = isDD ? currentShift.replace("DD:", "").split("") : ["", ""];

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
                       className="bg-transparent border rounded px-0 md:px-1 py-0.5 text-[10px] md:text-xs font-semibold w-full cursor-pointer"
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
          <div className="flex justify-end mt-3 md:absolute md:right-3 md:bottom-3">
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
