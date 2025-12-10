// src/pages/PayrollComponentList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import BackButton from "../component/BackButton";
import Sidebar from '../component/Sidebar';

const PayrollComponentList = () => {
  const [components, setComponents] = useState([]);
  const navigate = useNavigate();

  const fetchComponents = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/payrollcomponents");
      setComponents(res.data);
    } catch (err) {
      console.error("Fetch Components Error:", err);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const deleteComponent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this component?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/payrollcomponents/${id}`);
      setComponents(components.filter((c) => c._id !== id));
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
        <h2 className="text-xl font-bold text-green-800">Payroll Components</h2>
        <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate("/payrollcomponentMaster")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Add Component
          </button>
        </div>
      </div>

      <table className="w-full table-auto border border-green-500">
        <thead className="bg-gray-200 text-sm">
          <tr>
            <th className="border border-green-500 px-2 py-1">Component ID</th>
            <th className="border border-green-500 px-2 py-1">Component Name</th>
            <th className="border border-green-500 px-2 py-1">Type</th>
            <th className="border border-green-500 px-2 py-1">Calculation Type</th>
            <th className="border border-green-500 px-2 py-1">Percentage Of</th>
            <th className="border border-green-500 px-2 py-1">Taxable</th>
            <th className="border border-green-500 px-2 py-1">Status</th>
            <th className="border border-green-500 px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {components.length > 0 ? (
            components.map((c) => (
              <tr key={c._id} className="hover:bg-gray-100 transition">
                <td className="border border-green-500 px-2 py-1">{c.componentID}</td>
                <td className="border border-green-500 px-2 py-1">{c.componentName}</td>
                <td className="border border-green-500 px-2 py-1">{c.type}</td>
                <td className="border border-green-500 px-2 py-1">{c.calculationType}</td>
                <td className="border border-green-500 px-2 py-1">{c.percentageOf || "-"}</td>
                <td className="border border-green-500 px-2 py-1">{c.taxable}</td>
                <td className="border border-green-500 px-2 py-1">{c.status}</td>
                <td className="border border-green-500 px-2 py-1">
                  <div className="flex justify-center gap-8">
                    <button
                      onClick={() =>
                        navigate("/payrollcomponentMaster", { state: { component: c } })
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteComponent(c._id)}
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
              <td colSpan="8" className="text-center py-4 text-gray-500">
                No payroll components found.
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

export default PayrollComponentList;
