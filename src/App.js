import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./component/HomePage";
import BackButton from "./component/BackButton";
import MasterPage from "./Master/MasterPage";
import DepartmentList from "./Master/DepartmentList";
import DepartmentMaster from "./Master/DepartmentMaster";
import DesignationMaster from "./Master/DesignationMaster";
import DesignationList from "./Master/DesignationList";
import LeaveTypeMaster from "./Master/leavetypemaster";
import LeaveTypeList from "./Master/leavetypelist";
import HolidayMaster from "./Master/HolidayMaster";
import HolidayList from "./Master/HolidayList";
import ShiftMaster from "./Master/Shiftmaster";
import ShiftList from "./Master/Shiftlist";
import PolicyMaster from "./Master/Policymaster";
import PolicyList from "./Master/PolicyList";
import LocationMaster from "./Master/LocationMaster";
import LocationList from "./Master/Locationlist";
import PayrollComponentMaster from "./Master/PayrollComponentMaster";
import PayrollComponentList from "./Master/PayrollComponentList";
import EmployeeMaster from "./Master/EmployeeMaster";
import EmployeeList from "./Master/EmployeeList";
import LeaveDashboard from "./Master/LeaveDashboard";
import Dashboard from "./component/Dashboard";
import AdminLogin from "./component/AdminLogin";
import EditProfile from "./component/EditProfile";
import ChangePassword from "./component/ChangePassword";
import AdminManagement from "./component/AdminManagement";
import { Toaster } from "react-hot-toast";
import LeaveRuleMaster from "./Master/LeaveRuleMaster";
import LeaveRuleList from "./Master/LeaveRuleList";
import LeaveAllocationForm from "./Master/LeaveAllocationForm";
import LeaveAllocationList from "./Master/LeaveAllocationList";
import EmployeeDashboard from "./EmployeeCorner/EmployeeDashboard";
import UserProfile from "./EmployeeCorner/UserProfile";
import EmployeeHome from "./EmployeeCorner/EmployeeHome";
import EmployeeCornerSidebar from "./EmployeeCorner/EmployeeCornerSidebar";
import EmployeeUserIdCreated from "./EmployeeCorner/EmployeeUserIdCreated";
import EmployeeCalendar from "./EmployeeCorner/EmployeeCalendar";
import EmployeeLeaveApplication from "./EmployeeCorner/EmployeeLeaveApplication";
import SalaryHeadForm from "./Master/SalaryHeadForm";
import SalarySlipHeadList from "./Master/SalarySlipHeadList";
import PaySlipGenerateEmployeeList from "./Master/PaySlipGenerateEmployeeList";
import GeneratePaySlip from "./Master/GeneratePaySlip";
import PaySlipHistory from "./Master/PaySlipHistory";

export default function App(){
  return (
    <>
    <Routes>
      <Route path="/Homepage" element={<HomePage/>} />
      <Route path="/BackButton" element={<BackButton/>} />
      <Route path="/MasterPage" element={<MasterPage/>} />
      <Route path="/DepartmentList" element={<DepartmentList/>} />
      <Route path="/DepartmentMaster" element={<DepartmentMaster/>} />
      <Route path="/DesignationMaster" element={<DesignationMaster/>} />
      <Route path="/DesignationList" element={<DesignationList/>} />
      <Route path="/LeaveTypeMaster" element={<LeaveTypeMaster/>} />
      <Route path="/LeaveTypeList" element={<LeaveTypeList/>} />
      <Route path="/HolidayMaster" element={<HolidayMaster/>} />
      <Route path="/HolidayList" element={<HolidayList/>} />
      <Route path="/ShiftMaster" element={<ShiftMaster/>} />
      <Route path="/ShiftList" element={<ShiftList/>} />
      <Route path="/PolicyMaster" element={<PolicyMaster/>} />
      <Route path="/PolicyList" element={<PolicyList/>} />
      <Route path="/LocationMaster" element={<LocationMaster/>} />
      <Route path="/LocationList" element={<LocationList/>} />
      <Route path="/PayrollComponentMaster" element={<PayrollComponentMaster/>} />
      <Route path="/PayrollComponentList" element={<PayrollComponentList/>} />
      <Route path="/EmployeeMaster" element={<EmployeeMaster/>} />
      <Route path="/EmployeeList" element={<EmployeeList/>} />
      <Route path="/Dashboard" element={<Dashboard/>} />
      <Route path="/" element={<AdminLogin/>} />
      <Route path="/EditProfile" element={<EditProfile/>} />
      <Route path="/ChangePassword" element={<ChangePassword/>} />
      <Route path="/AdminManagement" element={<AdminManagement/>} />
      <Route path="/LeaveDashboard" element={<LeaveDashboard/>} />
      <Route path="/LeaveRuleMaster" element={<LeaveRuleMaster/>} />
      <Route path="/LeaveRuleList" element={<LeaveRuleList/>} />
      <Route path="/LeaveAllocationForm" element={<LeaveAllocationForm/>} />
      <Route path="/LeaveAllocationList" element={<LeaveAllocationList/>} />
      <Route path="/EmployeeDashboard" element={<EmployeeDashboard/>} />
      <Route path="/UserProfile" element={<UserProfile/>} />
      <Route path="/EmployeeHome" element={<EmployeeHome/>} />
      <Route path="/EmployeeCornerSidebar" element={<EmployeeCornerSidebar/>} />
      <Route path="/EmployeeUserIdCreated" element={<EmployeeUserIdCreated/>} />
      <Route path="/EmployeeCalendar" element={<EmployeeCalendar/>} />
      <Route path="/EmployeeLeaveApplication" element={<EmployeeLeaveApplication/>} />
      <Route path="/SalaryHeadForm" element={<SalaryHeadForm/>} />
      <Route path="/SalarySlipHeadList" element={<SalarySlipHeadList/>} />
      <Route path="/PaySlipGenerateEmployeeList" element={<PaySlipGenerateEmployeeList/>} />
      <Route path="/GeneratePaySlip" element={<GeneratePaySlip/>} />
      <Route path="/PaySlipHistory" element={<PaySlipHistory/>} />

     </Routes>
        <Toaster
          reverseOrder={false}
          toastOptions={{
            style: { fontWeight: 600 },
            success: {
              icon: "✅",
              style: { background: "#d1fae5", color: "#065f46" }, // green background
            },
            error: {
              icon: "❌",
              style: { background: "#fee2e2", color: "#991b1b" }, // red background
            },
          }}
        />
</>
  );
}
