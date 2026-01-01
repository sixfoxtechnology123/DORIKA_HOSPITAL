import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import toast from "react-hot-toast";

// Updated status flow as per your 2 phases
const STATUS_RULES = {
  // Phase 1: Fresher Flow
  TP: { months: 6, next: "TR" },
  TR: { months: 6, next: "TEP" },
  TEP: { months: 6, next: "P" },
  
  // Phase 2: Experienced Flow & Doctor Flow
  PB: { months: 6, next: "P" },
  PDP: { months: 6, next: "PD" },
  
  // Permanent / Ex-Employee (No next auto-status)
  P: null,
  PD: null,
  EX: null
};

const STATUS_LABELS = {
  TP: "Trainee Probation",
  TR: "Trainee",
  TEP: "Trainee Employee Probation",
  PB: "Probation",
  P: "Permanent",
  PDP: "Permanent Doctor Probation",
  PD: "Permanent Doctor",
  EX: "Ex-Employee",
};

const ReminderPage = () => {
  const [reminderList, setReminderList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [activeTab, setActiveTab] = useState("reminder");
  const navigate = useNavigate();

  useEffect(() => {
    fetchReminderData();
  }, []);

  const fetchReminderData = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/employees");
      const today = new Date();

      // Process Reminders
      const reminders = res.data
        .filter(emp => STATUS_RULES[emp.employmentStatus] && STATUS_RULES[emp.employmentStatus].next !== null)
        .map(emp => {
          const rule = STATUS_RULES[emp.employmentStatus];
          const statusChangeDate = new Date(emp.statusChangeDate);
          const endDate = new Date(statusChangeDate);
          endDate.setMonth(endDate.getMonth() + rule.months);

          const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

          return {
            rawEmployee: emp,
            employeeID: emp.employeeID,
            name: `${emp.firstName} ${emp.middleName || ""} ${emp.lastName}`,
            department: emp.departmentName,
            designation: emp.designationName,
            statusChangeDate: emp.statusChangeDate,
            currentStatus: STATUS_LABELS[emp.employmentStatus] || emp.employmentStatus,
            nextStatus: STATUS_LABELS[rule.next] || rule.next,
            remainingDays,
            changeAvailable: remainingDays <= 0,
          };
        });

      // Process History
      const history = res.data.map(emp => ({
        employeeID: emp.employeeID,
        name: `${emp.firstName} ${emp.middleName || ""} ${emp.lastName}`,
        beforeStatus: "N/A", // Usually requires a separate history table from backend
        beforeDate: "N/A",
        currentStatus: STATUS_LABELS[emp.employmentStatus] || emp.employmentStatus,
        currentDate: emp.statusChangeDate ? emp.statusChangeDate.split("T")[0] : "N/A",
      }));

      setReminderList(reminders);
      setHistoryList(history);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reminder data");
    }
  };

  const handleGoChange = (employee) => {
    navigate("/EmployeeMaster", {
      state: { employee: employee },
    });
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">Employee Status Reminder</h2>
            <BackButton />
          </div>

          <div className="flex gap-4 mb-3">
            <button onClick={() => setActiveTab("reminder")} className={`px-4 py-1 rounded font-semibold ${activeTab === "reminder" ? "bg-dorika-blue text-white" : "bg-gray-200 text-gray-700"}`}>
              Reminder
            </button>
            <button onClick={() => setActiveTab("history")} className={`px-4 py-1 rounded font-semibold ${activeTab === "history" ? "bg-dorika-blue text-white" : "bg-gray-200 text-gray-700"}`}>
              History
            </button>
          </div>

          {activeTab === "reminder" && (
            <table className="w-full table-auto border border-dorika-blue text-sm">
              <thead className="bg-dorika-blue text-white">
                <tr>
                  <th className="border px-2 py-1">S.No</th>
                  <th className="border px-2 py-1">Employee ID</th>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Designation</th>
                  <th className="border px-2 py-1">Current Status</th>
                  <th className="border px-2 py-1">Days Left</th>
                  <th className="border px-2 py-1">Next Status</th>
                  <th className="border px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {reminderList.length > 0 ? (
                  reminderList.map((emp, index) => (
                    <tr key={index} className="hover:bg-dorika-blueLight">
                      <td className="border px-2 py-1">{index + 1}</td>
                      <td className="border px-2 py-1">{emp.employeeID}</td>
                      <td className="border px-2 py-1">{emp.name}</td>
                      <td className="border px-2 py-1">{emp.designation}</td>
                      <td className="border px-2 py-1">{emp.currentStatus}</td>
                      <td className={`border px-2 py-1 font-semibold ${emp.changeAvailable ? "text-orange-600" : "text-green-600"}`}>
                        {emp.changeAvailable ? "Eligible for Change" : emp.remainingDays}
                      </td>
                      <td className="border px-2 py-1">{emp.nextStatus}</td>
                      <td className="border px-2 py-1">
                        {emp.changeAvailable && (
                          <button onClick={() => handleGoChange(emp.rawEmployee)} className="bg-orange-500 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold">
                            GO TO CHANGE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8" className="py-4 text-gray-500">No eligibility for status change found.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === "history" && (
            <table className="w-full table-auto border border-dorika-blue text-sm">
              <thead className="bg-dorika-blue text-white">
                <tr>
                  <th className="border px-2 py-1">S.No</th>
                  <th className="border px-2 py-1">Employee ID</th>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Before Status</th>
                  <th className="border px-2 py-1">Before Date</th>
                  <th className="border px-2 py-1">Current Status</th>
                  <th className="border px-2 py-1">Current Date</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {historyList.map((h, i) => (
                  <tr key={i} className="hover:bg-dorika-blueLight">
                    <td className="border px-2 py-1">{i + 1}</td>
                    <td className="border px-2 py-1">{h.employeeID}</td>
                    <td className="border px-2 py-1">{h.name}</td>
                    <td className="border px-2 py-1">{h.beforeStatus}</td>
                    <td className="border px-2 py-1">{h.beforeDate}</td>
                    <td className="border px-2 py-1 font-bold">{h.currentStatus}</td>
                    <td className="border px-2 py-1">{h.currentDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderPage;