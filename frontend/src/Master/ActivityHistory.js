import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import toast from "react-hot-toast";

const isPlainObject = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

const sortEntryPairs = (entries) =>
  [...entries].sort(([a], [b]) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a).localeCompare(String(b));
  });

const toCompactText = (value) => {
  if (value == null || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    return value.map((item) => toCompactText(item)).join(", ");
  }
  if (isPlainObject(value)) {
    const entries = sortEntryPairs(Object.entries(value));
    return entries.map(([key, nestedValue]) => `${key}: ${toCompactText(nestedValue)}`).join(" | ");
  }
  return String(value);
};

const renderHorizontalValue = (value) => {
  if (value == null || value === "") return <span className="text-gray-500">-</span>;

  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-gray-500">-</span>;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse text-[11px]">
          <thead>
            <tr>
              {value.map((_, index) => (
                <th
                  key={index}
                  className="border border-slate-300 bg-slate-200 px-2 py-1 font-semibold text-slate-700"
                >
                  Index {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {value.map((item, index) => (
                <td key={index} className="border border-slate-300 bg-white px-2 py-1 text-slate-700">
                  {toCompactText(item)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (isPlainObject(value)) {
    const entries = sortEntryPairs(
      Object.entries(value).filter(([, nestedValue]) => nestedValue != null && nestedValue !== "")
    );
    if (!entries.length) return <span className="text-gray-500">-</span>;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse text-[11px]">
          <thead>
            <tr>
              {entries.map(([key]) => (
                <th
                  key={key}
                  className="border border-slate-300 bg-slate-200 px-2 py-1 font-semibold uppercase tracking-wide text-slate-700"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {entries.map(([key, nestedValue]) => (
                <td key={key} className="border border-slate-300 bg-white px-2 py-1 text-slate-700">
                  {toCompactText(nestedValue)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

const formatDateCell = (row) => {
  if (row.actionDate) return row.actionDate;
  if (!row.createdAt) return "-";
  const d = new Date(row.createdAt);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatTimeCell = (row) => {
  if (row.actionTime) return row.actionTime;
  if (!row.createdAt) return "-";
  const d = new Date(row.createdAt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const ActivityHistory = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const params = {};
        if (fromDate && toDate) {
          params.startDate = fromDate;
          params.endDate = toDate;
        }
        const res = await axios.get("/api/dashboard/activities", { params });
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error("Failed to fetch activity history");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [fromDate, toDate]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [rows]
  );

  const tableColSpan = 21;

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="bg-white shadow-md rounded-md p-2 sm:p-3 md:p-4 flex-1 flex flex-col min-h-0">
          <MobileHeaderToggle>
            <div className="rounded-lg border border-sky-300 bg-gradient-to-r from-sky-100 via-cyan-50 to-white p-3 mb-3 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-base sm:text-xl font-bold text-sky-900 whitespace-nowrap">
                Activity History
              </h2>
              <BackButton />
            </div>

            <div className="rounded-lg border border-sky-300 bg-white p-3 shadow mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex flex-col">
                  <label className="font-semibold text-sky-800 text-xs uppercase mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-sky-300 rounded px-3 py-2 bg-sky-50 text-sm focus:outline-none"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold text-sky-800 text-xs uppercase mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-sky-300 rounded px-3 py-2 bg-sky-50 text-sm focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="rounded border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
                    Total Records: <span className="font-semibold">{sortedRows.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </MobileHeaderToggle>

          <div className="md:hidden flex-1 min-h-0 overflow-auto space-y-3">
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm">
                Loading...
              </div>
            ) : sortedRows.length > 0 ? (
              sortedRows.map((row, index) => (
                <div key={row._id || index} className="rounded-xl border border-sky-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Record {index + 1}
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {(row.action || row.changedDetails?.action || "-")} / {(row.module || row.changedDetails?.module || "-")}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <div>{formatDateCell(row)}</div>
                      <div>{formatTimeCell(row)}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-900">Changed By</div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                        <div><span className="font-semibold">Login ID:</span> {row.changedBy?.loginUserId || row.employeeUserId || "-"}</div>
                        <div><span className="font-semibold">User ID:</span> {row.changedBy?.employeeUserId || "-"}</div>
                        <div><span className="font-semibold">Emp ID:</span> {row.changedBy?.employeeID || "-"}</div>
                        <div><span className="font-semibold">Role:</span> {row.changedBy?.role || "-"}</div>
                        <div className="col-span-2"><span className="font-semibold">Name:</span> {row.changedBy?.name || row.name || "-"}</div>
                        <div><span className="font-semibold">Department:</span> {row.changedBy?.department || "-"}</div>
                        <div><span className="font-semibold">Designation:</span> {row.changedBy?.designation || "-"}</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-900">Target User</div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                        <div><span className="font-semibold">User ID:</span> {row.targetUser?.employeeUserId || "-"}</div>
                        <div><span className="font-semibold">Emp ID:</span> {row.targetUser?.employeeID || "-"}</div>
                        <div className="col-span-2"><span className="font-semibold">Name:</span> {row.targetUser?.name || "-"}</div>
                        <div><span className="font-semibold">Department:</span> {row.targetUser?.department || "-"}</div>
                        <div><span className="font-semibold">Designation:</span> {row.targetUser?.designation || "-"}</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-900">Details</div>
                      <div className="text-xs text-slate-700">{row.details || row.changedDetails?.details || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-900">Previous</div>
                      {renderHorizontalValue(row.changedSet?.previous)}
                    </div>

                    <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-900">Current</div>
                      {renderHorizontalValue(row.changedSet?.current)}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Meta Data</div>
                      {renderHorizontalValue(row.metaData)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-gray-500">
                No activity history found
              </div>
            )}
          </div>

          <div className="hidden md:block w-full flex-1 min-h-0 overflow-auto">
            <table className="min-w-[2400px] w-full border border-sky-300 text-xs sm:text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th rowSpan="2" className="border border-sky-300 bg-slate-900 px-2 py-2 text-white">SL No</th>
                  <th rowSpan="2" className="border border-sky-300 bg-slate-900 px-2 py-2 text-white">Date</th>
                  <th rowSpan="2" className="border border-sky-300 bg-slate-900 px-2 py-2 text-white">Time</th>
                  <th rowSpan="2" className="border border-sky-300 bg-slate-900 px-2 py-2 text-white">Action</th>
                  <th rowSpan="2" className="border border-sky-300 bg-slate-900 px-2 py-2 text-white">Module</th>
                  <th rowSpan="2" className="border border-sky-300 bg-slate-900 px-2 py-2 text-white">Details</th>
                  <th colSpan="7" className="border border-sky-300 bg-sky-800 px-2 py-2 text-white">Changed By</th>
                  <th colSpan="5" className="border border-sky-300 bg-emerald-800 px-2 py-2 text-white">Target User</th>
                  <th colSpan="2" className="border border-sky-300 bg-violet-800 px-2 py-2 text-white">Changed Set</th>
                  <th rowSpan="2" className="border border-sky-300 bg-amber-700 px-2 py-2 text-white">Meta Data</th>
                </tr>
                <tr>
                  <th className="border border-sky-300 bg-sky-100 px-2 py-2 text-sky-950">Login ID</th>
                  <th className="border border-sky-300 bg-sky-100 px-2 py-2 text-sky-950">User ID</th>
                  <th className="border border-sky-300 bg-sky-100 px-2 py-2 text-sky-950">Emp ID</th>
                  <th className="border border-sky-300 bg-sky-100 px-2 py-2 text-sky-950">Name</th>
                  <th className="border border-sky-300 bg-sky-100 px-2 py-2 text-sky-950">Role</th>
                  <th className="border border-sky-300 bg-sky-100 px-2 py-2 text-sky-950">Department</th>
                  <th className="border border-sky-300 bg-sky-100 px-2 py-2 text-sky-950">Designation</th>
                  <th className="border border-sky-300 bg-emerald-100 px-2 py-2 text-emerald-950">User ID</th>
                  <th className="border border-sky-300 bg-emerald-100 px-2 py-2 text-emerald-950">Emp ID</th>
                  <th className="border border-sky-300 bg-emerald-100 px-2 py-2 text-emerald-950">Name</th>
                  <th className="border border-sky-300 bg-emerald-100 px-2 py-2 text-emerald-950">Department</th>
                  <th className="border border-sky-300 bg-emerald-100 px-2 py-2 text-emerald-950">Designation</th>
                  <th className="border border-sky-300 bg-violet-100 px-2 py-2 text-violet-950">Previous</th>
                  <th className="border border-sky-300 bg-violet-100 px-2 py-2 text-violet-950">Current</th>
                </tr>
              </thead>
              <tbody className="text-center align-top">
                {loading ? (
                  <tr>
                    <td colSpan={tableColSpan} className="border border-sky-200 px-2 py-4 bg-white">Loading...</td>
                  </tr>
                ) : sortedRows.length > 0 ? (
                  sortedRows.map((row, index) => (
                    <tr key={row._id || index} className="transition odd:bg-white even:bg-slate-50 hover:bg-sky-50">
                      <td className="border border-sky-200 px-2 py-2">{index + 1}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{formatDateCell(row)}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{formatTimeCell(row)}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap font-semibold">{row.action || row.changedDetails?.action || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.module || row.changedDetails?.module || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 min-w-[260px] text-left">{row.details || row.changedDetails?.details || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.changedBy?.loginUserId || row.employeeUserId || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.changedBy?.employeeUserId || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.changedBy?.employeeID || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.changedBy?.name || row.name || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.changedBy?.role || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.changedBy?.department || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.changedBy?.designation || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.targetUser?.employeeUserId || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.targetUser?.employeeID || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.targetUser?.name || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.targetUser?.department || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 whitespace-nowrap">{row.targetUser?.designation || "-"}</td>
                      <td className="border border-sky-200 px-2 py-2 text-left min-w-[280px]">
                        {renderHorizontalValue(row.changedSet?.previous)}
                      </td>
                      <td className="border border-sky-200 px-2 py-2 text-left min-w-[280px]">
                        {renderHorizontalValue(row.changedSet?.current)}
                      </td>
                      <td className="border border-sky-200 px-2 py-2 text-left min-w-[240px]">
                        {renderHorizontalValue(row.metaData)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={tableColSpan} className="border border-sky-200 px-2 py-4 text-gray-500 bg-white">
                      No activity history found
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

export default ActivityHistory;
