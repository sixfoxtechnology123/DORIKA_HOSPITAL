import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import Pagination from "./Pagination";
import toast from "react-hot-toast";

const formatName = (name) => {
  if (!name) return "-";
  return name.replace(/\bundefined\b/g, "").replace(/\s+/g, " ").trim() || "-";
};

const formatText = (text) => {
  if (text === null || text === undefined || text === "") return "-";
  return String(text)
    .replace(/\bundefined\b/g, "")
    .replace(/\bnull\b/g, "")
    .replace(/\s+/g, " ")
    .trim() || "-";
};

const getRoleLabel = (changedBy = {}) => {
  const name = String(changedBy?.name || "").trim().toLowerCase();
  const userId = String(changedBy?.loginUserId || changedBy?.employeeUserId || "").trim().toLowerCase();
  if (name.includes("sixfox") || userId === "sixfox") return "Main Admin";
  if (name.includes("dorika") || userId === "dorika") return "Dorika Admin";
  return formatText(changedBy?.role);
};

const isHiddenField = (key) => key === "_id" || key === "buffer";

const getVisibleEntries = (data) => {
  if (!data || typeof data !== "object") return [];
  return Object.entries(data).filter(
    ([key, value]) =>
      !isHiddenField(key) &&
      value !== "" &&
      value !== undefined &&
      value !== null
  );
};

const flattenValue = (value) => {
  if (value === "" || value === undefined || value === null) return "-";

  if (Array.isArray(value)) {
    return value.map((item) => flattenValue(item)).join("\n");
  }

  if (typeof value === "object") {
    if (value.shifts && typeof value.shifts === "object") {
      return Object.entries(value.shifts)
        .filter(([_, shift]) => shift !== "" && shift !== undefined && shift !== null)
        .map(([day, shift]) => `Day ${day}: ${formatText(shift)}`)
        .join("\n") || "No Change";
    }

    return getVisibleEntries(value)
      .filter(([_, nestedValue]) => nestedValue !== "" && nestedValue !== undefined && nestedValue !== null)
      .map(([key, nestedValue]) => `${key}: ${flattenValue(nestedValue)}`)
      .join("\n") || "No Change";
  }

  return formatText(value);
};

const stringifyData = (data) => {
  if (!data || getVisibleEntries(data).length === 0) return "No Change";
  return flattenValue(data);
};

const renderDataCells = (data, compareData, tone = "neutral") => {
  const entries = getVisibleEntries(data);
  if (entries.length === 0) {
    return <span className="text-gray-400 italic">No Change</span>;
  }

  if (data.shifts) {
    const entries = Object.entries(data.shifts).filter(([_, value]) => value !== "");
    if (entries.length === 0) return <span className="text-gray-400 italic">Empty</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {entries.map(([day, shift]) => (
          <span
            key={day}
            className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-bold"
          >
            Day {day}: {formatText(shift)}
          </span>
        ))}
      </div>
    );
  }

  const compareMap = Object.fromEntries(
    getVisibleEntries(compareData).map(([key, value]) => [key, flattenValue(value)])
  );

  return (
    <div className="text-[10px] text-slate-600 leading-tight space-y-1">
      {entries.map(([key, value]) => {
        const displayValue = flattenValue(value);
        const changed = compareMap[key] !== displayValue;
        const valueClass = changed
          ? tone === "old"
            ? "text-orange-700 font-semibold"
            : tone === "new"
              ? "text-green-700 font-semibold"
              : "text-sky-700 font-semibold"
          : "text-slate-600";

        return (
        <div key={key} className="whitespace-pre-wrap break-words overflow-hidden">
          <span className="font-bold uppercase text-slate-400">{key}:</span>{" "}
          <span className={`whitespace-pre-wrap break-all ${valueClass}`}>{displayValue}</span>
        </div>
      )})}
    </div>
  );
};

const ActivityHistory = () => {
  const PER_PAGE_STORAGE_KEY = "activityHistory.perPage";
  const getStoredPerPage = () => {
    const raw = localStorage.getItem(PER_PAGE_STORAGE_KEY);
    if (!raw) return 20;
    if (raw === "all") return "all";
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 20;
  };

  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(getStoredPerPage);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -500 : 500,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const params = { startDate: fromDate, endDate: toDate };
        if (perPage !== "all") {
          params.page = currentPage;
          params.limit = perPage;
        }
        const res = await axios.get("/api/dashboard/activities", { params });
        if (Array.isArray(res.data)) {
          setRows(res.data);
          setTotalRows(res.data.length);
        } else {
          setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
          setTotalRows(Number(res.data?.total) || 0);
        }
      } catch (err) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [fromDate, toDate, currentPage, perPage]);

  useEffect(() => {
    localStorage.setItem(PER_PAGE_STORAGE_KEY, String(perPage));
  }, [perPage]);

  const filteredRows = useMemo(() => {
    let data = [...rows];
    if (searchTerm) {
      const value = searchTerm.toLowerCase();
      data = data.filter((row) =>
        formatName(row.changedBy?.name).toLowerCase().includes(value) ||
        formatName(row.targetUser?.name).toLowerCase().includes(value) ||
        formatText(row.changedDetails?.module).toLowerCase().includes(value) ||
        formatText(row.changedDetails?.details).toLowerCase().includes(value) ||
        formatText(row.changedBy?.employeeID).toLowerCase().includes(value) ||
        formatText(row.targetUser?.employeeID).toLowerCase().includes(value)
      );
    }
    return data;
  }, [rows, searchTerm]);

  const paginatedRows = useMemo(() => filteredRows, [filteredRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate, perPage]);

  useEffect(() => {
    setSelectedRowIds((prev) =>
      prev.filter((id) => filteredRows.some((row) => row._id === id))
    );
  }, [filteredRows]);

  const exportRows = useMemo(() => {
    if (selectedRowIds.length === 0) return filteredRows;
    return filteredRows.filter((row) => selectedRowIds.includes(row._id));
  }, [filteredRows, selectedRowIds]);

  const isCurrentPageFullySelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((row) => selectedRowIds.includes(row._id));

  const toggleSelectAllCurrentPage = () => {
    const currentPageIds = paginatedRows.map((row) => row._id).filter(Boolean);

    if (isCurrentPageFullySelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }

    setSelectedRowIds((prev) => [...new Set([...prev, ...currentPageIds])]);
  };

  const toggleRowSelection = (rowId) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setSearchTerm("");
    setCurrentPage(1);
    setSelectedRowIds([]);
  };

  const handleExportExcel = () => {
    try {
      const rowsToExport = exportRows;
      const exportData = rowsToExport.map((row, index) => ({
        "Sl No": index + 1,
        Date: formatText(row.actionDate),
        Time: formatText(row.actionTime),
        Module: formatText(row.changedDetails?.module),
        Action: formatText(row.changedDetails?.action),
        "Changed By Name": formatName(row.changedBy?.name),
        "Changed By Employee ID": formatText(row.changedBy?.employeeID),
        "Changed By Role": formatText(row.changedBy?.role),
        "Target User Name": formatName(row.targetUser?.name),
        "Target User Employee ID": formatText(row.targetUser?.employeeID),
        Description: formatText(row.changedDetails?.details),
        "Old Data": stringifyData(row.changedSet?.previous),
        "New Data": stringifyData(row.changedSet?.current),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = [
        { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 15 },
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
        { wch: 40 }, { wch: 50 }, { wch: 50 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Activity History");
      XLSX.writeFile(workbook, "Activity_History.xlsx");
      toast.success(selectedRowIds.length ? "Selected logs exported to Excel" : "Excel exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel");
    }
  };

  const handleExportPdf = () => {
    try {
      const rowsToExport = exportRows;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const leftColWidth = 58;
      const rightColWidth = contentWidth - leftColWidth - 4;
      let y = 16;

      const ensureSpace = (requiredHeight = 10) => {
        if (y + requiredHeight <= pageHeight - 12) return;
        pdf.addPage();
        y = 16;
      };

      const drawFilledBox = (x, top, width, height, fillColor) => {
        pdf.setFillColor(...fillColor);
        pdf.setDrawColor(210, 218, 230);
        pdf.roundedRect(x, top, width, height, 2, 2, "FD");
      };

      const drawSectionTitle = (text, x, top, color) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(...color);
        pdf.text(text, x, top);
      };

      const buildComparableLines = (data, compareData) => {
        const visibleEntries = getVisibleEntries(data);
        if (visibleEntries.length === 0) {
          return [{ text: "No Change", changed: false }];
        }

        const compareMap = Object.fromEntries(
          getVisibleEntries(compareData).map(([key, value]) => [key, flattenValue(value)])
        );

        return visibleEntries.map(([key, value]) => {
          const text = `${key}: ${flattenValue(value)}`;
          return {
            text,
            changed: compareMap[key] !== flattenValue(value),
          };
        });
      };

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(25, 35, 58);
      pdf.text("Activity History", margin, y);
      y += 4;

      drawFilledBox(margin, y + 2, contentWidth, 18, [241, 245, 249]);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text("FROM DATE", margin + 3, y + 8);
      pdf.text("TO DATE", margin + 48, y + 8);
      pdf.text("TOTAL LOGS", margin + 93, y + 8);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text(fromDate || "All", margin + 3, y + 14);
      pdf.text(toDate || "All", margin + 48, y + 14);
      pdf.text(String(rowsToExport.length), margin + 93, y + 14);
      y += 28;

      rowsToExport.forEach((row, index) => {
        const infoPairs = [
          ["Sl No", String(index + 1)],
          ["Date", formatText(row.actionDate)],
          ["Time", formatText(row.actionTime)],
          ["Module", formatText(row.changedDetails?.module)],
          ["Action", formatText(row.changedDetails?.action)],
          ["Changed By", formatName(row.changedBy?.name)],
          ["Changed By ID", formatText(row.changedBy?.employeeID)],
          ["Role", formatText(row.changedBy?.role)],
          ["Target User", formatName(row.targetUser?.name)],
          ["Target User ID", formatText(row.targetUser?.employeeID)],
          ["Description", formatText(row.changedDetails?.details)],
        ];
        const oldLines = buildComparableLines(row.changedSet?.previous, row.changedSet?.current);
        const newLines = buildComparableLines(row.changedSet?.current, row.changedSet?.previous);

        const wrappedInfo = infoPairs.flatMap(([label, value]) =>
          pdf.splitTextToSize(`${label}: ${value}`, contentWidth - 8).map((text) => ({
            label,
            text,
          }))
        );
        const wrappedOld = oldLines.flatMap((line) =>
          pdf.splitTextToSize(line.text, leftColWidth - 6).map((text) => ({
            text,
            changed: line.changed,
          }))
        );
        const wrappedNew = newLines.flatMap((line) =>
          pdf.splitTextToSize(line.text, rightColWidth - 6).map((text) => ({
            text,
            changed: line.changed,
          }))
        );

        const infoHeight = Math.max(18, wrappedInfo.length * 4.5 + 8);
        const dataHeight = Math.max(
          28,
          Math.max(wrappedOld.length, wrappedNew.length) * 4.5 + 14
        );
        const blockHeight = infoHeight + dataHeight + 12;

        ensureSpace(blockHeight + 2);

        pdf.setDrawColor(180, 188, 200);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin, y - 4, contentWidth, blockHeight, 3, 3, "FD");

        pdf.setFillColor(15, 23, 42);
        pdf.roundedRect(margin, y - 4, contentWidth, 10, 3, 3, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Activity Log ${index + 1}`, margin + 3, y + 2.5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        let infoY = y + 10;
        wrappedInfo.forEach((line) => {
          if (line.label === "Date") {
            pdf.setTextColor(3, 105, 161);
          } else if (line.label === "Time") {
            pdf.setTextColor(124, 58, 237);
          } else {
            pdf.setTextColor(31, 41, 55);
          }
          pdf.text(line.text, margin + 3, infoY);
          infoY += 4.5;
        });

        const dataTop = y + infoHeight + 2;
        drawSectionTitle("OLD DATA", margin + 3, dataTop, [234, 88, 12]);
        drawSectionTitle("NEW DATA", margin + leftColWidth + 7, dataTop, [22, 163, 74]);

        drawFilledBox(margin + 2, dataTop + 2, leftColWidth, dataHeight - 6, [255, 247, 237]);
        drawFilledBox(margin + leftColWidth + 6, dataTop + 2, rightColWidth, dataHeight - 6, [240, 253, 244]);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(51, 65, 85);
        let oldY = dataTop + 8;
        wrappedOld.forEach((line) => {
          pdf.setTextColor(...(line.changed ? [180, 83, 9] : [51, 65, 85]));
          pdf.text(line.text, margin + 4, oldY);
          oldY += 4.5;
        });

        let newY = dataTop + 8;
        wrappedNew.forEach((line) => {
          pdf.setTextColor(...(line.changed ? [21, 128, 61] : [51, 65, 85]));
          pdf.text(line.text, margin + leftColWidth + 8, newY);
          newY += 4.5;
        });

        y += blockHeight + 6;
      });

      pdf.save("Activity_History.pdf");
      toast.success(selectedRowIds.length ? "Selected logs exported to PDF" : "PDF exported successfully");
    } catch (error) {
      toast.error("Failed to export PDF");
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden bg-slate-100 font-sans relative">
      <Sidebar />

      {/* Scroll Arrows */}
      <div className="hidden lg:block">
        <button onClick={() => scroll("left")} className="fixed left-72 top-1/2 z-50 -translate-y-1/2 bg-slate-800/90 hover:bg-slate-900 text-white p-3 rounded-full shadow-2xl transition-all active:scale-90">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button onClick={() => scroll("right")} className="fixed right-8 top-1/2 z-50 -translate-y-1/2 bg-slate-800/90 hover:bg-slate-900 text-white p-3 rounded-full shadow-2xl transition-all active:scale-90">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-3 md:p-4 min-w-0">
        <div className="flex-1 flex flex-col min-h-0">
          <MobileHeaderToggle defaultOpen={false}>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-3 overflow-hidden">
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-slate-200">
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl font-black text-slate-800 uppercase tracking-tighter truncate">Activity History</h1>
                  <p className="text-[10px] sm:text-xs font-bold text-sky-600 uppercase">
                    Total Logs: {searchTerm ? filteredRows.length : totalRows}{" "}
                    {selectedRowIds.length ? `| Selected: ${selectedRowIds.length}` : ""}
                  </p>
                </div>
                <div className="shrink-0 flex justify-end">
                  <BackButton />
                </div>
              </div>

              <div className="px-3 sm:px-4 md:px-6 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
                <input type="text" placeholder="Search..." className="border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none xl:col-span-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <input type="date" className="border border-slate-300 rounded-md p-2 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input type="date" className="border border-slate-300 rounded-md p-2 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))} className="border border-slate-300 rounded-md p-2 text-sm bg-white outline-none">
                  <option value={8}>Show 8</option>
                  <option value={20}>Show 20</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                  <option value="all">Show All</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={handleExportPdf} className="flex-1 bg-red-600 text-white font-bold py-2 rounded text-[10px] sm:text-xs hover:bg-red-700 uppercase">Export PDF</button>
                  <button onClick={handleExportExcel} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded text-[10px] sm:text-xs hover:bg-emerald-700 uppercase">Export Excel</button>
                </div>
              </div>
            </div>
          </MobileHeaderToggle>

          {/* TABLE SECTION */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto scroll-smooth bg-slate-100 rounded-xl border border-slate-200 shadow-lg">
            <div className="inline-block min-w-full align-middle bg-white">
              <table className="min-w-[1800px] w-full text-left border-collapse table-fixed">
                {/* STICKY HEADER FIXED HERE */}
                <thead className="sticky top-0 z-30">
                  <tr className="bg-slate-900 text-white text-[11px] uppercase">
                    <th className="p-2 w-[70px] border-r border-slate-800 sticky top-0 bg-slate-900">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isCurrentPageFullySelected}
                          onChange={toggleSelectAllCurrentPage}
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span>Sl No</span>
                      </div>
                    </th>
                    <th className="p-4 w-[160px] border-r border-slate-800 sticky top-0 bg-slate-900">Date & Time</th>
                    <th className="p-4 w-[160px] border-r border-slate-800 sticky top-0 bg-slate-900">Module & Action</th>
                    <th className="p-4 w-[250px] border-r border-slate-800 sticky top-0 bg-slate-900">Changed By</th>
                    <th className="p-4 w-[250px] border-r border-slate-800 sticky top-0 bg-slate-900">Target User</th>
                    <th className="p-4 w-[350px] border-r border-slate-800 sticky top-0 bg-slate-900">Description</th>
                    <th className="p-4 w-[350px] border-r border-slate-800 sticky top-0 bg-slate-900 text-orange-300">Old Data</th>
                    <th className="p-4 w-[350px] sticky top-0 bg-slate-900 text-green-300">New Data</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="8" className="p-20 text-center font-bold text-slate-300 animate-pulse uppercase">Syncing...</td></tr>
                  ) : paginatedRows.length ? (
                    paginatedRows.map((row, index) => (
                      <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 border-r border-slate-50 bg-slate-50/60 align-top">
                          <div className="flex flex-col items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedRowIds.includes(row._id)}
                              onChange={() => toggleRowSelection(row._id)}
                              className="h-4 w-4 accent-orange-500"
                            />
                            <span className="font-bold text-slate-700">
                              {perPage === "all" ? index + 1 : (currentPage - 1) * perPage + index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 border-r border-slate-50 bg-slate-50/40 font-mono">
                          <div className="font-bold text-sky-700">{formatText(row.actionDate)}</div>
                          <div className="text-[10px] font-semibold text-violet-600">{formatText(row.actionTime)}</div>
                        </td>
                        <td className="p-4 border-r border-slate-50">
                          <div className="font-black text-sky-800 text-[10px] truncate">{formatText(row.changedDetails?.module)}</div>
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-bold">{formatText(row.changedDetails?.action)}</span>
                        </td>
                        <td className="p-4 border-r border-slate-50">
                          <div className="font-bold text-slate-900 text-[13px]">{formatName(row.changedBy?.name)}</div>
                          <div className="text-[10px] text-slate-500">{formatText(row.changedBy?.employeeID)} | {getRoleLabel(row.changedBy)}</div>
                        </td>
                        <td className="p-4 border-r border-slate-50">
                          <div className="font-bold text-slate-700 text-[13px]">{formatName(row.targetUser?.name)}</div>
                          <div className="text-[10px] text-slate-500">{formatText(row.targetUser?.employeeID)}</div>
                        </td>
                        <td className="p-4 border-r border-slate-50">
                          <p className="text-slate-500 italic leading-relaxed break-words">{formatText(row.changedDetails?.details)}</p>
                        </td>
                        <td className="p-4 border-r border-slate-50 bg-orange-50/20 align-top overflow-hidden">
                          {renderDataCells(row.changedSet?.previous, row.changedSet?.current, "old")}
                        </td>
                        <td className="p-4 bg-green-50/20 align-top overflow-hidden">
                          {renderDataCells(row.changedSet?.current, row.changedSet?.previous, "new")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="p-20 text-center font-bold text-slate-300 uppercase">No activity found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {perPage !== "all" && !loading && filteredRows.length > 0 && (
            <div className="pt-3">
              <Pagination
                total={searchTerm ? filteredRows.length : totalRows}
                perPage={perPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory;
