import React from "react";

const Pagination = ({ total, perPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(total / perPage);

  // If perPage is 'all', totalPages will be NaN or 1, so hide component
  if (totalPages <= 1 || isNaN(totalPages)) return null;

  const handleClick = (page) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  return (
    <div className="flex justify-end items-center gap-4 mt-2">
      {/* Current Page Info */}
      <span className="text-xs font-semibold text-gray-600">
        Page {currentPage} of {totalPages}
      </span>

      <div className="flex gap-1">
        <button
          onClick={() => handleClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded bg-white text-dorika-blue disabled:opacity-50 font-bold hover:bg-gray-100"
        >
          Prev
        </button>

        <button
          onClick={() => handleClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded bg-white text-dorika-blue disabled:opacity-50 font-bold hover:bg-gray-100"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;