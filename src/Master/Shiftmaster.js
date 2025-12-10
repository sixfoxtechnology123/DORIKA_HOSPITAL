import React, { useState, useEffect } from "react";
import axios from "axios";
import BackButton from "../component/BackButton";
import { useNavigate, useLocation } from "react-router-dom";

const ShiftMaster = () => {
  const [shift, setShift] = useState({
    _id: "",
    shiftID: "",
    shiftName: "",
    startTime: "",
    endTime: "",
    breakDuration: "",
    status: "Active",
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Load mode (Add vs Edit)
  useEffect(() => {
    const fetchNextShiftId = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/shifts/next-id");
        const nextId = res.data?.shiftID || "SHIFT0001";
        setShift((prev) => ({ ...prev, shiftID: nextId }));
      } catch (err) {
        console.error("Error getting next shiftID:", err);
      }
    };

    if (location.state?.shift) {
      // EDIT MODE → keep same ID, don't regenerate
      const s = location.state.shift;
      setIsEditMode(true);
      setShift({
        _id: s._id,
        shiftID: s.shiftID,   // fixed → always existing id
        shiftName: s.shiftName || "",
        startTime: s.startTime || "",
        endTime: s.endTime || "",
        breakDuration: s.breakDuration || "",
        status: s.status || "Active",
      });
    } else {
      // ADD MODE → generate new ID
      setIsEditMode(false);
      fetchNextShiftId();
    }
  }, [location.state]);

  // Handle input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setShift((prev) => ({ ...prev, [name]: value }));
  };

  // Save / Update
  const handleSaveOrUpdate = async (e) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        //  UPDATE → never send shiftID (kept constant)
        const { _id, shiftID, ...payload } = shift;
        await axios.put(`http://localhost:5001/api/shifts/${_id}`, payload);
        alert("Shift updated successfully!");
      } else {
        // CREATE → include shiftID
        await axios.post("http://localhost:5001/api/shifts", shift);
        alert("Shift added successfully!");
      }
      navigate("/shiftList", { replace: true });
    } catch (err) {
      console.error("Save failed:", err);
      alert(err?.response?.data?.error || "Error saving shift");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-6xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          {isEditMode ? "Update Shift" : "Shift"}
        </h2>

        <form onSubmit={handleSaveOrUpdate}
         className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium">Shift ID</label>
            <input
              type="text"
              name="shiftID"
              value={shift.shiftID}
              readOnly
              className="w-full p-1 border rounded bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-medium">Shift Name</label>
            <input
              type="text"
              name="shiftName"
              value={shift.shiftName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-1 rounded bg-gray-100 " placeholder="eg-Morning, Night, General"
              required
            />
          </div>

          <div>
            <label className="block font-medium">Start Time</label>
            <input
              type="time"
              name="startTime"
              value={shift.startTime}
              onChange={handleChange}
              className="w-full border border-gray-300 p-1 rounded bg-gray-100 "
              required
            />
          </div>

          <div>
            <label className="block font-medium">End Time</label>
            <input
              type="time"
              name="endTime"
              value={shift.endTime}
              onChange={handleChange}
              className="w-full border border-gray-300 p-1 rounded bg-gray-100 "
              required
            />
          </div>

          <div>
            <label className="block font-medium">Break Duration (minutes)</label>
            <input
              type="number"
              name="breakDuration"
              value={shift.breakDuration}
              onChange={handleChange}
              className="w-full border border-gray-300 p-1 rounded bg-gray-100 "
              required
            />
          </div>

          <div>
            <label className="block font-medium">Status</label>
            <select
              name="status"
              value={shift.status}
              onChange={handleChange}
              className="w-full border border-gray-300 p-1 rounded bg-gray-100 "
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-between mt-2">
            <BackButton />
            <button
              type="submit"
              className={`px-4 py-1 rounded text-white ${
                isEditMode
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {isEditMode ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftMaster;
