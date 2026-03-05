import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import { FaEdit, FaTrash } from "react-icons/fa";
import MobileHeaderToggle from "../component/MobileHeaderToggle";

const DepartmrentHead = () => {
  const [departmentHeadId, setDepartmentHeadId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [savedHeads, setSavedHeads] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHeadId, setEditingHeadId] = useState("");
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDepartmentCode, setSelectedDepartmentCode] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((e) => e._id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const selectedDepartmentName = useMemo(() => {
    const dep = departments.find((d) => d.deptCode === selectedDepartmentCode);
    return dep?.deptName || "";
  }, [departments, selectedDepartmentCode]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toUpperCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const fullName = `${e.firstName || ""} ${e.middleName || ""} ${e.lastName || ""}`
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
      return (
        fullName.includes(q) ||
        String(e.employeeID || "").toUpperCase().includes(q) ||
        String(e.employeeUserId || "").toUpperCase().includes(q)
      );
    });
  }, [employees, searchTerm]);

  const autoDesignationRows = useMemo(
    () =>
      designations
        .filter((d) => d.departmentName === selectedDepartmentName)
        .map((d) => ({
          designationID: d.designationID,
          designationName: d.designationName,
        }))
        .filter((d) => d.designationID && d.designationName),
    [designations, selectedDepartmentName]
  );

  const autoDesignationData = autoDesignationRows.map((d) => ({
    id: d.designationID,
    name: d.designationName,
  }));

  const formatSearchInput = (value) => {
    let formatted = value.toUpperCase().replace(/\s+/g, " ");
    const compact = formatted.replace(/\s+/g, "");
    if (!compact.includes("-")) {
      const match = compact.match(/^([A-Z]+)(\d.*)$/);
      if (match) {
        return `${match[1]}-${match[2]}`;
      }
    }
    return formatted;
  };

  const loadNextId = async () => {
    const idRes = await axios.get("/api/department-heads/next-id");
    setDepartmentHeadId(idRes?.data?.departmentHeadId || "");
  };

  const loadSavedHeads = async () => {
    const res = await axios.get("/api/department-heads");
    setSavedHeads(Array.isArray(res.data) ? res.data : []);
  };

  const resetForm = async () => {
    setEditingHeadId("");
    setSelectedEmployeeId("");
    setSelectedDepartmentCode("");
    setSearchTerm("");
    await loadNextId();
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empRes, deptRes, desigRes] = await Promise.all([
          axios.get("/api/employees"),
          axios.get("/api/departments"),
          axios.get("/api/designations"),
        ]);
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
        setDesignations(Array.isArray(desigRes.data) ? desigRes.data : []);
        await Promise.all([loadNextId(), loadSavedHeads()]);
      } catch (err) {
        toast.error("Failed to load data");
      }
    };
    loadData();
  }, []);

  const openAddModal = async () => {
    await resetForm();
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error("Please select employee");
      return;
    }
    if (!selectedDepartmentCode || !selectedDepartmentName) {
      toast.error("Please select department");
      return;
    }

    try {
      setSaving(true);
      const fullName = `${selectedEmployee.firstName || ""} ${selectedEmployee.middleName || ""} ${
        selectedEmployee.lastName || ""
      }`
        .replace(/\s+/g, " ")
        .trim();

      const payload = {
        departmentHeadId,
        employeeUserId: selectedEmployee.employeeUserId || "",
        employeeID: selectedEmployee.employeeID || "",
        employeeName: fullName,
        departmentHeadName: fullName,
        departmentID: selectedDepartmentCode,
        departmentName: selectedDepartmentName,
        designationData: autoDesignationData,
      };

      if (editingHeadId) {
        await axios.put(`/api/department-heads/${editingHeadId}`, payload);
        toast.success("Department head updated successfully");
      } else {
        await axios.post("/api/department-heads", payload);
        toast.success("Department head saved successfully");
      }

      await loadSavedHeads();
      setIsModalOpen(false);
      await resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    const emp = employees.find(
      (e) => e.employeeUserId === row.employeeUserId || e.employeeID === row.employeeID
    );
    setEditingHeadId(row._id);
    setDepartmentHeadId(row.departmentHeadId || "");
    setSelectedEmployeeId(emp?._id || "");
    setSelectedDepartmentCode(row.departmentID || "");
    setSearchTerm("");
    setIsModalOpen(true);
  };

  const handleDelete = async (rowId) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await axios.delete(`/api/department-heads/${rowId}`);
      toast.success("Deleted successfully");
      await loadSavedHeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-2 sm:p-3 md:p-4">
        <div className="bg-white shadow-md rounded-md p-3">
          <MobileHeaderToggle>
            <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-row justify-between items-center gap-2">
              <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
                Department Head
              </h2>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={openAddModal}
                  className="bg-dorika-blue hover:bg-dorika-orange text-white px-3 py-1 rounded text-sm font-semibold"
                >
                  Add
                </button>
                <BackButton />
              </div>
            </div>
          </MobileHeaderToggle>

          <div className="border border-dorika-blue rounded-md overflow-x-auto">
            <table className="min-w-[1250px] w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-dorika-blue text-white">
                <tr>
                  <th className="border border-dorika-blue px-2 py-1">Head ID</th>
                  <th className="border border-dorika-blue px-2 py-1">Employee UserID</th>
                  <th className="border border-dorika-blue px-2 py-1">Employee ID</th>
                  <th className="border border-dorika-blue px-2 py-1">Employee Name</th>
                  <th className="border border-dorika-blue px-2 py-1">Department ID</th>
                  <th className="border border-dorika-blue px-2 py-1">Department Name</th>
                  <th className="border border-dorika-blue px-2 py-1">Designation ID List</th>
                  <th className="border border-dorika-blue px-2 py-1">Designation Name List</th>
                  <th className="border border-dorika-blue px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {savedHeads.length > 0 ? (
                  savedHeads.map((row) => (
                    <tr key={row._id} className="hover:bg-dorika-blueLight transition">
                      <td className="border border-dorika-blue px-2 py-1 font-semibold">{row.departmentHeadId}</td>
                      <td className="border border-dorika-blue px-2 py-1">{row.employeeUserId}</td>
                      <td className="border border-dorika-blue px-2 py-1">{row.employeeID}</td>
                      <td className="border border-dorika-blue px-2 py-1 text-left">
                        {row.departmentHeadName || row.employeeName}
                      </td>
                      <td className="border border-dorika-blue px-2 py-1">{row.departmentID || "-"}</td>
                      <td className="border border-dorika-blue px-2 py-1">{row.departmentName}</td>
                      <td className="border border-dorika-blue px-2 py-1 text-left">
                        {(row.designationData || []).length > 0
                          ? row.designationData.map((d, idx) => (
                              <div key={`${d?.id || "id"}-${idx}`}>{idx + 1}. {d?.id || "-"}</div>
                            ))
                          : (row.designationIdArray || []).map((d, idx) => (
                              <div key={`${d}-${idx}`}>{idx + 1}. {d}</div>
                            ))}
                      </td>
                      <td className="border border-dorika-blue px-2 py-1 text-left">
                        {(row.designationData || []).length > 0
                          ? row.designationData.map((d, idx) => (
                              <div key={`${d?.name || "name"}-${idx}`}>{idx + 1}. {d?.name || "-"}</div>
                            ))
                          : (row.designationArray || []).map((d, idx) => (
                              <div key={`${d}-${idx}`}>{idx + 1}. {d}</div>
                            ))}
                      </td>
                      <td className="border border-dorika-blue px-2 py-1">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => handleEdit(row)}
                            className="text-dorika-blue hover:text-dorika-orange"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(row._id)}
                            className="text-dorika-orange hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="border border-dorika-blue px-2 py-3 text-gray-500">
                      No saved records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-2">
          <div className="bg-white w-full max-w-6xl rounded-md shadow-xl border border-blue-200 p-3 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base sm:text-lg font-bold text-dorika-blue">
                {editingHeadId ? "Edit Department Head" : "Add Department Head"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-600 hover:text-gray-900 text-xl px-2"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold text-dorika-blue uppercase mb-1">Head ID</label>
                <input
                  type="text"
                  value={departmentHeadId}
                  readOnly
                  className="w-full p-2 border border-dorika-blue rounded text-sm bg-gray-100 font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-dorika-blue uppercase mb-1">
                  Search Employee (Name / UserID / EmployeeID)
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(formatSearchInput(e.target.value))}
                  placeholder="Type name or ID"
                  className="w-full p-2 border border-dorika-blue rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dorika-blue uppercase mb-1">Department</label>
                <select
                  value={selectedDepartmentCode}
                  onChange={(e) => setSelectedDepartmentCode(e.target.value)}
                  className="w-full p-2 border border-dorika-blue rounded text-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d.deptCode}>
                      {d.deptName} ({d.deptCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold text-dorika-blue uppercase mb-1">
                Designation (Auto by Department)
              </label>
              <div className="w-full p-2 border border-dorika-blue rounded text-sm bg-gray-100 min-h-[38px]">
                {autoDesignationRows.length > 0 ? (
                  autoDesignationRows.map((d, idx) => (
                    <div key={`${d.designationID}-${idx}`}>
                      {idx + 1}. {d.designationName} ({d.designationID})
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500">No designation found</span>
                )}
              </div>
            </div>

            <div className="border border-dorika-blue rounded-md overflow-x-auto mb-3">
              <table className="min-w-[900px] w-full text-xs sm:text-sm border-collapse">
                <thead className="bg-dorika-blue text-white">
                  <tr>
                    <th className="border border-dorika-blue px-2 py-1">Select</th>
                    <th className="border border-dorika-blue px-2 py-1">Employee ID</th>
                    <th className="border border-dorika-blue px-2 py-1">Employee UserID</th>
                    <th className="border border-dorika-blue px-2 py-1">Employee Name</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((e) => {
                      const fullName = `${e.firstName || ""} ${e.middleName || ""} ${e.lastName || ""}`
                        .replace(/\s+/g, " ")
                        .trim();
                      return (
                        <tr key={e._id} className="hover:bg-dorika-blueLight transition">
                          <td className="border border-dorika-blue px-2 py-1">
                            <input
                              type="radio"
                              name="department-head-employee"
                              checked={selectedEmployeeId === e._id}
                              onChange={() => setSelectedEmployeeId(e._id)}
                            />
                          </td>
                          <td className="border border-dorika-blue px-2 py-1">{e.employeeID}</td>
                          <td className="border border-dorika-blue px-2 py-1">{e.employeeUserId}</td>
                          <td className="border border-dorika-blue px-2 py-1 text-left">{fullName}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="border border-dorika-blue px-2 py-3 text-gray-500">
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-1 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-dorika-blue hover:bg-dorika-orange text-white px-4 py-1 rounded font-semibold disabled:bg-gray-400"
              >
                {saving ? "Saving..." : editingHeadId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmrentHead;
