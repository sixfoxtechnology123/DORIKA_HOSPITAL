import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import hospitalBg from "../assets/hospital.jpeg";

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
          ? "http://localhost:5002/api/adminManagement/login"
          : "http://localhost:5002/api/employee-ids/login";

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
              employeeID: user.employeeID || user.employeeId,
              employeeUserId: user.employeeUserId,
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

        navigate(loginType === "admin" ? "/Dashboard" : "/AttendanceSignIn");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div 
        className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${hospitalBg})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >

      {/* Overlay to make the form stand out more against the image */}
      <div className="absolute inset-0 bg-black/50"></div>

     
      <div className="relative z-10 bg-white/10 backdrop-blur-xl py-6 px-4 sm:px-8 rounded-2xl shadow-2xl w-full max-w-sm border border-white/20">
      <div className="text-center mb-1">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter sm:tracking-normal drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
         DORIKA HOSPITAL
        </h2>
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent mt-1"></div>
      </div>
       {/* Heading */}
       <h1 className="text-lg font-semibold text-white/90 text-center mb-2">
          {loginType === "admin" ? "Admin Login" : "Employee Login"}
        </h1>

        {/* Error */}
        {error && <p className="text-red-400 text-center mb-3 text-sm">{error}</p>}

        {/* Toggle Buttons */}
        <div className="flex flex-col sm:flex-row justify-center mb-5 gap-3 sm:gap-4">
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
            let value = e.target.value;
            if (loginType === "employee") {
              value = value.toUpperCase(); // Convert to Capital letters
              if (value.length > 1 && /^[A-Z]+[0-9]/.test(value) && !value.includes("-")) {
                const firstDigitIndex = value.search(/\d/);
                if (firstDigitIndex !== -1) {
                  value = value.slice(0, firstDigitIndex) + "-" + value.slice(firstDigitIndex);
                }
              }
            }
            setUserId(value);
          }}
             className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/20 text-white text-sm sm:text-base placeholder-gray-300 outline-none focus:ring-2 focus:ring-purple-500"
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
              className="absolute right-2 sm:right-3 top-2 sm:top-3 text-white text-lg sm:text-xl" // Changed to white for better visibility
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