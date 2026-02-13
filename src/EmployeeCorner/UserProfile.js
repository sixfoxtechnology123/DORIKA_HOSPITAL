import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";
import {AiOutlineLock } from "react-icons/ai";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const UserProfile = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // 2. Function to handle the API call
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("New passwords do not match!");
    }

    try {
      const user = JSON.parse(localStorage.getItem("employeeUser"));
      // This hits your employeeuseridcreated model logic
      const response = await axios.put(`http://localhost:5002/api/employee-ids/change-password`, {
        employeeID: user.employeeID,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (response.status === 200) {
        toast.success("Password updated successfully!");
        setIsModalOpen(false);
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("employeeUser")); // stored during login
    if (!user || !user.employeeID) {
      toast.error("No Employee ID found!");
      setLoading(false);
      return;
    }

    axios
      .get(`http://localhost:5002/api/employee-ids/details/${user.employeeID}`)
      .then((res) => {
        setEmployee(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Employee not found or failed to fetch data");
        setLoading(false);
      });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500 text-lg">Loading employee details...</p>
      </div>
    );
  }

  // Error state
  if (!employee) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500 text-lg">Employee not found or not logged in.</p>
      </div>
    );
  }

  // Helper to format date
  const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "--");
// Inside your UserProfile component, before return
const TwoColRow = ({ label1, value1, label2, value2 }) => {
  return (
    /* We use grid or flex-row consistently to keep the side-by-side look */
    <div className="flex flex-col md:flex-row text-xs sm:text-sm gap-2 md:gap-4 mb-2">
      
      {/* Column 1 */}
      <div className="flex items-start flex-1">
        {/* 'w-32' or 'min-w-[120px]' ensures the colon always starts at the same spot */}
        <div className="w-32 sm:w-40 font-semibold shrink-0">{label1}</div>
        <div className="flex-1">: {value1 || "--"}</div>
      </div>

      {/* Column 2 */}
      {label2 && (
        <div className="flex items-start flex-1">
          <div className="w-32 sm:w-40 font-semibold shrink-0">{label2}</div>
          <div className="flex-1">: {value2 || "--"}</div>
        </div>
      )}
    </div>
  );
};

  return (
    
    <div className="flex min-h-screen bg-gray-100 flex-col md:flex-row">
      {/* Sidebar */}
      <EmployeeCornerSidebar />

      {/* Profile Section */}
      <div className="flex-1 p-2 sm:p-3 w-full">
        <div className="w-full mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
       {/* Header Section */}
     <div className="bg-slate-800 text-white px-4 md:px-8 py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-3xl font-bold">
          {employee?.firstName} {employee?.middleName} {employee?.lastName}
        </h2>
        
        {/* Modern Change Password Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
        >
          <AiOutlineLock /> Change Password
        </button>
      </div>

          {/* Info Grid: 1 column on mobile, 2 on tablet, 4 on desktop for maximum "desktop style" alignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm md:text-base border-t border-slate-600 pt-3">
            <div className="flex flex-col">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Designation</span>
              <p className="font-medium">{employee?.designationName || "--"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Department</span>
              <p className="font-medium">{employee?.departmentName || "--"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Mobile</span>
              <p className="font-medium">{employee?.permanentAddress?.mobile || "--"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Email</span>
              <p className="font-medium break-all">{employee?.permanentAddress?.email || "--"}</p>
            </div>
          </div>
        </div>

        {/* Image section commented out but preserved */}
        {/* <div className="flex flex-col items-center">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
            {employee?.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              "NO IMAGE"
            )}
          </div>
        </div> 
        */}
      </div>

      {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 sm:gap-3 p-2 sm:p-3">

          {/* Left Column: 3/5 */}
          <div className="col-span-1 md:col-span-3 space-y-4">

            {/* Personal Details */}
            <div className="bg-white border rounded-xl p-2 shadow-sm">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">🧍 Personal Details</h3>
              <TwoColRow label1="Employee Code" value1={employee?.employeeID} label2="Father's Name" value2={employee?.fatherName} />
              <TwoColRow label1="Spouse Name" value1={employee?.spouseName} label2="Caste" value2={employee?.caste} />
              <TwoColRow label1="Religion" value1={employee?.religion} label2="Marital Status" value2={employee?.maritalStatus} />
              <TwoColRow label1="Date of Birth" value1={formatDate(employee?.dob)} label2="Gender" value2={employee?.gender} />
            </div>

            {/* Service Details */}
            <div className="bg-blue-50 border rounded-xl p-3 shadow-sm">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">🏢 Service Details</h3>
              <TwoColRow label1="Department" value1={employee?.departmentName} label2="Designation" value2={employee?.designationName} />
              <TwoColRow label1="Date of Joining" value1={formatDate(employee?.doj)} label2="Date of Retirement" value2={formatDate(employee?.dor)} />
              <TwoColRow label1="Next Increment Date" value1={formatDate(employee?.nextIncrementDate)} label2="Eligible for Promotion" value2={employee?.eligiblePromotion} />
              <TwoColRow label1="Employee Type" value1={employee?.employmentStatus} label2="User ID" value2={employee?.employeeUserId} />
            </div>

            {/* Permanent Address */}
            <div className="bg-white border rounded-xl p-3 shadow-sm">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">📍 Permanent Address</h3>
              <TwoColRow label1="Street No. and Name" value1={employee?.permanentAddress?.street} label2="Village/Town" value2={employee?.permanentAddress?.village} />
              <TwoColRow label1="City" value1={employee?.permanentAddress?.city} label2="Post Office" value2={employee?.permanentAddress?.postOffice} />
              <TwoColRow label1="Police Station" value1={employee?.permanentAddress?.policeStation} label2="Pin Code" value2={employee?.permanentAddress?.pinCode} />
              <TwoColRow label1="District" value1={employee?.permanentAddress?.district} label2="State" value2={employee?.permanentAddress?.state} />
              <TwoColRow label1="Country" value1={employee?.permanentAddress?.country} />
            </div>

            {/* Present Address */}
            <div className="bg-white border rounded-xl p-3 shadow-sm">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">🏠 Present Address</h3>
              <TwoColRow label1="Street No. and Name" value1={employee?.presentAddress?.street} label2="Village/Town" value2={employee?.presentAddress?.village} />
              <TwoColRow label1="City" value1={employee?.presentAddress?.city} label2="Post Office" value2={employee?.presentAddress?.postOffice} />
              <TwoColRow label1="Police Station" value1={employee?.presentAddress?.policeStation} label2="Pin Code" value2={employee?.presentAddress?.pinCode} />
              <TwoColRow label1="District" value1={employee?.presentAddress?.district} label2="State" value2={employee?.presentAddress?.state} />
              <TwoColRow label1="Country" value1={employee?.presentAddress?.country} />
            </div>
          </div>

          {/* Right Column: 2/5 */}
          <div className="col-span-1 md:col-span-2 space-y-4">
              {/* Earnings Details */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings Section */}
          <div className="bg-blue-50 border rounded-xl p-3 shadow-sm">
            <h4 className="font-semibold border-b pb-1 text-blue-700 mb-2">📈 Earnings</h4>
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="pb-1 font-medium">Head Name</th>
                  <th className="pb-1 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employee?.earnings?.length > 0 ? (
                  employee.earnings.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 font-medium">{item.headName}</td>
                      <td className="py-1.5 text-right font-semibold text-blue-800">₹{item.value}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="2" className="py-2 text-gray-400 italic">No earnings found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Deductions Section */}
          <div className="bg-red-50 border rounded-xl p-3 shadow-sm">
            <h4 className="font-semibold border-b pb-1 text-red-700 mb-2">📉 Deductions</h4>
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="pb-1 font-medium">Head Name</th>
                  <th className="pb-1 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employee?.deductions?.length > 0 ? (
                  employee.deductions.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 font-medium">{item.headName}</td>
                      <td className="py-1.5 text-right font-semibold text-red-600">₹{item.value}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="2" className="py-2 text-gray-400 italic">No deductions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
            {/* Pay Details */}
            <div className="bg-green-50 border rounded-xl p-3 shadow-sm">
              <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">💰 Pay Details</h3>
              {/* <TwoColRow label1="Basic Pay" value1={`₹${employee?.payDetails?.basicPay || "0"}`} />
              <TwoColRow label1="PF Type" value1={employee?.payDetails?.pfType || "--"} /> */}
              <TwoColRow label1="Passport No." value1={employee?.payDetails?.passportNo || "--"} />
              {/* <TwoColRow label1="PF No." value1={employee?.payDetails?.pfNo || "--"} /> */}
              <TwoColRow label1="UAN No." value1={employee?.payDetails?.uanNo || "--"} />
              <TwoColRow label1="PAN No." value1={employee?.payDetails?.panNo || "--"} />
              {/* <TwoColRow label1="Pay Level / Grade" value1={employee?.payDetails?.payLevel || "--"} /> */}
              <TwoColRow label1="Aadhaar No." value1={employee?.payDetails?.aadhaarNo || "--"} />
            </div>

          {/* Authority Details */}
         <div className="bg-yellow-50 border rounded-xl p-3 shadow-sm">
           <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">🧾 Authority Details</h3>
              <TwoColRow  label1="Reporting Manager" value1={employee?.reportingManager || "--"} />
              <TwoColRow label1="Department Head" value1={employee?.departmentHead || "--"} />
            </div>
            
           {/* Bank Details */}
                <div className="bg-orange-50 border rounded-xl p-3 shadow-sm">
                  <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">🏦 Bank Details</h3>

                  <TwoColRow
                    label1="Bank Name"
                    value1={employee?.payDetails?.bankName || "--"}
                  />
                  <TwoColRow  
                    label1="Branch"
                    value1={employee?.payDetails?.branch || "--"}/>

                  <TwoColRow
                    label1="IFSC Code"
                    value1={employee?.payDetails?.ifscCode || "--"}
                  />
                  <TwoColRow
                    label1="Account No."
                    value1={employee?.payDetails?.accountNo || "--"}
                  />
              </div>

          </div>

        </div>


        </div>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50">
            <div className="bg-white w-full max-w-md shadow-xl border border-gray-200">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-gray-800 font-semibold text-lg">Account Security</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              {/* Modal Body */}
            <form onSubmit={handlePasswordChange} className="p-6">
              <p className="text-xs text-gray-800 mb-6 uppercase tracking-wider font-semibold">Update User Password</p>
              
              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:border-indigo-500 focus:outline-none pr-10"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-2 text-gray-500 hover:text-indigo-600 focus:outline-none"
                    >
                      {showCurrent ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:border-indigo-500 focus:outline-none pr-10"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-2 text-gray-500 hover:text-indigo-600 focus:outline-none"
                    >
                      {showNew ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:border-indigo-500 focus:outline-none pr-10"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-2 text-gray-500 hover:text-indigo-600 focus:outline-none"
                    >
                      {showConfirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
            </div>
          </div>
        )}
      </div>

  );
  
};

export default UserProfile;
