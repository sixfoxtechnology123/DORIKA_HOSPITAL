const mongoose = require('mongoose');

const feeHistorySchema = new mongoose.Schema({
  consultationFee: { type: Number, required: true },
  revenueShareType: { type: String, enum: ['Percentage', 'Fixed'], required: true },
  doctorShare: { type: Number, required: true },
  centerShare: { type: Number, required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: false }
});

const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, required: true, unique: true },
  prefix: { type: String, default: 'DR' },
  doctorName: { type: String, required: true },
  dob: { type: String },
  qualification: { type: String, required: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'TRANSGENDER'] },
  // specialization: { type: String },
  registrationNumber: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String },
  department: { type: String, required: true },
  // Address Fields
  vill: { type: String },
  po: { type: String },
  ps: { type: String },
  dist: { type: String },
  stateName: { type: String },
  pin: { type: String },
  // Status & Dates
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  joiningDate: { type: String, required: true },
  terminationDate: { type: String },
  // Fee & History
  consultationFee: { type: Number }, // Current Fee
  feeHistory: [feeHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
