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

const EmployeeAttendance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeeFullName, setEmployeeFullName] = useState("");
  
  // New state for filtering
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

  const handleCheckIn = async () => {
    const user = JSON.parse(localStorage.getItem("employeeUser"));
    if (!user || !user.employeeUserId) {
      toast.error("You must be logged in to mark attendance!");
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
  const isAlreadyMarked = history[0]?.records?.some(
    (rec) => rec.date === todayStr && rec.status === "Present"
  );

  if (isAlreadyMarked) {
    toast.error("Attendance already marked for today!");
    return;
  }
    setLoading(true);
    try {
      const storageName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      const nameToStore = employeeFullName || storageName || user.employeeUserId;

      await axios.post("http://localhost:5002/api/attendance/mark", {
        employeeId: user.employeeID,
        employeeUserId: user.employeeUserId,
        employeeName: nameToStore 
      });
      
      toast.success(`Attendance marked for ${nameToStore}`);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error marking attendance");
    } finally {
      setLoading(false);
    }
  };

  // Filter records based on selected month
  const filteredRecords = history.length > 0 
    ? history[0].records.filter(rec => rec.date.startsWith(selectedMonth))
    : [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <EmployeeCornerSidebar />
      <div className="flex-1 p-4 sm:p-6">
        
        {/* Responsive One-Line Header Container */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border-t-4 border-dorika-blue">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* 1. Left side: Title */}
            <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap">
              Daily Attendance
            </h2>

            {/* 2. Calendar Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Filter:</span>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded-md p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* 3. Mark Present Button */}
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md disabled:bg-gray-400 whitespace-nowrap"
            >
              {loading ? "Processing..." : "MARK PRESENT"}
            </button>

            {/* 4. Current Date */}
            <div className="text-blue-600 font-semibold whitespace-nowrap">
              Today: {formatDateDisplay(new Date().toISOString().split('T')[0])}
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
                  <th className="p-3 border">Date (DD-MM-YYYY)</th>
                  <th className="p-3 border">Check-In Time</th>
                  <th className="p-3 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.slice().reverse().map((rec, index) => (
                    <tr 
                      key={index} 
                      className={`border-b ${rec.status === 'Holiday' ? 'bg-yellow-50' : 'hover:bg-blue-50'}`}
                    >
                      <td className="p-3 border font-medium">
                        {formatDateDisplay(rec.date)}
                      </td>
                      <td className="p-3 border">{rec.checkInTime || "--"}</td>
                      <td className="p-3 border">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          rec.status === 'Present' 
                            ? 'bg-green-100 text-green-700' 
                            : rec.status === 'Holiday' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700' 
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-10 text-gray-400 italic">No attendance records found for this period.</td>
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