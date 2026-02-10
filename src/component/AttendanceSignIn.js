import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import bgImage from "../assets/dorikaLogo1.jpg";


const AttendanceSignIn = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeFullName, setEmployeeFullName] = useState("");
  const [alreadyMarked, setAlreadyMarked] = useState(false); // New state to track today's status
  
  const [shiftTimes, setShiftTimes] = useState({
    start: "--:--",
    end: "--:--"
  });

  const loggedUser = JSON.parse(localStorage.getItem("employeeUser"));

  useEffect(() => {
    // 1. Digital Clock
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 1000);

    const fetchData = async () => {
      try {
        const now = new Date();
        const dayKey = now.getDate(); 
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const shiftMonthStr = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;

        // STEP 1: Check if attendance is already marked for today
        const historyRes = await axios.get(`http://localhost:5002/api/attendance/my/${loggedUser.employeeUserId}`);
        if (historyRes.data && historyRes.data.length > 0) {
          const todaysRecord = historyRes.data[0].records.find(rec => rec.date === todayStr);
          if (todaysRecord && todaysRecord.checkInTime && todaysRecord.checkInTime !== "--") {
            setAlreadyMarked(true); // User already punched in today
          }
        }

        // STEP 2: Fetch Monthly Schedule
        const mgmtRes = await axios.get(`http://localhost:5002/api/shift-management/${shiftMonthStr}`);
        const mySchedule = mgmtRes.data.find(item => item.employeeUserId === loggedUser.employeeUserId);

        if (mySchedule && mySchedule.shifts) {
          const assignedShiftCode = mySchedule.shifts[dayKey] || mySchedule.shifts[dayKey.toString()];

          if (assignedShiftCode && assignedShiftCode !== "OFF") {
            const shiftMasterRes = await axios.get("http://localhost:5002/api/shifts");
            const allShifts = shiftMasterRes.data;

            if (assignedShiftCode.length === 2 && assignedShiftCode !== "DD") {
              const first = allShifts.find(s => s.shiftCode === assignedShiftCode[0]);
              const second = allShifts.find(s => s.shiftCode === assignedShiftCode[1]);
              if (first && second) setShiftTimes({ start: first.startTime, end: second.endTime });
            } else {
              const single = allShifts.find(s => s.shiftCode === assignedShiftCode);
              if (single) setShiftTimes({ start: single.startTime, end: single.endTime });
            }
          } else if (assignedShiftCode === "OFF") {
            setShiftTimes({ start: "WEEK OFF", end: "WEEK OFF" });
          }
        }

        // STEP 3: Fetch Name for validation
        const empRes = await axios.get("http://localhost:5002/api/employees");
        const empData = empRes.data.find(e => e.employeeUserId === loggedUser.employeeUserId);
        if (empData) {
          setEmployeeFullName(`${empData.firstName || ""} ${empData.lastName || ""}`.trim());
        }

      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    if (loggedUser?.employeeUserId) {
      fetchData();
    }
    return () => clearInterval(timer);
  }, [loggedUser?.employeeUserId]);

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject("Geolocation not supported");
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => reject("Location permission denied")
      );
    });
  };

  const handleOkClick = async () => {
    if (!loggedUser || alreadyMarked) return;
    setLoading(true);
    try {
      const loc = await getLocation();
      const res = await axios.post("http://localhost:5002/api/attendance/mark", {
        employeeId: loggedUser.employeeID,
        employeeUserId: loggedUser.employeeUserId,
        employeeName: employeeFullName || loggedUser.employeeUserId,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });

      toast.success(res.data.message);
      navigate("/EmployeeAttendance");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error marking attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
   <div
      className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-0"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/60"></div>

      
       <div className="relative z-10 w-full max-w-xs sm:max-w-sm bg-white rounded-lg shadow-xl overflow-hidden mx-auto ">      
        <div className="bg-indigo-600 text-white px-3 sm:px-4 py-2 flex justify-between items-center">
          <span className="font-semibold">Attendance Sign In</span>
          <button onClick={() => navigate("/EmployeeAttendance")} className="text-xl font-bold">×</button>
        </div>

        <div className="p-4 text-center">
          {alreadyMarked ? (
            <p className="text-orange-600 font-bold bg-orange-50 p-2 rounded border border-orange-200">
              You have already punched in for today.
            </p>
          ) : (
            <p className="font-medium text-gray-700">Would you like to sign in Attendance?</p>
          )}
        </div>

       <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm sm:text-sm">
            <tbody>
              <tr>
                <td className="border py-1 px-4  bg-gray-100 text-gray-600 font-medium">Date</td>
                <td className="border py-1 px-4 text-center font-semibold">{new Date().toLocaleDateString("en-GB")}</td>
              </tr>
              <tr>
                <td className="border py-1 px-4  bg-gray-100 text-gray-600 font-medium">Shift Start Time</td>
                <td className="border py-1 px-4 font-bold text-indigo-700 text-center">{shiftTimes.start}</td>
              </tr>
              <tr>
                <td className="border py-1 px-4  bg-gray-100 text-gray-600 font-medium">Shift End Time</td>
                <td className="border py-1 px-4 font-bold text-indigo-700 text-center">{shiftTimes.end}</td>
              </tr>
              <tr>
                <td className="border py-1 px-4  bg-gray-100 text-gray-600 font-medium">Current Time</td>
                <td className="border py-1 px-4 font-bold text-green-700 text-center">{currentTime}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 py-6">
          <button 
            onClick={handleOkClick}
            disabled={loading || alreadyMarked || shiftTimes.start === "WEEK OFF" || shiftTimes.start === "--:--"}
            className="bg-indigo-600 text-white px-3 sm:px-4 py-1 sm:py-1 rounded font-bold shadow hover:bg-indigo-700 w-full sm:w-auto disabled:bg-gray-400 transition-all"
          >
            {alreadyMarked ? "MARKED" : loading ? "..." : "YES"}
          </button>
          <button onClick={() => navigate("/EmployeeAttendance")} className="bg-gray-500 text-white px-3 py-1 rounded font-bold shadow hover:bg-gray-600 transition-all">
            {alreadyMarked ? "CLOSE" : "NO"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSignIn;