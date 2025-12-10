// src/pages/PayrollComponentMaster.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import BackButton from "../component/BackButton";
import { useNavigate, useLocation } from "react-router-dom";

const PayrollComponentMaster = () => {
  const [componentID, setComponentID] = useState("");
  const [componentName, setComponentName] = useState("");
  const [type, setType] = useState("Earning");
  const [calculationType, setCalculationType] = useState("Fixed");
  const [percentageOf, setPercentageOf] = useState("");
  const [taxable, setTaxable] = useState("Yes");
  const [status, setStatus] = useState("Active");

  const [components, setComponents] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchComponents();

    if (location.state?.component) {
      const comp = location.state.component;
      setComponentID(comp.componentID);
      setComponentName(comp.componentName);
      setType(comp.type);
      setCalculationType(comp.calculationType);
      setPercentageOf(comp.percentageOf || "");
      setTaxable(comp.taxable);
      setStatus(comp.status);
      setEditId(comp._id);
      setIsEditMode(true);
    } else {
      fetchNextComponentID();
      setIsEditMode(false);
    }
  }, [location.state]);

  const fetchComponents = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/payrollcomponents");
      setComponents(res.data);
    } catch (err) {
      console.error("Fetch Components Error:", err);
    }
  };

  const fetchNextComponentID = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/payrollcomponents/next-id");
      setComponentID(res.data.componentID);
    } catch (err) {
      console.error("Fetch Next ID Error:", err);
    }
  };

  const handleSaveOrUpdate = async (e) => {
    e.preventDefault();

    if (!componentName.trim()) {
      alert("Component Name is required");
      return;
    }

    const duplicate = components.find(
      (c) =>
        c.componentName.toLowerCase().trim() === componentName.toLowerCase().trim() &&
        c._id !== editId
    );
    if (duplicate) {
      alert("Component already exists!");
      return;
    }

    const payload = {
      componentID,
      componentName,
      type,
      calculationType,
      percentageOf: calculationType === "Percentage" ? percentageOf : "",
      taxable,
      status,
    };

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:5001/api/payrollcomponents/${editId}`, payload);
        alert("Component updated successfully");
      } else {
        await axios.post("http://localhost:5001/api/payrollcomponents", payload);
        alert("Component saved successfully");
      }
      navigate("/payrollcomponentList", { replace: true });
    } catch (err) {
      console.error("Save/Update Error:", err);
      alert("Failed to save/update");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-6xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          {isEditMode ? "Update Payroll Component" : "Payroll Component Master"}
        </h2>

        <form
          onSubmit={handleSaveOrUpdate}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div>
            <label className="block font-medium">Component ID</label>
            <input
              type="text"
              value={componentID}
              readOnly
              className="w-full border border-gray-300 p-1 rounded bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-medium">Component Name</label>
            <input
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              className="w-full p-1 border rounded"
              placeholder="Basic, HRA, PF, etc."
            />
          </div>

          <div>
            <label className="block font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="Earning">Earning</option>
              <option value="Deduction">Deduction</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">Calculation Type</label>
            <select
              value={calculationType}
              onChange={(e) => setCalculationType(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="Fixed">Fixed</option>
              <option value="Percentage">Percentage</option>
            </select>
          </div>

          {calculationType === "Percentage" && (
            <div>
              <label className="block font-medium">Percentage Of</label>
              <select
                value={percentageOf}
                onChange={(e) => setPercentageOf(e.target.value)}
                className="w-full p-1 border rounded"
              >
                <option value="">-- Select --</option>
                <option value="Basic">Basic</option>
                <option value="Gross">Gross</option>
              </select>
            </div>
          )}

          <div>
            <label className="block font-medium">Taxable</label>
            <select
              value={taxable}
              onChange={(e) => setTaxable(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
  );
};

export default PayrollComponentMaster;
