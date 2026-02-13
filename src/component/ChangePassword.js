import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const ChangePassword = ({ onClose }) => { // ADDED onClose PROP
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirm password do not match");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        "http://localhost:5002/api/admin/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        if (onClose) {
          onClose(); // CLOSE MODAL ON SUCCESS
        } else {
          navigate("/Dashboard");
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to change password");
    }
  };

  return (
    // Removed min-h-screen when used in modal to prevent huge white boxes
    <div className={`flex justify-center items-center ${!onClose ? "min-h-screen bg-gray-100" : ""}`}>
      <div className={`bg-white p-6 ${!onClose ? "rounded shadow-md" : ""} w-full max-w-md`}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Change Password</h2>

        {message && (
          <p className={`mb-3 p-2 rounded ${message.includes("match") || message.includes("Failed") ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
              <span className="absolute right-3 top-2.5 cursor-pointer text-gray-600" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
              <span className="absolute right-3 top-2.5 cursor-pointer text-gray-600" onClick={() => setShowNew(!showNew)}>
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
              <span className="absolute right-3 top-2.5 cursor-pointer text-gray-600" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button type="submit" className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium">
            Update Password
          </button>
        </form>

        <button
          onClick={onClose || (() => navigate("/Dashboard"))}
          className="mt-3 w-full py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;