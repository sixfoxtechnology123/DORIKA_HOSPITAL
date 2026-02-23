import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCogs, FaDatabase, FaUserPlus } from "react-icons/fa";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-teal-200">
      <h1 className="text-4xl font-bold text-gray-800 mb-10">Welcome to HRMS</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 justify-center">
        {/* Admin Panel Box */}
        <div
          className="group p-6 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-green-100 transition"
          onClick={() => navigate("/Dashboard")}
        >
          <FaCogs size={60} className="mx-auto text-green-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Dashboard
          </h2>
        </div>

        {/* Master Box */}
        <div
          className="group p-6 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-blue-100 transition"
          onClick={() => navigate("/masterpage")}
        >
          <FaDatabase size={60} className="mx-auto text-blue-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Master
          </h2>
        </div>

        {/* Add New Employee Box */}
        <div
          className="group p-6 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-yellow-100 transition"
          onClick={() => navigate("/EmployeeList")}
        >
          <FaUserPlus size={60} className="mx-auto text-yellow-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            New Employee
          </h2>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
