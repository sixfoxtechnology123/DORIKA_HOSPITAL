import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../component/BackButton';
import Sidebar from "../component/Sidebar";
import { useLocation, useNavigate } from 'react-router-dom';
import toast from "react-hot-toast";

const QualificationMaster = () => {
  const [qualCode, setQualCode] = useState('');
  const [qualName, setQualName] = useState('');
  const [status, setStatus] = useState('Active');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.qualification) {
      const qual = location.state.qualification;
      setQualCode(qual.qualCode);
      setQualName(qual.qualName);
      setStatus(qual.status || 'Active');
      setEditId(qual._id);
      setIsEditMode(true);
    } else {
      resetAddForm();
    }
  }, [location.state]);

  const fetchNextQualCode = async () => {
    try {
      const token = localStorage.getItem("token");
      // Updated URL to include /master
      const res = await axios.get('http://localhost:5002/api/master/qualifications/next-code', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQualCode(res.data.qualCode);
    } catch {
      setQualCode('ED001'); // Fallback
    }
  };

  const resetAddForm = () => {
    setQualName('');
    setStatus('Active');
    setIsEditMode(false);
    setEditId(null);
    fetchNextQualCode();
  };

  const handleSaveOrUpdate = async () => {
    if (!qualName.trim()) return toast.error('Qualification name is required');

    const token = localStorage.getItem("token");
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    const payload = {
      qualCode,
      qualName,
      status,
    };

    try {
      if (isEditMode) {
        // Updated URL to include /master
        await axios.put(`http://localhost:5002/api/master/qualifications/${editId}`, payload, config);
        toast.success('Updated successfully');
      } else {
        // Updated URL to include /master
        await axios.post('http://localhost:5002/api/master/qualifications', payload, config);
        toast.success('Saved successfully');
      }
      navigate('/qualificationList', { replace: true });
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to save/update qualification');
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-300 flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 p-3 overflow-y-auto flex items-start md:items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-md sm:max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold whitespace-nowrap">
              {isEditMode ? 'Update Qualification' : 'Qualification Master'}
            </h2>
          </div>

          <div className="mb-4">
            <label className="block text-black mb-1">Qualification Code</label>
            <input 
              type="text" 
              value={qualCode} 
              readOnly 
              className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none bg-gray-100 cursor-not-allowed" 
            />
          </div>

          <div className="mb-4">
            <label className="block text-black mb-1">Qualification Name</label>
            <input 
              type="text" 
              value={qualName} 
              onChange={(e) => setQualName(e.target.value.toUpperCase())}  
              className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400" 
              placeholder="e.g. BACHELOR OF ARTS"
            />
          </div>

          <div className="mb-4">
            <label className="block text-black mb-1">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)} 
              className="w-full pl-2 pr-1 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex w-full justify-between items-center">
            <div><BackButton/></div>
            <button
              onClick={handleSaveOrUpdate}
              className={`px-4 py-1 rounded text-white transition-colors duration-200 ${
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

export default QualificationMaster;