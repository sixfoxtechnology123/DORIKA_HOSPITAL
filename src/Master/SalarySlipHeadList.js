import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";

const SalarySlipHeadList = () => {
  const [salaryHeads, setSalaryHeads] = useState([]);
  const navigate = useNavigate();

useEffect(() => {
  const fetchSalaryHeads = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/salary-heads/salary-list");
      setSalaryHeads(res.data.data); // <-- use data property
    } catch (err) {
      console.error("Fetch Salary Heads Error:", err);
      toast.error("Failed to fetch salary slip heads");
    }
  };
  fetchSalaryHeads();
}, []);


  const deleteSalaryHead = async (id) => {
    if (!window.confirm("Are you sure you want to delete this salary slip head?")) return;
    try {
      await axios.delete(`http://localhost:5002/api/salary-heads/${id}`);
      setSalaryHeads(salaryHeads.filter((h) => h._id !== id));
      toast.success("Salary slip head deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-white shadow-md rounded-md p-3">
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">Salary Slip Head List</h2>
            <div className="flex gap-2">
              <BackButton />
              <button
                onClick={() => navigate("/SalaryHeadForm")}
                className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
              >
                Add New Salary Slip Head
              </button>
            </div>
          </div>

          <table className="w-full table-auto border border-dorika-blue text-sm">
            <thead className="bg-dorika-blue text-white
">
              <tr>
                <th className="border border-dorika-blue px-2 py-1">S.No</th>
                <th className="border border-dorika-blue px-2 py-1">Head ID</th>
                <th className="border border-dorika-blue px-2 py-1">Head Name</th>
                <th className="border border-dorika-blue px-2 py-1">Type</th>
                <th className="border border-dorika-blue px-2 py-1">Action</th>
              </tr>
            </thead>

            <tbody className="text-center">
              {salaryHeads.length > 0 ? (
                salaryHeads.map((head, index) => (
                  <tr key={head._id} className="hover:bg-dorika-blueLight transition">
                    <td className="border border-dorika-blue px-2 py-1">{index + 1}</td>
                    <td className="border border-dorika-blue px-2 py-1">{head.headId || "-"}</td>
                    <td className="border border-dorika-blue px-2 py-1">{head.headName || "-"}</td>
                    <td className="border border-dorika-blue px-2 py-1">{head.headType || "-"}</td>


                    <td className="border border-dorika-blue px-2 py-1">
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => navigate("/SalaryHeadForm", { state: { editingData: head } })}
                          className="text-dorika-blue hover:text-dorika-green"
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={() => deleteSalaryHead(head._id)}
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
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No salary slip heads found.
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

export default SalarySlipHeadList;
