import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import BackButton from "../component/BackButton";
import Sidebar from '../component/Sidebar';
import toast from "react-hot-toast";
import Pagination from "../Master/Pagination";

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;
  const navigate = useNavigate();

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");

      // 2. Add headers to the GET request
      const res = await axios.get("http://localhost:5002/api/departments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const formatted = res.data.map((d) => ({
        _id: d._id,
        deptCode: d.deptCode || d.dept_code || d.code || "",
        deptName: d.deptName || d.name || "",
        description: d.description || "",
        status: d.status || "Active",
      }));
      setDepartments(formatted);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);
  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const currentDepartments = departments.slice(indexOfFirst, indexOfLast);

  // Delete department
  const deleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;
    try {
      const token = localStorage.getItem("token");

      // 2. Add headers to the DELETE request
      await axios.delete(`http://localhost:5002/api/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(departments.filter((d) => d._id !== id));
    } catch (err) {
      console.error("Failed to delete department:", err);
      toast.error("Unauthorized: Only admins can delete.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 overflow-y-auto">
    <div className="p-3 bg-white shadow-md rounded-md">
      {/* Header */}
     <div className="flex justify-between items-center gap-2">
    <h2 className="text-lg sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
      Department
    </h2>

    <div className="flex gap-2">
      <BackButton />

    <button
        onClick={() => navigate("/departmentMaster")}
        className="bg-dorika-orange hover:bg-dorika-blue text-white px-3 sm:px-4 rounded font-semibold text-sm sm:text-base whitespace-nowrap"
      >
        Add Department
      </button>
    </div>
  </div>

      {/* Table */}
      <table className=" mt-2 w-full table-auto border border-dorika-blue">
        <thead className="bg-dorika-blue text-white text-sm">
          <tr>
            <th className="border border-dorika-blue px-2">
              Department Code
            </th>
            <th className="border border-dorika-blue px-2">
              Department Name
            </th>
            {/* <th className="border border-dorika-blue px-2">
              Description
            </th> */}
            <th className="border border-dorika-blue px-2">Action</th>
          </tr>
        </thead>
        <tbody className="text-xs sm:text-sm text-center">
          {departments.length > 0 ? (
            currentDepartments.map((dept) => (
              <tr
                key={dept._id}
                className="hover:bg-dorika-blueLight transition text-center"
              >
                <td className="border border-dorika-blue px-2">
                  {dept.deptCode}
                </td>
                <td className="border border-dorika-blue px-2">
                  {dept.deptName}
                </td>
                {/* <td className="border border-dorika-blue px-2">
                  {dept.description}
                </td> */}
                <td className="border border-dorika-blue px-2">
                  <div className="flex justify-center items-center gap-4">
                    {/* Edit Button */}
                    <button
                      onClick={() =>
                        navigate("/departmentMaster", { state: { department: dept } })
                      }
                      className="text-dorika-blue hover:text-dorika-green p-2"
                      aria-label="Edit Department"
                    >
                      <FaEdit />
                    </button>
                    {/* Delete Buttton */}
                    <button
                      onClick={() => deleteDepartment(dept._id)}
                      className="text-dorika-orange hover:text-red-700"
                      aria-label="Delete Department"
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
                colSpan="4"
                className="text-center py-4 text-gray-500 font-medium"
              >
                No departments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Pagination
        total={departments.length}
        perPage={perPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
    </div>
    </div>
  );
};

export default DepartmentList;
