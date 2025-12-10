// EmployeeDashboard.js
import React from "react";
import { FaUserTie } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const EmployeeDashboard = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/EmployeeHome"); // Navigate to UserProfile page
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-200 p-4">
      {/* Centered rectangle card */}
      <div
        onClick={handleClick}
        className="cursor-pointer bg-white shadow-xl rounded-2xl px-12 py-10 flex flex-col items-center hover:shadow-2xl transition-shadow duration-300"
      >
        {/* Modern icon with gradient background */}
        <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full p-6 mb-4 flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
          <FaUserTie className="text-6xl text-white" />
        </div>
        <span className="text-2xl font-semibold text-gray-800">Employee</span>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
