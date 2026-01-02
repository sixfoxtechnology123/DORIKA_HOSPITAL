import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from '../component/Sidebar';
import BackButton from "../component/BackButton";
import { useNavigate } from "react-router-dom";
import Pagination from "./Pagination";
import toast from "react-hot-toast";



// Shift options
const SHIFT_OPTIONS = ["M", "N", "G", "E", "OFF"];

const ShiftManagement = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
    const navigate = useNavigate();
  
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [shifts, setShifts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8; // employees per page



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

  /* ================= FETCH SHIFTS MONTH WISE ================= */
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5002/api/shift-management/${selectedMonth}`
        );

        const formatted = {};
        res.data.forEach((item) => {
          formatted[item.employeeID] = item.shifts || {};
        });

        setShifts(formatted);
      } catch (err) {
        console.error("Shift fetch error:", err);
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

const handleShiftChange = (emp, day, value) => {
  const updatedShifts = {
    ...(shifts[emp.employeeID] || {}),
    [day]: value,
  };

  setShifts((prev) => ({
    ...prev,
    [emp.employeeID]: updatedShifts,
  }));
};

        const startIndex = (currentPage - 1) * perPage;
        const paginatedEmployees = filteredEmployees.slice(
        startIndex,
        startIndex + perPage
        );

const handleSubmit = async () => {
  try {
    // Prepare only employees with at least one shift
    const dataToSave = filteredEmployees
      .map(emp => {
        const empShifts = shifts[emp.employeeID] || {};
        const nonEmptyShifts = Object.fromEntries(
          Object.entries(empShifts).filter(([day, shift]) => shift)
        );
        if (Object.keys(nonEmptyShifts).length === 0) return null; // skip if no shift
        return {
          employeeID: emp.employeeID,
          employeeName: `${emp.firstName} ${emp.middleName} ${emp.lastName}`,
          designation: emp.designationName,
          shifts: nonEmptyShifts,
        };
      })
      .filter(Boolean); // remove nulls

    if (dataToSave.length === 0) {
     toast.error("No shifts to save ❌");
      return;
    }

    await axios.post("http://localhost:5002/api/shift-management/save-bulk", {
      month: selectedMonth,
      data: dataToSave,
    });

    toast.success("Shift saved successfully ✅");
  } catch (error) {
    toast.error("Failed to save shifts ❌");
  }
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
      <div className="bg-white p-2 rounded-lg shadow mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="font-semibold">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded px-3 "
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="font-semibold">Designation:</label>
          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="border rounded px-3 "
          >
            {designations.map((des) => (
              <option key={des} value={des}>
                {des}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= SHIFT TABLE ================= */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="border-collapse border-dorika-blue w-full text-xs">
          <thead className="bg-dorika-blue text-white sticky top-0">
            <tr>
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
              <tr key={emp.employeeID} className="hover:bg-dorika-blueLight transition">
                <td className="border px-2 py-1 border-dorika-blue"> {startIndex + index + 1}</td>
                <td className="border px-2 py-1 border-dorika-blue">{emp.employeeID}</td>
                <td className="border px-2 py-1 border-dorika-blue">{emp.firstName} {emp.middleName} {emp.lastName}</td>
                <td className="border px-2 py-1 border-dorika-blue">{emp.designationName}</td>
                {daysInMonth.map((day) => (
                  <td key={day} className="border border-dorika-blue px-1 py-1 text-center">
                    <select
                      value={shifts?.[emp.employeeID]?.[day] || ""}
                      onChange={(e) =>
                        handleShiftChange(emp, day, e.target.value)
                      }
                      className="border rounded px-1 py-0.5 text-xs"
                    >
                      <option value="">-</option>
                      {SHIFT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
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
        <div className="flex justify-end mt-3">
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
