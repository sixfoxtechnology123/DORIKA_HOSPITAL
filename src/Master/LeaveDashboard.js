import React from "react";
import Sidebar from "../component/Sidebar";
import { CalendarCheck, UserCheck, ClipboardList } from "lucide-react";

const LeaveDashboard = () => {
  return (
    <div className="min-h-screen bg-zinc-300 flex">
        <Sidebar />

        <div className="flex-1 p-3 overflow-y-auto">
          <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
      <div className="flex flex-col items-center justify-center h-[100vh] w-full bg-gray-50">
        <div className="flex space-x-8 mb-6">
          <CalendarCheck size={64} className="text-sky-600" />
          <UserCheck size={64} className="text-green-600" />
          <ClipboardList size={64} className="text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">
          Leave Management Dashboard
        </h2>
        <p className="text-gray-500">
          View and manage employee leaves, rules, and reports.
        </p>
      </div>
    </div>
    </div>
    </div>
  );
};

export default LeaveDashboard;
