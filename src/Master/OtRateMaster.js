import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Select from "react-select"; // Ensure you have installed react-select

const OTRateMaster = () => {
  const navigate = useNavigate();
  const [conflictEmployees, setConflictEmployees] = useState([]);
  const [showChoice, setShowChoice] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  const [rateType, setRateType] = useState("EMPLOYEE");
  const [selectedValue, setSelectedValue] = useState("");
  const [otRatePerHour, setOtRatePerHour] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/employees");
      setEmployees(res.data);
    } catch {
      toast.error("Failed to load employees");
    }
  };

  // ✅ Auto-format logic: converts letters to uppercase and adds hyphen before numbers
  const formatInput = (input) => {
    let val = input.toUpperCase().replace(/\s+/g, "");
    // If it's like TP00001 and doesn't have a hyphen yet
    if (val.length > 1 && /^[A-Z]+[0-9]/.test(val) && !val.includes("-")) {
      // Find where letters end and numbers begin
      const firstDigitIndex = val.search(/\d/);
      if (firstDigitIndex !== -1) {
        val = val.slice(0, firstDigitIndex) + "-" + val.slice(firstDigitIndex);
      }
    }
    return val;
  };

  const handleFilter = (value) => {
    setSelectedValue(value);
    let filtered = [];

    if (rateType === "EMPLOYEE") {
      filtered = employees.filter((e) => e.employeeID === value);
    } else if (rateType === "DESIGNATION") {
      filtered = employees.filter((e) => e.designationName === value);
    } else if (rateType === "DEPARTMENT") {
      filtered = employees.filter((e) => e.departmentName === value);
    }

    setFilteredEmployees(filtered);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!otRatePerHour || filteredEmployees.length === 0) {
      toast.error("Select data & enter OT rate");
      return;
    }

    try {
      const res = await axios.get("http://localhost:5002/api/ot/check-existing", {
        params: {
          rateType,
          employeeId: rateType === "EMPLOYEE" ? selectedValue : null,
          designationName: rateType === "DESIGNATION" ? selectedValue : null,
          departmentName: rateType === "DEPARTMENT" ? selectedValue : null,
        },
      });

      const existing = res.data.existing;

      if (existing.length > 0) {
        if (rateType === "EMPLOYEE") {
          toast.error(`OT rate already exists for ${existing[0].employeeName} (${existing[0].employeeId})`);
          return;
        } else {
          setConflictEmployees(existing);
          // ✅ Show Choice Toast UI
          showCustomChoiceToast();
          return;
        }
      }

      await saveRates("ALL");
    } catch (err) {
      toast.error("Error checking existing rates");
    }
  };

  const showCustomChoiceToast = () => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-[220px]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-green-500 rounded-full"></div>
            <p className="text-sm font-semibold text-gray-800">
              Some employees already have a fixed rate. Do you change?
            </p>
          </div>

          <div className="flex justify-end items-center gap-3 border-t border-gray-100 pt-3">
            <button
              className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-md transition-all uppercase"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-md transition-all uppercase"
              onClick={() => {
                toast.dismiss(t.id);
                saveRates("EXCEPT");
              }}
            >
              Rest Employee
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-4 py-1.5 rounded-md shadow-md transition-all uppercase"
              onClick={() => {
                toast.dismiss(t.id);
                saveRates("ALL");
              }}
            >
             Replace All
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
        position: "top-center",
        style: { padding: "16px", borderRadius: "12px", background: "#ffffff" },
      }
    );
  };

  const saveRates = async (mode) => {
    try {
      await axios.post("http://localhost:5002/api/ot/save-bulk", {
        employees: filteredEmployees,
        otRatePerHour,
        rateType,
        mode,
      });

      toast.success("OT Rate saved successfully");
      setShowChoice(false);
      navigate("/otRateList");
    } catch {
      toast.error("Failed to save OT rate");
    }
  };

  // Prepare options for Select
  const employeeOptions = employees.map((emp) => ({
    value: emp.employeeID,
    label: `${emp.firstName} ${emp.lastName} - ${emp.employeeID}`,
  }));

  const bulkOptions = [
    ...new Set(
      employees.map((e) =>
        rateType === "DESIGNATION" ? e.designationName : e.departmentName
      )
    ),
  ].map((val) => ({ value: val, label: val }));

  return (
    <div className="min-h-screen bg-zinc-300 flex flex-col md:flex-row">
      <div className="md:w-64 w-full">
        <Sidebar />
      </div>

      <div className="flex-1 p-2 sm:p-3 overflow-y-auto">
        <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
         <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 text-center">
            OT Rate Master
          </h2>

          <form
            onSubmit={handleSave}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm">Rate Type</label>
              <select
                value={rateType}
                onChange={(e) => {
                  setRateType(e.target.value);
                  setFilteredEmployees([]);
                  setSelectedValue("");
                }}
                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 h-[32px]"
              >
                <option value="EMPLOYEE">Employee Wise</option>
                <option value="DESIGNATION">Designation Wise</option>
                <option value="DEPARTMENT">Department Wise</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm">
                {rateType === "EMPLOYEE" ? "Employee" : rateType}
              </label>
            <Select
                options={rateType === "EMPLOYEE" ? employeeOptions : bulkOptions}
                onChange={(opt) => handleFilter(opt ? opt.value : "")}
                value={
                  (rateType === "EMPLOYEE" ? employeeOptions : bulkOptions).find(
                    (s) => s.value === selectedValue
                  ) || null
                }
                placeholder="Search..."
                isSearchable
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: "32px",   // Reduced height from 38px
                    height: "32px",
                    fontWeight: "600",
                    fontSize: "12px",    // Small text for the selected value
                    borderColor: "#d1d5db",
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    padding: "0px 6px",  // Tighter padding
                  }),
                  input: (base) => ({
                    ...base,
                    margin: "0px",
                  }),
                  indicatorsContainer: (base) => ({
                    ...base,
                    height: "30px",      // Smaller arrows/clear icons
                  }),
                  option: (base) => ({
                    ...base,
                    fontSize: "12px",    // ✅ This makes the list names small
                    padding: "4px 10px", // Makes the list items more compact
                  }),
                }}
                onInputChange={(inputValue, { action }) => {
                  if (action === "input-change") {
                    return formatInput(inputValue);
                  }
                  return inputValue;
                }}
              />
            </div>

            <div>
              <label className="block text-sm">OT Rate / Hour</label>
              <input
                type="number"
                min="0"
                value={otRatePerHour}
                onChange={(e) => setOtRatePerHour(e.target.value)}
                className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 h-[32px]"
                placeholder="Enter OT rate"
              />
            </div>
          </form>

          {filteredEmployees.length > 0 && (
            <div className="mt-4 overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-1 border">Employee ID</th>
                    <th className="p-1 border">Employee Name</th>
                    <th className="p-1 border">Department</th>
                    <th className="p-1 border">Designation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp._id}>
                      <td className="p-1 border">{emp.employeeID}</td>
                      <td className="p-1 border">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="p-1 border">{emp.departmentName}</td>
                      <td className="p-1 border">{emp.designationName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

         <div className="flex w-full justify-between items-center mt-4">
           <div><BackButton/></div>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1 rounded text-white bg-teal-600 hover:bg-teal-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTRateMaster;