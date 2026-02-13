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
  const [perPage, setPerPage] = useState(20);
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

  const indexOfLast = perPage === "all" ? designations.length : currentPage * perPage;
  const indexOfFirst = perPage === "all" ? 0 : indexOfLast - perPage;

  const currentdesignations =
    perPage === "all"
      ? designations
      : designations.slice(indexOfFirst, indexOfLast);
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
  <div className="flex h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
    <div className="flex-1 flex flex-col min-h-0 p-3 bg-white shadow-md rounded-md">
      {/* Header */}
   <div className="flex flex-wrap justify-between items-center gap-y-3 gap-x-2">
  
  {/* TOP ROW: Department Title (Left) and Back Button (Right) */}
  <div className="flex justify-between items-center w-full sm:w-auto flex-1">
    <h2 className="text-lg sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
      Designation
    </h2>
    <div className="sm:hidden">
      <BackButton />
    </div>
  </div>

  {/* BOTTOM ROW (Mobile) / SAME ROW (Desktop): Show Dropdown (Left) and Add Button (Right) */}
  <div className="flex justify-between sm:justify-end items-center gap-2 w-full sm:w-auto">
    
    {/* Show Dropdown */}
    <div className="flex items-center gap-1">
      <label className="text-[10px] sm:text-xs font-bold text-dorika-blue uppercase">Show</label>
      <select
        value={perPage}
        onChange={(e) => {
          const val = e.target.value;
          setPerPage(val === "all" ? "all" : parseInt(val));
          setCurrentPage(1);
        }}
        className="border border-dorika-blue rounded px-1 py-1 sm:py-1 text-sm outline-none bg-white font-semibold text-dorika-blue"
      >
        <option value={20}>20</option>
        <option value={30}>30</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value="all">ALL</option>
      </select>
    </div>

    <div className="flex gap-2 items-center">
      {/* Back button visible here only on Desktop */}
      <div className="hidden sm:block">
        <BackButton />
      </div>
      
      <button
            onClick={() => navigate('/designationMaster')}
            className="bg-dorika-orange hover:bg-dorika-blue text-white px-3 sm:px-4 rounded font-semibold text-sm sm:text-base whitespace-nowrap"
          >
            Add Designation
          </button>
    </div>
  </div>

</div>

      <div className="overflow-x-auto">
      <table className=" mt-2 w-full table-auto border border-dorika-blue">
        <thead className="bg-dorika-blue text-white text-sm">
          <tr>
            <th className="border border-dorika-blue px-2">SL No</th>
            <th className="border border-dorika-blue px-2">Designation ID</th>
            <th className="border border-dorika-blue px-2">Designation Name</th>
            <th className="border border-dorika-blue px-2">Department</th>
            <th className="border border-dorika-blue px-2">Grade</th>
            <th className="border border-dorika-blue px-2">Status</th>
            <th className="border border-dorika-blue px-2">Action</th>
          </tr>
        </thead>
        <tbody className="text-xs sm:text-sm text-center">
          {designations.length > 0 ? (
           currentdesignations.map((d,index) => (
              <tr key={d._id} className="hover:bg-dorika-blueLight transition">
                <td className="border border-dorika-blue px-2 py-1">
                  {perPage === "all" ? index + 1 : (currentPage - 1) * perPage + index + 1}
                </td>
                <td className="border border-dorika-blue px-2">{d.designationID}</td>
                <td className="border border-dorika-blue px-2">{d.designationName}</td>
                <td className="border border-dorika-blue px-2">{d.departmentName}</td>
                <td className="border border-dorika-blue px-2">{d.grade}</td>
                <td className="border border-dorika-blue px-2">{d.status}</td>
                <td className="border border-dorika-blue px-2 ">
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
      {perPage !== "all" && (
        <Pagination
          total={designations.length}
          perPage={perPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
</div>
</div>
</div>
  );
};

export default DesignationList;
