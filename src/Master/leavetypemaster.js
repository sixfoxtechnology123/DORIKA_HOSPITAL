import React, { useState, useEffect } from "react";
import axios from "axios";
import BackButton from "../component/BackButton";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from '../component/Sidebar';
import toast from "react-hot-toast";

const LeaveTypeMaster = () => {
  const [leaveTypeID, setLeaveTypeID] = useState("");
  const [leaveName, setLeaveName] = useState("");
  const [leaveCode, setLeaveCode] = useState("");
  const [annualQuota, setAnnualQuota] = useState("");
  const [carryForward, setCarryForward] = useState("No");
  const [status, setStatus] = useState("Active");
  const [remarks, setRemarks] = useState(""); // <-- added remarks
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchLeaveTypes();

    if (location.state?.leaveType) {
      const lt = location.state.leaveType;
      setLeaveTypeID(lt.leaveTypeID);
      setLeaveName(lt.leaveName);
      setLeaveCode(lt.leaveCode);
      setAnnualQuota(lt.annualQuota);
      setCarryForward(lt.carryForward);
      setStatus(lt.status);
      setRemarks(lt.remarks || ""); // <-- load existing remarks
      setEditId(lt._id);
      setIsEditMode(true);
    } else {
      fetchNextLeaveTypeID();
      setIsEditMode(false);
    }
  }, [location.state]);

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/leavetypes");
      setLeaveTypes(res.data);
    } catch (err) {
      console.error("Fetch LeaveTypes Error:", err);
    }
  };

  const fetchNextLeaveTypeID = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/leavetypes/next-id");
      setLeaveTypeID(res.data.leaveTypeID);
    } catch (err) {
      console.error("Fetch Next ID Error:", err);
    }
  };

  const handleSaveOrUpdate = async (e) => {
    e.preventDefault();

    // if (!leaveName.trim() || !leaveCode.trim() || !annualQuota) {
    //   alert("All fields are required");
    //   return;
    // }

    const duplicate = leaveTypes.find(
      (lt) =>
        lt.leaveName.toLowerCase().trim() === leaveName.toLowerCase().trim() &&
        lt._id !== editId
    );
    if (duplicate) {
      toast.error("Leave type already exists!");
      return;
    }

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:5001/api/leavetypes/${editId}`, {
          leaveTypeID,
          leaveName,
          leaveCode,
          annualQuota,
          carryForward,
          status,
          remarks, // <-- save remarks
        });
        toast.success("Leave type updated successfully");
      } else {
        await axios.post("http://localhost:5001/api/leavetypes", {
          leaveTypeID,
          leaveName,
          leaveCode,
          annualQuota,
          carryForward,
          status,
          remarks, // <-- save remarks
        });
        toast.success("Leave type saved successfully");
      }

      navigate("/leavetypeList", { replace: true });
    } catch (err) {
      console.error("Save/Update Error:", err);
      toast.error("Failed to save/update");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex">
      <Sidebar />

      <div className="flex-1 p-3 overflow-y-auto">
        <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
          <h2 className="text-2xl font-bold mb-4 text-center text-black">
            {isEditMode ? "Update Leave Type" : "Leave Type"}
          </h2>
          <form
            onSubmit={handleSaveOrUpdate}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm">Leave Type ID</label>
              <input
                type="text"
                value={leaveTypeID}
                readOnly
                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-sm">Leave type</label>
              <input
                type="text"
                value={leaveName}
               onChange={(e) => setLeaveName(e.target.value.toUpperCase())}

                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
                placeholder="Casual, Sick, Maternity, etc"
              />
            </div>

            <div>
              <label className="block text-sm">Alies</label>
              <input
                type="text"
                value={leaveCode}
                onChange={(e) => setLeaveCode(e.target.value.toUpperCase())}

                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
                placeholder="e.g., CL, SL"
              />
            </div>

            {/* <div>
              <label className="block text-sm">Annual Quota</label>
              <input
                type="number"
                value={annualQuota}
                onChange={(e) => setAnnualQuota(e.target.value)}
                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-sm">Carry Forward</label>
              <select
                value={carryForward}
                onChange={(e) => setCarryForward(e.target.value)}
                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div> */}

            {/* Remarks Box */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
                placeholder="Enter any remarks..."
                rows={3}
              />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-between mt-2">
              <BackButton type="button" />
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

export default LeaveTypeMaster;
