import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import BackButton from "../component/BackButton";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";

const OTRateList = () => {
  const [otRates, setOtRates] = useState([]);
  const navigate = useNavigate();

  const fetchOTRates = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/ot/ot-rate");
      setOtRates(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch OT rates");
    }
  };

  useEffect(() => {
    fetchOTRates();
  }, []);

  const deleteOTRate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this OT rate?")) return;

    try {
      await axios.delete(`http://localhost:5002/api/ot/ot-rate/${id}`);
      setOtRates(otRates.filter((ot) => ot._id !== id));
      toast.success("OT rate deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 bg-white shadow-md rounded-md">
          {/* HEADER */}
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-dorika-blue">
              OT Rate List
            </h2>

            <div className="flex gap-2">
              <BackButton />
              <button
                onClick={() => navigate("/otRateMaster")}
                className="bg-dorika-orange hover:bg-dorika-blue text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
              >
                Manage OT Rate
              </button>
            </div>
          </div>

          {/* TABLE */}
          <table className="w-full table-auto border border-dorika-blue">
            <thead className="bg-dorika-blue text-white text-sm">
              <tr>
                <th className="border px-2 py-1">S.No</th>
                <th className="border px-2 py-1">Employee ID</th>
                <th className="border px-2 py-1">Employee Name</th>
                <th className="border px-2 py-1">Department</th>
                <th className="border px-2 py-1">Designation</th>
                <th className="border px-2 py-1">Rate Type</th>
                <th className="border px-2 py-1">OT Rate / Hr</th>
                <th className="border px-2 py-1">Action</th>
              </tr>
            </thead>

            <tbody className="text-sm text-center">
              {otRates.length > 0 ? (
                otRates.map((ot, index) => (
                  <tr
                    key={ot._id}
                    className="hover:bg-dorika-blueLight transition"
                  >
                    <td className="border px-2 py-1">{index + 1}</td>
                    <td className="border px-2 py-1">{ot.employeeId}</td>
                    <td className="border px-2 py-1">
                      {ot.employeeName}
                    </td>
                    <td className="border px-2 py-1">
                      {ot.departmentName}
                    </td>
                    <td className="border px-2 py-1">
                      {ot.designationName}
                    </td>
                    <td className="border px-2 py-1">
                      {ot.rateType}
                    </td>
                    <td className="border px-2 py-1 font-semibold">
                      ₹ {ot.otRatePerHour}
                    </td>
                    <td className="border px-2 py-1">
                      <div className="flex justify-center gap-8">
                        {/* <button
                          onClick={() =>
                            navigate("/otRateMaster", {
                              state: { otRate: ot },
                            })
                          }
                          className="text-dorika-blue hover:text-dorika-green"
                        >
                          <FaEdit />
                        </button> */}

                        <button
                          onClick={() => deleteOTRate(ot._id)}
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
                  <td
                    colSpan="8"
                    className="text-center py-4 text-gray-500"
                  >
                    No OT rates found.
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

export default OTRateList;