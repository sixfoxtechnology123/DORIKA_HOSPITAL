import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Home, Eye, EyeOff } from "lucide-react";
import { FaTrash, FaEdit } from "react-icons/fa";
import Sidebar from "../component/Sidebar";
import toast from "react-hot-toast";

export default function AdminManagement() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]); 
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [newUser, setNewUser] = useState({
    userId: "",
    employeeID: "",
    employeeUserId: "",
    name: "",
    password: "",
    role: "HR",
    permissions: [],
  });

  const permissionsList = ["Dashboard_View", "Master_View", "Reminder_View", "Employee_View", "Leave_Management_View", "Shift_Management_view", "Attendance_history_view", "Pay_slip_view", "Admin_Management_view"];
  const token = localStorage.getItem("token");

  const isMainAdmin = (u) => {
    const flag = u?.isDefault === true || u?.is_default === true;
    const idGuess = typeof u?.userId === "string" && ["dorika", "admin"].includes(u.userId.trim().toLowerCase());
    return Boolean(flag || idGuess);
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const [userRes, empRes] = await Promise.all([
        axios.get("http://localhost:5002/api/adminManagement/users", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("http://localhost:5002/api/employees", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(userRes.data);
      setEmployees(empRes.data);
    } catch (err) { console.error(err.message); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAutoFill = (empId) => {
    if (!empId) return;
    const emp = employees.find((e) => e.employeeID?.toUpperCase() === empId.toUpperCase());
    if (emp) {
      const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
      setNewUser((prev) => ({ 
        ...prev, 
        name: fullName, 
        userId: emp.employeeUserId || "",
        employeeUserId: emp.employeeUserId || "",
        employeeID: emp.employeeID || ""
      }));
      toast.success("Details auto-filled!");
    } else { toast.error("Employee ID not found!"); }
  };

  const saveUser = async () => {
    if (!token) return toast.error("Admin session expired!");
    const isEditing = !!editingUserId;
    if (!newUser.userId || !newUser.name || (!isEditing && !newUser.password)) {
      return toast.error("Please fill all required fields");
    }

    try {
      if (isEditing) {
        await axios.put(`http://localhost:5002/api/adminManagement/users/${editingUserId}`, newUser, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("User updated!");
      } else {
        await axios.post("http://localhost:5002/api/adminManagement/users", newUser, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("User created!");
      }
      fetchData();
      setEditingUserId(null);
      setNewUser({ userId: "", employeeID: "", employeeUserId: "", name: "", password: "", role: "HR", permissions: [] });
    } catch (err) { toast.error(err.response?.data?.message || "Error saving user"); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5002/api/adminManagement/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Deleted!");
      fetchData();
    } catch (err) { toast.error("Error deleting"); }
  };

  const togglePermission = (perm) => {
    setNewUser((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm) ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm],
    }));
  };

  return (
   <div className="flex h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="p-4">
          <div className="bg-white border-l-8 border-dorika-blue p-3 mb-4 rounded-xl shadow-lg text-xs md:text-sm">
            <p className="font-bold text-dorika-blue mb-1">💡 Admin Tip: Assign specific module permissions carefully.</p>
            <p className="font-bold text-red-600 animate-pulse">💡 Quick Action: Simply enter the Employee ID and press "Enter" to auto-fill details. You only need to provide the password and choose the role.</p>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-dorika-blue">Admin Management</h2>
            <button onClick={() => navigate("/Dashboard")} className="flex items-center gap-2 bg-dorika-orange text-white px-3 md:px-4 py-1 rounded-lg font-semibold shadow-md text-sm"><Home size={18} /> Home</button>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-blue-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-dorika-blue">Employee ID Search</label>
                <input
                  placeholder="e.g. P00001"
                  className="border-2 border-dorika-blue p-1 pl-2 rounded w-full uppercase outline-none focus:border-dorika-orange font-bold"
                  onChange={(e) => {
                    let val = e.target.value.toUpperCase();
                    let clean = val.replace(/-/g, "");
                    let formatted = clean.replace(/^([A-Z]+)(\d+)/, "$1-$2");
                    setNewUser({ ...newUser, employeeID: formatted });
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAutoFill(newUser.employeeID); }}
                  value={newUser.employeeID}
                />
              </div>
              <div><label className="block text-sm font-medium text-dorika-blue">User ID</label><input value={newUser.userId} readOnly className="border-2 border-gray-300 p-1 pl-2 rounded w-full bg-gray-100 font-bold" /></div>
              <div><label className="block text-sm font-medium text-dorika-blue">Name</label><input value={newUser.name} readOnly className="border-2 border-gray-300 p-1 pl-2 rounded w-full bg-gray-100 font-bold" /></div>
              <div className="relative">
                <label className="block text-sm font-medium text-dorika-blue">Password</label>
                <input type={showPassword ? "text" : "password"} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="border-2 border-dorika-blue p-1 pl-2 rounded w-full pr-10 outline-none" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-dorika-blue">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-dorika-blue">Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="border-2 border-dorika-blue p-1 rounded w-full font-semibold">
                  <option value="HR">HR</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="font-bold text-dorika-blue mb-3">Module Permissions:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 font-semibold">
                {permissionsList.map((perm) => (
                  <label key={perm} className="flex items-center p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                    <input type="checkbox" checked={newUser.permissions.includes(perm)} onChange={() => togglePermission(perm)} className="mr-3" />
                    <span className="text-[10px] md:text-xs text-black">{perm.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={saveUser} className="mt-6 bg-dorika-orange text-white px-10 py-2 rounded-xl font-bold shadow-lg w-full md:w-auto">{editingUserId ? "Update User" : "Create User"}</button>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-200">
            <h3 className="text-lg font-bold text-dorika-blue mb-2">Registered user</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-center text-sm border-collapse">
                <thead className="bg-blue-100 text-dorika-blue uppercase text-xs">
                  <tr>
                    <th className="py-3 border-b border-dorika-blue px-2">User ID</th>
                    <th className="py-3 border-b border-dorika-blue px-2">Employee ID</th>
                    <th className="py-3 border-b border-dorika-blue px-2">Name</th>
                    <th className="py-3 border-b border-dorika-blue px-2">Role</th>
                    <th className="py-3 border-b border-dorika-blue px-2">Permissions</th>
                    <th className="py-3 border-b border-dorika-blue px-2">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {users.map((u) => {
                    const disabled = isMainAdmin(u);
                    return (
                      <tr key={u._id} className="hover:bg-blue-50 transition-colors border-b">
                        <td className="py-3 font-bold text-dorika-blue">{u.userId}</td>
                        <td className="py-3 font-bold text-dorika-blue">{u.employeeID}</td>
                        <td className="py-3">{u.name}</td>
                        <td className="py-3 font-semibold text-dorika-orange">{u.role}</td>
                        <td className="py-3 px-2 max-w-[300px]">
                          <div className="flex flex-wrap justify-center gap-1">
                            {u.permissions?.length > 0 ? u.permissions.map((p, i) => (
                              <span key={i} className="bg-blue-50 text-dorika-blue px-2 py-0.5 rounded text-[9px] border border-blue-100">{p.replace(/_View|_view/g, "")}</span>
                            )) : <span className="text-gray-400 italic">No Permissions</span>}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-center gap-4">
                            <button onClick={() => !disabled && (setEditingUserId(u._id) || setNewUser(u) || window.scrollTo({ top: 0, behavior: "smooth" }))} disabled={disabled} className={`${disabled ? "text-gray-300 cursor-not-allowed" : "text-dorika-blue hover:text-green-600"} transition-colors`}><FaEdit size={16} /></button>
                            <button onClick={() => !disabled && deleteUser(u._id)} disabled={disabled} className={`${disabled ? "text-gray-300 cursor-not-allowed" : "text-dorika-orange hover:text-red-700"} transition-colors`}><FaTrash size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}