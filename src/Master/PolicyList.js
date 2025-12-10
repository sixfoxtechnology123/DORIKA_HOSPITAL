import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit, FaFileAlt, FaDownload } from "react-icons/fa";
import BackButton from "../component/BackButton";
import Sidebar from '../component/Sidebar';

const PolicyList = () => {
  const [policies, setPolicies] = useState([]);
  const navigate = useNavigate();

  const fetchPolicies = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/policies");
      setPolicies(res.data);
    } catch (err) {
      console.error("Fetch Policies Error:", err);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const deletePolicy = async (id) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/policies/${id}`);
      setPolicies(policies.filter((p) => p._id !== id));
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
        <h2 className="text-xl font-bold text-green-800">Policy</h2>
        <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate("/policyMaster")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Add Policy
          </button>
        </div>
      </div>

      <table className="w-full table-auto border border-green-500">
        <thead className="bg-gray-200 text-sm">
          <tr>
            <th className="border border-green-500 px-2 py-1">Policy ID</th>
            <th className="border border-green-500 px-2 py-1">Policy Name</th>
            <th className="border border-green-500 px-2 py-1">Effective Date</th>
            <th className="border border-green-500 px-2 py-1">Status</th>
            <th className="border border-green-500 px-2 py-1">Document</th>
            <th className="border border-green-500 px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {policies.length > 0 ? (
            policies.map((p) => (
              <tr key={p._id} className="hover:bg-gray-100 transition">
                <td className="border border-green-500 px-2 py-1">{p.policyID}</td>
                <td className="border border-green-500 px-2 py-1">{p.policyName}</td>

                {/* ✅ Show dd-mm-yyyy format */}
                <td className="border border-green-500 px-2 py-1">
                  {p.effectiveDateFormatted || "-"}
                </td>

                <td className="border border-green-500 px-2 py-1">{p.status}</td>

                {/* ✅ Show filename + view/download */}
                <td className="border border-green-500 px-2 py-1">
                  {p.policyDocument ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-700 truncate max-w-[150px]">
                        {p.policyDocument}
                      </span>
                      <div className="flex justify-center gap-4">
                        {/* View */}
                        <a
                          href={`http://localhost:5001/uploads/${p.policyDocument}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                          title="View Document"
                        >
                          <FaFileAlt />
                        </a>
                        {/* Download */}
                        <a
                          href={`http://localhost:5001/uploads/${p.policyDocument}`}
                          download
                          className="text-green-600 hover:underline"
                          title="Download Document"
                        >
                          <FaDownload />
                        </a>
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="border border-green-500 px-2 py-1">
                  <div className="flex justify-center gap-6">
                    <button
                      onClick={() =>
                        navigate("/policyMaster", { state: { policy: p } })
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deletePolicy(p._id)}
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
              <td colSpan="6" className="text-center py-4 text-gray-500">
                No policies found.
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

export default PolicyList;
