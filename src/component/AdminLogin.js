import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const AdminLogin = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState("admin"); // admin or employee
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint =
        loginType === "admin"
          ? "http://localhost:5001/api/adminManagement/login"
          : "http://localhost:5001/api/employee-ids/login"; 

          


      const res = await axios.post(endpoint, {
        userId: userId.trim(),
        password: password.trim(),
      });

      if (res.data.token) {
        const user = res.data.admin || res.data.user; // admin or employee
        if (!user) {
          setError("Login failed. Invalid response from server.");
          return;
        }

        const userData = {
          ...user,
          permissions: user.permissions || [],
          role: user.role || (loginType === "employee" ? "employee" : "user"),
        };

        localStorage.setItem("token", res.data.token);
       if (loginType === "employee") {
  localStorage.setItem(
    "employeeUser",
    JSON.stringify({
      employeeID: user.employeeID || user.employeeId, // match backend field exactly
      firstName: user.firstName,
      lastName: user.lastName,
      designation: user.designation,
      department: user.department,
      phone: user.phone,
    })
  );
} else {
  localStorage.setItem("adminData", JSON.stringify(userData));
}

        localStorage.setItem("userPermissions", JSON.stringify(userData.permissions));

        navigate(loginType === "admin" ? "/Dashboard" : "/EmployeeDashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <div className="relative z-10 bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-[90%] sm:w-[400px] border border-white/20">
        {/* Heading */}
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          {loginType === "admin" ? "Admin Login" : "Employee Login"}
        </h1>

        {/* Error */}
        {error && <p className="text-red-400 text-center mb-3 text-sm">{error}</p>}

        {/* Toggle Buttons */}
        <div className="flex justify-center mb-5 gap-4">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold ${
              loginType === "admin"
                ? "bg-purple-600 text-white"
                : "bg-white/20 text-white"
            }`}
            onClick={() => setLoginType("admin")}
          >
            Admin
          </button>

          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold ${
              loginType === "employee"
                ? "bg-purple-600 text-white"
                : "bg-white/20 text-white"
            }`}
            onClick={() => setLoginType("employee")}
          >
            Employee
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* User ID */}
          <div>
            <label className="text-white block mb-1">User ID</label>
            <input
              type="text"
              placeholder={`Enter ${loginType} userId`}
              value={userId}
              onChange={(e) => {
                const value = e.target.value;
                setUserId(loginType === "employee" ? value.toUpperCase() : value);
              }}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-black" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg hover:scale-105 transform transition duration-300"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
