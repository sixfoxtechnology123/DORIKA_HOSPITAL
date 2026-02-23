import React from "react";

const Input = ({ label, value, onChange, type = "text", readOnly = false }) => {
  return (
    <div className="flex flex-col mb-2">
      <label className="font-semibold text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)} // ✅ THIS IS CRITICAL
        className="border border-gray-300 p-2 rounded w-full text-sm"
      />
    </div>
  );
};

export default Input;
