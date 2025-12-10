import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";

const SalaryHeadForm = ({ onSaved }) => {
  const [headType, setHeadType] = useState("");
  const [autoId, setAutoId] = useState("");
  const [headName, setHeadName] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const editingData = location.state?.editingData || null;

  useEffect(() => {
    if (editingData) {
      setHeadType(editingData.headType || "");
      setAutoId(editingData.headId || "");
      setHeadName(editingData.headName || "");
    }
  }, [editingData]);

  useEffect(() => {
    const fetchNextId = async () => {
      if (!headType || editingData) return;
      try {
        const res = await axios.get(
          `http://localhost:5001/api/salary-heads/next-id?type=${headType}`
        );
        setAutoId(res.data.nextId || "");
      } catch {
        setAutoId("");
      }
    };
    fetchNextId();
  }, [headType, editingData]);

  const handleSave = async () => {
    if (!headType || !headName) {
      toast.error("Select head type and enter head name");
      return;
    }

    setSaving(true);
    try {
      let res;
      const payload = { headType, headName };

      if (editingData?._id) {
        res = await axios.put(
          `http://localhost:5001/api/salary-heads/salary-heads/${editingData._id}`,
          payload
        );
        toast.success("Updated successfully");
      } else {
        res = await axios.post(
          "http://localhost:5001/api/salary-heads/salary-heads",
          payload
        );
        toast.success("Saved successfully");
      }

      setHeadType("");
      setHeadName("");
      setAutoId("");
      if (onSaved) onSaved(res.data.data);
      navigate("/SalarySlipHeadList", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex">
      <Sidebar />
      <div className="flex-1 flex justify-center items-center p-3">
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-black">
            Salary Head Master
          </h2>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Salary Slip Head</label>
              <select
                value={headType}
                onChange={(e) => setHeadType(e.target.value)}
                className="w-full pl-2 pr-1 py-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
              >
                <option value="">-- Select --</option>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {headType === "EARNING" ? "Earning ID" : headType === "DEDUCTION" ? "Deduction ID" : "ID"}
              </label>
              <input
                type="text"
                value={autoId}
                readOnly
                className="w-full pl-2 pr-1 py-1 border border-gray-300 font-medium rounded text-sm bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Head Name</label>
              <input
                type="text"
                value={headName}
                onChange={(e) => setHeadName(e.target.value.toUpperCase())}
                className="w-full pl-2 pr-1 py-1 border border-gray-300 font-medium rounded text-sm"
                placeholder="e.g., HRA, DA, PF"
              />
            </div>

            <div className="flex justify-between mt-4">
              <BackButton />
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-1 rounded text-white ${
                  editingData ? "bg-yellow-600 hover:bg-yellow-700" : "bg-teal-600 hover:bg-teal-700"
                } disabled:opacity-50`}
              >
                {saving ? (editingData ? "Updating..." : "Saving...") : (editingData ? "Update" : "Save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryHeadForm;
