// src/components/EmployeeCalendar.js
import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import EmployeeCornerSidebar from "./EmployeeCornerSidebar";

const EmployeeCalendar = ({ holidays = {} }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const daysOfWeek = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = startDay; i > 0; i--) days.push({ day: prevMonthLastDate - i + 1, currentMonth: false });
    for (let i = 1; i <= lastDate; i++) days.push({ day: i, currentMonth: true });
    const totalCells = 42;
    const nextDays = totalCells - days.length;
    for (let i = 1; i <= nextDays; i++) days.push({ day: i, currentMonth: false });

    return days;
  };

  const days = generateCalendar();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <EmployeeCornerSidebar />

      <div className="flex-1 border rounded-lg shadow-sm p-4 bg-white m-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-2 bg-yellow-200 p-2 rounded">
          <button onClick={prevMonth} className="p-1 hover:bg-yellow-300 rounded"><FaChevronLeft /></button>
          <h2 className="font-semibold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <button onClick={nextMonth} className="p-1 hover:bg-yellow-300 rounded"><FaChevronRight /></button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-center font-semibold text-sm bg-blue-700 text-white rounded-t">
          {daysOfWeek.map(d => <div key={d} className="py-1">{d}</div>)}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-7 text-center gap-1 mt-1">
          {days.map((d, index) => {
            const isRestrictedHoliday = holidays.restricted?.includes(d.day);
            const isClosedHoliday = holidays.closed?.includes(d.day);
            const isNationalHoliday = holidays.national?.includes(d.day);
            const isToday = d.currentMonth && d.day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

            let bgClass = "";
            if (!d.currentMonth) bgClass = "text-gray-400";
            if (isRestrictedHoliday) bgClass = "bg-green-200 rounded";
            if (isClosedHoliday) bgClass = "bg-pink-200 rounded";
            if (isNationalHoliday) bgClass = "bg-yellow-300 rounded";
             if (isToday) bgClass = "bg-blue-400 text-white font-bold rounded-full flex items-center justify-center mx-auto w-8 h-8";

            return <div key={index} className={`py-2 ${bgClass}`}>{d.day}</div>;
          })}
        </div>

        {/* Legend */}
        <div className="mt-2 text-sm flex flex-wrap gap-2">
          <span className="inline-block bg-green-200 px-2 py-1 rounded-full">Restricted Holiday</span>
          <span className="inline-block bg-pink-200 px-2 py-1 rounded-full">Closed Holiday</span>
          <span className="inline-block bg-yellow-300 px-2 py-1 rounded-full">National Holiday</span>
          <span className="inline-block bg-blue-400 text-white px-2 py-1 rounded-full">Today</span>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCalendar;
