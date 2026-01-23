import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
};

const calculateWorkTime = (inTime, outTime) => {
  if (!inTime || !outTime || inTime === "--" || outTime === "--") return "--";

  const parseTime = (t) => {
    const [time, modifier] = t.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  try {
    const diff = parseTime(outTime) - parseTime(inTime);
    if (diff <= 0) return "--"; 
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  } catch (e) {
    return "--";
  }
};

const EmployeeAttendance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeeFullName, setEmployeeFullName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
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
            const fullName = `${targetEmployee.firstName || ""} ${targetEmployee.middleName || ""} ${targetEmployee.lastName || ""}`.replace(/\s+/g, ' ').trim();
            setEmployeeFullName(fullName);
          }
        }
      } catch (err) {
        console.error("Master data fetch failed");
      }
    };

    if (loggedUser?.employeeUserId) {
      getMasterData();
      fetchHistory();
    }
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysRecord = history.length > 0 ? history[0].records.find(rec => rec.date === todayStr) : null;
  const hasIn = !!todaysRecord?.checkInTime;
  const hasOut = !!todaysRecord?.checkOutTime;

  const handleAttendanceAction = async () => {
    setLoading(true);
    try {
      const storageName = `${loggedUser.firstName || ""} ${loggedUser.lastName || ""}`.trim();
      const nameToStore = employeeFullName || storageName;

      const res = await axios.post("http://localhost:5002/api/attendance/mark", {
        employeeId: loggedUser.employeeID,
        employeeUserId: loggedUser.employeeUserId,
        employeeName: nameToStore,
      });
      
      // Logic for Late Entry vs Present based on 15 min rule
      if (res.data.isLate) {
        toast.error("Late Entry Marked as Present", { icon: '⚠️' });
      } else {
        toast.success(res.data.message);
      }

      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error marking attendance");
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
        
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border-t-4 border-dorika-blue">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-800">Daily Attendance</h2>
            <div className="flex items-center gap-4">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded-md p-1 text-sm focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleAttendanceAction}
                disabled={loading || (hasIn && hasOut)}
                className={`${hasIn ? "bg-orange-600" : "bg-green-600"} text-white px-8 py-2 rounded-lg font-bold shadow-md disabled:bg-gray-400`}
              >
                {loading ? "..." : (hasIn && !hasOut) ? "OUT" : (hasIn && hasOut) ? "MARKED" : "IN"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead className="bg-dorika-blue text-white">
                <tr>
                  <th className="p-3 border">Date</th>
                  <th className="p-3 border">In Time</th>
                  <th className="p-3 border bg-blue-800">Shift Start</th>
                  <th className="p-3 border bg-blue-800">Shift End</th>
                  <th className="p-3 border">Out Time</th>
                  <th className="p-3 border text-blue-200">Work Time</th>
                  <th className="p-3 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.slice().reverse().map((rec, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 border font-medium">{formatDateDisplay(rec.date)}</td>
                      
                      {/* Actual In Time */}
                      <td className="p-3 border text-green-700 font-bold">{rec.checkInTime || "--"}</td>
                      
                      {/* Shift Start Time */}
                      <td className="p-3 border text-gray-500 italic">{rec.shiftStartTime || "--"}</td>
                      
                      {/* Shift End Time */}
                      <td className="p-3 border text-gray-500 italic">{rec.shiftEndTime || "--"}</td>
                      
                      {/* Actual Out Time */}
                      <td className="p-3 border text-orange-700 font-bold">{rec.checkOutTime || "--"}</td>

                      <td className="p-3 border font-bold">{calculateWorkTime(rec.checkInTime, rec.checkOutTime)}</td>
                      
                      <td className="p-3 border">
                        <div className="flex flex-col gap-1 items-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {rec.status}
                          </span>
                          {/* Showing Late Entry Message */}
                          {rec.isLate && (
                            <span className="text-[9px] text-red-600 font-black animate-pulse">LATE ENTRY</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="p-10 text-gray-400">No records found.</td></tr>
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