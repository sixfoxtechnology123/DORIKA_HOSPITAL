import React, { useState, useEffect } from "react";
import axios from "axios";
import BackButton from "../component/BackButton";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from '../component/Sidebar';
import toast from "react-hot-toast";



const ShiftMaster = () => {
  const [shift, setShift] = useState({
    _id: "",
    shiftID: "",
    shiftCode: "",
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
        const res = await axios.get("http://localhost:5002/api/shifts/next-id");
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
        shiftCode: s.shiftCode || "",
        shiftName: s.shiftName || "",
        startTime: to24Hour(s.startTime) || "",
        endTime: to24Hour(s.endTime) || "",

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


const to12Hour = (time24) => {
  if (!time24) return "";
  let [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? " PM" : " AM"; // ✅ space added
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}${ampm}`;
};
const to24Hour = (time12) => {
  if (!time12) return "";
  const [time, mod] = time12.split(" ");
  let [h, m] = time.split(".").map(Number);

  if (mod === "PM" && h !== 12) h += 12;
  if (mod === "AM" && h === 12) h = 0;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};


  // Save / Update
  const handleSaveOrUpdate = async (e) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        const { _id, shiftID, ...payload } = shift;
        await axios.put(`http://localhost:5002/api/shifts/${_id}`, {
          ...payload,
          startTime: to12Hour(shift.startTime),
          endTime: to12Hour(shift.endTime),
        });

        toast.success("Shift updated successfully!");
      } else {
        // CREATE → include shiftID
       await axios.post("http://localhost:5002/api/shifts", {
      ...shift,
      startTime: to12Hour(shift.startTime),
      endTime: to12Hour(shift.endTime),
    });

        toast.success("Shift added successfully!");
      }
      navigate("/shiftList", { replace: true });
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(err?.response?.data?.error || "Error saving shift");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex">
      <Sidebar />
      <div className="flex-1 p-3 overflow-y-auto flex items-center justify-center">
       <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4">
          {isEditMode ? "Update Shift" : "Shift"}
        </h2>

        <form onSubmit={handleSaveOrUpdate}
         className="gap-4">
          <div>
            <label className="block font-medium">Shift ID</label>
            <input
              type="text"
              name="shiftID"
              value={shift.shiftID}
              readOnly
              className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-medium">Shift Name</label>
           <input
                type="text"
                name="shiftName"
                value={shift.shiftName}
                onChange={(e) =>
                  handleChange({
                    target: {
                      name: e.target.name,
                      value: e.target.value.toUpperCase(),
                    },
                  })
                }
                className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                placeholder="eg-MORNING, NIGHT, GENERAL"
                required
              />
          </div>
          <div>
                <label className="block font-medium">Shift Code</label>
                <input
                  type="text"
                  name="shiftCode"
                  value={shift.shiftCode}
                  onChange={(e) => setShift({...shift, shiftCode: e.target.value.toUpperCase()})}
                  placeholder="eg: M, N, E"
                  required
                  maxLength={5}
                  className="w-full pl-2 py-1 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-sky-400 focus:outline-none"
                />
              </div>
          <div>
            <label className="block font-medium">Start Time</label>
            <input
              type="time"
              name="startTime"
              value={shift.startTime}
              onChange={handleChange}
             className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
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
              className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
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
              className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
            />
          </div>

          <div>
            <label className="block font-medium">Status</label>
            <select
              name="status"
              value={shift.status}
              onChange={handleChange}
             className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
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
    </div>
  );
};

export default ShiftMaster;
