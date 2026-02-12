import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaEdit } from 'react-icons/fa';
import BackButton from '../component/BackButton';
import Sidebar from '../component/Sidebar';
import Pagination from "../Master/Pagination";


const DesignationList = () => {
  const [designations, setDesignations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const navigate = useNavigate();

  const fetchDesignations = async () => {
    try {
      const res = await axios.get('http://localhost:5002/api/designations');
      console.log('Fetched designations:', res.data); // ✅ Debug
      setDesignations(res.data);
    } catch (err) {
      console.error('Fetch Designations Error:', err);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const currentDesignation = designations.slice(indexOfFirst, indexOfLast);
  const deleteDesignation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this designation?'))
      return;
    try {
      await axios.delete(`http://localhost:5002/api/designations/${id}`);
      setDesignations(designations.filter((d) => d._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar/>
    <div className="flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-3">
    <div className="p-3 bg-white shadow-md rounded-md">
      <div className="flex justify-between items-center gap-2">
    <h2 className="text-lg sm:text-xl font-bold text-dorika-blue whitespace-nowrap">Designation</h2>
       <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate('/designationMaster')}
            className="bg-dorika-orange hover:bg-dorika-blue text-white px-3 sm:px-4 py-1 rounded font-semibold text-sm sm:text-base whitespace-nowrap"
          >
            Add Designation
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
      <table className=" mt-2 w-full table-auto border border-dorika-blue">
        <thead className="bg-dorika-blue text-white text-sm">
          <tr>
            <th className="border border-dorika-blue px-2 py-1">Designation ID</th>
            <th className="border border-dorika-blue px-2 py-1">Designation Name</th>
            <th className="border border-dorika-blue px-2 py-1">Department</th>
            <th className="border border-dorika-blue px-2 py-1">Grade</th>
            <th className="border border-dorika-blue px-2 py-1">Status</th>
            <th className="border border-dorika-blue px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-xs sm:text-sm text-center">
          {designations.length > 0 ? (
            currentDesignation.map((d) => (
              <tr key={d._id} className="hover:bg-dorika-blueLight transition">
                <td className="border border-dorika-blue px-2 py-1">{d.designationID}</td>
                <td className="border border-dorika-blue px-2 py-1">{d.designationName}</td>
                <td className="border border-dorika-blue px-2 py-1">{d.departmentName}</td>
                <td className="border border-dorika-blue px-2 py-1">{d.grade}</td>
                <td className="border border-dorika-blue px-2 py-1">{d.status}</td>
                <td className="border border-dorika-blue px-2 py-1 ">
                <div className="flex justify-center gap-4 sm:gap-8">
                    <button
                    onClick={() =>
                      navigate('/designationMaster', { state: { designation: d } })
                    }
                    className="text-dorika-blue hover:text-dorika-green"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => deleteDesignation(d._id)}
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
              <td colSpan="6" className="text-center py-4 text-gray-500">
                No designations found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Pagination
      total={designations.length}
      perPage={perPage}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
    />
    </div>
</div>
</div>
</div>
  );
};

export default DesignationList;
