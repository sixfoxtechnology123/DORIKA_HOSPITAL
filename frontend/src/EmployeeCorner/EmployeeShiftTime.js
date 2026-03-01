import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";

const formatMonthForApi = (yearMonth) => {
  const [year, month] = yearMonth.split("-");
  const mon = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", {
    month: "short",
  });
  return `${mon}-${year}`;
};

const EmployeeShiftTime = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [shiftMasterMap, setShiftMasterMap] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loggedUser = useMemo(() => JSON.parse(localStorage.getItem("employeeUser") || "{}"), []);
  const normalizeCode = (value) => String(value || "").trim().toUpperCase();

  const parseDDCodes = (value) => {
    const code = normalizeCode(value);
    if (!code.startsWith("DD:")) return ["", ""];
    const payload = code.slice(3);
    if (payload.includes("+")) {
      const [first = "", second = ""] = payload.split("+");
      return [first, second || first];
    }
    if (payload.length === 2) return [payload[0], payload[1]];
    return [payload, payload];
  };

  useEffect(() => {
    const fetchShiftMaster = async () => {
      try {
        const res = await axios.get("/api/shifts");
        const map = {};
        (Array.isArray(res.data) ? res.data : []).forEach((s) => {
          map[normalizeCode(s.shiftCode)] = {
            name: s.shiftName || "-",
            time: s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : "-",
          };
        });
        setShiftMasterMap(map);
      } catch (error) {
        toast.error("Failed to fetch shift master");
      }
    };

    fetchShiftMaster();
  }, []);

  useEffect(() => {
    const fetchShiftData = async () => {
      try {
        setLoading(true);
        const monthParam = formatMonthForApi(selectedMonth);
        const res = await axios.get(`/api/shift-management/${monthParam}`);
        const list = Array.isArray(res.data) ? res.data : [];

        const record =
          list.find((item) => item.employeeUserId === loggedUser?.employeeUserId) || list[0] || null;
        const monthShifts = record?.shifts || {};

        const [year, month] = selectedMonth.split("-");
        const preparedRows = Object.entries(monthShifts)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([day, shiftCodeRaw]) => {
            const dayNum = String(day).padStart(2, "0");
            const shiftCode = normalizeCode(shiftCodeRaw);

            if (!shiftCode) {
              return {
                date: `${dayNum}-${month}-${year}`,
                shiftCode: "-",
                shiftName: "-",
                shiftTime: "-",
              };
            }

            if (shiftCode.startsWith("DD:")) {
              const [firstCode, secondCode] = parseDDCodes(shiftCode);
              const first = shiftMasterMap[firstCode];
              const second = shiftMasterMap[secondCode];
              return {
                date: `${dayNum}-${month}-${year}`,
                shiftCode,
                shiftName: `${first?.name || firstCode} + ${second?.name || secondCode}`,
                shiftTime: `${first?.time || "-"} + ${second?.time || "-"}`,
              };
            }

            // Legacy fallback: old DD values may be stored as "MN" without prefix.
            if (shiftCode.length === 2 && shiftCode !== "OFF" && !shiftMasterMap[shiftCode]) {
              const first = shiftMasterMap[shiftCode[0]];
              const second = shiftMasterMap[shiftCode[1]];
              return {
                date: `${dayNum}-${month}-${year}`,
                shiftCode: `DD:${shiftCode[0]}+${shiftCode[1]}`,
                shiftName: `${first?.name || shiftCode[0]} + ${second?.name || shiftCode[1]}`,
                shiftTime: `${first?.time || "-"} + ${second?.time || "-"}`,
              };
            }

            const info = shiftMasterMap[shiftCode];
            return {
              date: `${dayNum}-${month}-${year}`,
              shiftCode,
              shiftName: info?.name || (shiftCode === "OFF" ? "OFF" : "-"),
              shiftTime: info?.time || "-",
            };
          });

        setRows(preparedRows);
      } catch (error) {
        toast.error("Failed to fetch employee shifts");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (Object.keys(shiftMasterMap).length > 0) {
      fetchShiftData();
    }
  }, [selectedMonth, shiftMasterMap, loggedUser?.employeeUserId]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      <EmployeeCornerSidebar />

      <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
        <div className="bg-white shadow-md rounded-md p-2 sm:p-3 md:p-4">
          <div className="bg-dorika-blueLight border border-blue-300 rounded-lg shadow-md p-2 mb-3 sm:mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h2 className="text-sm sm:text-xl font-bold text-dorika-blue whitespace-nowrap">
              Employee Shift Time
            </h2>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-semibold text-dorika-blue whitespace-nowrap">
                Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-dorika-blue rounded px-2 py-1 text-xs sm:text-sm w-full sm:w-auto"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="min-w-[700px] w-full border border-dorika-blue text-xs sm:text-sm border-collapse">
              <thead className="bg-dorika-blue text-white">
                <tr>
                  <th className="border border-dorika-blue px-2 py-1">Date</th>
                  <th className="border border-dorika-blue px-2 py-1">Shift Code</th>
                  <th className="border border-dorika-blue px-2 py-1">Shift Name</th>
                  <th className="border border-dorika-blue px-2 py-1">Shift Time</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="border border-dorika-blue px-2 py-3">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((row, index) => (
                    <tr key={`${row.date}-${index}`} className="hover:bg-dorika-blueLight transition">
                      <td className="border border-dorika-blue px-2 py-1">{row.date}</td>
                      <td className="border border-dorika-blue px-2 py-1 font-semibold">{row.shiftCode}</td>
                      <td className="border border-dorika-blue px-2 py-1">{row.shiftName}</td>
                      <td className="border border-dorika-blue px-2 py-1">{row.shiftTime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="border border-dorika-blue px-2 py-3 text-gray-500">
                      No shift data found for selected month
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

export default EmployeeShiftTime;
