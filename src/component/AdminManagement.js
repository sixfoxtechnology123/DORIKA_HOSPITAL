// src/pages/AdminManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { FaTrash, FaEdit } from "react-icons/fa";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";

export default function AdminManagement() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [newUser, setNewUser] = useState({
    userId: "",
    name: "",
    password: "",
    role: "HR",
    permissions: [],
  });

  const permissionsList = [
    "Dashboard_View",
    "Department_View",
    "Designation_View",
    "Leave_Manage",
    "Holiday_Manage",
    "Shift_Manage",
    "Policy_Manage",
    "Location_Manage",
    "Payroll_Manage",
    "Employee_View",
    "Admin_Management",
  ];

  const token = localStorage.getItem("token");

  // Detect main admin to protect editing/deleting
  const isMainAdmin = (u) => {
    const flag =
      u?.isDefault === true ||
      u?.isDefault === "true" ||
      u?.isDefault === 1 ||
      u?.is_default === true ||
      u?.is_default === "true";
    const idGuess =
      typeof u?.userId === "string" &&
      ["admin", "superadmin", "mainadmin", "root"].includes(
        u.userId.trim().toLowerCase()
      );
    const roleGuess =
      typeof u?.role === "string" &&
      ["admin", "superadmin", "root"].includes(u.role.trim().toLowerCase());
    return Boolean(flag || (idGuess && roleGuess));
  };

  // Fetch all users
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await axios.get(
        "http://localhost:5001/api/adminManagement/users",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch users error:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create or Update User
  const saveUser = async () => {
    if (!token) return alert("Admin not logged in!");
    const isEditing = !!editingUserId;

    if (!newUser.userId || !newUser.name || (!isEditing && !newUser.password)) {
      return toast.success(
        !isEditing
          ? "Please fill User ID, Name and Password"
          : "Please fill User ID and Name"
      );
    }

    const payload = { ...newUser };
    if (isEditing && !newUser.password) delete payload.password;

    try {
      let res;
      if (isEditing) {
        res = await axios.put(
          `http://localhost:5001/api/adminManagement/users/${editingUserId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(res.data.message || "User updated successfully!");
        setUsers((prev) =>
          prev.map((u) => (u._id === editingUserId ? { ...u, ...payload } : u))
        );
      } else {
        res = await axios.post(
          "http://localhost:5001/api/adminManagement/users",
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(res.data.message || "New user added!");
        setUsers((prev) => [...prev, res.data.user]);
      }

      setEditingUserId(null);
      setNewUser({
        userId: "",
        name: "",
        password: "",
        role: "HR",
        permissions: [],
      });
    } catch (err) {
      console.error("Save user error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Error saving user");
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(
        `http://localhost:5001/api/adminManagement/users/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("User deleted successfully!");
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      console.error("Delete user error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Error deleting user");
    }
  };

  // Edit user
  const editUser = (user) => {
    setEditingUserId(user._id);
    setNewUser({
      userId: user.userId,
      name: user.name,
      password: "",
      role: user.role,
      permissions: user.permissions || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePermission = (perm) => {
    setNewUser((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-screen bg-blue-50 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-blue-800">Admin Management</h2>
            <button
              onClick={() => navigate("/Dashboard")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 font-semibold py-1 rounded-lg shadow hover:bg-blue-700"
            >
              <Home size={20} /> Home
            </button>
          </div>

          {/* User Form */}
          <div className="bg-white p-4 rounded-2xl shadow mb-3 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">
              {editingUserId ? "Update User" : "Create New User"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800">User ID</label>
                <input
                  placeholder="Enter User ID"
                  value={newUser.userId}
                  onChange={(e) =>
                    setNewUser({ ...newUser, userId: e.target.value })
                  }
                  className="border border-blue-300 p-0 pl-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-800">Name</label>
                <input
                  placeholder="Enter Name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="border border-blue-300 p-0 pl-2 rounded w-full"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-blue-800">Password</label>
                <input
                  placeholder="Enter Password"
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
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

              <div>
                <label className="block text-sm font-medium text-blue-800">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="border border-blue-300 p-0 pl-2 rounded w-full"
                >
                  <option value="HR">HR</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
            </div>

            {/* Permissions */}
            <div className="mt-4">
              <h4 className="font-medium text-blue-700 mb-2">Permissions:</h4>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 font-semibold">
                {permissionsList.map((perm) => (
                  <label key={perm} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newUser.permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="mr-2"
                    />
                    {perm.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={saveUser}
              className={`mt-3 px-4 font-semibold py-1 rounded-lg ${
                editingUserId
                  ? "bg-yellow-400 hover:bg-yellow-500 text-black"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {editingUserId ? "Update User" : "Create User"}
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white p-4 rounded-2xl shadow border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Existing Users</h3>
            <table className="w-full table-auto border border-blue-500 text-sm text-center">
              <thead className="bg-blue-100 text-blue-800">
                <tr>
                  <th className="border border-blue-500 px-2 py-1">User ID</th>
                  <th className="border border-blue-500 px-2 py-1">Name</th>
                  <th className="border border-blue-500 px-2 py-1">Role</th>
                  <th className="border border-blue-500 px-2 py-1">Permissions</th>
                  <th className="border border-blue-500 px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((u) => {
                    const disabled = isMainAdmin(u);
                    return (
                      <tr key={u._id} className="hover:bg-blue-50">
                        <td className="border border-blue-500 px-2 py-1">{u.userId}</td>
                        <td className="border border-blue-500 px-2 py-1">{u.name}</td>
                        <td className="border border-blue-500 px-2 py-1">{u.role}</td>
                        <td className="border border-blue-500 px-2 py-1">
                          {Array.isArray(u.permissions) && u.permissions.length > 0
                            ? u.permissions.join(", ")
                            : "-"}
                        </td>
                        <td className="border border-blue-500 px-2 py-1">
                          <div className="flex justify-center items-center gap-4">
                            <button
                              onClick={() => { if (!disabled) editUser(u); }}
                              disabled={disabled}
                              className={`${
                                disabled ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-800"
                              }`}
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => { if (!disabled) deleteUser(u._id); }}
                              disabled={disabled}
                              className={`${
                                disabled ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:text-red-800"
                              }`}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-gray-500 font-medium">
                      No users found.
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
}
