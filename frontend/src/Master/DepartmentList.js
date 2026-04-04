import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import Sidebar from '../component/Sidebar';
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import toast from "react-hot-toast";
import Pagination from "../Master/Pagination";

const DepartmentList = () => {
  const PER_PAGE_STORAGE_KEY = "departmentList.perPage";
  const getStoredPerPage = () => {
    const raw = localStorage.getItem(PER_PAGE_STORAGE_KEY);
    if (!raw) return 20;
    if (raw === "all") return "all";
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 20;
  };

  const [departments, setDepartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(getStoredPerPage);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");

      // 2. Add headers to the GET request
      const res = await axios.get("/api/departments", {
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
      toast.error("Failed to fetch departments:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    localStorage.setItem(PER_PAGE_STORAGE_KEY, String(perPage));
  }, [perPage]);

 const indexOfLast = perPage === "all" ? departments.length : currentPage * perPage;
const indexOfFirst = perPage === "all" ? 0 : indexOfLast - perPage;

const currentDepartments =
  perPage === "all"
    ? departments
    : departments.slice(indexOfFirst, indexOfLast);

  // Delete department
  const deleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;
    try {
      const token = localStorage.getItem("token");

      // 2. Add headers to the DELETE request
      await axios.delete(`/api/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(departments.filter((d) => d._id !== id));
    } catch (err) {
      toast.error("Failed to delete department:", err);
      toast.error("Unauthorized: Only admins can delete.");
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
    <div className="flex-1 flex flex-col min-h-0 p-3 bg-white shadow-md rounded-md">
      <MobileHeaderToggle>
      <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
        <h2 className="text-xl font-bold text-dorika-blue">Department</h2>
        <button
          type="button"
          onClick={goBack}
          className="h-8 px-3 rounded bg-dorika-blue text-white font-semibold text-sm hover:bg-dorika-orange"
        >
          Back
        </button>
      </div>

      <div className="bg-dorika-blueLight p-3 rounded-lg shadow mb-3 border border-dorika-blue">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div className="flex flex-col">
            <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
              Show
            </label>
            <select
              value={perPage}
              onChange={(e) => {
                const val = e.target.value;
                setPerPage(val === "all" ? "all" : parseInt(val));
                setCurrentPage(1);
              }}
              className="h-8 border border-dorika-blue rounded px-3 text-sm outline-none bg-white font-semibold text-dorika-blue"
            >
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">ALL</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="font-semibold text-dorika-blue text-xs uppercase mb-1">
              Action
            </label>
            <button
              onClick={() => navigate("/departmentMaster")}
              className="h-8 bg-dorika-orange hover:bg-dorika-blue text-white px-3 sm:px-4 rounded font-semibold text-sm sm:text-base whitespace-nowrap w-full"
            >
              Add Department
            </button>
          </div>
        </div>
      </div>
      </MobileHeaderToggle>

<div className="w-full flex-1 min-h-0 overflow-auto mt-2">
      {/* Table */}
      <table className="w-full table-auto border border-dorika-blue">
        <thead className="bg-dorika-blue text-white text-sm sticky top-0 z-10">
          <tr>
             <th className="border border-dorika-blue px-2">
             SL No
            </th>
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
            currentDepartments.map((dept,index) => (
              <tr
                key={dept._id}
                className="hover:bg-dorika-blueLight transition text-center"
              >
                <td className="border border-dorika-blue px-2 py-1">
                  {perPage === "all" ? index + 1 : (currentPage - 1) * perPage + index + 1}
                </td>
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
      {perPage !== "all" && (
        <Pagination
          total={departments.length}
          perPage={perPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
    </div>
    </div>
    </div>
  );
};

export default DepartmentList;



