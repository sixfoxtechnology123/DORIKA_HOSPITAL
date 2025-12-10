import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaEdit } from 'react-icons/fa';
import BackButton from '../component/BackButton';
import Sidebar from '../component/Sidebar';


const DesignationList = () => {
  const [designations, setDesignations] = useState([]);
  const navigate = useNavigate();

  const fetchDesignations = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/designations');
      console.log('Fetched designations:', res.data); // ✅ Debug
      setDesignations(res.data);
    } catch (err) {
      console.error('Fetch Designations Error:', err);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const deleteDesignation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this designation?'))
      return;
    try {
      await axios.delete(`http://localhost:5001/api/designations/${id}`);
      setDesignations(designations.filter((d) => d._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 overflow-y-auto">
    <div className="p-3 bg-white shadow-md rounded-md">
      <div className="bg-green-50 border border-green-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-green-800">Designation</h2>
        <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate('/designationMaster')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Add Designation
          </button>
        </div>
      </div>

      <table className="w-full table-auto border border-green-500">
        <thead className="bg-gray-200 text-sm">
          <tr>
            <th className="border border-green-500 px-2 py-1">Designation ID</th>
            <th className="border border-green-500 px-2 py-1">Designation Name</th>
            <th className="border border-green-500 px-2 py-1">Department</th>
            <th className="border border-green-500 px-2 py-1">Grade</th>
            <th className="border border-green-500 px-2 py-1">Status</th>
            <th className="border border-green-500 px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {designations.length > 0 ? (
            designations.map((d) => (
              <tr key={d._id} className="hover:bg-gray-100 transition">
                <td className="border border-green-500 px-2 py-1">{d.designationID}</td>
                <td className="border border-green-500 px-2 py-1">{d.designationName}</td>
                <td className="border border-green-500 px-2 py-1">{d.departmentName}</td>
                <td className="border border-green-500 px-2 py-1">{d.grade}</td>
                <td className="border border-green-500 px-2 py-1">{d.status}</td>
                <td className="border border-green-500 px-2 py-1 ">
                <div className='flex justify-center gap-8'>
                    <button
                    onClick={() =>
                      navigate('/designationMaster', { state: { designation: d } })
                    }
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => deleteDesignation(d._id)}
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
              <td colSpan="6" className="text-center py-4 text-gray-500">
                No designations found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
</div>
</div>
  );
};

export default DesignationList;
