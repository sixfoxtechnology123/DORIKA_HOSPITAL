import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../assets/avatar.jpg";

const EditProfile = () => {
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState(defaultAvatar);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const adminData = localStorage.getItem("adminData");
    if (adminData) {
      const admin = JSON.parse(adminData);
      setName(admin.name);
      setPreview(admin.profileImage ? `http://localhost:5001/${admin.profileImage}?t=${Date.now()}` : defaultAvatar);
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return setMessage("Admin not found. Please login again.");

    const formData = new FormData();
    formData.append("name", name);
    if (profileImage) formData.append("profileImage", profileImage);

    try {
      const res = await axios.put("http://localhost:5001/api/admin/edit-profile", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      localStorage.setItem("adminData", JSON.stringify(res.data.admin));
      setPreview(res.data.admin.profileImage ? `http://localhost:5001/${res.data.admin.profileImage}?t=${Date.now()}` : defaultAvatar);
      setMessage("Profile updated successfully");

      window.dispatchEvent(new Event("profileUpdated"));
      setTimeout(() => navigate("/Dashboard"), 1000);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to update profile");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Edit Profile</h2>
        {message && <p className="text-green-500 mb-3">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center">
            <img src={preview} alt="Profile Preview" className="w-24 h-24 rounded-full mb-2 object-cover" />
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          <div>
            <label className="block mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded" required />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Save Changes</button>
        </form>
        <button onClick={() => navigate("/Dashboard")} className="mt-3 w-full py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition">Cancel</button>
      </div>
    </div>
  );
};

export default EditProfile;
