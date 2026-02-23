import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../component/BackButton';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from "react-hot-toast";
import Sidebar from "../component/Sidebar";


const DesignationMaster = () => {
  const normalizeGrade = (value) => {
    const raw = String(value || "").trim().toUpperCase();
    if (["I", "GRADE-I", "A", "GRADE 1", "GRADE-1", "1"].includes(raw)) return "I";
    if (["II", "GRADE-II", "B", "GRADE 2", "GRADE-2", "2"].includes(raw)) return "II";
    if (["III", "GRADE-III", "C", "GRADE 3", "GRADE-3", "3"].includes(raw)) return "III";
    if (["IV", "GRADE-IV", "D", "GRADE 4", "GRADE-4", "4"].includes(raw)) return "IV";
    return "I";
  };

  const [designationID, setDesignationID] = useState('');
  const [designationName, setDesignationName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [grade, setGrade] = useState('I');
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
      setGrade(normalizeGrade(d.grade));
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
      const res = await axios.get('/api/departments');
      setDepartments(res.data);
    } catch (err) {
      toast.error('Fetch Departments Error:', err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await axios.get('/api/designations');
      setDesignations(res.data);
    } catch (err) {
      toast.error('Fetch Designations Error:', err);
    }
  };

  const fetchNextDesignationID = async () => {
    try {
      const res = await axios.get('/api/designations/next-id');
      setDesignationID(res.data.designationID);
    } catch (err) {
      toast.error('Fetch Next ID Error:', err);
    }
  };

  const handleSaveOrUpdate = async () => {
    if (!designationName.trim() || !departmentName) {
      toast.error('All fields are required');
      return;
    }

    const duplicate = designations.find(
      (d) =>
        d.designationName.toLowerCase().trim() ===
          designationName.toLowerCase().trim() &&
        d._id !== editId
    );
    if (duplicate) {
      toast.error('Designation already exists!');
      return;
    }

    try {
      if (isEditMode) {
        await axios.put(`/api/designations/${editId}`, {
          designationID,
          designationName,
          departmentName,
          grade: normalizeGrade(grade),
          status,
        });
        toast.success('Designation updated successfully');
      } else {
        await axios.post('/api/designations', {
          designationID,
          designationName,
          departmentName,
          grade: normalizeGrade(grade),
          status,
        });
        toast.success('Designation saved successfully');
      }
      resetForm();
      fetchDesignations();
      navigate('/designationList', { replace: true });
    } catch (err) {
      toast.error('Save/Update Error:', err);
      toast.error('Failed to save/update');
    }
  };

  const resetForm = () => {
    setDesignationName('');
    setDepartmentName('');
    setGrade('I');
    setStatus('Active');
    setEditId(null);
    setIsEditMode(false);
    fetchNextDesignationID();
  };

  const handleBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-zinc-300 flex flex-col md:flex-row">
      <Sidebar />
     <div className="flex-1 p-3 overflow-y-auto flex items-start md:items-center justify-center">
       <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-md sm:max-w-lg">
         <h2 className="text-lg sm:text-xl font-bold mb-4 whitespace-nowrap">
        {isEditMode ? 'Update Designation' : 'Designation Master'}
      </h2>

        <div className="mb-4">
          <label className="block text-black mb-1">Designation ID</label>
          <input
            type="text"
            value={designationID}
            readOnly
            className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 cursor-not-allowed"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Designation Name</label>
          <input
            type="text"
            value={designationName}
            onChange={(e) => setDesignationName(e.target.value.toUpperCase())}
            className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
          />
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Department</label>
          <select
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
            className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
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
            className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
          >
            <option value="I">I</option>
            <option value="II">II</option>
            <option value="III">III</option>
            <option value="IV">IV</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-black mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
           className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

      <div className="flex w-full justify-between items-center">
        <div><BackButton/></div>
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
    </div>
  );
};

export default DesignationMaster;



