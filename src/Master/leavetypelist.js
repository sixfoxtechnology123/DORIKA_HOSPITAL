import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import BackButton from "../component/BackButton";
import Sidebar from '../component/Sidebar';
import toast from "react-hot-toast";


const LeaveTypeList = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const navigate = useNavigate();

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/leavetypes");
      setLeaveTypes(res.data);
    } catch (err) {
      console.error("Fetch LeaveTypes Error:", err);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const deleteLeaveType = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave type?"))
      return;
    try {
      await axios.delete(`http://localhost:5002/api/leavetypes/${id}`);
      setLeaveTypes(leaveTypes.filter((lt) => lt._id !== id));
      toast.success("Leave type deleted successfully")
    } catch (err) {
      console.error(err);
    }
  };

  return (
  <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 overflow-y-auto">
    <div className="p-3 bg-white shadow-md rounded-md">
      <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
  
        {/* Desktop and mobile: title left, back button right */}
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-dorika-blue">Leave Type</h2>
          <div className="sm:hidden">
            <BackButton />
          </div>
          <div className="hidden sm:flex gap-2">
            <BackButton />
          </div>
        </div>

        {/* Manage button always at bottom on mobile */}
        <div className="mt-2 sm:mt-0">
          <button
            onClick={() => navigate("/leavetypeMaster")}
            className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold whitespace-nowrap w-full sm:w-auto"
          >
            Manage New Leave Type
          </button>
        </div>
      </div>

<div className="overflow-x-auto">
      <table className="w-full table-auto border border-dorika-blue">
        <thead className="bg-dorika-blue text-white text-sm">
          <tr>
            <th className="border border-dorika-blue px-2 py-1">S.No</th>
            <th className="border border-dorika-blue px-2 py-1">Leave Type ID</th>
            <th className="border border-dorika-blue px-2 py-1">Leave Name</th>
            <th className="border border-dorika-blue px-2 py-1">Alies</th>
            <th className="border border-dorika-blue px-2 py-1">Total Days</th>
            {/* <th className="border border-dorika-blue px-2 py-1">Annual Quota</th>
            <th className="border border-dorika-blue px-2 py-1">Carry Forward</th> */}
            <th className="border border-dorika-blue px-2 py-1">Remarks</th>
            <th className="border border-dorika-blue px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {leaveTypes.length > 0 ? (
            leaveTypes.map((lt,index) => (
              <tr key={lt._id} className="hover:bg-dorika-blueLight transition">
                <td className="border border-dorika-blue px-2 py-1">{index + 1}</td> 
                <td className="border border-dorika-blue px-2 py-1">{lt.leaveTypeID}</td>
                <td className="border border-dorika-blue px-2 py-1">{lt.leaveName}</td>
                <td className="border border-dorika-blue px-2 py-1">{lt.leaveCode}</td>
                <td className="border border-dorika-blue px-2 py-1">{lt.totalDays}</td>
                {/* <td className="border border-dorika-blue px-2 py-1">{lt.annualQuota}</td>
                <td className="border border-dorika-blue px-2 py-1">{lt.carryForward}</td> */}
                <td className="border border-dorika-blue px-2 py-1">{lt.remarks}</td>
                <td className="border border-dorika-blue px-2 py-1">
                  <div className="flex justify-center gap-8">
                    <button
                      onClick={() =>
                        navigate("/leavetypeMaster", { state: { leaveType: lt } })
                      }
                      className="text-dorika-blue hover:text-dorika-green"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteLeaveType(lt._id)}
                      className="text-dorika-orange hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center py-4 text-gray-500">
                No leave types found.
              </td>
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

export default LeaveTypeList;
