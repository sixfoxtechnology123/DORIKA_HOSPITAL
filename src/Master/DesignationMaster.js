import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../component/BackButton';
import { useNavigate, useLocation } from 'react-router-dom';

const DesignationMaster = () => {
  const [designationID, setDesignationID] = useState('');
  const [designationName, setDesignationName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [grade, setGrade] = useState('A');
  const [status, setStatus] = useState('Active');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

 useEffect(() => {
  const init = async () => {
    await fetchDepartments();
    await fetchDesignations();

    if (location.state?.designation) {
      // EDIT MODE → keep same ID
      const d = location.state.designation;
      setDesignationID(d.designationID);  // keep existing ID
      setDesignationName(d.designationName);
      setDepartmentName(d.departmentName);
      setGrade(d.grade);
      setStatus(d.status);
      setEditId(d._id);
      setIsEditMode(true);
    } else {
      // ADD MODE → generate new ID
      setIsEditMode(false);
      await fetchNextDesignationID();
    }
  };

  init();
}, [location.state]);


  const fetchDepartments = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Fetch Departments Error:', err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/designations');
      setDesignations(res.data);
    } catch (err) {
      console.error('Fetch Designations Error:', err);
    }
  };

  const fetchNextDesignationID = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/designations/next-id');
      setDesignationID(res.data.designationID);
    } catch (err) {
      console.error('Fetch Next ID Error:', err);
    }
  };

  const handleSaveOrUpdate = async () => {
    if (!designationName.trim() || !departmentName) {
      alert('All fields are required');
      return;
    }

    const duplicate = designations.find(
      (d) =>
        d.designationName.toLowerCase().trim() ===
          designationName.toLowerCase().trim() &&
        d._id !== editId
    );
    if (duplicate) {
      alert('Designation already exists!');
      return;
    }

    try {
      if (isEditMode) {
        await axios.put(`http://localhost:5001/api/designations/${editId}`, {
          designationID,
          designationName,
          departmentName,
          grade,
          status,
        });
        alert('Designation updated successfully');
      } else {
        await axios.post('http://localhost:5001/api/designations', {
          designationID,
          designationName,
          departmentName,
          grade,
          status,
        });
        alert('Designation saved successfully');
      }
      resetForm();
      fetchDesignations();
      navigate('/designationList', { replace: true });
    } catch (err) {
      console.error('Save/Update Error:', err);
      alert('Failed to save/update');
    }
  };

  const resetForm = () => {
    setDesignationName('');
    setDepartmentName('');
    setGrade('A');
    setStatus('Active');
    setEditId(null);
    setIsEditMode(false);
    fetchNextDesignationID();
  };

  const handleBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-zinc-300 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          {isEditMode ? 'Update Designation' : 'Designation Master'}
        </h2>

        <div className="mb-4">
          <label className="block text-black mb-1">Designation ID</label>
          <input
            type="text"
            value={designationID}
            readOnly
            className="w-full p-1 border rounded cursor-not-allowed"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Designation Name</label>
          <input
            type="text"
            value={designationName}
            onChange={(e) => setDesignationName(e.target.value)}
            className="w-full p-1 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Department</label>
          <select
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
            className="w-full p-1 border rounded"
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d.deptName}>
                {d.deptName}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Grade</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full p-1 border rounded"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-1 border rounded"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex justify-between">
          <button onClick={handleBack}>
            <BackButton />
          </button>
          <button
            onClick={handleSaveOrUpdate}
            className={`px-4 py-1 rounded text-white ${
              isEditMode
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {isEditMode ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignationMaster;
