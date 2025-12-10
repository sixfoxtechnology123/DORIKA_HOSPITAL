const mongoose = require("mongoose");

const EducationSchema = new mongoose.Schema({
  qualification: { type: String, default: "" },
  discipline: { type: String, default: "" },
  institute: { type: String, default: "" },
  board: { type: String, default: "" },
  year: { type: String, default: "" },
  percentage: { type: String, default: "" },
  grade: { type: String, default: "" },
});

const NomineeSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  relationship: { type: String, default: "" },
  dob: { type: String, default: "" },
  share: { type: String, default: "" },
  address: { type: String, default: "" },
});

const MedicalSchema = new mongoose.Schema({
  bloodGroup: { type: String, default: "" },
  eyeSightLeft: { type: String, default: "" },
  eyeSightRight: { type: String, default: "" },
  familyPlanStatus: { type: String, default: "" },
  familyPlanDate: { type: String, default: "" },
  height: { type: String, default: "" },
  weight: { type: String, default: "" },
  identification1: { type: String, default: "" },
  identification2: { type: String, default: "" },
  physicallyChallenged: { type: String, default: "" },
});

const AddressSchema = new mongoose.Schema({
  street: { type: String, default: "" },
  village: { type: String, default: "" },
  city: { type: String, default: "" },
  postOffice: { type: String, default: "" },
  policeStation: { type: String, default: "" },
  pinCode: { type: String, default: "" },
  district: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "INDIA" },
  mobile: { type: String, default: "" },
  email: { type: String, default: "" },
});

const EarningSchema = new mongoose.Schema({
  headName: { type: String, default: "" },
  headType: { type: String, default: "" },
  value: { type: Number, default: 0 },
});

const DeductionSchema = new mongoose.Schema({
  headName: { type: String, default: "" },
  headType: { type: String, default: "" },
  value: { type: Number, default: 0 },
});

const PayDetailsSchema = new mongoose.Schema({
  // basicPay: { type: Number, default: 0 },
  // pfType: { type: String, default: "" },
  passportNo: { type: String, default: "" },
  //pfNo: { type: String, default: "" },
  uanNo: { type: String, default: "" },
  panNo: { type: String, default: "" },
  bankName: { type: String, default: "" },
  branch: { type: String, default: "" },
  ifscCode: { type: String, default: "" },
  accountNo: { type: String, default: "" },
  //payLevel: { type: String, default: "" },
  aadhaarNo: { type: String, default: "" },
});

const EmployeeSchema = new mongoose.Schema(
  {
    // Personal & Service
    employeeID: { type: String, required: true, unique: true },
    salutation: { type: String, default: "" },
    firstName: { type: String, default: "" },
    middleName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    fatherName: { type: String, default: "" },
    spouseName: { type: String, default: "" },
    caste: { type: String, default: "" },
    subCaste: { type: String, default: "" },
    religion: { type: String, default: "" },
    maritalStatus: { type: String, default: "No" },

    departmentName: { type: String, default: "" }, // store department name
  designationName: { type: String, default: "" },

    dob: { type: String, default: "" },
    dor: { type: String, default: "" },
    doj: { type: String, default: "" },
    confirmationDate: { type: String, default: "" },
    nextIncrementDate: { type: String, default: "" },
    eligiblePromotion: { type: String, default: "" },
    employmentType: { type: String, default: "" },

     profileImage: {
    data: Buffer,
    contentType: String
  },

    reportingAuthority: { type: String, default: "" },
    leaveAuthority: { type: String, default: "" },


    educationDetails: { type: [EducationSchema], default: [] },
    nominees: { type: [NomineeSchema], default: [] },
    medical: { type: MedicalSchema, default: {} },

    permanentAddress: { type: AddressSchema, default: {} },
    presentAddress: { type: AddressSchema, default: {} },

    payDetails: { type: PayDetailsSchema, default: {} },
    earnings: { type: [EarningSchema], default: [] },
    deductions: { type: [DeductionSchema], default: [] },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
