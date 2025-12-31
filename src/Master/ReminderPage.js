import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import toast from "react-hot-toast";

const STATUS_RULES = {
  TP: { months: 6, next: "TR" },
  TR: { months: 6, next: "TEP" },
  TEP: { months: 6, next: "PB" },
  PB: { months: 6, next: "P" },
  PDP: { months: 6, next: "PD" },
};

const ReminderPage = () => {
  const [reminderList, setReminderList] = useState([]);
  const [activeTab, setActiveTab] = useState("reminder");
  const navigate = useNavigate();

  useEffect(() => {
    fetchReminderData();
  }, []);

  const fetchReminderData = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/employees");
      const today = new Date();

      const reminders = res.data
        .filter(emp => STATUS_RULES[emp.employmentStatus])
        .map(emp => {
          const rule = STATUS_RULES[emp.employmentStatus];
          const doj = new Date(emp.doj);

          const endDate = new Date(doj);
          endDate.setMonth(endDate.getMonth() + rule.months);

          const remainingDays = Math.ceil(
            (endDate - today) / (1000 * 60 * 60 * 24)
          );

          return {
            rawEmployee: emp, // 🔥 full data for prefill
            employeeID: emp.employeeID,
            name: `${emp.firstName} ${emp.middleName || ""} ${emp.lastName}`,
            department: emp.departmentName,
            designation: emp.designationName,
            doj: emp.doj,
            currentStatus: emp.employmentStatus,
            nextStatus: rule.next,
            remainingDays,
            changeAvailable: remainingDays <= 0,
          };
        });

      setReminderList(reminders);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reminder data");
    }
  };

const handleGoChange = (employee) => {
  navigate("/EmployeeMaster", {
    state: { employee: employee }, // must match EmployeeMaster
  });
};



  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">

          {/* HEADER */}
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">
              Employee Status Reminder
            </h2>
            <div className="flex gap-2">
              <BackButton />
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-4 mb-3">
            <button
              onClick={() => setActiveTab("reminder")}
              className={`px-4 py-1 rounded font-semibold ${
                activeTab === "reminder"
                  ? "bg-dorika-blue text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Reminder
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-1 rounded font-semibold ${
                activeTab === "history"
                  ? "bg-dorika-blue text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              History
            </button>
          </div>

          {/* REMINDER TABLE */}
          {activeTab === "reminder" && (
            <table className="w-full table-auto border border-dorika-blue text-sm">
              <thead className="bg-dorika-blue text-white">
                <tr>
                  <th className="border px-2 py-1">S.No</th>
                  <th className="border px-2 py-1">Employee ID</th>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Department</th>
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
                      <td className="border px-2 py-1">{emp.department}</td>
                      <td className="border px-2 py-1">{emp.designation}</td>
                      <td className="border px-2 py-1">{emp.currentStatus}</td>

                      <td
                        className={`border px-2 py-1 font-semibold ${
                          emp.changeAvailable
                            ? "text-dorika-orange"
                            : "text-dorika-green"
                        }`}
                      >
                        {emp.changeAvailable
                          ? "Status Change Available"
                          : emp.remainingDays}
                      </td>

                      <td className="border px-2 py-1">{emp.nextStatus}</td>

                      <td className="border px-2 py-1">
                        {emp.changeAvailable && (
                          <button
                            onClick={() => handleGoChange(emp.rawEmployee)}
                            className="bg-dorika-orange hover:bg-dorika-blue text-white px-3 py-1 rounded font-semibold"
                          >
                            GO to CHANGE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-4 text-gray-500">
                      No reminder data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* HISTORY PLACEHOLDER */}
          {activeTab === "history" && (
            <div className="text-center text-gray-500 py-10">
              History module will be shown here.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ReminderPage;
