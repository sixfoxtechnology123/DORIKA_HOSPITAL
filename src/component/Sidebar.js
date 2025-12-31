import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookA,
  Building2,
  Bell,
  Briefcase,
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  MapPin,
  Wallet,
  Menu,
  X,
  ArrowBigRightDash,
  ArrowBigLeftDash,
  LogOut,
} from "lucide-react";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState("");
  // **MODIFIED:** Use an array to track multiple open menus (for nested visibility)
  const [openMenus, setOpenMenus] = useState([]); 
  const navigate = useNavigate();
  const location = useLocation();

  const menus = [
    { name: "Dashboard", path: "/Dashboard", icon: LayoutDashboard, permission: "Dashboard_View" },
    {
      name: "Reminder",
      path: "/ReminderPage",
      icon: Bell,          // or any icon you prefer
      permission: "Reminder_View",
    },
    { name: "New Employee Reg", path: "/EmployeeList", icon: Users, permission: "Employee_View" },
    {
      name:"Pay Slip",
      icon:BookA,
      permission:"",
      submenus:[
        { name: "Salary Fee Heads",path: "/SalarySlipHeadList"},
        { name: "Pay Slip Generate",path: "/PaySlipGenerateEmployeeList"},
        { name: "History",path: "/PaySlipHistory"},
      ]

    },
    {
      name: "Master",
      icon: Building2,
      permission: "Master_View",
      submenus: [
        { name: "Departments", path: "/DepartmentList" },
        { name: "Designations", path: "/DesignationList" },
        {
          name: "Leave Management",
          submenus: [
            { name: "Dashboard", path: "/LeaveDashboard" },
            { name: "Manage Leave Type", path: "/LeaveTypeList" },
            { name: "Leave Rule", path: "/LeaveRuleList" },
            { name: "Leave Allocation", path: "/LeaveAllocationList" },
          ],
        },
        { name: "Holidays", path: "/HolidayList" },
        { name: "Shifts", path: "/ShiftList" },
        { name: "Policies", path: "/PolicyList" },
        { name: "Locations", path: "/LocationList" },
        { name: "Payroll", path: "/PayrollComponentList" },
      ],
    },
    {
      name: "Admin Panel",
      icon: Users,
      permission: "Admin_Management",
      submenus: [
        { name: "Admin Management", path: "/AdminManagement" },
        { name: "Employee Management", path: "/EmployeeUserIdCreated" },
      ],
    },
  ];

  // Helper function to find all parent menu names for a given path
  const findParentMenus = (path, menusList, currentParents = []) => {
    for (const menu of menusList) {
      const newParents = [...currentParents, menu.name];
      if (menu.path === path) {
        // Return all parent names for a direct match
        return newParents;
      }
      if (menu.submenus) {
        // Recurse into submenus
        const result = findParentMenus(path, menu.submenus, newParents);
        if (result.length > 0) {
          // If a match is found in nested submenus, return the path
          return result;
        }
      }
    }
    return [];
  };

  // useEffect to open parent menus based on the current URL
  useEffect(() => {
    const admin = JSON.parse(localStorage.getItem("adminData")) || {};
    setPermissions(admin.permissions || []);
    setRole(admin.role || "");

    const activeParents = findParentMenus(location.pathname, menus);
    // Set all parent menus to be open
    setOpenMenus(activeParents); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("adminData");
    localStorage.removeItem("token");
    navigate("/");
  };

  // **MODIFIED:** Toggles the menu's name in the openMenus array
  const handleMenuClick = (menu) => {
    if (menu.submenus) {
      setOpenMenus(prevOpenMenus => {
        if (prevOpenMenus.includes(menu.name)) {
          // Close: Remove the menu name from the array
          return prevOpenMenus.filter(name => name !== menu.name);
        } else {
          // Open: Add the menu name to the array
          return [...prevOpenMenus, menu.name];
        }
      });
    } else {
      navigate(menu.path);
      setMobileOpen(false);
    }
  };

  const isMenuActive = (menu) => {
    if (menu.path && location.pathname === menu.path) return true;
    if (menu.submenus) {
      return menu.submenus.some(sub =>
        sub.submenus
          ? sub.submenus.some(ss => ss.path && location.pathname.startsWith(ss.path))
          : sub.path && location.pathname.startsWith(sub.path)
      );
    }
    return false;
  };

  // **MODIFIED:** Check if a menu is open by checking if its name is in openMenus
  const isMenuOpen = (menuName) => openMenus.includes(menuName);

  const renderSubmenus = (submenus) => (
    <ul className="pl-8 space-y-1 mt-1">
      {submenus.map((sub, j) => (
        <li key={j}>
          {sub.submenus ? (
            <>
              <button
                // **MODIFIED:** Toggles the submenu name in the openMenus array
                onClick={() => setOpenMenus(prevOpenMenus => {
                  if (prevOpenMenus.includes(sub.name)) {
                    return prevOpenMenus.filter(name => name !== sub.name);
                  } else {
                    return [...prevOpenMenus, sub.name];
                  }
                })}
                className="flex items-center gap-3 p-1 w-full text-left rounded hover:bg-gray-700"
              >
                {sub.name}
              </button>
              {/* **MODIFIED:** Check if the submenu is open using isMenuOpen */}
              {isMenuOpen(sub.name) && renderSubmenus(sub.submenus)}
            </>
          ) : (
            <NavLink
              to={sub.path}
              className={({ isActive }) =>
                `block p-1 rounded text-sm ${isActive ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`
              }
              onClick={() => setMobileOpen(false)}
            >
              {sub.name}
            </NavLink>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-gray-800 text-white p-3">
        <h2 className="text-lg font-bold">DORIKA</h2>
        <button onClick={() => setMobileOpen(true)}> <Menu size={28} /> </button>
      </div>

      <div
        className={`fixed inset-y-0 left-0 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out z-50
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} 
        md:static md:translate-x-0 md:flex md:flex-col
        ${isOpen ? "md:w-56" : "md:w-16"} 
        md:min-h-screen`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-1 p-1">
            <button className="hidden md:block text-white" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <ArrowBigLeftDash size={22} /> : <ArrowBigRightDash size={22} />}
            </button>
            <button className="md:hidden text-white ml-auto" onClick={() => setMobileOpen(false)}>
              <X size={28} />
            </button>
          </div>

          {isOpen && <h2 className="hidden md:block text-2xl font-bold mb-1 px-4">DORIKA</h2>}

          <ul className="space-y-2 px-2 flex-1 overflow-y-auto">
            {menus
              .filter(menu => role === "Admin" || permissions.includes(menu.permission))
              .map((menu, i) => {
                const Icon = menu.icon;
                const active = isMenuActive(menu);
                // **MODIFIED:** Check if the menu is open using isMenuOpen
                const open = isMenuOpen(menu.name);

                return (
                  <li key={i}>
                    <button
                      onClick={() => handleMenuClick(menu)}
                      className={`flex items-center gap-3 p-1 w-full text-left rounded transition-colors ${
                        active ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                      }`}
                    >
                      <Icon size={20} />
                      {isOpen && <span>{menu.name}</span>}
                    </button>

                    {/* **MODIFIED:** Check if the menu is open using the updated state */}
                    {open && menu.submenus && renderSubmenus(menu.submenus)}
                  </li>
                );
              })}
          </ul>

          <div className="px-2 mb-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full bg-red-600 text-white p-1 rounded transition"
            >
              <LogOut size={20} />
              {isOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black opacity-50 z-40 md:hidden" onClick={() => setMobileOpen(false)}></div>
      )}
    </>
  );
};

export default Sidebar;