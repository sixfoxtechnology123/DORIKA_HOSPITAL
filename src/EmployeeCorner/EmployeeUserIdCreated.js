import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import { Key, RefreshCw, Save, Edit3, XCircle, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

const EmployeeUserIdCreated = () => {
  const [dataList, setDataList] = useState([]);
  const [bulkPassword, setBulkPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [tempPassword, setTempPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const token = localStorage.getItem("token");
  const API_URL = "http://localhost:5002/api/employee-ids";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDataList(res.data);
    } catch (err) {
      toast.error("Error loading employees");
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(dataList.map((emp) => emp.employeeId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkGenerate = async () => {
    if (!bulkPassword) return toast.error("Please enter a password first!");
    const message = selectedIds.length > 0 
      ? `Update password for ${selectedIds.length} selected employees?`
      : "Update password for ALL employees?";

    if (!window.confirm(message)) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/generate-all-passwords`, 
        { 
          customPassword: bulkPassword,
          targetEmployeeIds: selectedIds.length > 0 ? selectedIds : null 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Passwords generated successfully!");
      setBulkPassword("");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (emp) => {
    setEditingRow(emp.employeeId);
    setTempPassword(""); 
  };

  const saveIndividualPassword = async (emp) => {
    if (!tempPassword) return toast.error("Password cannot be empty");
    try {
      await axios.post(`${API_URL}/generate-all-passwords`, 
        { 
          customPassword: tempPassword,
          targetEmployeeIds: [emp.employeeId] 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Password updated for ${emp.name}`);
      setEditingRow(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to update individual password");
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <h2 className="text-xl md:text-2xl font-bold text-dorika-blue mb-4">
          Employee Password Management
        </h2>

        {/* TOP SECTION */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border-t-4 border-dorika-orange mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-2 font-mono uppercase">
                {selectedIds.length > 0 
                  ? `Target: (${selectedIds.length}) Selected` 
                  : "Target: All Employees"}
              </label>
              <input
                type="text"
                placeholder="Enter password to generate..."
                value={bulkPassword}
                onChange={(e) => setBulkPassword(e.target.value)}
                className="w-full border-2 border-gray-200 p-2 md:p-3 rounded-xl focus:border-dorika-blue outline-none transition-all"
              />
            </div>
            <button
              onClick={handleBulkGenerate}
              disabled={loading}
              className="bg-dorika-blue hover:bg-black text-white px-6 md:px-8 py-3 md:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" /> : <Key size={20} />}
              <span className="whitespace-nowrap">
                {selectedIds.length > 0 ? "Generate Selected" : "Generate All"}
              </span>
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        {/* <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden"> */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-blue-50 text-dorika-blue text-[10px] md:text-xs uppercase font-bold">
                <tr>
                  <th className="p-3 md:p-4 border-b w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedIds.length === dataList.length && dataList.length > 0}
                      className="w-4 h-4 accent-dorika-orange cursor-pointer"
                    />
                  </th>
                  <th className="p-3 md:p-4 border-b">Sl No</th>
                  <th className="p-3 md:p-4 border-b">Employee ID</th>
                  <th className="p-3 md:p-4 border-b">User ID</th>
                  <th className="p-3 md:p-4 border-b">Name</th>
                  <th className="p-3 md:p-4 border-b">Designation</th>
                  <th className="p-3 md:p-4 border-b">Password Status</th>
                  <th className="p-3 md:p-4 border-b text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {dataList.map((emp, index) => (
                  <tr 
                    key={index} 
                    className={`${selectedIds.includes(emp.employeeId) ? 'bg-orange-50' : 'hover:bg-gray-50'} border-b last:border-0 transition-colors`}
                  >
                    <td className="p-3 md:p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(emp.employeeId)}
                        onChange={() => handleSelectOne(emp.employeeId)}
                        className="w-4 h-4 accent-dorika-orange cursor-pointer"
                      />
                    </td>
                    <td className="p-3 md:p-4 text-gray-500">{index + 1}</td>
                    <td className="p-3 md:p-4 font-semibold text-gray-800">{emp.employeeId}</td>
                    <td className="p-3 md:p-4 font-bold text-dorika-blue">{emp.employeeUserId}</td>
                    <td className="p-3 md:p-4 font-medium uppercase">{emp.name}</td>
                    <td className="p-3 md:p-4 text-[10px] md:text-xs text-gray-600 truncate max-w-[150px]" title={emp.designation}>
                      {emp.designation}
                    </td>
                    <td className="p-3 md:p-4">
                      {editingRow === emp.employeeId ? (
                        <input 
                          type="text"
                          placeholder="Set Password"
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          className="border border-dorika-blue rounded px-2 py-1 w-full max-w-[120px] text-xs outline-none shadow-inner"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* STATUS BADGE LOGIC */}
                          <span className={`px-2 md:px-3 py-1 rounded-lg font-bold text-[10px] md:text-xs ${
                            emp.password === "NOT GENERATED" || !emp.password
                            ? "bg-red-50 text-red-500" 
                            : "bg-green-50 text-green-600"
                          }`}>
                            {emp.password === "NOT GENERATED" || !emp.password
                              ? "NONE" 
                              : (visiblePasswords[emp.employeeId] ? emp.plainPassword : "GENERATED")}
                          </span>
                          
                          {/* EYE ICON (Only if password exists) */}
                          {(emp.password && emp.password !== "NOT GENERATED") && (
                            <button 
                              onClick={() => togglePasswordVisibility(emp.employeeId)}
                              className="text-gray-400 hover:text-dorika-blue transition-colors"
                            >
                              {/* {visiblePasswords[emp.employeeId] ? <EyeOff size={14} /> : <Eye size={14} />} */}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 md:p-4 text-center">
                      {editingRow === emp.employeeId ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => saveIndividualPassword(emp)} className="text-green-600 hover:text-green-800">
                            <Save size={18} />
                          </button>
                          <button onClick={() => setEditingRow(null)} className="text-red-500 hover:text-red-700">
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(emp)} className="text-dorika-blue hover:text-dorika-orange transition-colors">
                          <Edit3 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    // </div>
  );
};

export default EmployeeUserIdCreated;