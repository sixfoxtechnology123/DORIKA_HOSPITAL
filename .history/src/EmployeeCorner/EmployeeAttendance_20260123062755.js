import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";

// Helper to format date for display
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`; // Returns DD-MM-YYYY
};

const shiftWorkTime = calculateWorkTime(
  rec.checkInTime, 
  rec.checkOutTime, 
  rec.shiftStartTime, 
  rec.shiftEndTime
);

const EmployeeAttendance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeeFullName, setEmployeeFullName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const loggedUser = JSON.parse(localStorage.getItem("employeeUser"));

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`http://localhost:5002/api/attendance/my/${loggedUser.employeeUserId}`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const getMasterData = async () => {
      try {
        const res = await axios.get("http://localhost:5002/api/employees");
        if (res.data && Array.isArray(res.data)) {
          const targetEmployee = res.data.find(emp => emp.employeeUserId === loggedUser.employeeUserId);
          if (targetEmployee) {
            const fName = targetEmployee.firstName || "";
            const mName = targetEmployee.middleName || "";
            const lName = targetEmployee.lastName || "";
            const fullName = `${fName} ${mName} ${lName}`.replace(/\s+/g, ' ').trim();
            setEmployeeFullName(fullName);
          }
        }
      } catch (err) {
        console.error("Could not access the employee list API");
      }
    };

    if (loggedUser?.employeeUserId) {
      getMasterData();
      fetchHistory();
    }
  }, []);

  // Today's date reference
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Find today's record in the history to toggle button state
  const todaysRecord = history.length > 0 
    ? history[0].records.find(rec => rec.date === todayStr) 
    : null;

  const hasIn = !!todaysRecord?.checkInTime;
  const hasOut = !!todaysRecord?.checkOutTime;

  const handleAttendanceAction = async () => {
    if (!loggedUser || !loggedUser.employeeUserId) {
      toast.error("You must be logged in!");
      return;
    }

  setLoading(true);
  try {
    const storageName = `${loggedUser.firstName || ""} ${loggedUser.lastName || ""}`.trim();
    const nameToStore = employeeFullName || storageName || loggedUser.employeeUserId;

    const res = await axios.post("http://localhost:5002/api/attendance/mark", {
      employeeId: loggedUser.employeeID,
      employeeUserId: loggedUser.employeeUserId,
      employeeName: nameToStore,
    });
    
    // Check if the backend returned a successful save but with an "Absent" status
    if (res.data.status === "Absent") {
      toast.error(res.data.message, { duration: 5000 }); // Red toast for late entry
    } else {
      toast.success(res.data.message); // Green toast for "Present" or "Out"
    }

    fetchHistory();
  } catch (err) {
    // This catches the 400 error (Too Early / No Shift) and shows the backend message
    const errorMsg = err.response?.data?.message || "Error marking attendance";
    toast.error(errorMsg);
  } finally {
    setLoading(false);
  }
};

  const filteredRecords = history.length > 0 
    ? history[0].records.filter(rec => rec.date.startsWith(selectedMonth))
    : [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <EmployeeCornerSidebar />
      <div className="flex-1 p-4 sm:p-6">
        
        {/* Top Header Section */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border-t-4 border-dorika-blue">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap">
              Daily Attendance
            </h2>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Filter:</span>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded-md p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* In/Out Toggle Button */}
            <button
              onClick={handleAttendanceAction}
              disabled={loading || (hasIn && hasOut)}
              className={`${
                hasIn ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
              } text-white px-8 py-2 rounded-lg font-bold transition-all shadow-md disabled:bg-gray-400 whitespace-nowrap`}
            >
              {loading ? "Processing..." : (hasIn && !hasOut) ? "OUT" : (hasIn && hasOut) ? "MARKED" : "IN"}
            </button>

            <div className="text-blue-600 font-semibold whitespace-nowrap">
              Today: {formatDateDisplay(todayStr)}
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-dorika-blue p-3 text-white font-bold text-center">
            Attendance History ({selectedMonth})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="p-3 border">Date</th>
            <th className="p-3 border">Shift</th>
            <th className="p-3 border text-green-600">Punch In</th> {/* New */}
            <th className="p-3 border">Shift Start</th> {/* New */}
            <th className="p-3 border">Shift End</th> {/* New */}
            <th className="p-3 border text-orange-600">Punch Out</th> {/* New */}
            <th className="p-3 border text-blue-600">Shift Work Time</th> {/* Official */}
            <th className="p-3 border text-purple-600">Actual Work Time</th>
            <th className="p-3 border">Status</th>
          </tr>
        </thead>
          <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.slice().reverse().map((rec, index) => {
                    // Keep your official calculation for the "Shift Work Time" column
                    const shiftWorkTime = calculateWorkTime(
                      rec.checkInTime, 
                      rec.checkOutTime, 
                      rec.shiftStartTime, 
                      rec.shiftEndTime
                    );

                    return (
                      <tr 
                        key={index} 
                        className={`border-b ${rec.status.includes('Holiday') ? 'bg-yellow-50' : 'hover:bg-blue-50'}`}
                      >
                        <td className="p-3 border font-medium">{formatDateDisplay(rec.date)}</td>
                        <td className="p-3 border font-bold text-indigo-600">{rec.shiftCode || "--"}</td>
                        <td className="p-3 border font-semibold text-green-700">{rec.checkInTime || "--"}</td>
                        <td className="p-3 border text-gray-500 font-semibold italic">{rec.shiftStartTime || "--"}</td>
                        <td className="p-3 border text-gray-500 font-semibold italic">{rec.shiftEndTime || "--"}</td>
                        <td className="p-3 border font-semibold text-orange-700">{rec.checkOutTime || "--"}</td>
                        
                        {/* 7. Shift Work Duration (Rounded) */}
                        <td className="p-3 border font-bold text-blue-700">
                          {rec.workDuration || "--"}
                        </td>

                        {/* 8. Actual Work Duration (Raw Punch Time from DB) */}
                        <td className="p-3 border font-bold text-purple-700">
                          {rec.actualWorkDuration || "--"}
                        </td>

                        <td className="p-3 border">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              rec.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {rec.status}
                            </span>
                            {(rec.isLateEntry || (rec.status === 'Present' && rec.isLate)) && (
                              <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">
                                Late Entry
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    {/* Changed colSpan to 9 to match new columns */}
                    <td colSpan="9" className="p-10 text-gray-400 italic text-center">No records found.</td>
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

export default EmployeeAttendance;