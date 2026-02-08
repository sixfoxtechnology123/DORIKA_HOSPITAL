import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import BackButton from "../component/BackButton";
import Sidebar from "../component/Sidebar";
import { useNavigate } from "react-router-dom";

const GenerateAllEmployeePayslip = () => {
  const navigate = useNavigate();
  const [selectedMonthYear, setSelectedMonthYear] = useState("");
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAlreadyGenerated, setIsAlreadyGenerated] = useState(false);

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

  const uniqueEarnings = [...new Set(employeesData.flatMap(emp => emp.earnings?.map(e => e.headName) || []))];
  const uniqueDeductions = [...new Set(employeesData.flatMap(emp => emp.deductions?.map(d => d.headName) || []))];

  const checkExistingStatus = async (m, y) => {
    try {
      const res = await axios.get(`http://localhost:5002/api/payslips/check-batch?month=${m}&year=${y}`);
      if (res.data.exists) {
        setIsAlreadyGenerated(true);
      } else {
        setIsAlreadyGenerated(false);
      }
    } catch (err) {
      setIsAlreadyGenerated(false);
    }
  };

  useEffect(() => {
    const fetchAndCalculate = async () => {
      if (!selectedMonthYear) return;
      try {
        setLoading(true);
        await checkExistingStatus(month, year);

        const [empRes, attRes] = await Promise.all([
          axios.get("http://localhost:5002/api/employees"),
          axios.get(`http://localhost:5002/api/attendance/history?month=${monthNum}&year=${year}`)
        ]);

        const mDays = new Date(year, monthNum, 0).getDate();

        const listWithMath = await Promise.all(empRes.data.map(async (emp) => {
          const att = attRes.data.find(a => a.employeeUserId === emp.employeeUserId) || {};
          let otRate = 0;
          try {
            const otRes = await axios.get(`http://localhost:5002/api/ot/ot-rate/rule?employeeUserId=${emp.employeeUserId}`);
            otRate = otRes.data?.data?.otRatePerHour || otRes.data?.otRatePerHour || 0;
          } catch (e) { otRate = 0; }

          const grossSalary = emp.earnings?.reduce((sum, e) => sum + (Number(e.value || e.amount) || 0), 0) || 0;
          const totalDeductionHeads = emp.deductions?.reduce((sum, d) => sum + (Number(d.value || d.amount) || 0), 0) || 0;
          const totalPaidDays = Number(att.totalPaidDays || 0);
          const lopDays = Number(att.totalAbsent || 0);
          const otHours = Number(att.totalOTHours || 0);
          const paidDaysSalary = mDays > 0 ? Math.round(((grossSalary - totalDeductionHeads) / mDays) * totalPaidDays) : 0;
          const otAmount = otHours > 0 ? Math.round(otHours * otRate) : "";
          const lopAmount = mDays > 0 ? Math.round((grossSalary / mDays) * lopDays) : 0;
          const netSalary = Math.round(paidDaysSalary + Number(otAmount || 0));

          return {
            ...emp,
            otRate,
            calc: {
              monthDays: mDays,
              grossSalary,
              totalDeductionHeads,
              paidDaysSalary,
              otHours: otHours > 0 ? otHours : "",
              otAmount: otAmount,
              lopDays,
              lopAmount,
              netSalary,
              totalPaidDays,
              totalOff: att.totalOff || 0,
              leaves: att.totalLeave || 0,
              totalWorkingDays: att.totalPresent || 0
            }
          };
        }));

        setEmployeesData(listWithMath);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchAndCalculate();
  }, [selectedMonthYear, month, year]);

  const handleOTChange = (index, field, value) => {
    if (isAlreadyGenerated) return; 
    const updated = [...employeesData];
    const emp = updated[index];
    emp.calc[field] = value;
    if (field === 'otHours') {
        emp.calc.otAmount = value === "" ? "" : Math.round(Number(value) * emp.otRate);
    }
    emp.calc.netSalary = Math.round(emp.calc.paidDaysSalary + Number(emp.calc.otAmount || 0));
    setEmployeesData(updated);
  };

  const handleBulkSubmit = async () => {
    setIsProcessing(true);
    const tid = toast.loading("Generating...");
    try {
      const allRecords = employeesData.map(emp => ({
        employeeId: emp.employeeID,
        employeeUserId: emp.employeeUserId,
        employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
        designationName: emp.designationName || "",
        doj: emp.doj,
        mobile: emp.permanentAddress?.mobile || "",
        email: emp.permanentAddress?.email || "",
        earnings: emp.earnings.map(e => ({ headName: e.headName, type: e.headType || "FIXED", amount: Number(e.value || e.amount || 0) })),
        deductions: emp.deductions.map(d => ({ headName: d.headName, type: d.headType || "FIXED", amount: Number(d.value || d.amount || 0) })),
        grossSalary: emp.calc.grossSalary,
        otHours: Number(emp.calc.otHours || 0),
        otAmount: Number(emp.calc.otAmount || 0),
        totalEarnings: emp.calc.grossSalary,
        totalDeduction: emp.calc.totalDeductionHeads,
        totalSalary: emp.calc.grossSalary - emp.calc.totalDeductionHeads,
        paidDaysSalary: emp.calc.paidDaysSalary,
        netSalary: emp.calc.netSalary,
        inHandSalary: emp.calc.netSalary,
        lopAmount: emp.calc.lopAmount,
        lopDays: emp.calc.lopDays,
        monthDays: emp.calc.monthDays,
        totalPaidDays: emp.calc.totalPaidDays,
        totalWorkingDays: emp.calc.totalWorkingDays,
        totalOff: emp.calc.totalOff,
        leaves: emp.calc.leaves,
      }));

      const payload = { month, year, employeePayslips: allRecords };
      await axios.post("http://localhost:5002/api/payslips/bulk", payload);
      
      toast.success(`Batch for ${month} saved!`, { id: tid });
      setIsAlreadyGenerated(true);
      navigate("/PaySlipGenerateEmployeeList");
    } catch (err) {
      toast.error("Failed to save batch", { id: tid });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-6">
      <div className="bg-white border-b-4 border-blue-600 rounded-t-xl shadow-sm px-6 py-4 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-slate-800 uppercase tracking-tight">
          Payslip Generate
        </h2>

        <div className="flex items-center">
          <BackButton />
        </div>
      </div>

        <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-4 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wide">Month & Year</label>
            <input type="month" className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold text-slate-700" value={selectedMonthYear} onChange={(e) => setSelectedMonthYear(e.target.value)} />
          </div>
          <div className="flex flex-col items-end gap-1">
            {isAlreadyGenerated && <span className="text-red-600 text-[10px] font-bold animate-pulse uppercase">Locked: {month} Data Exists</span>}
            <button onClick={handleBulkSubmit} disabled={isProcessing || !selectedMonthYear || employeesData.length === 0 || isAlreadyGenerated} className={`px-5 py-2 rounded-lg font-black uppercase text-sm shadow-xl transition-all ${isProcessing || isAlreadyGenerated ? "bg-slate-300 text-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"}`}>
                {isProcessing ? "Processing..." : isAlreadyGenerated ? "Already Generated" : "Generate All"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-x-auto border border-slate-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[10px] uppercase text-center">
                <th className="py-1 px-2 border border-slate-700" colSpan="3">Employee Info</th>
                <th className="py-1 px-2 border border-slate-700 bg-blue-900" colSpan={uniqueEarnings.length + 1}>Earnings</th>
                <th className="py-1 px-2 border border-slate-700 bg-red-900" colSpan={uniqueDeductions.length}>Deductions</th>
                <th className="py-1 px-2 border border-slate-700 bg-orange-700" colSpan="2">Overtime</th>
                <th className="p-2 bg-slate-900" colSpan="2">Summary</th>
              </tr>
              <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-b-2 border-blue-500 text-center">
                <th className="p-1 border border-gray-300">SL</th>
                <th className="p-1 border border-gray-300">ID</th>
                <th className="p-1 border border-gray-300 min-w-[150px]">Full Name</th>
                <th className="p-1 border border-gray-300 bg-blue-600 text-white font-bold">Gross Salary</th>
                {uniqueEarnings.map(head => <th key={head} className="p-1 border border-gray-300 bg-blue-50 text-blue-800">{head}</th>)}
                {uniqueDeductions.map(head => <th key={head} className="p-1 border border-gray-300 bg-red-50 text-red-800">{head}</th>)}
                <th className="p-1 border border-gray-300 bg-orange-50">OT Hours</th>
                <th className="p-1 border border-gray-300 bg-orange-50">OT Amount</th>
                <th className="p-1 border border-gray-300 bg-slate-200">Paid Days</th>
                <th className="p-1 border border-gray-300 bg-green-700 text-white text-sm font-black italic">Net Salary</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-medium text-center">
              {loading ? (
                <tr><td colSpan={11 + uniqueEarnings.length + uniqueDeductions.length} className="p-20 font-bold text-slate-400">Wait...</td></tr>
              ) : employeesData.map((emp, idx) => (
                <tr key={idx} className="hover:bg-blue-50 border-b border-slate-100">
                  <td className="py-1 px-2 border border-gray-300">{idx + 1}</td>
                  <td className="py-1 px-2 border border-gray-300 font-bold">{emp.employeeID}</td>
                  <td className="py-1 px-2 border border-gray-300 font-bold text-left uppercase">{emp.firstName} {emp.lastName}</td>
                  <td className="py-1 px-2 border border-gray-300 bg-blue-50 font-black">₹{emp.calc.grossSalary}</td>
                  {uniqueEarnings.map(head => <td key={head} className="py-1 px-2 border border-gray-300 text-blue-700">₹{emp.earnings?.find(e => e.headName === head)?.value || 0}</td>)}
                  {uniqueDeductions.map(head => <td key={head} className="py-1 px-2 border border-gray-300 text-red-700">₹{emp.deductions?.find(d => d.headName === head)?.value || 0}</td>)}
                  <td className="p-1 border border-gray-300 bg-orange-50">
                    <input type="number" step="0.01" disabled={isAlreadyGenerated} className={`w-16 p-1 text-center border rounded outline-none ${isAlreadyGenerated ? 'bg-gray-100' : 'bg-white'}`} value={emp.calc.otHours} onChange={(e) => handleOTChange(idx, 'otHours', e.target.value)} />
                  </td>
                  <td className="p-1 border border-gray-300 bg-orange-50">
                    <input type="number" disabled={isAlreadyGenerated} className={`w-20 p-1 text-center border rounded outline-none ${isAlreadyGenerated ? 'bg-gray-100' : 'bg-white'}`} value={emp.calc.otAmount} onChange={(e) => handleOTChange(idx, 'otAmount', e.target.value)} />
                  </td>
                  <td className="py-1 px-2 border border-gray-300 font-bold bg-slate-50">{emp.calc.totalPaidDays}</td>
                  <td className="py-1 px-2 border border-gray-300 bg-green-100 text-green-900 font-black text-sm">₹{emp.calc.netSalary}</td>
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