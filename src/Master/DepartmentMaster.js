import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../component/BackButton';
import { useLocation, useNavigate } from 'react-router-dom';

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
      const res = await axios.get('http://localhost:5001/api/departments/next-code');
      setDeptCode(res.data.deptCode);
    } catch {
      setDeptCode('');
    }
  };

  const fetchDepartments = async () => {
    const res = await axios.get('http://localhost:5001/api/departments');
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
        await axios.put(`http://localhost:5001/api/departments/${editId}`, {
          deptCode,
          deptName,
          description,
          status,
        });
        alert('Updated successfully');
      } else {
        await axios.post('http://localhost:5001/api/departments', {
          deptCode,
          deptName,
          description,
          status,
        });
        alert('Saved successfully');
      }
      navigate('/departmentList', { replace: true });
    } catch {
      alert('Failed to save/update department');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          {isEditMode ? 'Update Department' : 'Department'}
        </h2>

        <div className="mb-4">
          <label className="block text-black mb-1">Department Code</label>
          <input type="text" value={deptCode} readOnly className="w-full p-1 border rounded cursor-not-allowed" />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Department Name</label>
          <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} className="w-full p-1 border rounded" />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-1 border rounded" rows="2" />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-1 border rounded">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex justify-between">
          <BackButton />
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
  );
};

export default DepartmentMaster;
