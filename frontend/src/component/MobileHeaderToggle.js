import React, { useState } from "react";

const MobileHeaderToggle = ({ children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      <div className="hidden md:block">{children}</div>

      <div className="md:hidden">
        {isOpen ? children : null}
        <div className="flex justify-center -mt-1 mb-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full border border-dorika-blue bg-white text-dorika-blue text-lg font-bold leading-none shadow"
            aria-label={isOpen ? "Collapse header section" : "Expand header section"}
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "^" : "v"}
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileHeaderToggle;
