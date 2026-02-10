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
      const res = await axios.get("http://localhost:5002/api/shifts");
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
      await axios.delete(`http://localhost:5002/api/shifts/${id}`);
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
      <div className="bg-dorika-blueLight border border-green-300 rounded-lg shadow-md p-2 mb-4 flex flex-row justify-between items-center gap-2">
        <h2 className="text-xl font-bold text-dorika-blue">Shift</h2>
        <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate("/shiftMaster")}
            className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Add Shift
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <table className="min-w-[750px] w-full border border-dorika-blue bg-white text-[11px] sm:text-sm border-collapse">
        <thead className="bg-dorika-blue text-white text-[11px] sm:text-sm">
          <tr>
            <th className="border border-dorika-blue px-2 py-1 whitespace-nowrap">Shift ID</th>
            <th className="border border-dorika-blue px-2 py-1 whitespace-nowrap">Shift Name</th>
            <th className="border border-dorika-blue px-2 py-1 whitespace-nowrap">Start Time</th>
            <th className="border border-dorika-blue px-2 py-1 whitespace-nowrap">End Time</th>
            <th className="border border-dorika-blue px-2 py-1 whitespace-nowrap">Break (min)</th>
            <th className="border border-dorika-blue px-2 py-1 whitespace-nowrap">Status</th>
            <th className="border border-dorika-blue px-2 py-1 whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {shifts.length > 0 ? (
            shifts.map((s) => (
              <tr key={s._id} className="hover:bg-dorika-blueLight transition">
                <td className="border border-dorika-blue px-2 py-1 whitespace-nowrap">{s.shiftID}</td>
                <td className="border border-dorika-blue px-2 py-1 whitespace-nowrap">{s.shiftName}</td>
                <td className="border border-dorika-blue px-2 py-1 whitespace-nowrap">{s.startTime}</td>
                <td className="border border-dorika-blue px-2 py-1 whitespace-nowrap">{s.endTime}</td>
                <td className="border border-dorika-blue px-2 py-1 whitespace-nowrap">{s.breakDuration}</td>
                <td className="border border-dorika-blue px-2 py-1 whitespace-nowrap">{s.status}</td>
                <td className="border border-dorika-blue px-2 py-1 whitespace-nowrap">
                  <div className="flex justify-center gap-4 sm:gap-6">
                    <button
                      onClick={() =>
                        navigate("/shiftMaster", { state: { shift: s } })
                      }
                      className="text-dorika-blue hover:text-dorika-green"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteShift(s._id)}
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
                No shifts found.
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

export default ShiftList;
