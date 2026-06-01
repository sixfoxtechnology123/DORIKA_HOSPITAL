const mongoose = require('mongoose');

const visitHistorySchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, default: '' },
    appointmentId: { type: String, default: '' },
    invoiceNo: { type: String, default: '' },
    visitDate: { type: String, required: true }, // YYYY-MM-DD
    doctorId: { type: String, default: '' },
    doctorName: { type: String, default: '' },
    department: { type: String, default: '' },
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
    prescriptionUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

const billingHistorySchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, default: '' },
    appointmentId: { type: String, default: '' },
    invoiceNo: { type: String, required: true },
    billDate: { type: String, required: true }, // YYYY-MM-DD
    doctorId: { type: String, default: '' },
    doctorName: { type: String, default: '' },
    department: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
    paymentMode: { type: String, default: '' }
  },
  { timestamps: true }
);

const pharmacyHistorySchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, default: '' },
    billNo: { type: String, required: true },
    medicinesPurchased: { type: String, required: true },
    amount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dob: { type: String }, // YYYY-MM-DD
    age: { type: Number },
    mobileNumber: { type: String, required: true, trim: true },
    alternateMobile: { type: String, trim: true },
    address: { type: String, trim: true },
    villageTown: { type: String, trim: true },
    postOffice: { type: String, trim: true },
    policeStation: { type: String, trim: true },
    district: { type: String, trim: true },
    stateName: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    allergies: { type: String, trim: true },
    knownMedicalConditions: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactNumber: { type: String, trim: true },
    department: { type: String, trim: true },
    appointmentId: { type: String, trim: true },
    notes: { type: String, trim: true },
    visitHistory: { type: [visitHistorySchema], default: undefined },
    billingHistory: { type: [billingHistorySchema], default: undefined },
    pharmacyHistory: { type: [pharmacyHistorySchema], default: undefined }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
