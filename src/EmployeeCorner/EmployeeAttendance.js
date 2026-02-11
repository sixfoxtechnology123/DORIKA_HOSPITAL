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
const formatOTDisplay = (otValue) => {
  const val = parseFloat(otValue);
  if (!val || val <= 0) return "--";
  const totalMinutes = Math.round(val * 60);
  if (totalMinutes < 240) return "--";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};


const EmployeeAttendance = () => {
  const [history, setHistory] = useState([]);
  const [location, setLocation] = useState(null);
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

// --- NEW LOGIC FOR NIGHT SHIFT ---
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Get Yesterday's date string
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  
  const allRecords = history.length > 0 ? history[0].records : [];
  
  // Find records for both days
  const todaysRecord = allRecords.find(rec => rec.date === todayStr);
  const yesterdaysRecord = allRecords.find(rec => rec.date === yesterdayStr);

  // Check if Yesterday's night shift is still waiting for a Punch Out
  const isNightShiftPending = yesterdaysRecord && 
                             yesterdaysRecord.checkInTime && 
                             (!yesterdaysRecord.checkOutTime || yesterdaysRecord.checkOutTime === "--" || yesterdaysRecord.checkOutTime === "");

  // Update button status
  // If night shift is pending, we use yesterday's status. Otherwise, use today's.
  const hasIn = isNightShiftPending || (todaysRecord && !!todaysRecord.checkInTime);
  const hasOut = isNightShiftPending ? false : (todaysRecord && !!todaysRecord.checkOutTime && todaysRecord.checkOutTime !== "--");
  // ---------------------------------

  const getLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation not supported");
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => reject("Location permission denied")
    );
  });
};

  const handleAttendanceAction = async () => {
    if (!loggedUser || !loggedUser.employeeUserId) {
      toast.error("You must be logged in!");
      return;
    }

  setLoading(true);
  try {
    const storageName = `${loggedUser.firstName || ""} ${loggedUser.lastName || ""}`.trim();
    const nameToStore = employeeFullName || storageName || loggedUser.employeeUserId;
    const loc = await getLocation();
    const res = await axios.post("http://localhost:5002/api/attendance/mark", {
      employeeId: loggedUser.employeeID,
      employeeUserId: loggedUser.employeeUserId,
      employeeName: nameToStore,
      latitude: loc.latitude,
      longitude: loc.longitude,
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
        {/* Changed flex-col to a grid on mobile, and flex-row on larger screens */}
        <div className="grid grid-cols-2 md:flex md:flex-row items-center justify-between gap-4">
          
          {/* 1. Title - Stays left */}
          <h2 className="text-lg md:text-xl font-bold text-gray-800 whitespace-nowrap order-1">
            Daily Attendance
          </h2>

          {/* 2. Today's Date - Moves to top right on mobile */}
          <div className="text-blue-600 font-semibold whitespace-nowrap text-sm md:text-base text-right order-2 md:order-4">
            {formatDateDisplay(todayStr)}
          </div>

          {/* 3. Filter - Bottom left on mobile */}
          <div className="flex items-center gap-2 order-3 md:order-2">
            <span className="text-xs md:text-sm font-medium text-gray-500">Filter:</span>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-md p-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full max-w-[120px]"
            />
          </div>

          {/* 4. Action Button - Bottom right on mobile */}
          <div className="flex justify-end order-4 md:order-3">
            <button
              onClick={handleAttendanceAction}
              disabled={loading || (hasIn && hasOut)}
              className={`${
                hasIn ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
              } text-white px-4 md:px-8 py-1 rounded-lg font-bold transition-all shadow-md disabled:bg-gray-400 whitespace-nowrap text-sm md:text-base w-full md:w-auto`}
            >
              {loading 
                ? "..." 
                : isNightShiftPending 
                  ? "OUT" 
                  : (hasIn && !hasOut) 
                    ? "OUT" 
                    : (hasIn && hasOut) 
                      ? "MARKED" 
                      : "IN"}
            </button>
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
            <th className="p-3 border text-red-600">OT Hours</th>
            <th className="p-3 border">Status</th>
          </tr>
        </thead>
          <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.slice().reverse().map((rec, index) => {
                   

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
                        {rec.isOT && rec.otHours > 0 ? (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold">
                        {formatOTDisplay(rec.otHours)}
                      </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                       <td className="p-3 border">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            rec.status === 'Present' ? 'bg-green-100 text-green-700' :
                            rec.status === 'Absent'  ? 'bg-red-100 text-red-700' :
                            rec.status === 'OFF'     ? 'bg-gray-100 text-gray-700' :
                            rec.status.includes('SL') ? 'bg-orange-100 text-orange-700' :
                            rec.status.includes('CL') ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700' // Default for Holidays or others
                          }`}>
                            {rec.status}
                          </span>
                          
                          {/* Late Entry Indicator */}
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