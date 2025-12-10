import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import BackButton from "../component/BackButton";
import Sidebar from '../component/Sidebar';

const ShiftList = () => {
  const [shifts, setShifts] = useState([]);
  const navigate = useNavigate();

  const fetchShifts = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/shifts");
      setShifts(res.data);
    } catch (err) {
      console.error("Fetch Shifts Error:", err);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const deleteShift = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/shifts/${id}`);
      setShifts(shifts.filter((s) => s._id !== id));
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
        <h2 className="text-xl font-bold text-green-800">Shift</h2>
        <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate("/shiftMaster")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Add Shift
          </button>
        </div>
      </div>

      <table className="w-full table-auto border border-green-500">
        <thead className="bg-gray-200 text-sm">
          <tr>
            <th className="border border-green-500 px-2 py-1">Shift ID</th>
            <th className="border border-green-500 px-2 py-1">Shift Name</th>
            <th className="border border-green-500 px-2 py-1">Start Time</th>
            <th className="border border-green-500 px-2 py-1">End Time</th>
            <th className="border border-green-500 px-2 py-1">Break (min)</th>
            <th className="border border-green-500 px-2 py-1">Status</th>
            <th className="border border-green-500 px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {shifts.length > 0 ? (
            shifts.map((s) => (
              <tr key={s._id} className="hover:bg-gray-100 transition">
                <td className="border border-green-500 px-2 py-1">{s.shiftID}</td>
                <td className="border border-green-500 px-2 py-1">{s.shiftName}</td>
                <td className="border border-green-500 px-2 py-1">{s.startTime}</td>
                <td className="border border-green-500 px-2 py-1">{s.endTime}</td>
                <td className="border border-green-500 px-2 py-1">{s.breakDuration}</td>
                <td className="border border-green-500 px-2 py-1">{s.status}</td>
                <td className="border border-green-500 px-2 py-1">
                  <div className="flex justify-center gap-8">
                    <button
                      onClick={() =>
                        navigate("/shiftMaster", { state: { shift: s } })
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteShift(s._id)}
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
                No shifts found.
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

export default ShiftList;
