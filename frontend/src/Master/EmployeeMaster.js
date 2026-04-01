import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import MobileHeaderToggle from "../component/MobileHeaderToggle";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  if (typeof dateString === "string" && dateString.includes("-")) {
    const parts = dateString.split("-");
    if (parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Flips to YYYY-MM-DD
    }
  }
  return dateString;
};

const formatDateForStorage = (dateString) => {
  if (!dateString) return "";
  if (typeof dateString === "string" && dateString.includes("-")) {
    const parts = dateString.split("-");
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Flips to DD-MM-YYYY
    }
  }
  return dateString;
};

const formatDateToDisplay = (dateString) => {
  if (!dateString || typeof dateString !== "string") return "";

  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const storedMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (storedMatch) {
    return `${storedMatch[1]}/${storedMatch[2]}/${storedMatch[3]}`;
  }

  return dateString;
};

const parseDisplayDateToInput = (dateString) => {
  if (!dateString || typeof dateString !== "string") return "";

  const trimmedValue = dateString.trim();
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

const formatDateTypingValue = (dateString) => {
  if (!dateString || typeof dateString !== "string") return "";

  const digitsOnly = dateString.replace(/\D/g, "").slice(0, 8);
  const day = digitsOnly.slice(0, 2);
  const month = digitsOnly.slice(2, 4);
  const year = digitsOnly.slice(4, 8);

  if (digitsOnly.length <= 2) return day;
  if (digitsOnly.length <= 4) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
};
const EmployeeMaster = () => {
  const location = useLocation();
  const { employee, id } = location.state || {};
  const editEmployeeId = employee?._id || id || "";
  const fromReminder = location.state?.fromReminder === true;
  const [loadedEmployee, setLoadedEmployee] = useState(employee || null);
  const [employeeUserId, setEmployeeUserId] = useState("");
  const isEditMode = Boolean(editEmployeeId);
  const [initialEmploymentStatus, setInitialEmploymentStatus] = useState("");
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");
  const [reportingManagerEmpID, setReportingManagerEmpID] = useState("");
  const [departmentHeadEmpID, setDepartmentHeadEmpID] = useState("");
  const [reportingManagerEmployeeUserId, setReportingManagerEmployeeUserId] = useState("");
  const [departmentHeadEmployeeUserId, setDepartmentHeadEmployeeUserId] = useState("");
  
const [departmentID, setDepartmentID] = useState("");
const [departmentName, setDepartmentName] = useState("");
const [designationID, setDesignationID] = useState("");
const [payType, setPayType] = useState('SALARY'); 


  //const [employeeData, setEmployeeData] = useState(location.state?.employee || {});
  const [employeeData, setEmployeeData] = useState({
  hardCopyDocuments: {
    aadhaar: false,
    pan: false,
    bank: false,
    photograph: false,
    addressProof: false,        // Voter ID / Utility bill
    educationCertificates: false,
    experienceLetters: false,
    relievingLetter: false,
    salarySlips: false,         // last 3 months
    medicalFitness: false,
    policeVerification: false,
    vaccinationCertificate: false,
    bloodGroupProof: false,
    nominationForm: false,      // PF / Gratuity
    esiForm: false,
    pfForm: false,
    nda: false,
  },
  ...(location.state?.employee || {}),
  _id: location.state?.employee?._id || location.state?.id || "",
});

useEffect(() => {
  const fetchFullEmployeeForEdit = async () => {
    if (!editEmployeeId) {
      setLoadedEmployee(employee || null);
      return;
    }

    try {
      const res = await axios.get(`/api/employees/employees/${editEmployeeId}`);
      const fullEmployee = res?.data?.data || res?.data?.employee || res?.data || null;
      setLoadedEmployee(fullEmployee || employee);
      if (fullEmployee?._id) {
        setEmployeeData((prev) => ({
          ...prev,
          ...fullEmployee,
        }));
      }
    } catch (err) {
      try {
        const employeeIdForFallback = employee?.employeeID || "";
        if (!employeeIdForFallback) throw err;
        const fallbackRes = await axios.get(`/api/employee-ids/details/${employeeIdForFallback}`);
        const fallbackEmployee =
          fallbackRes?.data?.data || fallbackRes?.data?.employee || fallbackRes?.data || null;

        setLoadedEmployee(fallbackEmployee || employee || null);
        if (fallbackEmployee) {
          setEmployeeData((prev) => ({
            ...prev,
            ...fallbackEmployee,
          }));
        }
      } catch (fallbackErr) {
        setLoadedEmployee(employee || null);
        toast.error("Failed to load full employee details");
      }
    }
  };

  fetchFullEmployeeForEdit();
}, [editEmployeeId, employee]);

  const [step, setStep] = useState(1);
  const [employeeID, setEmployeeID] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [exEmployeeReason, setExEmployeeReason] = useState("");
  const [governmentRegistrationNumber, setGovernmentRegistrationNumber] = useState("");
  const [registrationState, setregistrationState] = useState("");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [caste, setCaste] = useState("");
  const [subCaste, setSubCaste] = useState("");
  const [religion, setReligion] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [designationName, setDesignationName] = useState(null);
  const [personalEmail, setPersonalEmail] = useState("");
  const [personalMobile, setPersonalMobile] = useState("");

  const [dob, setDob] = useState("");
  const [dor, setDor] = useState("");
  const [doj, setDoj] = useState("");
 const [statusChangeDate, setStatusChangeDate] = useState(new Date().toISOString().split("T")[0]);
  const [confirmationDate, setConfirmationDate] = useState("");
  const [nextIncrementDate, setNextIncrementDate] = useState("");
  const [eligiblePromotion, setEligiblePromotion] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [reportingManager, setReportingManager] = useState("");
  const [departmentHead, setdepartmentHead] = useState("");

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [qualificationsMaster, setQualificationsMaster] = useState([]);
  const createEducationRow = () => ({
    qualification: "",
    discipline: "",
    institute: "",
    board: "",
    year: "",
    percentage: "",
    grade: "",
  });
  const createExperienceRow = () => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    organizationName: "",
    organizationType: "",
    designation: "",
    employmentType: "",
    location: "",
    startMonth: "",
    endMonth: "",
    totalDuration: "",
  });
  const createNomineeRow = () => ({
    name: "",
    relation: "",
    share: "",
    age: "",
    address: "",
    dob: "",
  });

  const [educationDetails, setEducationDetails] = useState([createEducationRow()]);
  const [experienceDetails, setExperienceDetails] = useState([createExperienceRow()]);
    // Step 3 States
const [nomineeDetails, setNomineeDetails] = useState([createNomineeRow()]);
const createEmergencyContactRow = () => ({
  name: "",
  relation: "",
  mobile: "",
  address: "",
});
const [emergencyContact, setEmergencyContact] = useState([createEmergencyContactRow()]);
const [bloodGroup, setBloodGroup] = useState("");
const [eyeSightLeft, setEyeSightLeft] = useState("");
const [eyeSightRight, setEyeSightRight] = useState("");
const [familyPlanStatus, setFamilyPlanStatus] = useState("");
const [familyPlanDate, setFamilyPlanDate] = useState("");
const [height, setHeight] = useState("");
const [weight, setWeight] = useState("");
const [identificationMark1, setIdentificationMark1] = useState("");
const [identificationMark2, setIdentificationMark2] = useState("");
const [physicallyChallenged, setPhysicallyChallenged] = useState("");

const [permanentAddress, setPermanentAddress] = useState({
  street: "",
  village: "",
  city: "",
  postOffice: "",
  policeStation: "",
  pinCode: "",
  district: "",
  state: "",
  country: "INDIA",
  mobile: "",
  email: "",
});

const [presentAddress, setPresentAddress] = useState({
  street: "",
  village: "",
  city: "",
  postOffice: "",
  policeStation: "",
  pinCode: "",
  district: "",
  state: "",
  country: "INDIA",
  mobile: "",
  email: "",
});

const [sameAsPermanent, setSameAsPermanent] = useState(false);
const [basicPay, setBasicPay] = useState("");
const [pfType, setPfType] = useState("");
const [passportNo, setPassportNo] = useState("");
const [pfNo, setPfNo] = useState("");
const [uanNo, setUanNo] = useState("");
const [panNo, setPanNo] = useState("");
const [bankName, setBankName] = useState("");
const [branch, setBranch] = useState("");
const [ifscCode, setIfscCode] = useState("");
const [accountNo, setAccountNo] = useState("");
const [payLevel, setPayLevel] = useState("");
const [aadhaarNo, setAadhaarNo] = useState("");
const [grossSalary, setGrossSalary] = useState("");
const [earningDetails, setEarningDetails] = useState([
  { headName: "", headType: "", value: "" }
]);

const [deductionDetails, setDeductionDetails] = useState([
  { headName: "", headType: "", value: "" }
]);

const [allHeads, setAllHeads] = useState([]);

const navigate = useNavigate();
  // Fetch salary heads
  useEffect(() => {
    const fetchHeads = async () => {
      try {
        const res = await axios.get("/api/salary-heads/salary-list");
        if (Array.isArray(res.data)) {
          setAllHeads(res.data);
        } else if (Array.isArray(res.data.data)) {
          setAllHeads(res.data.data);
        } else {
          toast.error("Invalid salary heads format", res.data);
          toast.error("Invalid salary heads data");
        }
      } catch (err) {
        toast.error(err);
        toast.error("Failed to fetch salary heads");
      }
    };
    fetchHeads();
  }, []);

//   useEffect(() => {
//   const storedID = localStorage.getItem("employeeID");
//   if (storedID) {
//     setEmployeeID(storedID);
//   }
// }, []);


  const earningHeads = Array.isArray(allHeads) ? allHeads.filter(h => h.headId.startsWith("EARN")) : [];
  const deductionHeads = Array.isArray(allHeads) ? allHeads.filter(h => h.headId.startsWith("DEDUCT")) : [];

useEffect(() => {

  if (!employmentStatus) return;
  if (!isEditMode && !employeeID) {
    axios
      .get("/api/employees/next-id", {
        params: { employmentStatus },
      })
      .then((res) => {
        // Only set if the user hasn't started typing while the request was loading
        setEmployeeID(res.data.employeeID || "");
        setEmployeeUserId(res.data.employeeUserId || "");
      })
      .catch((err) => {
        toast.error("Error fetching next ID:", err);
      });
    return;
  }

  if (employmentStatus !== initialEmploymentStatus && employeeID) {
   
    const parts = employeeID.split("-");
    const numberPart = parts.length > 1 ? parts[1] : employeeID.slice(2);
    setEmployeeID(`${employmentStatus}-${numberPart}`);
  }
}, [employmentStatus, isEditMode, initialEmploymentStatus]); 



useEffect(() => {
  if (!selectedDepartmentName) {
    setFilteredDesignations([]);
    return;
  }

  const filtered = designations
    .filter(d => d.departmentName === selectedDepartmentName)
    .map(d => ({
      label: d.designationName,
      value: d._id
    }));

  setFilteredDesignations(filtered);
}, [selectedDepartmentName, designations]);


useEffect(() => {
  if (loadedEmployee && departments.length && designations.length) {
    const dept = departments.find(d => d.value === loadedEmployee.departmentID);
    setDepartmentID(dept?._id || "");
    setSelectedDepartmentName(dept?.deptName || "");

    const desig = designations.find(d => d.value === loadedEmployee.designationID);
    setDesignationID(desig?._id || "");
  }
}, [loadedEmployee, departments, designations]);



useEffect(() => {
  // Only proceed if employee data is available
  if (loadedEmployee) {
    // 1. Basic Info
    setEmployeeID(loadedEmployee.employeeID || "");
    setEmployeeUserId(loadedEmployee.employeeUserId || "");
    setInitialEmploymentStatus(loadedEmployee.employmentStatus);
    setEmploymentStatus(loadedEmployee.employmentStatus);
    setExEmployeeReason(loadedEmployee.exEmployeeReason || "");
    setGovernmentRegistrationNumber(loadedEmployee.governmentRegistrationNumber || "");
    setregistrationState(loadedEmployee.registrationState || "");
    setSalutation(loadedEmployee.salutation || "");
    setFirstName(loadedEmployee.firstName || "");
    setMiddleName(loadedEmployee.middleName || "");
    setLastName(loadedEmployee.lastName || "");
    setFatherName(loadedEmployee.fatherName || "");
    setSpouseName(loadedEmployee.spouseName || "");
    setCaste(loadedEmployee.caste || "");
    setSubCaste(loadedEmployee.subCaste || "");
    setReligion(loadedEmployee.religion || "");
    setMaritalStatus(loadedEmployee.maritalStatus || "");
    setGender(loadedEmployee.gender || "");
    setPersonalEmail(
      loadedEmployee.personalEmail ||
        loadedEmployee.presentAddress?.email ||
        loadedEmployee.permanentAddress?.email ||
        ""
    );
    setPersonalMobile(
      loadedEmployee.personalMobile ||
        loadedEmployee.presentAddress?.mobile ||
        loadedEmployee.permanentAddress?.mobile ||
        ""
    );

    // 2. Department & Designation Prefill (Matching by Name)
    if (departments.length > 0) {
      const foundDept = departments.find(d => d.label === loadedEmployee.departmentName);
      if (foundDept) {
        setDepartmentID(foundDept.value);
        setSelectedDepartmentName(foundDept.label);
      }
    }

    if (designations.length > 0) {
      const foundDesig = designations.find(d => d.label === loadedEmployee.designationName);
      if (foundDesig) {
        setDesignationID(foundDesig.value);
      }
    }

    // 3. Authority Prefill (Matching Full Name string to ObjectID)
    if (employees.length > 0) {
      const findIdByName = (fullNameStr) => {
        if (!fullNameStr) return "";
        const found = employees.find(e => {
          const full = `${e.firstName || ""} ${e.middleName || ""} ${e.lastName || ""}`
            .replace(/\s+/g, ' ')
            .trim();
          return full === fullNameStr;
        });
        return found ? found._id : "";
      };

      setReportingManager(findIdByName(loadedEmployee.reportingManager));
      setdepartmentHead(findIdByName(loadedEmployee.departmentHead));
    }
    setReportingManagerEmpID(loadedEmployee.reportingManagerEmpID || "");
    setDepartmentHeadEmpID(loadedEmployee.departmentHeadEmpID || "");
    setReportingManagerEmployeeUserId(loadedEmployee.reportingManagerEmployeeUserId || "");
    setDepartmentHeadEmployeeUserId(loadedEmployee.departmentHeadEmployeeUserId || "");

    setDob(formatDateForInput(loadedEmployee.dob));
    setDor(formatDateForInput(loadedEmployee.dor));
    setDoj(formatDateForInput(loadedEmployee.doj));
    const todayDate = new Date().toISOString().split("T")[0];
    const existingStatusDate = formatDateForInput(loadedEmployee.statusChangeDate);
    setStatusChangeDate(fromReminder ? todayDate : (existingStatusDate || todayDate));

    setConfirmationDate(formatDateForInput(loadedEmployee.confirmationDate));
    setNextIncrementDate(formatDateForInput(loadedEmployee.nextIncrementDate));
    setEligiblePromotion(loadedEmployee.eligiblePromotion || "");
    setEmploymentType(loadedEmployee.employmentType || "");
    setProfileImage(loadedEmployee.profileImage || null);
    setEligiblePromotion(loadedEmployee.eligiblePromotion || "");
    setEmploymentType(loadedEmployee.employmentType || "");
    setProfileImage(loadedEmployee.profileImage || null);

    // 5. Education & Nominees
    const loadedEducation = Array.isArray(loadedEmployee.educationDetails)
      ? loadedEmployee.educationDetails
      : [];
    setEducationDetails(loadedEducation.length > 0 ? loadedEducation : [createEducationRow()]);
    const loadedExperience = Array.isArray(loadedEmployee.experienceDetails)
      ? loadedEmployee.experienceDetails
      : [];
    setExperienceDetails(
      loadedExperience.length > 0
        ? loadedExperience.map((row) => ({
            ...row,
            id: row.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            totalDuration:
              row.totalDuration ||
              calculateDurationLabel(row.startMonth, row.endMonth),
          }))
        : [createExperienceRow()]
    );

    const loadedNominees = Array.isArray(loadedEmployee.nominees)
      ? loadedEmployee.nominees
      : [];
    setNomineeDetails(
      loadedNominees.length > 0
        ? loadedNominees.map((n) => ({
            name: n.name || "",
            relation: n.relationship || "",
            share: n.share || "",
            age: n.age || "",
            address: n.address || "",
            dob: n.dob || "",
          }))
        : [createNomineeRow()]
    );

    // 6. Medical Details
    setBloodGroup(loadedEmployee.medical?.bloodGroup || "");
    setEyeSightLeft(loadedEmployee.medical?.eyeSightLeft || "");
    setEyeSightRight(loadedEmployee.medical?.eyeSightRight || "");
    setFamilyPlanStatus(loadedEmployee.medical?.familyPlanStatus || "");
    setFamilyPlanDate(loadedEmployee.medical?.familyPlanDate || "");
    setHeight(loadedEmployee.medical?.height || "");
    setWeight(loadedEmployee.medical?.weight || "");
    setIdentificationMark1(loadedEmployee.medical?.identification1 || "");
    setIdentificationMark2(loadedEmployee.medical?.identification2 || "");
    setPhysicallyChallenged(loadedEmployee.medical?.physicallyChallenged || "");
    const loadedEmergency = Array.isArray(loadedEmployee.emergencyContact)
      ? loadedEmployee.emergencyContact
      : loadedEmployee.emergencyContact
      ? [loadedEmployee.emergencyContact]
      : [];
    setEmergencyContact(
      loadedEmergency.length > 0 ? loadedEmergency : [createEmergencyContactRow()]
    );

    // 7. Address
    setPermanentAddress(loadedEmployee.permanentAddress || {});
    setPresentAddress(loadedEmployee.presentAddress || {});

    // 8. Pay Details
    setBasicPay(loadedEmployee.payDetails?.basicPay || "");
    setPfType(loadedEmployee.payDetails?.pfType || "");
    setPassportNo(loadedEmployee.payDetails?.passportNo || "");
    setPfNo(loadedEmployee.payDetails?.pfNo || "");
    setUanNo(loadedEmployee.payDetails?.uanNo || "");
    setPanNo(loadedEmployee.payDetails?.panNo || "");
    setBankName(loadedEmployee.payDetails?.bankName || "");
    setBranch(loadedEmployee.payDetails?.branch || "");
    setIfscCode(loadedEmployee.payDetails?.ifscCode || "");
    setAccountNo(loadedEmployee.payDetails?.accountNo || "");
    setPayLevel(loadedEmployee.payDetails?.payLevel || "");
    setAadhaarNo(loadedEmployee.payDetails?.aadhaarNo || "");
    // setEarningDetails(employee.earnings || []);
    // setDeductionDetails(employee.deductions || []);
    setPayType(loadedEmployee.payType || 'SALARY');
    setGrossSalary(loadedEmployee.grossSalary || "");
    if (loadedEmployee.earnings && loadedEmployee.earnings.length > 0) {
      setEarningDetails(loadedEmployee.earnings);
    } else {
      setEarningDetails([
        { headName: "Basic", headType: "EARNING", value: "" },
        { headName: "HRA", headType: "EARNING", value: "" },
        { headName: "Mobile Allowance", headType: "EARNING", value: "500" },
        { headName: "Bonus", headType: "EARNING", value: "" },
        { headName: "Management Allowance", headType: "EARNING", value: "" },
        { headName: "OT", headType: "EARNING", value: "0" },
      ]);
    }

    if (loadedEmployee.deductions && loadedEmployee.deductions.length > 0) {
      setDeductionDetails(loadedEmployee.deductions);
    } else {
      setDeductionDetails([
        { headName: "PF", headType: "DEDUCTION", value: "" },
        { headName: "PT", headType: "DEDUCTION", value: "" },
        { headName: "ESI", headType: "DEDUCTION", value: "" },
      ]);
    }

    // 9. Document Checkboxes
    const hardCopyDocsObj = {};
    const docKeys = [
      "aadhaar", "pan", "bank", "photograph", "addressProof", "educationCertificates",
      "experienceLetters", "relievingLetter", "salarySlips", "medicalFitness",
      "policeVerification", "vaccinationCertificate", "bloodGroupProof", "pfForm", "esiForm", "nda"
    ];
    docKeys.forEach(key => {
      hardCopyDocsObj[key] = loadedEmployee.hardCopyDocuments?.includes(key) || false;
    });

    setEmployeeData(prev => ({
      ...prev,
      hardCopyDocuments: hardCopyDocsObj,
    }));
  }
}, [loadedEmployee, departments, designations, employees, fromReminder]);



  const handleDobChange = (val) => {
    setDob(val);
    if (val) {
      const dobDate = new Date(val);
      dobDate.setFullYear(dobDate.getFullYear() + 60);
      setDor(dobDate.toISOString().split("T")[0]);
    } else setDor("");
  };

  useEffect(() => {
   // fetchNextEmployeeID();
    loadMasters();
    fetchEmployees();
  }, []);

const fetchNextEmployeeID = async () => {
  try {
    const res = await axios.get("/api/employees/next-id");
    setEmployeeID(res.data.nextEmployeeID);
  } catch (err) {
    toast.error("Failed to get next employee ID", err);
  }
};


const loadMasters = async () => {
  try {
    const [deptRes, desigRes,qualRes] = await Promise.all([
      axios.get("/api/departments"),
      axios.get("/api/designations"),
      axios.get("/api/master/qualifications"),
    ]);

   setDepartments(
  (deptRes.data || []).map((d) => ({
    value: d._id,
    label: d.deptName,
    _id: d._id,
    deptName: d.deptName
  }))
);

setDesignations(
  (desigRes.data || []).map((d) => ({
    value: d._id,
    label: d.designationName,
    _id: d._id,
    designationName: d.designationName,
    departmentName: d.departmentName 
  }))
);
setQualificationsMaster(qualRes.data || []);

  } catch (err) {
    toast.error("Error fetching master data:", err);
  }
};

const fetchEmployees = async () => {
  try {
    const res = await axios.get("/api/employees");
    setEmployees(res.data); // store all employees
  } catch (err) {
    toast.error("Failed to fetch employees:", err);
  }
};


useEffect(() => {
  if (employeeID) {
    const match = employeeID.match(/\d+$/); 
    
    if (match) {
      const numericPart = match[0];
      setEmployeeUserId(`DH-${numericPart}`);
    }
  }
}, [employeeID]);

const calculatePayStructure = (grossInput, currentPayType = payType) => {

  if (!grossInput || grossInput === "") {
    setGrossSalary("");
    setEarningDetails([]);
    setDeductionDetails([]);
    return;
  }

  const S = Math.round(parseFloat(grossInput) || 0);
  setGrossSalary(S);

  if (currentPayType === "Stipend") {
    /* ================= STIPEND LOGIC ================= */
    setEarningDetails([
      { headName: "Stipend Amount", headType: "EARNING", value: S }
    ]);
    setDeductionDetails([]);
  } else {
    /* ================= SALARY (SALARY) LOGIC ================= */
    const basic = Math.round(S * 0.50);
    const hra = Math.round(basic * 0.40);
    const mobile = S > 0 ? 500 : 0;
    const bonus = Math.round(basic / 6);
    const managementAllowance = S > 0 ? Math.round(S - (basic + hra + mobile + bonus)) : 0;
    const isPhysicallyChallenged = String(physicallyChallenged || "").toLowerCase() === "yes";
    const esiLimit = isPhysicallyChallenged ? 25000 : 21000;
    const esiAmount = S > 0 && S <= esiLimit ? Math.round(S * 0.0075) : 0;

    setEarningDetails([
      { headName: "Basic", headType: "EARNING", value: basic },
      { headName: "HRA", headType: "EARNING", value: hra },
      { headName: "Mobile Allowance", headType: "EARNING", value: mobile },
      { headName: "Bonus", headType: "EARNING", value: bonus },
      { headName: "Management Allowance", headType: "EARNING", value: managementAllowance },
    ]);

    setDeductionDetails([
      { headName: "PF", headType: "DEDUCTION", value: Math.round(basic * 0.12) },
      { headName: "PT", headType: "DEDUCTION", value: Math.round(S > 25000 ? 208 : (S >= 15000 ? 180 : 0)) },
      { headName: "ESI", headType: "DEDUCTION", value: esiAmount }
    ]);
  }
};

useEffect(() => {
  if (payType === "SALARY" && grossSalary !== "" && grossSalary !== null) {
    calculatePayStructure(grossSalary, payType);
  }
}, [physicallyChallenged, payType]);

  const handleFileChange = (e) => setProfileImage(e.target.files[0]);

  const handleAddRow = () =>
    setEducationDetails([...educationDetails, createEducationRow()]);

  const handleRemoveRow = (index) => {
    const updated = [...educationDetails];
    updated.splice(index, 1);
    setEducationDetails(updated);
  };

  const handleEduChange = (index, field, value) => {
    const updated = [...educationDetails];
    updated[index][field] = value;
    setEducationDetails(updated);
  };
  const calculateDurationLabel = (startMonth, endMonth) => {
    if (!startMonth || !endMonth) return "";
    const [sy, sm] = startMonth.split("-").map(Number);
    const [ey, em] = endMonth.split("-").map(Number);
    if (!sy || !sm || !ey || !em) return "";
    const diffMonths = (ey - sy) * 12 + (em - sm);
    if (diffMonths < 0) return "";
    const totalMonths = diffMonths + 1;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const yearLabel = years > 0 ? `${years} year${years > 1 ? "s" : ""}` : "";
    const monthLabel = `${months} month${months !== 1 ? "s" : ""}`;
    return `${yearLabel}${yearLabel ? " " : ""}${monthLabel}`.trim();
  };
  const getMonthIndex = (monthStr) => {
    if (!monthStr) return null;
    const [y, m] = monthStr.split("-").map(Number);
    if (!y || !m) return null;
    return y * 12 + (m - 1);
  };
  const getExperienceTotalMonths = (startMonth, endMonth) => {
    const startIdx = getMonthIndex(startMonth);
    const endIdx = getMonthIndex(endMonth);
    if (startIdx == null || endIdx == null) return 0;
    const diff = endIdx - startIdx;
    if (diff < 0) return 0;
    return diff + 1;
  };
  const formatTotalMonths = (totalMonths) => {
    if (!totalMonths || totalMonths <= 0) return "";
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const yearLabel = years > 0 ? `${years} year${years > 1 ? "s" : ""}` : "";
    const monthLabel = `${months} month${months !== 1 ? "s" : ""}`;
    return `${yearLabel}${yearLabel ? " " : ""}${monthLabel}`.trim();
  };
  const handleExperienceChange = (id, field, value) => {
    setExperienceDetails((prev) => {
      const updated = prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      );
      return updated.map((row) =>
        row.id === id
          ? {
              ...row,
              totalDuration: calculateDurationLabel(row.startMonth, row.endMonth),
            }
          : row
      );
    });
  };
  const addExperienceRow = () =>
    setExperienceDetails((prev) => [createExperienceRow(), ...prev]);
  const removeExperienceRow = (id) =>
    setExperienceDetails((prev) => prev.filter((row) => row.id !== id));
const getValue = (obj) => {
  if (!obj) return "";
  if (typeof obj === "object") return obj.value || obj._id || "";
  return obj;
};

const getEmployeeName = (id) => {
  const emp = employees.find(e => e._id === id);
  if (!emp) return "";
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
};

const payload = {
  employeeID,
 employeeUserId,
  employmentStatus,
  exEmployeeReason: employmentStatus === "EX" ? exEmployeeReason : "",
  governmentRegistrationNumber,
  registrationState,
  salutation,
  firstName,
  middleName,
  lastName,
  fatherName,
  spouseName,
  caste,
  subCaste,
  religion,
  gender,
  maritalStatus,
  personalEmail: String(personalEmail || "").toLowerCase(),
  personalMobile,
  departmentID: departmentID,
  designationID: designationID,
  dob: formatDateForStorage(dob),
  dor: formatDateForStorage(dor),
  doj: formatDateForStorage(doj),
  statusChangeDate: formatDateForStorage(statusChangeDate),
  confirmationDate: formatDateForStorage(confirmationDate),
  nextIncrementDate: formatDateForStorage(nextIncrementDate),
  eligiblePromotion,
  employmentType,
  profileImage,
  reportingManager: getEmployeeName(reportingManager),
  reportingManagerEmpID: reportingManagerEmpID,
  reportingManagerEmployeeUserId: reportingManagerEmployeeUserId,
  departmentHead: getEmployeeName(departmentHead),
  departmentHeadEmpID: departmentHeadEmpID,
  departmentHeadEmployeeUserId: departmentHeadEmployeeUserId,
  educationDetails,
  experienceDetails: experienceDetails
    .map((row) => ({
      ...row,
      totalDuration: calculateDurationLabel(row.startMonth, row.endMonth),
    }))
    .filter((row) => {
      const { organizationName, organizationType, designation, employmentType, location, startMonth, endMonth } = row;
      return (
        organizationName ||
        organizationType ||
        designation ||
        employmentType ||
        location ||
        startMonth ||
        endMonth
      );
    })
    .sort((a, b) => {
      const aIdx = getMonthIndex(a.endMonth) ?? getMonthIndex(a.startMonth) ?? -1;
      const bIdx = getMonthIndex(b.endMonth) ?? getMonthIndex(b.startMonth) ?? -1;
      return bIdx - aIdx;
    })
    .map(({ id, ...rest }) => rest),
  nominees: nomineeDetails.map(n => ({
  name: n.name,
  relationship: n.relation, // map frontend 'relation' to backend 'relationship'
  dob: formatDateForStorage(n.dob),
  share: n.share,
  address: n.address
})),
  emergencyContact: emergencyContact.filter((c) => {
    const { name, relation, mobile, address } = c;
    return name || relation || mobile || address;
  }),

  medical: {
    bloodGroup,
    eyeSightLeft,
    eyeSightRight,
    familyPlanStatus,
    familyPlanDate: formatDateForStorage(familyPlanDate),
    height,
    weight,
    identification1: identificationMark1,
    identification2: identificationMark2,
    physicallyChallenged,
  },
  permanentAddress: { ...permanentAddress, mobile: "", email: "" },
  presentAddress: { ...presentAddress, mobile: "", email: "" },
  payDetails: {
    basicPay,
    pfType,
    passportNo,
    pfNo,
    uanNo,
    panNo,
    bankName,
    branch,
    ifscCode,
    accountNo,
    payLevel,
    aadhaarNo,
  },
  payType,
  grossSalary: Math.round(Number(grossSalary) || 0),
  earnings: earningDetails.map(e => ({
    ...e,
    value: Math.round(Number(e.value) || 0)
  })),
 deductions: deductionDetails.map(d => ({
    ...d,
    value: Math.round(Number(d.value) || 0)
  })),
  hardCopyDocuments: employeeData.hardCopyDocuments,

};

const handleSaveAndNext = async () => {
  try {

    const cleanedEdu = educationDetails.map(edu => ({
      ...edu,
      qualification: edu.qualification === "OTHER_SELECTED" ? "" : edu.qualification
    }));
    const finalData = { ...payload, educationDetails: cleanedEdu };
    if (employeeData._id) {
      // update existing employee
      await axios.put(
        `/api/employees/${employeeData._id}`,
        payload
      );
    } else {
      // create first time
      const res = await axios.post(
        "/api/employees",
        payload
      );
      setEmployeeData(res.data); // store _id for next steps
    }
    localStorage.setItem("employeeID", employeeID);

    setStep(step + 1); // go to next page
  } catch (err) {
    toast.error("Error saving:", err);
    toast.error("Failed to save step");
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    
    const cleanedEduSubmit = educationDetails.map(edu => ({
      ...edu,
      qualification: edu.qualification === "OTHER_SELECTED" ? "" : edu.qualification
    }));
    const finalDataSubmit = { ...payload, educationDetails: cleanedEduSubmit };
    if (employeeData._id) {
      await axios.put(
        `/api/employees/${employeeData._id}`,
        payload
      );
      toast.success("Employee updated successfully!");
    } else {
      const res = await axios.post(
        "/api/employees",
        payload
      );
      setEmployeeData(res.data); // store _id
      toast.success("Employee saved successfully!");
    }

    navigate("/EmployeeList");
  } catch (err) {
    toast.error(err);
   if (err.response && err.response.data && err.response.data.error) {
      toast.error(err.response.data.error); // shows "Please select Employment Status"
    } else {
      toast.error("Failed to save employee");
    }}
};


  return (
    <div className="h-screen bg-zinc-300 flex flex-col md:flex-row overflow-hidden">
        <Sidebar />

        <div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">
          <div className="bg-white shadow-lg rounded-lg p-4 w-full flex flex-col min-h-0">
          {/* ===================== STEP 1 ===================== */}


          <MobileHeaderToggle>
         <div className="bg-white flex items-center font-semibold gap-1 border-b border-gray-300 mb-3 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide px-1 text-xs sm:text-sm text-dorika-blue">
          {["Personal & Service details", "Work Experience", "Education", "Nominees/Medical/Address", "Pay Details", "Pay Structure","Doccument"].map((s, i) => (
            <React.Fragment key={i}>
              <div
                className={`cursor-pointer px-2 py-0.5 rounded ${
                  step === i + 1 ? "bg-dorika-blue font-semibold text-white" : "text-dorika-blue hover:text-blue-600"
                }`}
                onClick={() => setStep(i + 1)}
              >
                {s}
              </div>
              {i < 6 && (
                <span className="text-gray-400 select-none">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
          </MobileHeaderToggle>
          <div className="flex-1 overflow-y-auto min-h-0">
          {step === 1 && (
            <>
              <h2 className="text-2xl font-semibold mb-4 text-center text-black">
                Employee
              </h2>

              <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                Personal Details
              </h3>

             <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                <Select
                    label="Employment Status *"
                    value={employmentStatus}
                    onChange={setEmploymentStatus}
                    options={[
                      { label: "TraineeProbation", value: "TP" },
                      { label: "Trainee", value: "TR" },
                      { label: "TEP", value: "TEP" },
                      { label: "Probation", value: "PB" },
                      { label: "Permanent", value: "P" },
                      { label: "PDP", value: "PDP" },
                      { label: "PD", value: "PD" },
                      { label: "ExEmployee", value: "EX" },
                    ]}
                  />
                   {employmentStatus === "EX" && (
                <Input
                  label="Ex Employee Reason"
                  value={exEmployeeReason}
                  onChange={setExEmployeeReason}
                />
              )}
                 {/* <Input label="Employee ID" value={employeeID} readOnly /> */}
                
             
                <Input 
                  label="Employee ID" 
                  value={employeeID} 
                  onChange={(val) => setEmployeeID(val)} // Change 'e' to 'val' and remove '.target.value'
                />
                <Input 
                label="Employee UserID" 
                value={employeeUserId} 
                readOnly={true} // Set to true so users don't break the link manually
              />
             
                <Input
                  label="Government Registration Number"
                  value={governmentRegistrationNumber}
                  onChange={(val) => setGovernmentRegistrationNumber(val.toUpperCase())}
                /> 
                <Input
                  label="Registration State"
                  value={registrationState}
                  onChange={(val) => setregistrationState(val.toUpperCase())}
                />

                <Select
                  label="Salutation"
                  value={salutation}
                  onChange={setSalutation}
                  options={["Mr.", "Mrs.", "Ms.", "Dr."]}
                />
                <Input
                  label="First Name *"
                  value={firstName}
                  onChange={(val) =>
                    setFirstName(val.replace(/\s+/g, " ").trimStart().toUpperCase())
                  }
                />
                <Input
                  label="Middle Name"
                  value={middleName}
                  onChange={(val) =>
                    setMiddleName(val.replace(/\s+/g, " ").trimStart().toUpperCase())
                  }
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(val) =>
                    setLastName(val.replace(/\s+/g, " ").trimStart().toUpperCase())
                  }
                />
                <Input
                  label="Father's Name *"
                  value={fatherName}
                  onChange={(val) => setFatherName(val.toUpperCase())}
                />
                <Input
                  label="Spouse Name"
                  value={spouseName}
                  onChange={(val) => setSpouseName(val.toUpperCase())}
                />
                <Input
                  label="Email"
                  type="email"
                  value={personalEmail}
                  onChange={(val) => setPersonalEmail(String(val || "").toLowerCase())}
                />
                <Input
                  label="Mobile No."
                  value={personalMobile}
                  onChange={(val) => setPersonalMobile(val)}
                />
                <Select
                  label="Caste"
                  value={caste}
                  onChange={setCaste}
                  options={[
                    "General",
                    "OBC-I",
                    "OBC-II",
                    "SC",
                    "ST",
                    "Other",
                  ]}
                />
                <Select
                  label="Gender *"
                  value={gender}
                  onChange={setGender}
                  options={["Male", "Female", "Transgender", "Other"]}
                />
                <Select
                  label="Religion"
                  value={religion}
                  onChange={setReligion}
                  options={["Hindu", "Muslim", "Christian", "Sikh", "Other"]}
                />
                <Select
                  label="Marital Status"
                  value={maritalStatus}
                  onChange={setMaritalStatus}
                  options={["Yes", "No"]}
                />

                <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                  Service Details
                </h3>
                  <Select
                    label="Department *"
                    value={departmentID}
                    onChange={(val) => {
                      setDepartmentID(val); // val is ObjectId string
                      const dept = departments.find(d => d._id === val);
                      setDepartmentName(dept?.deptName || ""); // only for display/filtering
                      setSelectedDepartmentName(dept?.deptName || "");
                    }}
                    options={departments.map(dep => ({
                      label: dep.deptName,
                      value: dep._id
                    }))}
                  />

                  <Select
                    label="Designation *"
                    value={designationID}
                    onChange={(val) => setDesignationID(val)} // ObjectId
                    options={filteredDesignations.map(des => ({
                      label: des.label,
                      value: des.value // ObjectId
                    }))}
                  />

                <Input
                  type="date"
                  label="Date of Birth *"
                  value={dob}
                  onChange={handleDobChange}
                  dateDisplayFormat="DD/MM/YYYY"
                />
                <Input
                  type="date"
                  label="Date of Retirement"
                  readOnly
                  value={dor}
                  onChange={setDor}
                  dateDisplayFormat="DD/MM/YYYY"
                />
                <Input
                  type="date"
                  label="Date of Joining *"
                  value={doj}
                  onChange={setDoj}
                  dateDisplayFormat="DD/MM/YYYY"
                />
                <Input
                  type="date"
                  label="Employee Status Change Date"
                  value={statusChangeDate || doj} // default to Date of Joining
                  onChange={setStatusChangeDate}
                  dateDisplayFormat="DD/MM/YYYY"
                />

                <Input
                  type="date"
                  label="Confirmation Date"
                  value={confirmationDate}
                  onChange={setConfirmationDate}
                  dateDisplayFormat="DD/MM/YYYY"
                />
                <Input
                  type="date"
                  label="Next Increment Date"
                  value={nextIncrementDate}
                  onChange={setNextIncrementDate}
                  dateDisplayFormat="DD/MM/YYYY"
                />
                <Select
                  label="Eligible for Promotion"
                  value={eligiblePromotion}
                  onChange={setEligiblePromotion}
                  options={["Yes", "No"]}
                />
                {/* <Select
                  label="Employee Type *"
                  value={employmentType}
                  onChange={setEmploymentType}
                  options={[
                    "TEMPORARY",
                    "PERMANENT",
                    "PROBATIONARY EMPLOYEE",
                    "EX-EMPLOYEE",
                    "CONTRACT",
                  ]}
                /> */}
                {/* <div>
                  <label className="block text-sm">Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-sm border border-gray-300 rounded p-1"
                  />
                </div> */}
              <SearchableSelect
                label="Reporting Manager"
                value={reportingManagerEmpID} // Bind to ID
                onChange={(val) => {
                  setReportingManagerEmpID(val);
                  const emp = employees.find((e) => e.employeeID === val);
                  if (emp) {
                    setReportingManager(`${emp.firstName} ${emp.lastName}`.trim());
                    setReportingManagerEmployeeUserId(emp.employeeUserId);
                  }
                }}
                options={employees.map((e) => {
                  const fullName = `${e.firstName || ""} ${e.middleName || ""} ${e.lastName || ""}`
                    .replace(/\s+/g, " ")
                    .trim();
                  return {
                    value: e.employeeID,
                    label: `${fullName} (${e.employeeID})`,
                    searchText: fullName,
                  };
                })}
              />

              <SearchableSelect
                label="Department Head"
                value={departmentHeadEmpID} // Bind to ID
                onChange={(val) => {
                  setDepartmentHeadEmpID(val);
                  const emp = employees.find((e) => e.employeeID === val);
                  if (emp) {
                    setdepartmentHead(`${emp.firstName} ${emp.lastName}`.trim());
                    setDepartmentHeadEmployeeUserId(emp.employeeUserId);
                  }
                }}
                options={employees.map((e) => {
                  const fullName = `${e.firstName || ""} ${e.middleName || ""} ${e.lastName || ""}`
                    .replace(/\s+/g, " ")
                    .trim();
                  return {
                    value: e.employeeID,
                    label: `${fullName} (${e.employeeID})`,
                    searchText: fullName,
                  };
                })}
              />
             <div className="col-span-full flex flex-row justify-between items-center gap-3 mt-6 border-t pt-4">
                {/* Left Side */}
                <div className="flex-shrink-0">
                  <BackButton />
                </div>

                {/* Right Side */}
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="flex items-center justify-center gap-1 px-4 py-2 rounded text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-sm active:scale-95"
                >
                  <span>Save & Next</span>
                  <span className="text-lg">→</span>
                </button>
              </div>
              </form>
            </>
          )}

          {/* ===================== STEP 2 ===================== */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 col-span-full">
                <h2 className="text-xl font-semibold text-sky-600">
                  Work Experience
                </h2>
                <div className="text-sm font-semibold text-dorika-orange">
                  Total Experience:{" "}
                  {formatTotalMonths(
                    experienceDetails.reduce(
                      (sum, row) =>
                        sum + getExperienceTotalMonths(row.startMonth, row.endMonth),
                      0
                    )
                  ) || "--"}
                </div>
              </div>

              <div className="overflow-x-auto mb-4">
                <table className="min-w-[900px] w-full border border-gray-300 text-xs sm:text-sm">
                  <thead className="bg-sky-100">
                    <tr>
                      <th className="border p-2">S.No.</th>
                      <th className="border p-2">Organization Name</th>
                      <th className="border p-2">Organization Type</th>
                      <th className="border p-2">Designation</th>
                      <th className="border p-2">Employment Type</th>
                      <th className="border p-2">Location</th>
                      <th className="border p-2">Start Month</th>
                      <th className="border p-2">End Month</th>
                      <th className="border p-2">Total Duration</th>
                      <th className="border p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...experienceDetails]
                      .sort((a, b) => {
                        const aIdx = getMonthIndex(a.endMonth) ?? getMonthIndex(a.startMonth) ?? -1;
                        const bIdx = getMonthIndex(b.endMonth) ?? getMonthIndex(b.startMonth) ?? -1;
                        return bIdx - aIdx;
                      })
                      .map((row, index) => (
                      <tr key={row.id}>
                        <td className="border p-2 text-center">{index + 1}</td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={row.organizationName}
                            onChange={(e) =>
                              handleExperienceChange(
                                row.id,
                                "organizationName",
                                e.target.value.toUpperCase()
                              )
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500"
                          />
                        </td>
                        <td className="border p-2">
                          <select
                            value={row.organizationType}
                            onChange={(e) =>
                              handleExperienceChange(row.id, "organizationType", e.target.value)
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500"
                          >
                            <option value="">Select</option>
                            <option value="Hospital">Hospital</option>
                            <option value="Clinic">Clinic</option>
                            <option value="Lab">Lab</option>
                            <option value="Pharmacy">Pharmacy</option>
                            <option value="Other Business">Other Business</option>
                          </select>
                        </td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={row.designation}
                            onChange={(e) =>
                              handleExperienceChange(
                                row.id,
                                "designation",
                                e.target.value.toUpperCase()
                              )
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500"
                          />
                        </td>
                        <td className="border p-2">
                          <select
                            value={row.employmentType}
                            onChange={(e) =>
                              handleExperienceChange(row.id, "employmentType", e.target.value)
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500"
                          >
                            <option value="">Select</option>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={row.location}
                            onChange={(e) =>
                              handleExperienceChange(
                                row.id,
                                "location",
                                e.target.value.toUpperCase()
                              )
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="month"
                            value={row.startMonth}
                            onChange={(e) =>
                              handleExperienceChange(row.id, "startMonth", e.target.value)
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="month"
                            value={row.endMonth}
                            onChange={(e) =>
                              handleExperienceChange(row.id, "endMonth", e.target.value)
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500"
                          />
                        </td>
                        <td className="border p-2 text-center font-semibold">
                          {row.totalDuration || "--"}
                        </td>
                        <td className="border p-2">
                          <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={addExperienceRow}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 rounded mr-1"
                          >
                            +
                          </button>
                            {experienceDetails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeExperienceRow(row.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 rounded"
                              >
                                -
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="col-span-full flex flex-row justify-between items-center mt-8 border-t pt-4">
        <button
          onClick={() => setStep(1)}
          className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800"
        >
          ← Back
        </button>

                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="flex items-center gap-1 px-3 py-1 rounded text-white bg-sky-600 hover:bg-sky-700"
                >
                  <span>Save & Next</span>
                  
                </button>
              </div>
            </>
          )}

          {/* ===================== STEP 3 ===================== */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold text-sky-600 col-span-full">
                Educational Details
              </h2>

              <div className="overflow-x-auto mb-4">
              <table className="min-w-[900px] w-full border border-gray-400 text-xs sm:text-sm">
                <thead className="bg-sky-100">
                  <tr>
                    <th className="border p-2">S.No.</th>
                    <th className="border p-2">Qualification</th>
                    <th className="border p-2">Discipline</th>
                    <th className="border p-2">Institute Name</th>
                    <th className="border p-2">Board/University</th>
                    <th className="border p-2">Year of Passing</th>
                    <th className="border p-2">Percentage</th>
                    <th className="border p-2">Grade/Division</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {educationDetails.map((row, index) => (
                    <tr key={index}>
                      <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">
                    <select
                      value={qualificationsMaster.some(q => q.qualName === row.qualification) ? row.qualification : (row.qualification === "" ? "" : "OTHER")}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "OTHER") {
                          handleEduChange(index, "qualification", "OTHER_SELECTED"); 
                        } else {
                          handleEduChange(index, "qualification", val);
                        }
                      }}
                      className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <option value="">SELECT</option>
                      {qualificationsMaster
                        .filter(q => q.status === "Active")
                        .map((q) => (
                          <option key={q._id} value={q.qualName}>
                            {q.qualName}
                          </option>
                      ))}
                      <option value="OTHER">OTHER</option>
                    </select>

                    {/* NEW FIELD: Appears if 'OTHER' is selected or if existing data doesn't match master */}
                    {(row.qualification === "OTHER_SELECTED" || (!qualificationsMaster.some(q => q.qualName === row.qualification) && row.qualification !== "")) && (
                      <input
                        type="text"
                        placeholder="Specify Qualification"
                        value={row.qualification === "OTHER_SELECTED" ? "" : row.qualification}
                        onChange={(e) => handleEduChange(index, "qualification", e.target.value.toUpperCase())}
                        className="w-full mt-2 pl-2 pr-1 border border-blue-400 font-bold rounded text-sm focus:ring-2 focus:ring-blue-500 bg-yellow-50"
                      />
                    )}
                  </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={row.discipline}
                          onChange={(e) =>
                            handleEduChange(
                              index,
                              "discipline",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={row.institute}
                          onChange={(e) =>
                            handleEduChange(
                              index,
                              "institute",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={row.board}
                          onChange={(e) =>
                            handleEduChange(
                              index,
                              "board",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={row.year}
                          onChange={(e) =>
                            handleEduChange(
                              index,
                              "year",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={row.percentage}
                          onChange={(e) =>
                            handleEduChange(
                              index,
                              "percentage",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={row.grade}
                          onChange={(e) =>
                            handleEduChange(
                              index,
                              "grade",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>
                      <td className="border p-2">
                       <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 rounded mr-1"
                        >
                          +
                        </button>
                        {educationDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 rounded"
                          >
                            -
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
      <div className="col-span-full flex flex-row justify-between items-center mt-8 border-t pt-4">

        <button
          onClick={() => setStep(2)}
          className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={handleSaveAndNext}
          className="flex items-center gap-1 px-3 py-1 rounded text-white bg-sky-600 hover:bg-sky-700"
        >
          <span>Save & Next</span>
          <span>→</span>
        </button>

      </div>
              </div>
            </>
          )}

       {/* ===================== STEP 4 ===================== */}
            {step === 4 && (
              <>
                {/* <h2 className="text-2xl font-bold mb-4 text-center text-black">
                  Nominee, Medical & Address Details
                </h2> */}

                {/* ---------- NOMINEE DETAILS ---------- */}
                <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                  Nominee Details
                </h3>
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-[700px] w-full border border-gray-400 text-xs sm:text-sm">
                  <thead className="bg-sky-100">
                    <tr>
                      <th className="border p-2">S.No.</th>
                      <th className="border p-2">Name</th>
                      <th className="border p-2">Relation</th>
                      <th className="border p-2">Date of Birth</th>
                      <th className="border p-2">Share (%)</th>
                      <th className="border p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nomineeDetails.map((row, index) => (
                      <tr key={index}>
                        <td className="border p-2 text-center">{index + 1}</td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) =>
                              setNomineeDetails((prev) => {
                                const updated = [...prev];
                                updated[index].name = e.target.value.toUpperCase();
                                return updated;
                              })
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={row.relation}
                            onChange={(e) =>
                              setNomineeDetails((prev) => {
                                const updated = [...prev];
                                updated[index].relation = e.target.value.toUpperCase();
                                return updated;
                              })
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                          />
                        </td>
                        <td className="border p-2">
                        <DateDisplayInput
                          value={row.dob}
                          onChange={(val) =>
                            setNomineeDetails((prev) => {
                              const updated = [...prev];
                              updated[index].dob = val;
                              return updated;
                            })
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            value={row.share}
                            onChange={(e) =>
                              setNomineeDetails((prev) => {
                                const updated = [...prev];
                                updated[index].share = e.target.value;
                                return updated;
                              })
                            }
                            className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                          />
                        </td>
                

                      <td className="border p-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setNomineeDetails([
                              ...nomineeDetails,
                              createNomineeRow(),
                            ])
                          }
                          className="bg-green-500 hover:bg-green-600 text-white px-2 rounded mr-1"
                        >
                          +
                        </button>
                        {nomineeDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setNomineeDetails(nomineeDetails.filter((_, i) => i !== index))
                            }
                            className="bg-red-500 hover:bg-red-600 text-white px-2 rounded"
                          >
                            -
                          </button>
                        )}
                      </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {/* ---------- MEDICAL DETAILS ---------- */}
                  <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                    Medical Information
                  </h3>

                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* Blood Group */}
                    <div>
                      <label className="block text-sm mb-1">Blood Group</label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      >
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>

                    {/* Eye Sight (Left) */}
                    <div>
                      <label className="block text-sm mb-1">Eye Sight (Left)</label>
                      <input
                        type="text"
                        value={eyeSightLeft}
                        onChange={(e) => setEyeSightLeft((e.target.value || "").toUpperCase())}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>

                    {/* Eye Sight (Right) */}
                    <div>
                      <label className="block text-sm mb-1">Eye Sight (Right)</label>
                      <input
                        type="text"
                        value={eyeSightRight}
                        onChange={(e) => setEyeSightRight((e.target.value || "").toUpperCase())}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>

                    {/* Family Plan Status */}
                    <div>
                      <label className="block text-sm mb-1">Family Plan Status</label>
                      <select
                        value={familyPlanStatus}
                        onChange={(e) => setFamilyPlanStatus(e.target.value)}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {/* Family Plan Date */}
                    <div>
                      <label className="block text-sm mb-1">Family Plan Date</label>
                      <DateDisplayInput
                        value={familyPlanDate}
                        onChange={setFamilyPlanDate}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-sm mb-1">Height (in cm)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="block text-sm mb-1">Weight (in Kgs)</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>

                    {/* Identification Mark (1) */}
                    <div>
                      <label className="block text-sm mb-1">Identification Mark (1)</label>
                      <input
                        type="text"
                        value={identificationMark1}
                        onChange={(e) =>
                          setIdentificationMark1((e.target.value || "").toUpperCase())
                        }
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>

                    {/* Identification Mark (2) */}
                    <div>
                      <label className="block text-sm mb-1">Identification Mark (2)</label>
                      <input
                        type="text"
                        value={identificationMark2}
                        onChange={(e) =>
                          setIdentificationMark2((e.target.value || "").toUpperCase())
                        }
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>

                    {/* Physically Challenged */}
                    <div>
                      <label className="block text-sm mb-1">Physically Challenged</label>
                      <select
                        value={physicallyChallenged}
                        onChange={(e) => setPhysicallyChallenged(e.target.value)}
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>


                {/* ---------- EMERGENCY CONTACT ---------- */}
                <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                  Emergency Contact
                </h3>

                <div className="overflow-x-auto mb-4 col-span-full">
                  <table className="min-w-[700px] w-full border border-gray-300 text-xs sm:text-sm">
                    <thead className="bg-sky-100">
                      <tr>
                        <th className="border p-2">S.No.</th>
                        <th className="border p-2">Contact Name</th>
                        <th className="border p-2">Relation</th>
                        <th className="border p-2">Emergency Contact No.</th>
                        <th className="border p-2">Address</th>
                        <th className="border p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emergencyContact.map((row, index) => (
                        <tr key={index}>
                          <td className="border p-2 text-center">{index + 1}</td>
                          <td className="border p-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                setEmergencyContact((prev) => {
                                  const updated = [...prev];
                                  updated[index].name = e.target.value.toUpperCase();
                                  return updated;
                                })
                              }
                              className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                            />
                          </td>
                          <td className="border p-2">
                            <input
                              type="text"
                              value={row.relation}
                              onChange={(e) =>
                                setEmergencyContact((prev) => {
                                  const updated = [...prev];
                                  updated[index].relation = e.target.value.toUpperCase();
                                  return updated;
                                })
                              }
                              className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                            />
                          </td>
                          <td className="border p-2">
                            <input
                              type="text"
                              value={row.mobile}
                              onChange={(e) =>
                                setEmergencyContact((prev) => {
                                  const updated = [...prev];
                                  updated[index].mobile = e.target.value;
                                  return updated;
                                })
                              }
                              className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                            />
                          </td>
                          <td className="border p-2">
                            <input
                              type="text"
                              value={row.address}
                              onChange={(e) =>
                                setEmergencyContact((prev) => {
                                  const updated = [...prev];
                                  updated[index].address = e.target.value.toUpperCase();
                                  return updated;
                                })
                              }
                              className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                            />
                          </td>
                          <td className="border p-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setEmergencyContact((prev) => [
                                    ...prev,
                                    createEmergencyContactRow(),
                                  ])
                                }
                                className="bg-green-500 hover:bg-green-600 text-white px-2 rounded"
                              >
                                +
                              </button>
                              {emergencyContact.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEmergencyContact((prev) =>
                                      prev.filter((_, i) => i !== index)
                                    )
                                  }
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 rounded"
                                >
                                  -
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>


             {/* ---------- ADDRESS DETAILS ---------- */}
                <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                  Permanent Address
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Street */}
                  <div>
                    <label className="block text-sm mb-1">Street No. and Name</label>
                    <input
                      type="text"
                      value={permanentAddress.street || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          street: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium 
                                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 
                                transition-all duration-150"
                    />
                  </div>

                  {/* Village */}
                  <div>
                    <label className="block text-sm mb-1">Village/Town</label>
                    <input
                      type="text"
                      value={permanentAddress.village || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          village: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium 
                                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm mb-1">City</label>
                    <input
                      type="text"
                      value={permanentAddress.city || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          city: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                  {/* Post Office */}
                  <div>
                    <label className="block text-sm mb-1">Post Office</label>
                    <input
                      type="text"
                      value={permanentAddress.postOffice || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          postOffice: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                  {/* Police Station */}
                  <div>
                    <label className="block text-sm mb-1">Police Station</label>
                    <input
                      type="text"
                      value={permanentAddress.policeStation || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          policeStation: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                  {/* Pin Code */}
                  <div>
                    <label className="block text-sm mb-1">Pin Code *</label>
                    <input
                      type="text"
                      value={permanentAddress.pinCode || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          pinCode: e.target.value.toUpperCase(),
                        })
                      }
                    
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                  {/* District */}
                  <div>
                    <label className="block text-sm mb-1">District</label>
                    <input
                      type="text"
                      value={permanentAddress.district || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          district: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm mb-1">State *</label>
                    <select
                      value={permanentAddress.state || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          state: e.target.value.toUpperCase(),
                        })
                      }
                    
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    >
                      <option value="">Select</option>
                     <option value="ANDHRA PRADESH">Andhra Pradesh</option>
                      <option value="ARUNACHAL PRADESH">Arunachal Pradesh</option>
                      <option value="ASSAM">Assam</option>
                      <option value="BIHAR">Bihar</option>
                      <option value="CHHATTISGARH">Chhattisgarh</option>
                      <option value="GOA">Goa</option>
                      <option value="GUJARAT">Gujarat</option>
                      <option value="HARYANA">Haryana</option>
                      <option value="HIMACHAL PRADESH">Himachal Pradesh</option>
                      <option value="JHARKHAND">Jharkhand</option>
                      <option value="KARNATAKA">Karnataka</option>
                      <option value="KERALA">Kerala</option>
                      <option value="MADHYA PRADESH">Madhya Pradesh</option>
                      <option value="MAHARASHTRA">Maharashtra</option>
                      <option value="MANIPUR">Manipur</option>
                      <option value="MEGHALAYA">Meghalaya</option>
                      <option value="MIZORAM">Mizoram</option>
                      <option value="NAGALAND">Nagaland</option>
                      <option value="ODISHA">Odisha</option>
                      <option value="PUNJAB">Punjab</option>
                      <option value="RAJASTHAN">Rajasthan</option>
                      <option value="SIKKIM">Sikkim</option>
                      <option value="TAMIL NADU">Tamil Nadu</option>
                      <option value="TELANGANA">Telangana</option>
                      <option value="TRIPURA">Tripura</option>
                      <option value="UTTAR PRADESH">Uttar Pradesh</option>
                      <option value="UTTARAKHAND">Uttarakhand</option>
                      <option value="WEST BENGAL">West Bengal</option>

                      
                      <option value="ANDAMAN AND NICOBAR">Andaman and Nicobar Islands</option>
                      <option value="CHANDIGARH">Chandigarh</option>
                      <option value="DADRA AND NAGAR HAVELI AND DAMAN AND DIU">Dadra and Nagar Haveli and Daman & Diu</option>
                      <option value="DELHI">Delhi</option>
                      <option value="JAMMU AND KASHMIR">Jammu & Kashmir</option>
                      <option value="LADAKH">Ladakh</option>
                      <option value="LAKSHADWEEP">Lakshadweep</option>
                      <option value="PUDUCHERRY">Puducherry</option>

                      <option value="OTHER">Other</option>

                    </select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm mb-1">Country</label>
                    <input
                      type="text"
                      value={permanentAddress.country || "INDIA"}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          country: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                </div>

                {/* ---------- PRESENT ADDRESS ---------- */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-sky-600 col-span-full">Present Address</h3>
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={sameAsPermanent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSameAsPermanent(checked);
                        if (checked) {
                          setPresentAddress(permanentAddress);
                        } else {
                          setPresentAddress({
                            street: "",
                            village: "",
                            city: "",
                            postOffice: "",
                            policeStation: "",
                            pinCode: "",
                            district: "",
                            state: "",
                            country: "INDIA",
                          });
                        }
                      }}
                    />
                    <span className="font-bold">Same as Permanent Address</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {[
                    "street",
                    "village",
                    "city",
                    "postOffice",
                    "policeStation",
                    "pinCode",
                    "district",
                    "state",
                    "country",
                  ].map((field, i) => (
                    <div key={i}>
                      <label className="block text-sm mb-1 capitalize">
                        {field === "pinCode"
                          ? "Pin Code *"
                          : field === "postOffice"
                          ? "Post Office"
                          : field === "policeStation"
                          ? "Police Station"
                          : field}
                      </label>
                      <input
                        type="text"
                        value={presentAddress[field] || ""}
                        onChange={(e) =>
                          setPresentAddress({
                            ...presentAddress,
                            [field]: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                  focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                      />
                    </div>
                  ))}
                </div>


                <div className="col-span-full flex justify-between mt-4">
                  <button
                    onClick={() => setStep(4)}
                    className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndNext} 
                    className="flex items-center gap-1 px-3 py-1 rounded text-white bg-sky-600 hover:bg-sky-700"
                  >
                    <span>Save & Next</span>
                    <span>→</span>
                  </button>
                </div>
              </>
            )}

            {step === 5 && (
            <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
              <h2 className="text-xl mb-3 font-semibold text-sky-600">
                Pay Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* <Input label="Basic Pay (*)" type="number" value={basicPay} onChange={setBasicPay} />

                <Select
                  label="PF Type (*)"
                  value={pfType}
                  onChange={setPfType}
                  options={["PF", "NPS","CPF","NA"]}
                /> */}

                <Input label="Passport No." value={passportNo} onChange={setPassportNo} />
                <Input label="PF No." value={pfNo} onChange={setPfNo} />
                <Input label="UAN No." value={uanNo} onChange={setUanNo} />
                <Input label="Pan No." value={panNo} onChange={setPanNo} />

                <Select
                  label="Bank Name (*)"
                  value={bankName}
                  onChange={setBankName}
              options={[
                      // --- PUBLIC SECTOR BANKS ---
                      "STATE BANK OF INDIA",
                      "PUNJAB NATIONAL BANK",
                      "BANK OF BARODA",
                      "CANARA BANK",
                      "UNION BANK OF INDIA",
                      "BANK OF INDIA",
                      "INDIAN BANK",
                      "CENTRAL BANK OF INDIA",
                      "UCO BANK",
                      "BANK OF MAHARASHTRA",
                      "INDIAN OVERSEAS BANK",
                      "PUNJAB & SIND BANK",
                      "FINO PAYMENTS BANK",

                      // --- PRIVATE SECTOR BANKS ---
                      "HDFC BANK",
                      "ICICI BANK",
                      "AXIS BANK",
                      "KOTAK MAHINDRA BANK",
                      "INDUSIND BANK",
                      "YES BANK",
                      "IDFC FIRST BANK",
                      "RBL BANK",
                      "FEDERAL BANK",
                      "CSB BANK",
                      "KARUR VYSYA BANK",
                      "SOUTH INDIAN BANK",
                      "CITY UNION BANK",
                      "DCB BANK",
                      "TAMILNAD MERCANTILE BANK",
                      "BANDHAN BANK",

                      // --- SMALL FINANCE BANKS ---
                      "AU SMALL FINANCE BANK",
                      "EQUITAS SMALL FINANCE BANK",
                      "UTKARSH SMALL FINANCE BANK",
                      "UJJIVAN SMALL FINANCE BANK",
                      "SURYODAY SMALL FINANCE BANK",
                      "ESAF SMALL FINANCE BANK",
                      "NORTH EAST SMALL FINANCE BANK",
                      "JANASEVA SMALL FINANCE BANK",
                    ]}
                />

             <Input 
                label="Branch (*)" 
                placeholder="Enter Branch Name" 
                value={branch} 
                // Change '(e) => ... e.target.value' to 'val => ... val'
                onChange={(val) => setBranch(val.toUpperCase())} 
              />
                <Input label="IFSC Code (*)" value={ifscCode} onChange={setIfscCode} />
                <Input label="Account No. (*)" value={accountNo} onChange={setAccountNo} />

                {/* <Select
                  label="Pay Level / Grade"
                  value={payLevel}
                  onChange={setPayLevel}
                  options={["LEVEL 1", "LEVEL 2", "LEVEL 3", "LEVEL 4"]}
                /> */}

                <Input label="Aadhar No." value={aadhaarNo} onChange={setAadhaarNo} />
              </div>

              {/* --- BUTTONS --- */}
              <div className="col-span-full flex justify-between mt-4">
                  <button
                    onClick={() => setStep(3)}
                    className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndNext} 
                    className="flex items-center gap-1 px-3 py-1 rounded text-white bg-sky-600 hover:bg-sky-700"
                  >
                    <span>Save & Next</span>
                    <span>→</span>
                  </button>
                </div>
            </div>
          )}

          {/* ---------- STEP 6 : PAY STRUCTURE ---------- */}
          {step === 6 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-sky-600 border-b pb-2">Pay Structure</h3>

              {/* Pay Type Selection */}
              <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="font-bold text-gray-700">Pay Type :</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payType"
                      value="SALARY"
                      checked={payType === 'SALARY'}
                      onChange={() => {
                        setPayType('SALARY');
                        calculatePayStructure(""); // Reset amount when switching to SALARY
                      }}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="font-medium">Salary</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payType"
                      value="Stipend"
                      checked={payType === 'Stipend'}
                      onChange={() => {
                        setPayType('Stipend');
                        calculatePayStructure(""); // Reset amount when switching to Stipend
                      }}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="font-medium">Stipend</span>
                  </label>
                </div>
              </div>

              {/* Salary / Stipend Input */}
              <div className="flex items-center gap-4 bg-sky-50 p-4 rounded-lg border border-sky-100">
                <label className="font-bold text-gray-700">
                  {payType === 'Stipend' ? 'Enter Stipend Amount :' : 'Enter Gross Salary :'}
                </label>
                <input
                  type="number"
                  value={grossSalary || ''}
                  className="border-2 border-sky-600 p-2 rounded w-48 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder={payType === 'Stipend' ? "e.g. 10000" : "e.g. 30000"}
                  onChange={(e) => calculatePayStructure(e.target.value)}
                />
              </div>

              {/* Tables: Only show if Pay Type is SALARY */}
              {payType === 'SALARY' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                  {/* Earnings Table */}
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-sky-600 text-white p-2 font-bold text-center">EARNINGS</div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 border-b text-left">Head Name</th>
                          <th className="p-2 border-b text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earningDetails.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="p-2 border-b font-semibold">{item.headName}</td>
                            <td className="p-2 border-b">
                              <input
                                type="number"
                                value={item.value ? Math.round(item.value) : ''}
                                className="w-full text-right border rounded p-1 font-semibold"
                                onChange={(e) => {
                                  const updated = [...earningDetails];
                                  updated[index].value = e.target.value;
                                  setEarningDetails(updated);
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Deductions Table */}
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-red-600 text-white p-2 font-bold text-center">DEDUCTIONS</div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 border-b text-left">Head Name</th>
                          <th className="p-2 border-b text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deductionDetails.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="p-2 border-b font-semibold">{item.headName}</td>
                            <td className="p-2 border-b">
                              <input
                                type="number"
                                value={item.value ? Math.round(item.value) : ''}
                                className="w-full text-right border rounded p-1 font-semibold"
                                onChange={(e) => {
                                  const updated = [...deductionDetails];
                                  updated[index].value = e.target.value;
                                  setDeductionDetails(updated);
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Stipend View Message */
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-500 italic">
                  Breakdown is not required for Stipend. The amount above will be recorded as a flat payment.
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="flex items-center gap-1 px-4 py-1.5 rounded text-white bg-sky-600 hover:bg-sky-700 transition-colors"
                >
                  Save & Next →
                </button>
              </div>
            </div>
          )}


          {/* ---------- STEP 7 : DOCUMENT MANAGEMENT ---------- */}
          {step === 7 && (
            <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
              <h3 className="text-xl font-semibold text-sky-600 mb-4">
                DOCUMENT MANAGEMENT
              </h3>

              <div className="border rounded p-4 mb-6">
                <h4 className="text-lg font-semibold mb-3">
                  Hard Copy Documents Collected
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm font-medium">
                  {[
                    ["aadhaar", "Aadhaar"],
                    ["pan", "PAN"],
                    ["bank", "Bank Passbook / Cheque"],
                    ["photograph", "Photograph"],
                    ["addressProof", "Address Proof"],
                    ["educationCertificates", "Education Certificates"],
                    ["experienceLetters", "Experience Letters"],
                    ["relievingLetter", "Relieving Letter"],
                    ["salarySlips", "Salary Slips"],
                    ["medicalFitness", "Medical Fitness"],
                    ["policeVerification", "Police Verification"],
                    ["vaccinationCertificate", "Vaccination Certificate"],
                    ["bloodGroupProof", "Blood Group Proof"],
                    ["pfForm", "PF Form"],
                    ["esiForm", "ESI Form"],
                    ["nda", "NDA / Agreement"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeData.hardCopyDocuments?.[key] || false}
                        onChange={(e) =>
                          setEmployeeData({
                            ...employeeData,
                            hardCopyDocuments: {
                              ...employeeData.hardCopyDocuments,
                              [key]: e.target.checked,
                            },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

             <div className="flex justify-between mt-6">
               <button
                    onClick={() => setStep(6)}
                    className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800"
                  >
                    ← Back
                  </button>
                 <form onSubmit={handleSubmit}>
                  {/* your full form fields here */}
                 <button
                    type="submit"
                    className={`flex items-center gap-1 px-3 py-1 rounded text-white ${
                      location.state?.employee ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    <span>{location.state?.employee ? "Update" : "Submit"}</span>
                    <span>→</span>
                  </button>

                </form>

              </div>
            </div>
          )}
          </div>
            </div>
          </div>
        </div>
        
      );
    };

const DateDisplayInput = ({
  value,
  onChange,
  readOnly = false,
  className = "",
  placeholder = "DD/MM/YYYY",
}) => {
  const [displayValue, setDisplayValue] = useState(formatDateToDisplay(value));

  useEffect(() => {
    setDisplayValue(formatDateToDisplay(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => {
        const nextDisplayValue = formatDateTypingValue(e.target.value);
        setDisplayValue(nextDisplayValue);

        if (!nextDisplayValue.trim()) {
          onChange && onChange("");
          return;
        }

        const parsedValue = parseDisplayDateToInput(nextDisplayValue);
        if (parsedValue) {
          onChange && onChange(parsedValue);
        }
      }}
      onBlur={() => {
        if (!displayValue.trim()) {
          setDisplayValue("");
          return;
        }

        const parsedValue = parseDisplayDateToInput(displayValue);
        if (parsedValue) {
          setDisplayValue(formatDateToDisplay(parsedValue));
        } else {
          setDisplayValue(formatDateToDisplay(value));
        }
      }}
      className={className}
    />
  );
};

// Input
const Input = ({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  dateDisplayFormat,
}) => (
  <div>
    <label className="block text-sm">{label}</label>
    {type === "date" && dateDisplayFormat === "DD/MM/YYYY" ? (
      <DateDisplayInput
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150 ${
          readOnly ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      />
    ) : (
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) =>
          onChange &&
          onChange(type === "text" ? e.target.value.toUpperCase() : e.target.value)
        }
        className={`w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150 ${
          readOnly ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      />
    )}
  </div>
);

// Select
const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150"
    >
      <option value="">-- Select --</option>
      {options.map((opt, i) => (
        <option key={i} value={typeof opt === "object" ? opt.value : opt}>
          {typeof opt === "object" ? opt.label : opt}
        </option>
      ))}
    </select>
  </div>
);

const SearchableSelect = ({ label, value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  const selected = options.find((opt) => opt.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((opt) => {
    const text = (opt.searchText || opt.label || "").toLowerCase();
    return text.includes(normalizedQuery);
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm">{label}</label>
      <button
        type="button"
        className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-150 bg-white"
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected ? selected.label : "-- Select --"}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded shadow">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No results</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onMouseDown={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-sky-50"
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default EmployeeMaster;



