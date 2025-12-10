// src/Master/HolidayMaster.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import BackButton from "../component/BackButton";

const toInputDate = (val) => {
  if (!val) return "";
  if (typeof val === "string") {
    if (val.includes("T")) return val.split("T")[0];                // ISO -> YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {                          // DD-MM-YYYY -> YYYY-MM-DD
      const [dd, mm, yyyy] = val.split("-");
      return `${yyyy}-${mm}-${dd}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;               // already YYYY-MM-DD
  }
  const d = new Date(val);
  if (isNaN(d)) return "";
  // Keep stable YYYY-MM-DD regardless of timezone
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

const normalizeForCompare = (val) => toInputDate(val); // compare in YYYY-MM-DD

const HolidayMaster = () => {
  const [holidayID, setHolidayID] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [location, setLocation] = useState("All");
  const [status, setStatus] = useState("Active");
  const [holidays, setHolidays] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();
  const loc = useLocation();
useEffect(() => {
  fetchHolidays();

  if (loc.state?.holiday) {
    const h = loc.state.holiday;
    setHolidayID(h.holidayID || "");
    setHolidayName(h.holidayName || "");
    setHolidayDate(toInputDate(h.holidayDate));
    setLocation(h.location || "All");
    setStatus(h.status || "Active");
    setEditId(h._id);
    setIsEditMode(true);
  } else {
    // only for new holiday
    fetchNextHolidayID();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loc.state]);


  const fetchHolidays = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/holidays");
      setHolidays(res.data || []);
    } catch (err) {
      console.error("Fetch Holidays Error:", err);
    }
  };

  const fetchNextHolidayID = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/holidays/next-id");
      setHolidayID(res.data.holidayID || "");
    } catch (err) {
      console.error("Next Holiday ID Error:", err);
    }
  };

  const handleSaveOrUpdate = async () => {
    if (!holidayName.trim() || !holidayDate) {
      alert("All fields are required");
      return;
    }

    const duplicate = holidays.find(
      (h) =>
        (h.holidayName || "").toLowerCase().trim() === holidayName.toLowerCase().trim() &&
        normalizeForCompare(h.holidayDate) === holidayDate &&              // compare normalized dates
        h._id !== editId
    );
    if (duplicate) {
      alert("Holiday already exists on this date!");
      return;
    }

    try {
      const payload = {
        holidayID,
        holidayName,
        holidayDate, // YYYY-MM-DD string works with Mongoose Date or String
        location,
        status,
      };

      if (isEditMode) {
        await axios.put(`http://localhost:5001/api/holidays/${editId}`, payload);
        alert("Holiday updated successfully");
      } else {
        await axios.post("http://localhost:5001/api/holidays", payload);
        alert("Holiday saved successfully");
      }

      resetForm();
      fetchHolidays();
      navigate("/holidayList", { replace: true });
    } catch (err) {
      console.error("Save/Update Error:", err);
      alert("Failed to save/update");
    }
  };

  const resetForm = () => {
    setHolidayName("");
    setHolidayDate("");
    setLocation("All");
    setStatus("Active");
    setEditId(null);
    setIsEditMode(false);
    fetchNextHolidayID();
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          {isEditMode ? "Update Holiday" : "Holiday Master"}
        </h2>

        <div className="mb-4">
          <label className="block text-black mb-1">Holiday ID</label>
          <input
            type="text"
            value={holidayID}
            readOnly
            className="w-full p-1 border rounded cursor-not-allowed"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Holiday Name</label>
          <input
            type="text"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            className="w-full p-1 border rounded"
            placeholder="e.g. Diwali, Christmas"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Holiday Date</label>
          <input
            type="date"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)} // always YYYY-MM-DD
            className="border rounded p-2 w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-1 border rounded"
          >
            <option value="All">All</option>
            <option value="Specific Location">Specific Location</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-1 border rounded"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex justify-between">
          <BackButton />
          <button
            onClick={handleSaveOrUpdate}
            className={`px-4 py-1 rounded text-white ${
              isEditMode
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolidayMaster;
