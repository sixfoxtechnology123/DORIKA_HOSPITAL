import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";
import { AiOutlinePhone, AiOutlineMail } from "react-icons/ai";

const UserProfile = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div className="flex flex-col sm:flex-row text-xs sm:text-sm gap-1 sm:gap-0">
      <div className="flex flex-1">
        <div className="sm:min-w-[160px] font-semibold">{label1}</div>
        <div>: {value1 || "--"}</div>
      </div>
      {label2 && (
        <div className="flex flex-1">
         <div className="sm:min-w-[150px] font-semibold">{label2}</div>
          <div>: {value2 || "--"}</div>
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
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-4 sm:px-8 py-3 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-center sm:text-left">
                {employee?.firstName} {employee?.middleName} {employee?.lastName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm sm:text-base">
                <p className="text-lg font-semibold">{employee?.designationName || "--"}</p>
                <p className="text-lg font-semibold">{employee?.departmentName || "--"}</p>
                <p className="text-lg font-semibold">{employee?.permanentAddress?.mobile || "--"}</p>
                <p className="text-lg font-semibold">{employee?.permanentAddress?.email || "--"}</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
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
              <TwoColRow label1="Employee Type" value1={employee?.employmentStatus} />
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
              <div className="bg-blue-50 border rounded-xl p-2 shadow-sm overflow-x-auto">
                <h4 className="font-semibold border-b pb-1 text-blue-700">📈 Earnings</h4>
               <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-1">Head Name</th>
                      <th className="pb-1">Type</th>
                      <th className="pb-1 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee?.earnings?.length > 0 ? (
                      employee.earnings.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className=" font-medium text-xs">{item.headName}</td>
                          <td className=" text-xs">{item.headType}</td>
                          <td className=" text-right font-semibold">₹{item.value}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className=" text-gray-400">No earnings found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Deduction Details */}
              <div className="bg-red-50 border rounded-xl p-2 shadow-sm mt-4">
                <h5 className="font-semibold border-b pb-1 text-red-700">📉 Deductions</h5>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-1">Head Name</th>
                      <th className="pb-1">Type</th>
                      <th className="pb-1 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee?.deductions?.length > 0 ? (
                      employee.deductions.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className=" font-medium text-xs">{item.headName}</td>
                          <td className=" text-xs">{item.headType}</td>
                          <td className="text-right font-semibold text-red-600">₹{item.value}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className=" text-gray-400">No deductions found</td></tr>
                    )}
                  </tbody>
                </table>
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
              <TwoColRow  label1="Reporting Authority" value1={employee?.reportingAuthority || "--"} />
              <TwoColRow label1="Leave Sanction Authority" value1={employee?.leaveAuthority || "--"} />
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
      </div>
    </div>
  );
};

export default UserProfile;
