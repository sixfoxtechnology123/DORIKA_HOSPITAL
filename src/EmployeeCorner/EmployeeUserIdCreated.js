// src/pages/EmployeeUserIdCreated.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import { Eye, EyeOff } from "lucide-react";
import { FaTrash, FaEdit } from "react-icons/fa";
import toast from "react-hot-toast";

const EmployeeUserIdCreated = () => {
  const [employees, setEmployees] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    password: "",
  });

  const token = localStorage.getItem("token");

  // Fetch all employees for search
  useEffect(() => {
    axios
      .get("http://localhost:5001/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployees(res.data))
      
      .catch((err) => console.error(err));
  }, [token]);

  // Fetch all created Employee IDs
  const fetchEmployeeIds = () => {
    axios
      .get("http://localhost:5001/api/employee-ids", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployeeIds(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchEmployeeIds();
  }, [token]);

  // Auto fill name and email on Enter
  const handleFetchEmployee = (id) => {
    if (!id) return;

    const emp = employees.find((e) => e.employeeID?.toUpperCase() === id.toUpperCase());

    if (emp) {
      const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
      const email = emp.permanentAddress?.email || "";
      setFormData((prev) => ({
        ...prev,
        name: fullName,
        email: email,
      }));
    } else {
      toast.error("Employee ID not found!");
      setFormData((prev) => ({ ...prev, name: "", email: "" }));
    }
  };

  // Save or update Employee ID
  const saveEmployeeId = async () => {
    if (!formData.employeeId || !formData.name || !formData.email || !formData.password) {
      return toast.error("Please fill all fields");
    }

    const payload = { ...formData };

    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5001/api/employee-ids/${editingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Employee ID updated successfully!");
      } else {
        await axios.post("http://localhost:5001/api/employee-ids", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Employee ID created successfully!");
      }
      fetchEmployeeIds();
      setEditingId(null);
      setFormData({ employeeId: "", name: "", email: "", password: "" });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error saving Employee ID");
    }
  };

  // Edit Employee ID
  const editEmployeeId = (id) => {
    const emp = employeeIds.find((e) => e._id === id);
    setEditingId(id);
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email,
      password: emp.password,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete Employee ID
  const deleteEmployeeId = (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    axios
      .delete(`http://localhost:5001/api/employee-ids/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("Employee ID deleted successfully!");
        fetchEmployeeIds();
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.response?.data?.message || "Error deleting Employee ID");
      });
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-screen bg-blue-50 p-4">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            Employee User ID Creation
          </h2>

          {/* Form */}
          <div className="bg-white p-4 rounded-2xl shadow mb-3 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">
              {editingId ? "Update Employee ID" : "Create Employee ID"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800">Employee ID</label>
                <input
                  placeholder="Enter Employee ID and press Enter"
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFetchEmployee(formData.employeeId);
                  }}
                  className="border border-blue-300 p-0 pl-2 rounded w-full uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-800">Name</label>
                <input
                  value={formData.name}
                  readOnly
                  className="border border-blue-300 p-0 pl-2 rounded w-full bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-800">Email</label>
                <input
                  value={formData.email}
                  readOnly
                  className="border border-blue-300 p-0 pl-2 rounded w-full bg-gray-100"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-blue-800">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter Password"
                  className="border border-blue-300 p-0 pl-2 rounded w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-6 text-blue-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={saveEmployeeId}
              className={`mt-3 px-4 font-semibold py-1 rounded-lg ${
                editingId
                  ? "bg-yellow-400 hover:bg-yellow-500 text-black"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {editingId ? "Update Employee ID" : "Save Employee ID"}
            </button>
          </div>

          {/* Table */}
          <div className="bg-white p-4 rounded-2xl shadow border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">
              Created Employee IDs
            </h3>
            <table className="w-full table-auto border border-blue-500 text-sm text-center">
              <thead className="bg-blue-100 text-blue-800">
                <tr>
                  <th className="border border-blue-500 px-2 py-1">Employee ID</th>
                  <th className="border border-blue-500 px-2 py-1">Name</th>
                  <th className="border border-blue-500 px-2 py-1">Email</th>
                  <th className="border border-blue-500 px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {employeeIds.length > 0 ? (
                  employeeIds.map((emp) => (
                    <tr key={emp._id} className="hover:bg-blue-50">
                      <td className="border border-blue-500 px-2 py-1">{emp.employeeId}</td>
                      <td className="border border-blue-500 px-2 py-1">{emp.name}</td>
                      <td className="border border-blue-500 px-2 py-1">{emp.email}</td>
                      <td className="border border-blue-500 px-2 py-1">
                        <div className="flex justify-center items-center gap-4">
                          <button
                            onClick={() => editEmployeeId(emp._id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => deleteEmployeeId(emp._id)}
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
                    <td colSpan="4" className="py-4 text-gray-500 font-medium">
                      No Employee IDs created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeUserIdCreated;
