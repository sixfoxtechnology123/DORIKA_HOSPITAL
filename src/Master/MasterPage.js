import React from "react";
import { useNavigate } from "react-router-dom";
import { FaClinicMedical, FaUserTie, FaCalendarCheck, FaRegCalendarAlt, FaClock, FaFileContract,FaMapMarkerAlt,FaMoneyBillWave } from "react-icons/fa"; 
import BackButton from "../component/BackButton"; // adjust path if needed

const MasterPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-teal-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-10">Master Data</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 justify-center">
        {/* Department Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-pink-100 transition"
          onClick={() => navigate("/DepartmentList")}
        >
          <FaClinicMedical size={60} className="mx-auto text-pink-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Department
          </h2>
        </div>

        {/* Designation Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-green-100 transition"
          onClick={() => navigate("/DesignationList")}
        >
          <FaUserTie size={60} className="mx-auto text-green-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Designation
          </h2>
        </div>

        {/* Leave Type Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-blue-100 transition"
          onClick={() => navigate("/LeaveTypeList")}
        >
          <FaCalendarCheck size={60} className="mx-auto text-blue-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Leave Type
          </h2>
        </div>
        {/* Holiday Master Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-yellow-100 transition"
          onClick={() => navigate("/HolidayList")}
        >
          <FaRegCalendarAlt size={60} className="mx-auto text-yellow-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Holiday
          </h2>
        </div>
         {/* Shift Master Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-purple-100 transition"
          onClick={() => navigate("/ShiftList")}
        >
          <FaClock size={60} className="mx-auto text-purple-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Shift
          </h2>
        </div>
        
        {/* Policy Master Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-red-100 transition"
          onClick={() => navigate("/PolicyList")}
        >
          <FaFileContract size={60} className="mx-auto text-red-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Policy
          </h2>
        </div>
        {/* Location Master Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-indigo-100 transition"
          onClick={() => navigate("/LocationList")}
        >
          <FaMapMarkerAlt size={60} className="mx-auto text-indigo-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Location
          </h2>
        </div>
        {/* Payroll Component Box */}
        <div
          className="group p-4 bg-white shadow-lg rounded-xl text-center cursor-pointer hover:bg-teal-200 transition"
          onClick={() => navigate("/PayrollComponentList")}
        >
          <FaMoneyBillWave size={60} className="mx-auto text-teal-600" />
          <h2 className="mt-6 text-2xl font-semibold transform transition-transform duration-300 group-hover:-translate-y-1">
            Payroll Component
          </h2>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-10">
        <BackButton />
      </div>
    </div>
  );
};

export default MasterPage;
