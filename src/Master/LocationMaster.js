// src/pages/LocationMaster.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../component/BackButton';
import { useNavigate, useLocation } from 'react-router-dom';

// If your backend is on another host/port, change this:
const API_BASE = 'http://localhost:5001';

const countriesData = [
  {
    countryName: 'India',
    states: [
      'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
      'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
      'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
      'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
      'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir'
    ],
  },
  { countryName: 'United States', states: ['California', 'Texas', 'Florida', 'New York', 'Illinois'] },
  { countryName: 'Canada', states: ['Ontario', 'Quebec', 'British Columbia', 'Alberta'] },
  { countryName: 'Australia', states: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'] },
];

const LocationMaster = () => {
  const [locationID, setLocationID] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('Active');

  const [states, setStates] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchNextLocationID = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/locations/next-id`);
      setLocationID(res.data.locationID || '');
    } catch (err) {
      console.error('Error fetching LocationID:', err);
      setLocationID('');
    }
  };

  useEffect(() => {
    if (location.state?.branch) {
      const l = location.state.branch;
      setLocationID(l.locationID || '');
      setLocationName(l.locationName || '');
      setAddress(l.address || '');
      setCountry(l.country || '');
      setSelectedState(l.state || '');
      setCity(l.city || '');
      setStatus(l.status || 'Active');
      setEditId(l._id);
      setIsEditMode(true);

      const countryObj = countriesData.find(c => c.countryName === l.country);
      setStates(countryObj ? countryObj.states : []);
    } else {
      setIsEditMode(false);
      fetchNextLocationID();
    }
  }, [location.state]);

  const handleCountryChange = (e) => {
    const selectedCountry = e.target.value;
    setCountry(selectedCountry);
    setSelectedState('');
    const countryObj = countriesData.find(c => c.countryName === selectedCountry);
    setStates(countryObj ? countryObj.states : []);
  };

  const handleSaveOrUpdate = async (e) => {
    e.preventDefault(); // ✅ Prevents form reload

    if (!locationName.trim() || !address.trim() || !country || !selectedState || !city.trim()) {
      alert('All fields are required');
      return;
    }

    const payload = {
      locationName,
      address,
      country,
      state: selectedState,
      city,
      status,
    };

    try {
      if (isEditMode) {
        await axios.put(`${API_BASE}/api/locations/${editId}`, payload);
        alert('Location updated successfully');
      } else {
        const res = await axios.post(`${API_BASE}/api/locations`, payload);
        if (res?.data?.locationID) setLocationID(res.data.locationID);
        alert('Location saved successfully');
      }

      resetForm();

      // Redirect to list page
      navigate('/locationList');
    } catch (err) {
      console.error('Save error:', err);
      const msg = err?.response?.data?.error || 'Error saving location';
      alert(msg);
    }
  };

  const resetForm = () => {
    setLocationName('');
    setAddress('');
    setCountry('');
    setSelectedState('');
    setCity('');
    setStatus('Active');
    setEditId(null);
    setIsEditMode(false);
    setStates([]);
    fetchNextLocationID();
  };

  const handleBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-zinc-300 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-6xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          {isEditMode ? 'Update Location / Branch' : 'Location / Branch Master'}
        </h2>

        <form
          onSubmit={handleSaveOrUpdate}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Location ID (read-only) */}
          <div>
            <label className="block font-medium">Location ID</label>
            <input
              type="text"
              value={locationID}
              readOnly
              className="w-full p-1 border rounded cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-medium">Location Name</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full p-1 border rounded"
            />
          </div>

          <div>
            <label className="block font-medium">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-1 border rounded"
            />
          </div>

          <div>
            <label className="block font-medium">Country</label>
            <select
              value={country}
              onChange={handleCountryChange}
              className="w-full p-1 border rounded"
            >
              <option value="">Select Country</option>
              {countriesData.map((c, idx) => (
                <option key={idx} value={c.countryName}>{c.countryName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="">Select State</option>
              {states.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-1 border rounded"
            />
          </div>

          <div>
            <label className="block font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-between mt-2">
            <BackButton type="button" onClick={handleBack} />
            <button
              type="submit"
              className={`px-4 py-1 rounded text-white ${isEditMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
              {isEditMode ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationMaster;
