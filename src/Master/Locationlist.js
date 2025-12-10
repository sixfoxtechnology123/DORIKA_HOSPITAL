import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaEdit } from 'react-icons/fa';
import BackButton from '../component/BackButton';
import Sidebar from '../component/Sidebar';


const LocationList = () => {
  const [locations, setLocations] = useState([]);
  const navigate = useNavigate();

  const fetchLocations = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/locations');
      setLocations(res.data);
    } catch (err) {
      console.error('Fetch Locations Error:', err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const deleteLocation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await axios.delete(`http://localhost:5001/api/locations/${id}`);
      setLocations((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      console.error('Delete Error:', err);
    }
  };

  return (
  <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 overflow-y-auto">
    <div className="p-3 bg-white shadow-md rounded-md">
      <div className="bg-green-50 border border-green-300 rounded-lg shadow-md p-2 mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-green-800">Location / Branch</h2>
        <div className="flex gap-2">
          <BackButton />
          <button
            onClick={() => navigate('/locationMaster')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold whitespace-nowrap"
          >
            Add Location
          </button>
        </div>
      </div>

      <table className="w-full table-auto border border-green-500">
        <thead className="bg-gray-200 text-sm">
          <tr>
            <th className="border border-green-500 px-2 py-1">Location ID</th>
            <th className="border border-green-500 px-2 py-1">Location Name</th>
            <th className="border border-green-500 px-2 py-1">Address</th>
            <th className="border border-green-500 px-2 py-1">Country</th>
            <th className="border border-green-500 px-2 py-1">State</th>
            <th className="border border-green-500 px-2 py-1">City</th>
            <th className="border border-green-500 px-2 py-1">Status</th>
            <th className="border border-green-500 px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm text-center">
          {locations.length > 0 ? (
            locations.map((l) => (
              <tr key={l._id} className="hover:bg-gray-100 transition">
                <td className="border border-green-500 px-2 py-1">{l.locationID}</td>
                <td className="border border-green-500 px-2 py-1">{l.locationName}</td>
                <td className="border border-green-500 px-2 py-1">{l.address}</td>
                <td className="border border-green-500 px-2 py-1">{l.country}</td>
                <td className="border border-green-500 px-2 py-1">{l.state}</td>
                <td className="border border-green-500 px-2 py-1">{l.city}</td>
                <td className="border border-green-500 px-2 py-1">{l.status}</td>
                <td className="border border-green-500 px-2 py-1">
                  <div className="flex justify-center gap-8">
                    <button
                      onClick={() => navigate('/locationMaster', { state: { branch: l } })}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteLocation(l._id)}
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
              <td colSpan="8" className="text-center py-4 text-gray-500">
                No locations found.
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

export default LocationList;
