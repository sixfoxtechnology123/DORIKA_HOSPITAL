import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../component/BackButton';
import Sidebar from "../component/Sidebar";
import { useLocation, useNavigate } from 'react-router-dom';
import toast from "react-hot-toast";

const DepartmentMaster = () => {
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [departments, setDepartments] = useState([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();

    if (location.state?.department) {
      const dept = location.state.department;
      setDeptCode(dept.deptCode);
      setDeptName(dept.deptName);
      setDescription(dept.description || '');
      setStatus(dept.status || 'Active');
      setEditId(dept._id);
      setIsEditMode(true);
    } else {
      resetAddForm();
    }
  }, [location.state]);

  const fetchDeptCode = async () => {
    try {
      const res = await axios.get('http://localhost:5002/api/departments/next-code');
      setDeptCode(res.data.deptCode);
    } catch {
      setDeptCode('');
    }
  };

  const fetchDepartments = async () => {
    const res = await axios.get('http://localhost:5002/api/departments');
    setDepartments(res.data);
  };

  const resetAddForm = () => {
    setDeptName('');
    setDescription('');
    setStatus('Active');
    setIsEditMode(false);
    setEditId(null);
    fetchDeptCode();
  };

  const handleSaveOrUpdate = async () => {
    if (!deptName.trim()) return alert('Department name is required');

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:5002/api/departments/${editId}`, {
          deptCode,
          deptName,
          description,
          status,
        });
        toast.success('Updated successfully');
      } else {
        await axios.post('http://localhost:5002/api/departments', {
          deptCode,
          deptName,
          description,
          status,
        });
        toast.success('Saved successfully');
      }
      navigate('/departmentList', { replace: true });
    } catch {
      toast.error('Failed to save/update department');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 p-3 overflow-y-auto flex items-start md:items-center justify-center">
       <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-md sm:max-w-lg">
        <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold whitespace-nowrap">
          {isEditMode ? 'Update Department' : 'Department'}
        </h2>
      </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Department Code</label>
          <input type="text" value={deptCode} readOnly className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 cursor-not-allowed" />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Department Name</label>
          <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value.toUpperCase())}  className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150" />
        </div>

        {/* <div className="mb-4">
          <label className="block text-black mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-1 border rounded" rows="2" />
        </div> */}

        <div className="mb-4">
          <label className="block text-black mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex w-full justify-between items-center">
         <div><BackButton/></div>
          <button
            onClick={handleSaveOrUpdate}
            className={`px-4 py-1 rounded text-white ${
              isEditMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {isEditMode ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default DepartmentMaster;
