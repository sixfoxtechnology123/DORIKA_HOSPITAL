import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";

const LeaveHistory = () => {
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");

  const fetchLeaveHistory = async () => {
    try {
      const res = await axios.get("/api/leave-application");
      const actualData = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.leaves || [];
      setLeaves(actualData);
    } catch (error) {
      toast.error("Failed to fetch leave history");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get("/api/departments");
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error("Failed to fetch departments");
    }
  };

  useEffect(() => {
    fetchLeaveHistory();
    fetchDepartments();
  }, []);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-") : "-";

  const formatDateTime = (date) =>
    date ? new Date(date).toLocaleString("en-GB").replace(/\//g, "-") : "-";

  const parseDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{2}-\d{2}-\d{4}$/.test(value)) {
      const [dd, mm, yyyy] = value.split("-");
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getFinalStatus = (leave) =>
    String(leave.approveRejectedStatus || leave.applyStatus || "PENDING").toUpperCase();

  const getByRole = (history = [], role) =>
    history.find((h) => h.role === role) || {};

  const filteredLeaves = leaves.filter((leave) => {
    const finalStatus = getFinalStatus(leave);
    const leaveDate = parseDate(leave.applicationDate || leave.fromDate);
    const monthStr = leaveDate
      ? `${leaveDate.getFullYear()}-${String(leaveDate.getMonth() + 1).padStart(2, "0")}`
      : "";

    const monthMatch = !selectedMonth || monthStr === selectedMonth;
    const statusMatch = selectedStatus === "ALL" || finalStatus === selectedStatus;
    const departmentMatch =
      selectedDepartment === "ALL" || (leave.departmentName || "") === selectedDepartment;

    return monthMatch && statusMatch && departmentMatch;
  });

  const handleDownloadPDF = () => {
    try {
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const headers = [
        "Emp ID",
        "Emp Name",
        "Department",
        "Apply Date",
        "From Date",
        "To Date",
        "Total Days",
        "RM",
        "Status",
        "Date & Time",
        "DH",
        "Status",
        "Date & Time",
        "Final Status",
      ];

      const rows = filteredLeaves.map((leave) => {
        const rm = getByRole(leave.history, "Reporting Manager");
        const dh = getByRole(leave.history, "Department Head");
        return [
          String(leave.employeeId || ""),
          String(leave.employeeName || ""),
          String(leave.departmentName || "-"),
          String(formatDate(leave.applicationDate)),
          String(formatDate(leave.fromDate)),
          String(formatDate(leave.toDate)),
          String(leave.noOfDays ?? ""),
          String(leave.reportingManager || ""),
          String(rm.status || "-"),
          String(formatDateTime(rm.date)),
          String(leave.departmentHead || ""),
          String(dh.status || "-"),
          String(formatDateTime(dh.date)),
          String(getFinalStatus(leave)),
        ];
      });

      const marginX = 5;
      const topY = 12;
      const minRowHeight = 7;
      const lineHeight = 3.2;
      const colWidths = [16, 34, 22, 19, 19, 19, 14, 20, 14, 22, 20, 14, 22, 17];
      const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
      const scale = Math.min(1, (pageWidth - marginX * 2) / totalTableWidth);
      const widths = colWidths.map((w) => w * scale);

      const getCellLines = (text, width) => pdf.splitTextToSize(String(text ?? ""), Math.max(1, width - 2.2));

      const drawRow = (cells, y, isHeader = false) => {
        const fontSize = isHeader ? 8 : 7;
        pdf.setLineWidth(0.2);
        pdf.setFont("helvetica", isHeader ? "bold" : "normal");
        pdf.setFontSize(fontSize);
        const lineSets = cells.map((cell, i) => getCellLines(cell, widths[i]));
        const maxLines = lineSets.reduce((m, lines) => Math.max(m, lines.length || 1), 1);
        const rowHeight = Math.max(minRowHeight, 2.2 + maxLines * lineHeight);

        let x = marginX;
        for (let i = 0; i < cells.length; i += 1) {
          const w = widths[i];
          const lines = lineSets[i].length ? lineSets[i] : [""];
          pdf.setFillColor(255, 255, 255);
          pdf.rect(x, y, w, rowHeight, "FD");
          pdf.text(lines, x + 1.2, y + 4.2);
          x += w;
        }
        return rowHeight;
      };

      let y = topY;
      y += drawRow(headers, y, true);

      rows.forEach((row) => {
        const rowLines = row.map((cell, i) => getCellLines(cell, widths[i]));
        const rowMaxLines = rowLines.reduce((m, lines) => Math.max(m, lines.length || 1), 1);
        const nextRowHeight = Math.max(minRowHeight, 2.2 + rowMaxLines * lineHeight);

        if (y + nextRowHeight > pageHeight - 8) {
          pdf.addPage();
          y = topY;
          y += drawRow(headers, y, true);
        }
        y += drawRow(row, y, false);
      });

      pdf.save("LeaveHistory.pdf");
      toast.success("PDF Downloaded");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="bg-white shadow-md rounded-md p-2 sm:p-3 md:p-4 flex-1 flex flex-col min-h-0" id="leave-history-print-root">
          <MobileHeaderToggle>
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-row justify-between items-center gap-2">
            <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
              Employee Leave history
            </h2>

            <div className="flex shrink-0">
              <button
                onClick={handleDownloadPDF}
                className="bg-dorika-blue text-white px-3 py-1 rounded font-semibold text-xs sm:text-sm mr-2"
              >
            Print
              </button>
              <BackButton />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            />

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            >
              <option value="ALL">All Final Status</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.deptName}>
                  {d.deptName}
                </option>
              ))}
            </select>
          </div>
          </MobileHeaderToggle>

          <div className="w-full flex-1 min-h-0 overflow-auto" id="leave-history-print">
            <table className="min-w-[900px] w-full border border-dorika-blue text-xs sm:text-sm border-collapse">
              <thead className="bg-dorika-blue text-white text-[10px] sm:text-xs md:text-sm sticky top-0 z-10">
                <tr>
                  <th className="border px-2 py-1">Emp ID</th>
                  <th className="border px-2 py-1">Emp Name</th>
                  <th className="border px-2 py-1">Department</th>
                  <th className="border px-2 py-1">Apply Date</th>
                  <th className="border px-2 py-1">From Date</th>
                  <th className="border px-2 py-1">To Date</th>
                  <th className="border px-2 py-1">Total Days</th>
                  <th className="border px-2 py-1">RM</th>
                  <th className="border px-2 py-1">Status</th>
                  <th className="border px-2 py-1">Date & Time</th>
                  <th className="border px-2 py-1 bg-dorika-orange">DH</th>
                  <th className="border px-2 py-1 bg-dorika-orange">Status</th>
                  <th className="border px-2 py-1 bg-dorika-orange">Date & Time</th>
                  <th className="border px-2 py-1 bg-dorika-orange">Final Status</th>
                </tr>
              </thead>

              <tbody className="text-center">
                {loading ? (
                  <tr>
                    <td colSpan="14" className="py-4">Loading...</td>
                  </tr>
                ) : filteredLeaves.length > 0 ? (
                  filteredLeaves.map((leave) => {
                    const rm = getByRole(leave.history, "Reporting Manager");
                    const dh = getByRole(leave.history, "Department Head");

                    return (
                      <tr key={leave._id} className="hover:bg-dorika-blueLight transition text-xs">
                        <td className="border px-2 py-1">{leave.employeeId}</td>
                        <td className="border px-2 py-1">{leave.employeeName}</td>
                        <td className="border px-2 py-1">{leave.departmentName || "-"}</td>
                        <td className="border px-2 py-1">{formatDate(leave.applicationDate)}</td>
                        <td className="border px-2 py-1">{formatDate(leave.fromDate)}</td>
                        <td className="border px-2 py-1">{formatDate(leave.toDate)}</td>
                        <td className="border px-2 py-1">{leave.noOfDays}</td>
                        <td className="border px-2 py-1">{leave.reportingManager}</td>
                        <td className="border px-2 py-1">{rm.status || "-"}</td>
                        <td className="border px-2 py-1">{formatDateTime(rm.date)}</td>
                        <td className="border px-2 py-1">{leave.departmentHead}</td>
                        <td className="border px-2 py-1">{dh.status || "-"}</td>
                        <td className="border px-2 py-1">{formatDateTime(dh.date)}</td>
                        <td className="border px-2 py-1 font-semibold">{getFinalStatus(leave)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="14" className="py-4 text-gray-500">
                      No leave history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveHistory;
