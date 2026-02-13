import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import BackButton from "../component/BackButton";
import Sidebar from '../component/Sidebar';
import toast from "react-hot-toast";
import Pagination from "./Pagination";


const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]); // normalized: [{id, name}]
  const [designations, setDesignations] = useState([]);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20); 
  const [searchTerm, setSearchTerm] = useState("");


  const fetchAll = async () => {
    try {
      const [empRes, deptRes, desigRes] = await Promise.all([
        axios.get("http://localhost:5002/api/employees"),
        axios.get("http://localhost:5002/api/departments"),
        axios.get("http://localhost:5002/api/designations"),
      ]);

      setEmployees(empRes.data || []);

      // normalize departments to {id, name}
      const depts = (deptRes.data || [])
        .map((d) => ({
          id:
            d.departmentID ||
            d.deptCode ||
            d.code ||
            d.id ||
            "",
          name:
            d.departmentName ||
            d.deptName ||
            d.name ||
            "",
        }))
        .filter((x) => x.id && x.name);
      setDepartments(depts);

      setDesignations(desigRes.data || []);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

const handleSearchChange = (e) => {
  let value = e.target.value.toUpperCase();

  // If user types only number → add P- before it (no zero padding)
  if (/^\d+$/.test(value)) {
    value = `P-${value}`;
  }

  // If user types P followed by number (no dash) → add dash only
  if (/^P\d/.test(value)) {
    value = value.replace(/^P/, "P-");
  }

  setSearchTerm(value);
  setCurrentPage(1);
};

  const deptMap = useMemo(() => {
    const m = {};
    departments.forEach((d) => (m[d.id] = d.name)); // code -> name
    return m;
  }, [departments]);

  const desigMap = useMemo(() => {
    const m = {};
    designations.forEach((d) => (m[d.designationID] = d.designationName));
    return m;
  }, [designations]);

  const deleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      await axios.delete(`http://localhost:5002/api/employees/${id}`);
      setEmployees((prev) => prev.filter((e) => e._id !== id));
      toast.success("Employee Deleted successfully");
    } catch (e) {
      console.error(e);
    }
  };

  const filteredEmployees = useMemo(() => {
  if (!searchTerm) return employees;

  return employees.filter((e) => {
    const fullName = `${e.firstName || ""} ${e.middleName || ""} ${e.lastName || ""}`.toUpperCase();
    const empId = (e.employeeID || "").toUpperCase();

    return (
      fullName.startsWith(searchTerm) ||
      empId.startsWith(searchTerm)
    );
  });
}, [employees, searchTerm]);

const indexOfLast = currentPage * perPage;
const indexOfFirst = indexOfLast - perPage;

// Logic to show all if selected, otherwise slice the array
const paginatedEmployees = perPage === "all" 
  ? filteredEmployees 
  : filteredEmployees.slice(indexOfFirst, indexOfLast);

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden">
    
      <Sidebar />
   
    <div className="flex-1 flex flex-col min-h-0 p-2 sm:p-3 md:p-2 overflow-hidden">
    <div className="flex-1 flex flex-col min-h-0 p-3 bg-white shadow-md rounded-md">
    <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-3 mb-4">

    <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-row justify-between items-center gap-2">
          {/* whitespace-nowrap ensures the text doesn't wrap and overlap */}
          <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
            Employee List
          </h2>
          <div className="flex shrink-0">
            <BackButton />
          </div>
    </div>

    {/* BOTTOM SECTION */}
    <div className="flex flex-col sm:flex-row justify-between gap-2 mt-3">

      {/* Search Bar - Full width on mobile */}
      <input
        type="text"
        placeholder="Search Name or Emp ID"
        value={searchTerm}
        onChange={handleSearchChange}
        className="border border-dorika-blue rounded 
                  px-3 py-2 text-sm uppercase
                  w-full sm:flex-1 focus:outline-none"
      />

      {/* Dropdown + Button Row */}
      <div className="flex justify-between sm:justify-end items-center gap-2 w-full sm:w-auto">

        <div className="flex items-center gap-1">
          <label className="text-[10px] sm:text-xs font-bold text-dorika-blue uppercase">
            Show
          </label>
          <select
            value={perPage}
            onChange={(e) => {
              const val = e.target.value;
              setPerPage(val === "all" ? "all" : parseInt(val));
              setCurrentPage(1);
            }}
            className="border border-dorika-blue rounded px-2 py-2 text-sm outline-none bg-white font-semibold text-dorika-blue"
          >
            <option value={20}>20</option>
            {/* <option value={30}>30</option> */}
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value="all">ALL</option>
          </select>
        </div>

        <button
          onClick={() => navigate("/EmployeeMaster")}
          className="bg-dorika-orange hover:bg-dorika-blue text-white 
                    px-4 py-2 rounded font-semibold 
                    text-sm whitespace-nowrap"
        >
          Add Employee
        </button>

      </div>
    </div>
  </div>
     <div className="w-full flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        <table className="min-w-[700px] w-full table-auto border border-dorika-blue">
        <thead className="bg-dorika-blue text-white text-sm">
          <tr>
            <th className="border border-dorika-blue px-2 py-1">Sl No</th>
            <th className="border border-dorika-blue px-2 py-1">Emp ID</th>
            <th className="border border-dorika-blue px-2 py-1">Name</th>
            {/* <th className="border border-dorika-blue px-2 py-1">Email</th>
            <th className="border border-dorika-blue px-2 py-1">Department</th> */}
            <th className="border border-dorika-blue px-2 py-1">Designation</th>
            <th className="border border-dorika-blue px-2 py-1">Mobile No.</th>
            {/* <th className="border border-dorika-blue px-2 py-1">Employment</th>
            <th className="border border-dorika-blue px-2 py-1">Work Location</th>
            <th className="border border-dorika-blue px-2 py-1">Contact</th>
            <th className="border border-dorika-blue px-2 py-1">Status</th> */}
            <th className="border border-dorika-blue px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-xs sm:text-sm text-center">
          {employees.length ? (
           paginatedEmployees.map((e,index) => (
              <tr key={e._id} className="hover:bg-dorika-blueLight transition">
                <td className="border border-dorika-blue px-2 py-1">{perPage === "all" ? index + 1 : (currentPage - 1) * perPage + index + 1}</td>
                <td className="border border-dorika-blue px-2 py-1">{e.employeeID}</td>
                <td className="border border-dorika-blue px-2 py-1">
                  {e.firstName} {e.middleName} {e.lastName}
                </td>
                {/* <td className="border border-dorika-blue px-2 py-1">{e.email}</td> */}

                {/* Show ONLY department name (from code)
                <td className="border border-dorika-blue px-2 py-1">
                  {deptMap[e.departmentID] || e.departmentID}
                </td> */}

                <td className="border border-dorika-blue px-2 py-1">
                  {e.designationName}
                </td>
                <td className="border border-dorika-blue px-2 py-1">{e.permanentAddress.mobile}</td>
                {/* <td className="border border-dorika-blue px-2 py-1">{e.employmentType}</td>
                <td className="border border-dorika-blue px-2 py-1">{e.workLocation}</td>
                <td className="border border-dorika-blue px-2 py-1">{e.contactNo}</td>
                <td className="border border-dorika-blue px-2 py-1">{e.status}</td> */}
                <td className="border border-dorika-blue px-2 py-1">
                  <div className="flex justify-center gap-4 sm:gap-8">
                   <button
                    onClick={() => navigate("/EmployeeMaster", { state: { employee: e, id: e._id } })}
                    className="text-dorika-blue hover:text-dorika-green
"
                  >
                    <FaEdit />
                  </button>

                    <button
                      onClick={() => deleteEmployee(e._id)}
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
              <td colSpan="10" className="text-center py-4 text-gray-500">
                No employees found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {perPage !== "all" && (
        <Pagination
          total={filteredEmployees.length}
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

export default EmployeeList;
