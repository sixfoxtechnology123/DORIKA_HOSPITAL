import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaEdit } from 'react-icons/fa';
import Sidebar from '../component/Sidebar';
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import Pagination from "../Master/Pagination";

const QualificationList = () => {
  const [qualifications, setQualifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const fetchQualifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get('/api/master/qualifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched qualifications:', res.data); 
      setQualifications(res.data);
    } catch (err) {
      console.error('Fetch Qualifications Error:', err);
    }
  };

  useEffect(() => {
    fetchQualifications();
  }, []);

  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const currentQualifications = qualifications.slice(indexOfFirst, indexOfLast);

  const deleteQualification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this qualification?'))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/master/qualifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQualifications(qualifications.filter((q) => q._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-3">
        <div className="p-3 bg-white shadow-md rounded-md flex-1 flex flex-col min-h-0">
          <MobileHeaderToggle>
            <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-1 flex justify-between items-center">
              <h2 className="text-xl font-bold text-dorika-blue">Qualification</h2>
              <button
                type="button"
                onClick={goBack}
                className="h-8 px-3 rounded bg-dorika-blue text-white font-semibold text-sm hover:bg-dorika-orange"
              >
                Back
              </button>
            </div>
            <div className="bg-dorika-blueLight p-3 rounded-lg shadow mb-3 border border-dorika-blue">
              <div className="grid grid-cols-1 gap-3 items-end">
                <div className="flex flex-col">
                
                  <button
                    onClick={() => navigate('/QualificationMaster')}
                    className="h-8 bg-dorika-orange hover:bg-dorika-blue text-white px-3 sm:px-4 rounded font-semibold text-sm sm:text-base whitespace-nowrap w-full"
                  >
                    Add Qualification
                  </button>
                </div>
              </div>
            </div>
          </MobileHeaderToggle>

          <div className="w-full flex-1 min-h-0 overflow-auto">
            <table className="mt-2 w-full table-auto border border-dorika-blue">
              <thead className="bg-dorika-blue text-white text-sm sticky top-0 z-10">
                <tr>
                  <th className="border border-dorika-blue px-2 py-1">Code</th>
                  <th className="border border-dorika-blue px-2 py-1 ">Qualification Name</th>
                  <th className="border border-dorika-blue px-2 py-1">Status</th>
                  <th className="border border-dorika-blue px-2 py-1 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm text-center">
                {qualifications.length > 0 ? (
                  currentQualifications.map((q) => (
                    <tr key={q._id} className="hover:bg-dorika-blueLight transition">
                      <td className="border border-dorika-blue px-2 py-1 font-medium">{q.qualCode}</td>
                      <td className="border border-dorika-blue px-2 py-1 ">{q.qualName}</td>
                      <td className="border border-dorika-blue px-2">{q.status}</td>
                      <td className="border border-dorika-blue px-2 py-1">
                        <div className="flex justify-center gap-4 sm:gap-8">
                          <button
                            onClick={() =>
                              navigate('/QualificationMaster', { state: { qualification: q } })
                            }
                            className="text-dorika-blue hover:text-dorika-green"
                            title="Edit"
                          >
                            <FaEdit size={16} />
                          </button>
                          <button
                            onClick={() => deleteQualification(q._id)}
                            className="text-dorika-orange hover:text-red-700"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500 italic">
                      No qualifications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination
              total={qualifications.length}
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

export default QualificationList;
