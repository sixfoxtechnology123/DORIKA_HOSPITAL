import React, { useEffect, useState } from "react";

const formatIsoToDisplayDate = (value) => {
  if (!value || typeof value !== "string") return "";

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const storedMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (storedMatch) {
    return `${storedMatch[1]}/${storedMatch[2]}/${storedMatch[3]}`;
  }

  return value;
};

const parseDisplayDateToIso = (value) => {
  if (!value || typeof value !== "string") return "";

  const trimmedValue = value.trim();
  const displayMatch = trimmedValue.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (displayMatch) {
    return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
  }

  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return trimmedValue;
  }

  return null;
};

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  className = "border border-gray-300 p-2 rounded w-full text-sm",
  placeholder,
  dateDisplayFormat,
}) => {
  const shouldUseFormattedDateInput = type === "date" && dateDisplayFormat === "DD/MM/YYYY";
  const [displayValue, setDisplayValue] = useState(formatIsoToDisplayDate(value));

  useEffect(() => {
    if (shouldUseFormattedDateInput) {
      setDisplayValue(formatIsoToDisplayDate(value));
    }
  }, [shouldUseFormattedDateInput, value]);

  if (shouldUseFormattedDateInput) {
    return (
      <div className="flex flex-col mb-2">
        <label className="font-semibold text-sm mb-1">{label}</label>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          readOnly={readOnly}
          placeholder={placeholder || "DD/MM/YYYY"}
          onChange={(e) => {
            const nextDisplayValue = e.target.value;
            setDisplayValue(nextDisplayValue);

            if (!nextDisplayValue.trim()) {
              onChange("");
              return;
            }

            const parsedValue = parseDisplayDateToIso(nextDisplayValue);
            if (parsedValue) {
              onChange(parsedValue);
            }
          }}
          onBlur={() => {
            if (!displayValue.trim()) {
              setDisplayValue("");
              return;
            }

            const parsedValue = parseDisplayDateToIso(displayValue);
            if (parsedValue) {
              setDisplayValue(formatIsoToDisplayDate(parsedValue));
            } else {
              setDisplayValue(formatIsoToDisplayDate(value));
            }
          }}
          className={className}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-2">
      <label className="font-semibold text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    </div>
  );
};

export default Input;
