import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";
import Sidebar from "../component/Sidebar";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const GenerateAllEmployeePayslip = () => {
  const navigate = useNavigate();
  const [selectedMonthYear, setSelectedMonthYear] = useState(localStorage.getItem("payslip_date") || "");
  const [selectedDept, setSelectedDept] = useState(localStorage.getItem("payslip_dept") || "All");
  
  const [employeesData, setEmployeesData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isGenerated, setIsGenerated] = useState(false); 
  const [isLocked, setIsLocked] = useState(false);
  const [masterLocked, setMasterLocked] = useState(false);

  const getPeriod = () => {
    if (!selectedMonthYear) return { month: "", year: "" };
    const [y, m] = selectedMonthYear.split("-");
    const date = new Date(y, m - 1);
    return {
      month: date.toLocaleString('default', { month: 'long' }),
      year: y,
      monthNum: parseInt(m)
    };
  };

  const { month, year, monthNum } = getPeriod();
  const uniqueEarnings = ["Basic", "HRA", "Mobile Allowance", "Bonus", "Management Allowance"];
  const uniqueDeductions = ["PF", "PT", "ESI"];

  useEffect(() => {
    axios.get("http://localhost:5002/api/departments")
      .then(res => setDepartments(res.data))
      .catch(() => console.error("Dept load failed"));
  }, []);

const runPayFormula = (grossInput) => {
    const S = Math.round(parseFloat(grossInput) || 0);
    
    const basic = Math.round(S * 0.50);
    const hra = Math.round(basic * 0.40);
    
    // Logic change: Only 500 if S > 0, otherwise 0
    const mobile = S > 0 ? 500 : 0; 
    
    const bonus = Math.round(basic / 6);
    
    // Logic change: Management allowance should be 0 if Gross is 0
    const managementAllowance = S > 0 ? Math.round(S - (basic + hra + mobile + bonus)) : 0;

    const pf = Math.round(basic * 0.12);
    const pt = Math.round(S > 25000 ? 208 : (S >= 15000 ? 180 : 0));
    const esi = Math.round(S * 0.0075);

    return {
      gross: S,
      earnings: [
        { headName: "Basic", value: basic },
        { headName: "HRA", value: hra },
        { headName: "Mobile Allowance", value: mobile },
        { headName: "Bonus", value: bonus },
        { headName: "Management Allowance", value: managementAllowance },
      ],
      deductions: [
        { headName: "PF", value: pf },
        { headName: "PT", value: pt },
        { headName: "ESI", value: esi },
      ],
      totalDeduction: pf + pt + esi
    };
  };

  const checkStatus = async (m, y, dept) => {
    if (!m || !y) return null;
    try {
      const masterRes = await axios.get(`http://localhost:5002/api/payslips/check-batch?month=${m}&year=${y}&filterDept=All`);
      const masterData = masterRes.data.data;
      setMasterLocked(masterData?.status === "Finalized");

      const res = await axios.get(`http://localhost:5002/api/payslips/check-batch?month=${m}&year=${y}&filterDept=${dept}`);
      if (res.data.exists) {
        setIsGenerated(true);
        setIsLocked(res.data.data.status === "Finalized");
        return res.data.data.employeePayslips;
      }
      setIsGenerated(false);
      setIsLocked(false);
      return null;
    } catch (err) { return null; }
  };

useEffect(() => {
  const fetchAndCalculate = async () => {
    if (!selectedMonthYear) return;
    localStorage.setItem("payslip_date", selectedMonthYear);
    localStorage.setItem("payslip_dept", selectedDept);

    try {
      setLoading(true);

      // 1. Fetch all data at once (Added OT rates here to fix speed)
      const [existingData, empRes, attRes, otRatesRes] = await Promise.all([
        checkStatus(month, year, selectedDept),
        axios.get("http://localhost:5002/api/employees"),
        axios.get(`http://localhost:5002/api/attendance/history?month=${monthNum}&year=${year}`),
        axios.get("http://localhost:5002/api/ot/ot-rate/rule") // Fetch all rules at once
      ]);

      const mDays = new Date(year, monthNum, 0).getDate();
      const allOtRules = otRatesRes.data?.data || otRatesRes.data || [];

      // 2. Process everything locally (Synchronous - very fast)
      const listWithMath = empRes.data.map((emp) => {
        const att = attRes.data.find(a => a.employeeUserId === emp.employeeUserId) || {};
        const saved = existingData?.find(s => s.employeeId === emp.employeeID);
        
        // Find OT rate from the list we just fetched instead of calling API again
        const otRule = allOtRules.find(r => r.employeeUserId === emp.employeeUserId);
        const otRate = otRule?.otRatePerHour || 0;

        // --- Keep your existing logic exactly as it was ---
        const currentGross = saved ? saved.grossSalary : (emp.grossSalary || "");
        const rawEarnings = saved ? saved.earnings : (emp.earnings || []);
        const rawDeductions = saved ? saved.deductions : (emp.deductions || []);

        const normalizedEarnings = rawEarnings.map(e => ({
          ...e,
          value: e.amount !== undefined ? e.amount : (e.value !== undefined ? e.value : "")
        }));

        const normalizedDeductions = rawDeductions.map(d => ({
          ...d,
          value: d.amount !== undefined ? d.amount : (d.value !== undefined ? d.value : "")
        }));
        
        const workingDays = Number(att.totalPresent || 0);
        const offDays = Number(att.totalOff || 0);
        const leaveDays = Number(att.totalLeave || 0);
        const absentDays = Number(att.totalAbsent || 0);
        const totalPaidDays = Number(att.totalPaidDays || 0);
        const otHours = saved ? saved.otHours : (att.totalOTHours > 0 ? att.totalOTHours : "");
        const otAmount = saved ? saved.otAmount : (otHours !== "" ? Math.round(otHours * otRate) : "");
        
        const totalDedSum = normalizedDeductions.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
        const paidDaysSalary = mDays > 0 ? Math.round(((Number(currentGross || 0) - totalDedSum) / mDays) * totalPaidDays) : 0;

        return {
          ...emp,
          otRate,
          earnings: normalizedEarnings,
          deductions: normalizedDeductions,
          calc: {
            monthDays: mDays,
            grossSalary: currentGross,
            totalDeductionHeads: totalDedSum,
            paidDaysSalary,
            otHours, 
            otAmount, 
            netSalary: Math.round(paidDaysSalary + Number(otAmount || 0)),
            totalWorkingDays: workingDays, 
            totalOff: offDays,
            leaves: leaveDays,
            absentDays: absentDays,
            totalPaidDays: totalPaidDays
          }
        };
      });

      setEmployeesData(listWithMath);
      setLoading(false);
    } catch (err) { 
      console.error("Fetch Error:", err);
      setLoading(false); 
    }
  };

  fetchAndCalculate();
}, [selectedMonthYear, selectedDept]);

const handleUniversalEdit = (employeeID, field, value, headName = null) => {
    if (isLocked || masterLocked) return;
    
    // 1. Create copy of the master data
    const updated = [...employeesData];
    
    // 2. Find employee by ID instead of index
    const emp = updated.find(e => e.employeeID === employeeID);
    if (!emp) return;

    if (field === "grossSalary") {
      const struct = runPayFormula(value);
      emp.calc.grossSalary = value === "" ? "" : struct.gross;
      emp.earnings = struct.earnings;
      emp.deductions = struct.deductions;
    } 
    else if (field === "earning") {
        const target = emp.earnings.find(e => e.headName === headName);
        if (target) target.value = value === "" ? "" : Number(value);
    }
    else if (field === "deduction") {
        const target = emp.deductions.find(d => d.headName === headName);
        if (target) target.value = value === "" ? "" : Number(value);
    }
    else if (field === "otHours") {
      emp.calc.otHours = value;
      emp.calc.otAmount = value === "" ? "" : Math.round(Number(value) * emp.otRate);
    } 
    else if (field === "otAmount") {
      emp.calc.otAmount = value === "" ? "" : Number(value);
    }

    // Recalculate Net math based on local employee object
    const totalDeductionHeads = emp.deductions.reduce((sum, d) => sum + Number(d.value || 0), 0);
    emp.calc.paidDaysSalary = Math.round(((Number(emp.calc.grossSalary || 0) - totalDeductionHeads) / emp.calc.monthDays) * emp.calc.totalPaidDays);
    emp.calc.netSalary = Math.round(emp.calc.paidDaysSalary + Number(emp.calc.otAmount || 0));
    
    setEmployeesData(updated);
  };

  const filteredEmployees = selectedDept === "All" ? employeesData : employeesData.filter(e => e.departmentName === selectedDept);

const handleBulkSubmit = async (status = "Draft") => {
    setIsProcessing(true);
    const tid = toast.loading(`Saving ${selectedDept} for ${month} ${year}...`);
    try {
      const payload = {
        month, 
        year, 
        status, 
        filterDept: selectedDept,
        employeePayslips: filteredEmployees.map(emp => ({
          employeeId: emp.employeeID,
          employeeUserId: emp.employeeUserId,
          employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
          
          departmentName: emp.departmentName || "",
          designationName: emp.designationName || "",
          doj: emp.doj || "",
          mobile: emp.permanentAddress?.mobile || emp.presentAddress?.mobile || "",
          email: emp.permanentAddress?.email || emp.presentAddress?.email || "",
          
          earnings: emp.earnings.map(e => ({
            headName: e.headName,
            type: e.type || "Fixed", 
            amount: e.value === "" || e.value === undefined ? 0 : Number(e.value)
          })),
          
          deductions: emp.deductions.map(d => ({
            headName: d.headName,
            type: d.type || "Fixed",
            amount: d.value === "" || d.value === undefined ? 0 : Number(d.value)
          })),

          // Summary Fields
          grossSalary: Number(emp.calc.grossSalary || 0),
          otHours: Number(emp.calc.otHours || 0),
          otAmount: Number(emp.calc.otAmount || 0),
          totalPaidDays: Number(emp.calc.totalPaidDays || 0),
          netSalary: Number(emp.calc.netSalary || 0),
          inHandSalary: Number(emp.calc.netSalary || 0),
          
          // Schema Defaults - FIXED: Mapping from emp.calc instead of 0
          lopDays: Number(emp.calc.absentDays || 0), // Stores Absent Days
          lopAmount: 0,
          monthDays: Number(emp.calc.monthDays || 0),
          totalWorkingDays: Number(emp.calc.totalWorkingDays || 0), // Stores Present Days
          totalOff: Number(emp.calc.totalOff || 0),
          leaves: Number(emp.calc.leaves || 0),
          
          totalEarnings: emp.earnings.reduce((sum, e) => sum + (Number(e.value) || 0), 0),
          totalDeduction: emp.deductions.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
        }))
      };

      const res = await axios.post("http://localhost:5002/api/payslips/bulk", payload);
      toast.success(res.data.message, { id: tid });
      
      setIsGenerated(true);
      if (status === "Finalized") setIsLocked(true);
      
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { 
        toast.error(err.response?.data?.message || "Error saving batch", { id: tid }); 
    } finally { setIsProcessing(false); }
  };

  const clearMonth = async () => {
    if (!window.confirm(`Clear all history for ${selectedDept} - ${month} ${year}?`)) return;
    try {
      const res = await axios.delete(`http://localhost:5002/api/payslips/clean?month=${month}&year=${year}&filterDept=${selectedDept}`);
      if (res.data.success) {
        toast.success(res.data.message);
        setIsGenerated(false);
        setIsLocked(false);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) { toast.error("Failed to clear month history"); }
  };

const exportExcel = () => {
    // Define the Header Rows
    const headerRow1 = ["Employee Info", "", "", "", "Earnings", "", "", "", "", "", "Deductions", "", "", "Overtime", "", "Summary", ""];
    const headerRow2 = ["SL", "ID", "Name", "Dept", "Gross", "Basic", "HRA", "Mobile Allowance", "Bonus", "Management Allowance", "PF", "PT", "ESI", "OT Hrs", "OT Amt", "Paid Days", "Net Pay"];

    // Prepare Data Rows
    const dataRows = filteredEmployees.map((emp, idx) => {
      const getVal = (arr, head) => {
        const found = arr.find(h => h.headName === head);
        return found ? (found.amount !== undefined ? found.amount : found.value) : 0;
      };
      return [
        idx + 1, emp.employeeID, `${emp.firstName} ${emp.lastName}`, emp.departmentName, emp.calc.grossSalary,
        getVal(emp.earnings, "Basic"), getVal(emp.earnings, "HRA"), getVal(emp.earnings, "Mobile Allowance"), getVal(emp.earnings, "Bonus"), getVal(emp.earnings, "Management Allowance"),
        getVal(emp.deductions, "PF"), getVal(emp.deductions, "PT"), getVal(emp.deductions, "ESI"),
        emp.calc.otHours || 0, emp.calc.otAmount || 0, emp.calc.totalPaidDays, emp.calc.netSalary
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);

    // Define Styles
    const baseStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "334155" } } };
    const empStyle = { ...baseStyle, fill: { fgColor: { rgb: "475569" } } }; // Gray
    const earnStyle = { ...baseStyle, fill: { fgColor: { rgb: "1E3A8A" } } }; // Dark Blue
    const dedStyle = { ...baseStyle, fill: { fgColor: { rgb: "991B1B" } } }; // Dark Red
    const otStyle = { ...baseStyle, fill: { fgColor: { rgb: "C2410C" } } }; // Orange
    const sumStyle = { ...baseStyle, fill: { fgColor: { rgb: "15803D" } } }; // Green

    // Apply Styles to Header Row 1 (Merged Categories)
    const range1 = [
      { c: 0, style: empStyle }, { c: 4, style: earnStyle }, 
      { c: 10, style: dedStyle }, { c: 13, style: otStyle }, { c: 15, style: sumStyle }
    ];

    range1.forEach(item => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: item.c });
      if (worksheet[cellRef]) worksheet[cellRef].s = item.style;
    });

    // Apply Styles to Header Row 2 (Subheads)
    const subheadStyle = { font: { bold: true }, fill: { fgColor: { rgb: "F1F5F9" } }, border: { bottom: { style: "thin" } } };
    for (let c = 0; c <= 16; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 1, c: c });
      if (worksheet[cellRef]) worksheet[cellRef].s = subheadStyle;
    }

    // Merge Cells logic
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },   // Employee Info
      { s: { r: 0, c: 4 }, e: { r: 0, c: 9 } },   // Earnings
      { s: { r: 0, c: 10 }, e: { r: 0, c: 12 } }, // Deductions
      { s: { r: 0, c: 13 }, e: { r: 0, c: 14 } }, // Overtime
      { s: { r: 0, c: 15 }, e: { r: 0, c: 16 } }  // Summary
    ];

    // Set Column Widths for better visibility
    worksheet["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll_Data");
    XLSX.writeFile(workbook, `Payroll_${selectedDept}_${month}_${year}.xlsx`);
  };

  return (
   <div className="flex h-screen flex-col md:flex-row">
      <Sidebar/>
    <div className="flex-1 pl-3 flex flex-col min-h-0 overflow-y-auto">
    {/* Header Section */}
       <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-row justify-between items-center gap-2">
          {/* whitespace-nowrap ensures the text doesn't wrap and overlap */}
          <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
          Payslip Control
          </h2>
          
          <div className="flex shrink-0">
            <BackButton />
          </div>
        </div>

    {/* Filters and Buttons Row */}
    <div className="bg-white p-2 md:p-4 rounded-xl shadow-md border mb-4 flex flex-row flex-wrap gap-2 items-end">
      
      {/* Period Field - side by side on mobile */}
      <div className="flex-1 min-w-[120px] md:min-w-[200px]">
        <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">Period</label>
        <input type="month" className="w-full border-2 p-1.5 md:p-2 rounded-lg font-bold text-xs md:text-base" value={selectedMonthYear} onChange={(e) => setSelectedMonthYear(e.target.value)} />
      </div>

      {/* Filter Dept Field - side by side on mobile */}
      <div className="flex-1 min-w-[120px] md:min-w-[200px]">
        <label className="block text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">Filter Dept</label>
        <select className="w-full border-2 p-1.5 md:p-2 rounded-lg font-bold text-xs md:text-base" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d._id} value={d.deptName}>{d.deptName}</option>)}
        </select>
      </div>

      {/* Buttons Row - All 4 buttons in one line on mobile */}
      <div className="flex flex-row gap-1 w-full lg:w-auto overflow-x-auto no-scrollbar">
        <button onClick={exportExcel} className="flex-1 whitespace-nowrap bg-green-600 text-white px-2 md:px-4 py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase shadow-md active:scale-95">Excel</button>
        <button onClick={() => handleBulkSubmit("Draft")} disabled={masterLocked || isLocked || isProcessing || isGenerated} className="flex-1 whitespace-nowrap bg-blue-600 text-white px-2 md:px-4 py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase disabled:bg-gray-300 shadow-md active:scale-95">Generate</button>
        <button onClick={clearMonth} disabled={masterLocked || isLocked || !isGenerated} className="flex-1 whitespace-nowrap bg-orange-500 text-white px-2 md:px-4 py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase disabled:bg-gray-300 shadow-md active:scale-95">Clear</button>
        <button onClick={() => handleBulkSubmit("Finalized")} disabled={masterLocked || isLocked || !isGenerated || isProcessing} className="flex-1 whitespace-nowrap bg-red-700 text-white px-2 md:px-4 py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase disabled:bg-gray-300 shadow-md active:scale-95">Close</button>
      </div>
    </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-x-auto border border-slate-200">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-slate-800 text-white text-[10px] uppercase">
                <th className="p-2 border border-slate-700" colSpan="4">Employee Info</th>
                <th className="p-2 border border-slate-700 bg-blue-900" colSpan={uniqueEarnings.length + 1}>Earnings</th>
                <th className="p-2 border border-slate-700 bg-red-900" colSpan={uniqueDeductions.length}>Deductions</th>
                <th className="p-2 border border-slate-700 bg-orange-700" colSpan="2">Overtime</th>
                <th className="p-2 bg-slate-900" colSpan="2">Summary</th>
              </tr>
              <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-b-2 border-blue-500">
                <th className="p-1 border">SL</th><th className="p-1 border">ID</th><th className="p-1 border min-w-[150px]">Name</th><th className="p-1 border bg-yellow-50">Dept</th>
                <th className="p-1 border bg-blue-600 text-white font-black italic">Gross</th>
                {uniqueEarnings.map(h => <th key={h} className="p-1 border bg-blue-50">{h}</th>)}
                {uniqueDeductions.map(h => <th key={h} className="p-1 border bg-red-50">{h}</th>)}
                <th className="p-1 border bg-orange-50">OT Hrs</th>
                <th className="p-1 border bg-orange-50">OT Amt</th>
                <th className="p-1 border bg-slate-200">Paid Days</th>
                <th className="p-1 border bg-green-700 text-white text-sm">Net Pay</th>
              </tr>
            </thead>
          <tbody className="text-[11px]">
            {loading ? (
              <tr><td colSpan={20} className="p-10 font-bold italic text-blue-600 animate-pulse">Loading the Employee List . Please Wait ...</td></tr>
            ) : filteredEmployees.map((emp, idx) => (
              <tr key={emp.employeeID} className={`hover:bg-blue-50 border-b ${(isLocked || masterLocked) ? 'bg-gray-100' : ''}`}>
                <td className="p-1 border">{idx + 1}</td>
                <td className="p-1 border font-bold text-slate-600">{emp.employeeID}</td>
                <td className="p-1 border text-left uppercase text-gray-900 font-semibold">{emp.firstName} {emp.lastName} {emp.lastName}</td>
                <td className="p-1 border bg-yellow-50/20 font-semibold">{emp.departmentName}</td>
                
                {/* Gross Salary */}
                <td className="p-1 border bg-blue-50">
                  <input type="number" disabled={isLocked || masterLocked} className="w-20 text-center font-black bg-white border rounded" 
                  value={emp.calc.grossSalary === 0 || emp.calc.grossSalary === null ? "" : emp.calc.grossSalary} 
                  onChange={(e) => handleUniversalEdit(emp.employeeID, 'grossSalary', e.target.value)} />
                </td>

                {/* Earnings */}
                {uniqueEarnings.map(h => (
                  <td key={h} className="p-1 border">
                      <input type="number" disabled={isLocked || masterLocked} className="w-16 text-center bg-transparent text-blue-700 font-bold" 
                      value={emp.earnings.find(e => e.headName === h)?.value || ""} 
                      onChange={(e) => handleUniversalEdit(emp.employeeID, 'earning', e.target.value, h)} />
                  </td>
                ))}

                {/* Deductions */}
                {uniqueDeductions.map(h => (
                  <td key={h} className="p-1 border">
                      <input type="number" disabled={isLocked || masterLocked} className="w-16 text-center bg-transparent text-red-600 font-bold" 
                      value={emp.deductions.find(d => d.headName === h)?.value || ""} 
                      onChange={(x) => handleUniversalEdit(emp.employeeID, 'deduction', x.target.value, h)} />
                  </td>
                ))}

                {/* Overtime */}
                <td className="p-1 border bg-orange-50">
                  <input type="number" disabled={isLocked || masterLocked} className="w-12 text-center bg-white border font-semibold rounded" 
                  value={emp.calc.otHours} onChange={(e) => handleUniversalEdit(emp.employeeID, 'otHours', e.target.value)} />
                </td>
                <td className="p-1 border bg-orange-50">
                  <input type="number" disabled={isLocked || masterLocked} className="w-16 text-center bg-white border rounded font-semibold italic" 
                  value={emp.calc.otAmount} onChange={(e) => handleUniversalEdit(emp.employeeID, 'otAmount', e.target.value)} />
                </td>

                <td className="p-1 border bg-slate-100 font-bold italic">{emp.calc.totalPaidDays}</td>
                <td className="p-1 border bg-green-100 text-green-900 font-black text-sm">₹{emp.calc.netSalary}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GenerateAllEmployeePayslip;