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
    employeeUserId: "", // New field added to state
    password: "",
  });

  const token = localStorage.getItem("token");

  // Fetch all employees for search
  useEffect(() => {
    axios
      .get("http://localhost:5002/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployees(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  // Fetch all created Employee IDs
  const fetchEmployeeIds = () => {
    axios
      .get("http://localhost:5002/api/employee-ids", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployeeIds(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchEmployeeIds();
  }, [token]);

// Auto fill name, email, and User ID from Employee Master on Enter
  const handleFetchEmployee = (id) => {
    if (!id) return;

    // 1. Find the employee in the master list
    const emp = employees.find((e) => e.employeeID?.toUpperCase() === id.toUpperCase());

    if (emp) {
      const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
      const email = emp.permanentAddress?.email || "";
      
      setFormData((prev) => ({
        ...prev,
        name: fullName,
        email: email,
        // 2. Fetch the existing employeeUserId from the master record
        employeeUserId: emp.employeeUserId || "", 
      }));
    } else {
      toast.error("Employee ID not found!");
      setFormData((prev) => ({ ...prev, name: "", email: "", employeeUserId: "" }));
    }
  };

  // Save or update Employee ID
  const saveEmployeeId = async () => {
    // EMAIL REMOVED FROM VALIDATION BELOW
    if (!formData.employeeId || !formData.name || !formData.password) {
      return toast.error("Please fill all fields");
    }

    const payload = { ...formData };

    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5002/api/employee-ids/${editingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Employee ID updated successfully!");
      } else {
        await axios.post("http://localhost:5002/api/employee-ids", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Employee ID created successfully!");
      }
      fetchEmployeeIds();
      setEditingId(null);
      setFormData({ employeeId: "", name: "", email: "", employeeUserId: "", password: "" });
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
      employeeUserId: emp.employeeUserId || "", // Populate from record
      password: emp.password,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete Employee ID
  const deleteEmployeeId = (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    axios
      .delete(`http://localhost:5002/api/employee-ids/${id}`, {
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
        <div className="min-h-screen bg-dorika-blueLight p-4">
          <h2 className="text-2xl font-bold text-dorika-blue mb-4">
            Employee User ID Creation
          </h2>

          {/* New Responsive Professional Message */}
          <div className="bg-blue-50 border-l-4 border-dorika-blue p-3 mb-4 rounded shadow-sm">
            <p className="text-sm font-semibold text-red-600 animate-pulse">
              💡 Quick Action: Simply enter the Employee ID and press "Enter" to auto-fill details. You only need to provide the password.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white p-4 rounded-2xl shadow mb-3 border border-blue-200">
            <h3 className="text-lg font-semibold text-dorika-blue mb-4">
              {editingId ? "Update Employee ID" : "Create Employee ID"}
            </h3>

            {/* Changed grid to 5 columns to accommodate the new field */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
             <div>
                <label className="block text-sm font-medium text-dorika-blue">Employee ID</label>
                <input
                  placeholder="e.g. TP00001"
                  value={formData.employeeId}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase();
                    let cleanValue = value.replace(/-/g, "");
                    let formattedValue = cleanValue.replace(/^([A-Z]+)(\d+)/, "$1-$2");
                    
                    setFormData({ ...formData, employeeId: formattedValue });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFetchEmployee(formData.employeeId);
                  }}
                  /* Added pulse animation below */
                  className="border-2 border-dorika-blue p-0 pl-2 rounded w-full uppercase font-semibold  focus:animate-none focus:border-dorika-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dorika-blue">Name</label>
                <input
                  value={formData.name}
                  readOnly
                  className="border border-dorika-blue p-0 pl-2 rounded w-full bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dorika-blue">Email </label>
                <input
                  value={formData.email}
                  readOnly
                  className="border border-dorika-blue p-0 pl-2 rounded w-full bg-gray-100"
                />
              </div>

              {/* Added Employee User ID Field (Disabled/ReadOnly) */}
              <div>
                <label className="block text-sm font-medium text-dorika-blue">Employee User ID</label>
                <input
                  value={formData.employeeUserId}
                  readOnly
                  placeholder="Auto-generated"
                  className="border border-dorika-blue p-0 pl-2 rounded w-full bg-gray-100"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-dorika-blue">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter Password"
                  className="border border-dorika-blue p-0 pl-2 rounded w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-6 text-dorika-blue"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={saveEmployeeId}
              className={`mt-4 w-full md:w-auto px-6 font-semibold py-2 rounded-lg transition-colors ${
                editingId
                  ? "bg-yellow-400 hover:bg-yellow-500 text-black"
                  : "bg-dorika-orange hover:bg-dorika-blue text-white"
              }`}
            >
              {editingId ? "Update Employee ID" : "Save Employee ID"}
            </button>
          </div>

          {/* Table */}
          <div className="bg-white p-4 rounded-2xl shadow border border-blue-200">
            <h3 className="text-lg font-semibold text-dorika-blue mb-2">
              Created Employee IDs
            </h3>
            {/* This div allows you to swipe left/right on your phone */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] table-auto border border-dorika-blue text-sm text-center">
              <thead className="bg-blue-100 text-dorika-blue">
                <tr>
                  <th className="border border-dorika-blue px-2 py-1">Employee ID</th>
                  <th className="border border-dorika-blue px-2 py-1">User ID</th>
                  <th className="border border-dorika-blue px-2 py-1">Name</th>
                  <th className="border border-dorika-blue px-2 py-1">Email</th>
                  <th className="border border-dorika-blue px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {employeeIds.length > 0 ? (
                  employeeIds.map((emp) => (
                    <tr key={emp._id} className="hover:bg-dorika-blueLight">
                      <td className="border border-dorika-blue px-2 py-1">{emp.employeeId}</td>
                      <td className="border border-dorika-blue px-2 py-1 font-semibold">{emp.employeeUserId}</td>
                      <td className="border border-dorika-blue px-2 py-1">{emp.name}</td>
                      <td className="border border-dorika-blue px-2 py-1">{emp.email}</td>
                      <td className="border border-dorika-blue px-2 py-1">
                        <div className="flex justify-center items-center gap-4">
                          <button
                            onClick={() => editEmployeeId(emp._id)}
                            className="text-dorika-blue hover:text-dorika-green"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => deleteEmployeeId(emp._id)}
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
                    <td colSpan="5" className="py-4 text-gray-500 font-medium">
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
    </div>
  );
};

export default EmployeeUserIdCreated;