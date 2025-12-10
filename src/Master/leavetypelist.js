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
      const res = await axios.get("http://localhost:5001/api/leavetypes");
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
      await axios.delete(`http://localhost:5001/api/leavetypes/${id}`);
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
      <div className="bg-green-50 border border-green-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-green-800">Leave Type</h2>
        <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate("/leavetypeMaster")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Manage New Leave Type
          </button>
        </div>
      </div>

      <table className="w-full table-auto border border-green-500">
        <thead className="bg-gray-200 text-sm">
          <tr>
            <th className="border border-green-500 px-2 py-1">S.No</th>
            <th className="border border-green-500 px-2 py-1">Leave Type ID</th>
            <th className="border border-green-500 px-2 py-1">Leave Name</th>
            <th className="border border-green-500 px-2 py-1">alies</th>
            {/* <th className="border border-green-500 px-2 py-1">Annual Quota</th>
            <th className="border border-green-500 px-2 py-1">Carry Forward</th> */}
            <th className="border border-green-500 px-2 py-1">Remarks</th>
            <th className="border border-green-500 px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {leaveTypes.length > 0 ? (
            leaveTypes.map((lt,index) => (
              <tr key={lt._id} className="hover:bg-gray-100 transition">
                <td className="border border-green-500 px-2 py-1">{index + 1}</td> 
                <td className="border border-green-500 px-2 py-1">{lt.leaveTypeID}</td>
                <td className="border border-green-500 px-2 py-1">{lt.leaveName}</td>
                <td className="border border-green-500 px-2 py-1">{lt.leaveCode}</td>
                {/* <td className="border border-green-500 px-2 py-1">{lt.annualQuota}</td>
                <td className="border border-green-500 px-2 py-1">{lt.carryForward}</td> */}
                <td className="border border-green-500 px-2 py-1">{lt.remarks}</td>
                <td className="border border-green-500 px-2 py-1">
                  <div className="flex justify-center gap-8">
                    <button
                      onClick={() =>
                        navigate("/leavetypeMaster", { state: { leaveType: lt } })
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteLeaveType(lt._id)}
                      className="text-red-600 hover:text-red-800"
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
  );
};

export default LeaveTypeList;
