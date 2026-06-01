const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, unique: true }, // DP-1 or HP-1
  type: { type: String, enum: ['Digital', 'Handwritten'], required: true },
  doctor: { type: String, required: true }, // store doctorId like DOC-0001
  patient: { type: String, required: true }, // store patientId like P1
  visitDate: { type: Date, default: Date.now },
  // Vitals
  vitals: {
    bp: String,
    weight: String,
    temp: String,
    sugar: String
  },
  // Clinical
  clinical: {
    symptoms: String,
    diagnosis: String,
    advice: String
  },
  medicines: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  // Handwritten specific
  uploadUrl: String,
  description: String,
  nextVisitDate: Date
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);
