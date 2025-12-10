import React, { useState, useEffect } from "react";
import axios from "axios";
import BackButton from "../component/BackButton";
import { useNavigate, useLocation } from "react-router-dom";

const PolicyMaster = () => {
  const [policyID, setPolicyID] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [policyDocument, setPolicyDocument] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [status, setStatus] = useState("Active");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.policy) {
      // Editing
      const p = location.state.policy;
      setPolicyID(p.policyID);
      setPolicyName(p.policyName);
      setEffectiveDate(p.effectiveDate?.split("T")[0]);
      setStatus(p.status);
      setEditId(p._id);
      setIsEditMode(true);
    } else {
      // Adding new → generate new ID
      fetchNextPolicyID();
    }
  }, [location.state]);

  const fetchNextPolicyID = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/policies/next-id");
      setPolicyID(res.data.policyID);
    } catch (err) {
      console.error("Fetch Next ID Error:", err);
    }
  };

  const handleSaveOrUpdate = async () => {
    if (!policyName.trim() || !effectiveDate) {
      alert("Policy Name and Effective Date are required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("policyID", policyID);
      formData.append("policyName", policyName);
      formData.append("effectiveDate", effectiveDate);
      formData.append("status", status);
      if (policyDocument) formData.append("policyDocument", policyDocument);

      if (isEditMode) {
        await axios.put(
          `http://localhost:5001/api/policies/${editId}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        alert("Policy updated successfully");
      } else {
        await axios.post("http://localhost:5001/api/policies", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Policy saved successfully");
      }

      navigate("/policyList", { replace: true });
    } catch (err) {
      console.error("Save/Update Error:", err);
      alert("Failed to save/update");
    }
  };

  const handleBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-zinc-300 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          {isEditMode ? "Update Policy" : "Policy Master"}
        </h2>

        <div className="mb-4">
          <label className="block text-black mb-1">Policy ID</label>
          <input
            type="text"
            value={policyID}
            readOnly
            className="w-full p-1 border rounded cursor-not-allowed"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Policy Name</label>
          <input
            type="text"
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            className="w-full p-1 border rounded" placeholder="eg-Leave Policy, Overtime Policy "
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Policy Document</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setPolicyDocument(e.target.files[0])}
            className="w-full p-1 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Effective Date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full p-1 border rounded"
          />
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
          <button onClick={handleBack}>
            <BackButton />
          </button>
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

export default PolicyMaster;
