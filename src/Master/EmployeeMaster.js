import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../component/Sidebar";
import BackButton from "../component/BackButton";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";


const EmployeeMaster = () => {
  const location = useLocation();
  const { employee, id } = location.state || {};
  const [employeeUserId, setEmployeeUserId] = useState("");
  const isEditMode = Boolean(employee?._id);
  const [initialEmploymentStatus, setInitialEmploymentStatus] = useState("");
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");
  const [reportingManagerEmpID, setReportingManagerEmpID] = useState("");
  const [departmentHeadEmpID, setDepartmentHeadEmpID] = useState("");
  
const [departmentID, setDepartmentID] = useState("");
const [departmentName, setDepartmentName] = useState("");
const [designationID, setDesignationID] = useState("");


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
});

  const [step, setStep] = useState(1);
  const [employeeID, setEmployeeID] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [governmentRegistrationNumber, setGovernmentRegistrationNumber] = useState("");
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

  const [educationDetails, setEducationDetails] = useState([
    {
      qualification: "",
      discipline: "",
      institute: "",
      board: "",
      year: "",
      percentage: "",
      grade: "",
    },
  ]);
    // Step 3 States
const [nomineeDetails, setNomineeDetails] = useState([
    { name: "", relation: "", share: "", age: "", address: "" },
  ]);
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
        const res = await axios.get("http://localhost:5002/api/salary-heads/salary-list");
        if (Array.isArray(res.data)) {
          setAllHeads(res.data);
        } else if (Array.isArray(res.data.data)) {
          setAllHeads(res.data.data);
        } else {
          console.error("Invalid salary heads format", res.data);
          toast.error("Invalid salary heads data");
        }
      } catch (err) {
        console.error(err);
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

  // NEW employee → generate full new ID
  if (!isEditMode) {
    axios
      .get("http://localhost:5002/api/employees/next-id", {
        params: { employmentStatus },
      })
      .then(res => {
        setEmployeeID(res.data.employeeID || "");
        setEmployeeUserId(res.data.employeeUserId || "");
      });
    return;
  }

  // EDIT employee → change PREFIX ONLY
  if (employmentStatus !== initialEmploymentStatus && employeeID) {
    const numberPart = employeeID.split("-")[1] || employeeID.slice(2);
    setEmployeeID(`${employmentStatus}-${numberPart}`);
  }
}, [employmentStatus]);



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
  if (employee && departments.length && designations.length) {
    const dept = departments.find(d => d.value === employee.departmentID);
    setDepartmentID(dept?._id || "");
    setSelectedDepartmentName(dept?.deptName || "");

    const desig = designations.find(d => d.value === employee.designationID);
    setDesignationID(desig?._id || "");
  }
}, [employee, departments, designations]);



useEffect(() => {
  // Only proceed if employee data is available
  if (employee) {
    // 1. Basic Info
    setEmployeeID(employee.employeeID || "");
    setEmployeeUserId(employee.employeeUserId || "");
    setInitialEmploymentStatus(employee.employmentStatus);
    setEmploymentStatus(employee.employmentStatus);
    setGovernmentRegistrationNumber(employee.governmentRegistrationNumber || "");
    setSalutation(employee.salutation || "");
    setFirstName(employee.firstName || "");
    setMiddleName(employee.middleName || "");
    setLastName(employee.lastName || "");
    setFatherName(employee.fatherName || "");
    setSpouseName(employee.spouseName || "");
    setCaste(employee.caste || "");
    setSubCaste(employee.subCaste || "");
    setReligion(employee.religion || "");
    setMaritalStatus(employee.maritalStatus || "");
    setGender(employee.gender || "");

    // 2. Department & Designation Prefill (Matching by Name)
    if (departments.length > 0) {
      const foundDept = departments.find(d => d.label === employee.departmentName);
      if (foundDept) {
        setDepartmentID(foundDept.value);
        setSelectedDepartmentName(foundDept.label);
      }
    }

    if (designations.length > 0) {
      const foundDesig = designations.find(d => d.label === employee.designationName);
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

      setReportingManager(findIdByName(employee.reportingManager));
      setdepartmentHead(findIdByName(employee.departmentHead));
    }
    setReportingManagerEmpID(employee.reportingManagerEmpID || "");
    setDepartmentHeadEmpID(employee.departmentHeadEmpID || "");
// 4. Dates & Employment
    setDob(employee.dob || "");
    setDor(employee.dor || "");
    setDoj(employee.doj || "");
    
    // ALWAYS show current date, even when editing
    setStatusChangeDate(new Date().toISOString().split("T")[0]);

    setConfirmationDate(employee.confirmationDate || "");
    setNextIncrementDate(employee.nextIncrementDate || "");
    setEligiblePromotion(employee.eligiblePromotion || "");
    setEmploymentType(employee.employmentType || "");
    setProfileImage(employee.profileImage || null);
    setConfirmationDate(employee.confirmationDate || "");
    setNextIncrementDate(employee.nextIncrementDate || "");
    setEligiblePromotion(employee.eligiblePromotion || "");
    setEmploymentType(employee.employmentType || "");
    setProfileImage(employee.profileImage || null);

    // 5. Education & Nominees
    setEducationDetails(employee.educationDetails || []);
    setNomineeDetails(
      (employee.nominees || []).map((n) => ({
        name: n.name || "",
        relation: n.relationship || "",
        share: n.share || "",
        age: n.age || "",
        address: n.address || "",
        dob: n.dob || "",
      }))
    );

    // 6. Medical Details
    setBloodGroup(employee.medical?.bloodGroup || "");
    setEyeSightLeft(employee.medical?.eyeSightLeft || "");
    setEyeSightRight(employee.medical?.eyeSightRight || "");
    setFamilyPlanStatus(employee.medical?.familyPlanStatus || "");
    setFamilyPlanDate(employee.medical?.familyPlanDate || "");
    setHeight(employee.medical?.height || "");
    setWeight(employee.medical?.weight || "");
    setIdentificationMark1(employee.medical?.identification1 || "");
    setIdentificationMark2(employee.medical?.identification2 || "");
    setPhysicallyChallenged(employee.medical?.physicallyChallenged || "");

    // 7. Address
    setPermanentAddress(employee.permanentAddress || {});
    setPresentAddress(employee.presentAddress || {});

    // 8. Pay Details
    setBasicPay(employee.payDetails?.basicPay || "");
    setPfType(employee.payDetails?.pfType || "");
    setPassportNo(employee.payDetails?.passportNo || "");
    setPfNo(employee.payDetails?.pfNo || "");
    setUanNo(employee.payDetails?.uanNo || "");
    setPanNo(employee.payDetails?.panNo || "");
    setBankName(employee.payDetails?.bankName || "");
    setBranch(employee.payDetails?.branch || "");
    setIfscCode(employee.payDetails?.ifscCode || "");
    setAccountNo(employee.payDetails?.accountNo || "");
    setPayLevel(employee.payDetails?.payLevel || "");
    setAadhaarNo(employee.payDetails?.aadhaarNo || "");
    setEarningDetails(employee.earnings || []);
    setDeductionDetails(employee.deductions || []);

    // 9. Document Checkboxes
    const hardCopyDocsObj = {};
    const docKeys = [
      "aadhaar", "pan", "bank", "photograph", "addressProof", "educationCertificates",
      "experienceLetters", "relievingLetter", "salarySlips", "medicalFitness",
      "policeVerification", "vaccinationCertificate", "bloodGroupProof", "pfForm", "esiForm", "nda"
    ];
    docKeys.forEach(key => {
      hardCopyDocsObj[key] = employee.hardCopyDocuments?.includes(key) || false;
    });

    setEmployeeData(prev => ({
      ...prev,
      hardCopyDocuments: hardCopyDocsObj,
    }));
  }
}, [employee, departments, designations, employees]);



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
    const res = await axios.get("http://localhost:5002/api/employees/next-id");
    setEmployeeID(res.data.nextEmployeeID);
  } catch (err) {
    console.error("Failed to get next employee ID", err);
  }
};


const loadMasters = async () => {
  try {
    const [deptRes, desigRes] = await Promise.all([
      axios.get("http://localhost:5002/api/departments"),
      axios.get("http://localhost:5002/api/designations"),
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
    departmentName: d.departmentName // ✅ Important for filtering
  }))
);


  } catch (err) {
    console.error("Error fetching master data:", err);
  }
};

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/employees");
      setEmployees(res.data); // store all employees
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };
  useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:5002/api/employees");
      setEmployees(res.data); // store all employees
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  fetchEmployees();
}, []);


  const handleFileChange = (e) => setProfileImage(e.target.files[0]);

  const handleAddRow = () =>
    setEducationDetails([
      ...educationDetails,
      {
        qualification: "",
        discipline: "",
        institute: "",
        board: "",
        year: "",
        percentage: "",
        grade: "",
      },
    ]);

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
  governmentRegistrationNumber,

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


departmentID: departmentID,
designationID: designationID,



  dob,
  dor,
  doj,
  statusChangeDate: statusChangeDate,
  confirmationDate,
  nextIncrementDate,
  eligiblePromotion,
  employmentType,
  profileImage,
  reportingManager: getEmployeeName(reportingManager),
  reportingManagerEmpID: reportingManagerEmpID,
  departmentHead: getEmployeeName(departmentHead),
  departmentHeadEmpID: departmentHeadEmpID,
  educationDetails,
  nominees: nomineeDetails.map(n => ({
  name: n.name,
  relationship: n.relation, // map frontend 'relation' to backend 'relationship'
  dob: n.dob,
  share: n.share,
  address: n.address
})),

  medical: {
    bloodGroup,
    eyeSightLeft,
    eyeSightRight,
    familyPlanStatus,
    familyPlanDate,
    height,
    weight,
    identification1: identificationMark1,
    identification2: identificationMark2,
    physicallyChallenged,
  },
  permanentAddress,
  presentAddress,
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
  earnings: earningDetails,
  deductions: deductionDetails,
  hardCopyDocuments: employeeData.hardCopyDocuments,

};

const handleSaveAndNext = async () => {
  try {
    if (employeeData._id) {
      // update existing employee
      await axios.put(
        `http://localhost:5002/api/employees/${employeeData._id}`,
        payload
      );
    } else {
      // create first time
      const res = await axios.post(
        "http://localhost:5002/api/employees",
        payload
      );
      setEmployeeData(res.data); // store _id for next steps
    }
    localStorage.setItem("employeeID", employeeID);

    setStep(step + 1); // go to next page
  } catch (err) {
    console.error("Error saving:", err);
    toast.error("Failed to save step");
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    if (employeeData._id) {
      await axios.put(
        `http://localhost:5002/api/employees/${employeeData._id}`,
        payload
      );
      toast.success("Employee updated successfully!");
    } else {
      const res = await axios.post(
        "http://localhost:5002/api/employees",
        payload
      );
      setEmployeeData(res.data); // store _id
      toast.success("Employee saved successfully!");
    }

    navigate("/EmployeeList");
  } catch (err) {
    console.error(err);
   if (err.response && err.response.data && err.response.data.error) {
      toast.error(err.response.data.error); // shows "Please select Employment Status"
    } else {
      toast.error("Failed to save employee");
    }}
};


  return (
    <div className="min-h-screen bg-zinc-300 flex">
        <Sidebar />

        <div className="flex-1 p-3 overflow-y-auto">
          <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
          {/* ===================== STEP 1 ===================== */}


         <div className="flex items-center font-semibold gap-2 border-b border-gray-300 mb-4 pb-2 flex-wrap">
          {["Personal & Service details", "Education", "Nominees/Medical/Address", "Pay Details", "Pay Structure","Doccument"].map((s, i) => (
            <React.Fragment key={i}>
              <div
                className={`cursor-pointer px-3 py-0 rounded ${
                  step === i + 1 ? "bg-blue-600 font-semibold text-white" : "text-black hover:text-blue-600"
                }`}
                onClick={() => setStep(i + 1)}
              >
                {s}
              </div>
              {i < 5 && (
                <span className="text-gray-400 select-none">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
          {step === 1 && (
            <>
              <h2 className="text-2xl font-semibold mb-4 text-center text-black">
                Employee
              </h2>

              <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                Personal Details
              </h3>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                 <Input label="Employee ID" value={employeeID} readOnly />
                <Input 
                    label="Employee UserID" 
                    value={employeeUserId} 
                    readOnly={true} 
                  />

                <Input
                  label="Government Registration Number"
                  value={governmentRegistrationNumber}
                  onChange={(val) => setGovernmentRegistrationNumber(val.toUpperCase())}
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
                    setFirstName(val.replace(/\s/g, "").toUpperCase())
                  }
                />
                <Input
                  label="Middle Name"
                  value={middleName}
                  onChange={(val) =>
                    setMiddleName(val.replace(/\s/g, "").toUpperCase())
                  }
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(val) =>
                    setLastName(val.replace(/\s/g, "").toUpperCase())
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
                />
                <Input
                  type="date"
                  label="Date of Retirement"
                  readOnly
                  value={dor}
                  onChange={setDor}
                />
                <Input
                  type="date"
                  label="Date of Joining *"
                  value={doj}
                  onChange={setDoj}
                />
                <Input
                  type="date"
                  label="Employee Status Change Date"
                  value={statusChangeDate || doj} // default to Date of Joining
                  onChange={setStatusChangeDate}
                />

                <Input
                  type="date"
                  label="Confirmation Date"
                  value={confirmationDate}
                  onChange={setConfirmationDate}
                />
                <Input
                  type="date"
                  label="Next Increment Date"
                  value={nextIncrementDate}
                  onChange={setNextIncrementDate}
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
              <Select
                  label="Reporting Manager"
                  value={reportingManagerEmpID} // Bind to ID
                  onChange={(val) => {
                    setReportingManagerEmpID(val);
                    const emp = employees.find((e) => e.employeeID === val);
                    if (emp) {
                      setReportingManager(`${emp.firstName} ${emp.lastName}`.trim());
                    }
                  }}
                  options={employees.map((e) => ({
                    value: e.employeeID,
                    label: `${e.firstName} ${e.lastName} (${e.employeeID})`,
                  }))}
                />

                <Select
                  label="Department Head"
                  value={departmentHeadEmpID} // Bind to ID
                  onChange={(val) => {
                    setDepartmentHeadEmpID(val);
                    const emp = employees.find((e) => e.employeeID === val);
                    if (emp) {
                      setdepartmentHead(`${emp.firstName} ${emp.lastName}`.trim());
                    }
                  }}
                  options={employees.map((e) => ({
                    value: e.employeeID,
                    label: `${e.firstName} ${e.lastName} (${e.employeeID})`,
                  }))}
                />
                <div className="col-span-full flex justify-between mt-4">
                  <BackButton />
                  <button
                    type="button"
                     onClick={handleSaveAndNext} 
                    className="flex items-center gap-1 px-3 py-1 rounded text-white bg-sky-600 hover:bg-sky-700"
                  >
                    <span>Save</span>
                    <span>&</span>
                    <span>Next</span>
                    <span>→</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ===================== STEP 2 ===================== */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold text-sky-600 col-span-full">
                Educational Details
              </h2>

              <table className="w-full border border-gray-400 text-sm mb-4">
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
                          value={row.qualification}
                          onChange={(e) =>
                            handleEduChange(
                              index,
                              "qualification",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="w-full pl-2 pr-1 border border-gray-300 font-medium rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        >
                          <option value="">SELECT</option>
                          <option value="10TH">10TH</option>
                          <option value="12TH">12TH</option>
                          <option value="GRADUATION">GRADUATION</option>
                          <option value="POST GRADUATION">
                            POST GRADUATION
                          </option>
                        </select>
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
                      <td className="border p-2 flex text-center">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="col-span-full flex justify-between mt-4">
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
                  <span>→</span>
                </button>
              </div>
            </>
          )}
          {/* ===================== STEP 3 ===================== */}
            {step === 3 && (
              <>
                {/* <h2 className="text-2xl font-bold mb-4 text-center text-black">
                  Nominee, Medical & Address Details
                </h2> */}

                {/* ---------- NOMINEE DETAILS ---------- */}
                <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                  Nominee Details
                </h3>
                <table className="w-full border border-gray-400 text-sm mb-4">
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
                        <input
                          type="date"
                          value={row.dob}
                          onChange={(e) =>
                            setNomineeDetails((prev) => {
                              const updated = [...prev];
                              updated[index].dob = e.target.value;
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
                              { name: "", relation: "", dob: "", share: "", address: "" },
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

                {/* ---------- MEDICAL DETAILS ---------- */}
                  <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                    Medical Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                      <input
                        type="date"
                        value={familyPlanDate}
                        onChange={(e) => setFamilyPlanDate(e.target.value)}
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

                  {/* Mobile */}
                  <div>
                    <label className="block text-sm mb-1">Mobile No.</label>
                    <input
                      type="text"
                      value={permanentAddress.mobile || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          mobile: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none 
                                focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input
                      type="email"
                      value={permanentAddress.email || ""}
                      onChange={(e) =>
                        setPermanentAddress({
                          ...permanentAddress,
                          email: e.target.value.toLowerCase(), // Keep lowercase for valid email format
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
                            mobile: "",
                            email: "",
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
                    "mobile",
                    "email",
                  ].map((field, i) => (
                    <div key={i}>
                      <label className="block text-sm mb-1 capitalize">
                        {field === "pinCode"
                          ? "Pin Code *"
                          : field === "postOffice"
                          ? "Post Office"
                          : field === "policeStation"
                          ? "Police Station"
                          : field === "mobile"
                          ? "Mobile No."
                          : field === "email"
                          ? "Email"
                          : field}
                      </label>
                      <input
                        type={field === "email" ? "email" : "text"}
                        value={presentAddress[field] || ""}
                        onChange={(e) =>
                          setPresentAddress({
                            ...presentAddress,
                            [field]:
                              field === "email"
                                ? e.target.value.toLowerCase()
                                : e.target.value.toUpperCase(),
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
              </>
            )}

            {step === 4 && (
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
                {/* <Input label="PF No." value={pfNo} onChange={setPfNo} /> */}
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

          {/* ---------- STEP 5 : PAY STRUCTURE ---------- */}
            {step === 5 && (
            <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
              <h3 className="text-xl font-semibold text-sky-600 col-span-full">
                PAY STRUCTURE
              </h3>

              {/* ===== EARNING TABLE ===== */}
              <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm">EARNING</h4>
              <table className="w-full border border-gray-300 mb-6 text-sm font-medium">
                <thead className="bg-sky-100">
                  <tr>
                    <th className="border p-2 w-16">SL.NO.</th>
                    <th className="border p-2">HEAD NAME</th>
                    <th className="border p-2">HEAD TYPE</th>
                    <th className="border p-2">VALUE</th>
                    <th className="border p-2 w-20 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {earningDetails.map((row, index) => (
                    <tr key={index} className="even:bg-gray-50">
                      <td className="border p-2 text-center">{index + 1}</td>

                      {/* Head Name */}
                     <td className="border p-2">
                  <select
                      value={row.headName}
                      onChange={(e) => {
                        const updated = [...earningDetails];
                        updated[index].headName = e.target.value;
                        setEarningDetails(updated);
                      }}
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase"
                    >
                      <option value="">SELECT</option>
                      {earningHeads.map(head => (
                        <option key={head._id} value={head.headName}>{head.headName}</option>
                      ))}
                    </select>
                    </td>


                      {/* Head Type */}
                      <td className="border p-2">
                        <select
                          value={row.headType}
                          onChange={(e) => {
                            const updated = [...earningDetails];
                            updated[index].headType = e.target.value.toUpperCase();
                            setEarningDetails(updated);
                          }}
                          className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase"
                        >
                          <option value="">SELECT</option>
                          <option value="FIXED">FIXED</option>
                          <option value="VARIABLE">VARIABLE</option>
                        </select>
                      </td>

                      {/* Value */}
                      <td className="border p-2">
                        <input
                          type="number"
                          value={row.value}
                          onChange={(e) => {
                            const updated = [...earningDetails];
                            updated[index].value = e.target.value;
                            setEarningDetails(updated);
                          }}
                          className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>

                      {/* Action Buttons */}
                      <td className="border p-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setEarningDetails([
                              ...earningDetails,
                              { headName: "", headType: "", value: "" },
                            ])
                          }
                          className="bg-green-500 hover:bg-green-600 text-white px-2 rounded mr-1"
                        >
                          +
                        </button>
                        {earningDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setEarningDetails(earningDetails.filter((_, i) => i !== index))
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

              {/* ===== DEDUCTION TABLE ===== */}
              <h4 className="text-lg font-semibold text-white mb-2 pl-2 bg-blue-700 rounded-sm">DEDUCTION</h4>
              <table className="w-full border border-gray-300 mb-6 text-sm font-medium">
                <thead className="bg-sky-100">
                  <tr>
                    <th className="border p-2 w-16">SL.NO.</th>
                    <th className="border p-2">HEAD NAME</th>
                    <th className="border p-2">HEAD TYPE</th>
                    <th className="border p-2">VALUE</th>
                    <th className="border p-2 w-20 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {deductionDetails.map((row, index) => (
                    <tr key={index} className="even:bg-gray-50">
                      <td className="border p-2 text-center">{index + 1}</td>

                     {/* Head Name */}
                    <td className="border p-2">
                      <select
                      value={row.headName}
                      onChange={(e) => {
                        const updated = [...deductionDetails];
                        updated[index].headName = e.target.value;
                        setDeductionDetails(updated);
                      }}
                      className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase"
                    >
                      <option value="">SELECT</option>
                      {deductionHeads.map(head => (
                        <option key={head._id} value={head.headName}>{head.headName}</option>
                      ))}
                    </select>
                    </td>

                      {/* Head Type */}
                      <td className="border p-2">
                        <select
                          value={row.headType}
                          onChange={(e) => {
                            const updated = [...deductionDetails];
                            updated[index].headType = e.target.value.toUpperCase();
                            setDeductionDetails(updated);
                          }}
                          className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150 uppercase"
                        >
                          <option value="">SELECT</option>
                          <option value="FIXED">FIXED</option>
                          <option value="VARIABLE">VARIABLE</option>
                        </select>
                      </td>

                      {/* Value */}
                      <td className="border p-2">
                        <input
                          type="number"
                          value={row.value}
                          onChange={(e) => {
                            const updated = [...deductionDetails];
                            updated[index].value = e.target.value;
                            setDeductionDetails(updated);
                          }}
                          className="w-full pl-2 pr-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-all duration-150"
                        />
                      </td>

                      {/* Action Buttons */}
                      <td className="border p-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setDeductionDetails([
                              ...deductionDetails,
                              { headName: "", headType: "", value: "" },
                            ])
                          }
                          className="bg-green-500 hover:bg-green-600 text-white px-2 rounded mr-1"
                        >
                          +
                        </button>
                        {deductionDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeductionDetails(deductionDetails.filter((_, i) => i !== index))
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

              {/* ===== NEXT/BACK BUTTONS ===== */}
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


                {/* ---------- STEP 6 : DOCUMENT MANAGEMENT ---------- */}
          {step === 6 && (
            <div className="bg-white min-h-screen shadow-lg rounded-lg p-4 w-full">
              <h3 className="text-xl font-semibold text-sky-600 mb-4">
                DOCUMENT MANAGEMENT
              </h3>

              <div className="border rounded p-4 mb-6">
                <h4 className="text-lg font-semibold mb-3">
                  Hard Copy Documents Collected
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm font-medium">
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
                    onClick={() => setStep(4)}
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
        
      );
    };

// Input
const Input = ({ label, value, onChange, type = "text", readOnly = false }) => (
  <div>
    <label className="block text-sm">{label}</label>
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


export default EmployeeMaster;
