import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const BackButton = ({ label = "Back" }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full flex justify-center sm:justify-start">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 bg-blue-700 font-semibold text-white
                  px-3 py-1 sm:px-4 sm:py-1
                  text-sm sm:text-base
                  rounded-lg shadow hover:bg-blue-800 transition"
      >
        <FaArrowLeft className="text-sm sm:text-base" />
        <span className="leading-none">{label ?? 'Back'}</span>
      </button>
    </div>

  );
};

export default BackButton;
