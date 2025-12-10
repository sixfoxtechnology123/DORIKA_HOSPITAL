// src/pages/employeeLeaveApplication.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";
import { useLocation } from "react-router-dom";

const EmployeeLeaveApplication = () => {
   const location = useLocation();
  const editingData = location.state?.editingData || null;
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveInHand, setLeaveInHand] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);


  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    applicationDate: "",
    leaveType: "",
    leaveInHand: "",
    fromDate: "",
    toDate: "",
    noOfDays: 0,
    reason: "",
  });

  const inputClass =
    "w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150";

  const token = localStorage.getItem("employeeToken");
  const loggedUser = JSON.parse(localStorage.getItem("employeeUser"));

  const formatDate = (date) => new Date(date).toISOString().split("T")[0];

useEffect(() => {
  if (!loggedUser || !loggedUser.employeeID) return;

  axios
    .get(
      `http://localhost:5001/api/leave-application/leaveAllocations/employee/${loggedUser.employeeID}`
    )
    .then((res) => {
      const data = res.data;
      if (!data.length) return;

      setLeaveTypes(data);

      setFormData({
        employeeId: data[0].employeeID,
        employeeName: data[0].employee,
        applicationDate: formatDate(new Date()),
        leaveType: data[0].leaveType,
        leaveInHand: data[0].leaveInHand,
        fromDate: "",
        toDate: "",
        noOfDays: 0,
        reason: "",
      });

      setLeaveInHand(data[0].leaveInHand);
    })
    .catch(() => toast.error("Error fetching leave allocations"));
}, []);

useEffect(() => {
  if (!formData.fromDate || !formData.toDate) return;

  const from = new Date(formData.fromDate);
  const to = new Date(formData.toDate);

  if (to < from) {
    setFormData((prev) => ({ ...prev, noOfDays: 0 }));
    return;
  }

  const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

  setFormData((prev) => ({ ...prev, noOfDays: diff }));
}, [formData.fromDate, formData.toDate]);


useEffect(() => {
  if (!loggedUser || !loggedUser.employeeID) return;

  axios
    .get(`http://localhost:5001/api/leave-application/leaveAllocations/employee/${loggedUser.employeeID}`)
    .then((res) => {
      const data = res.data;
      if (!data.length) return;

      setLeaveTypes(data);

      if (editingData) {
        setFormData({
          employeeId: editingData.employeeId,
          employeeName: editingData.employeeName,
          applicationDate: formatDate(editingData.applicationDate),
          leaveType: editingData.leaveType,
          leaveInHand: editingData.leaveInHand,
          fromDate: formatDate(editingData.fromDate),
          toDate: formatDate(editingData.toDate),
          noOfDays: editingData.noOfDays,
          reason: editingData.reason,
        });
        setLeaveInHand(editingData.leaveInHand);
        setEditingId(editingData._id);
        setIsEditMode(true);
      } else {
        setFormData({
          employeeId: data[0].employeeID,
          employeeName: data[0].employee,
          applicationDate: formatDate(new Date()),
          leaveType: data[0].leaveType,
          leaveInHand: data[0].leaveInHand,
          fromDate: "",
          toDate: "",
          noOfDays: 0,
          reason: "",
        });
        setLeaveInHand(data[0].leaveInHand);
      }
    })
    .catch(() => toast.error("Error fetching leave allocations"));
}, [editingData]);


  const handleLeaveTypeChange = (value) => {
    const selected = leaveTypes.find((lt) => lt.leaveType === value);

    setLeaveInHand(selected?.leaveInHand || 0);

    setFormData((prev) => ({
      ...prev,
      leaveType: value,
      leaveInHand: selected?.leaveInHand || 0,
    }));
  };

  const calculateDays = () => {
    if (!formData.fromDate || !formData.toDate) return;

    const from = new Date(formData.fromDate);
    const to = new Date(formData.toDate);

    if (to < from) {
      toast.error("To Date cannot be earlier than From Date");
      return;
    }

    const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

    setFormData((prev) => ({ ...prev, noOfDays: diff }));
  };

const handleSubmit = async () => {
  try {
    if (isEditMode) {
      await axios.put(
        `http://localhost:5001/api/leave-application/${editingId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Leave application updated!");
    } else {
      await axios.post(
        "http://localhost:5001/api/leave-application",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Leave application submitted!");
    }

    setFormData({
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      applicationDate: formData.applicationDate,
      leaveType: leaveTypes[0]?.leaveType || "",
      leaveInHand: leaveTypes[0]?.leaveInHand || 0,
      fromDate: "",
      toDate: "",
      noOfDays: 0,
      reason: "",
    });
    setLeaveInHand(leaveTypes[0]?.leaveInHand || 0);
    setIsEditMode(false);
    setEditingId(null);
  } catch (error) {
    toast.error(error.response?.data?.message || "Error submitting leave");
  }
};

  return (
    <div className="flex min-h-screen bg-gray-100">
      <EmployeeCornerSidebar />

      <div className="flex-1 border rounded-lg shadow-sm p-4 bg-white m-4">
        <h1 className="text-xl font-bold mb-4">Leave Application</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Employee ID */}
          <div>
            <label className="font-semibold">Employee ID</label>
            <input
              type="text"
              className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150 cursor-not-allowed bg-gray-100"
              value={formData.employeeId}
              readOnly
            />
          </div>

          {/* Employee Name */}
          <div>
            <label className="font-semibold">Employee Name</label>
            <input
              type="text"
              className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150 cursor-not-allowed bg-gray-100"
              value={formData.employeeName}
              readOnly
            />
          </div>

          {/* Application Date */}
          <div>
            <label className="font-semibold">Application Date</label>
            <input
              type="date"
              className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150 cursor-not-allowed bg-gray-100"
              value={formData.applicationDate}
              readOnly
            />
          </div>

          {/* Leave Type */}
          <div>
            <label className="font-semibold">Leave Type</label>
            <select
              className={inputClass}
              value={formData.leaveType}
              onChange={(e) => handleLeaveTypeChange(e.target.value)}
            >
              {leaveTypes.map((lt) => (
                <option key={lt._id} value={lt.leaveType}>
                  {lt.leaveType}
                </option>
              ))}
            </select>
          </div>

          {/* Leave In Hand */}
          <div>
            <label className="font-semibold">Leave In Hand</label>
            <input
              type="text"
              className={inputClass}
              value={leaveInHand}
              readOnly
            />
          </div>

          {/* From Date */}
          <div>
            <label className="font-semibold">From Date</label>
            <input
              type="date"
              className={inputClass}
              value={formData.fromDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fromDate: e.target.value }))
              }
             
            />
          </div>

          {/* To Date */}
          <div>
            <label className="font-semibold">To Date</label>
            <input
              type="date"
              className={inputClass}
              value={formData.toDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, toDate: e.target.value }))
              }
             
            />
          </div>

          {/* No of Days */}
          <div>
            <label className="font-semibold">No. of Days</label>
            <input
              type="number"
              className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all cursor-not-allowed bg-gray-100 duration-150"
              value={formData.noOfDays}
              readOnly
            />
          </div>

          {/* Reason */}
          <div>
            <label className="font-semibold">Reason</label>
            <textarea
              rows={3}
              className={inputClass}
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
              onClick={handleSubmit}
              className={`px-4 py-1 rounded ${
                isEditMode ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
            >
              {isEditMode ? "Update" : "Submit"}
            </button>

        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaveApplication;
