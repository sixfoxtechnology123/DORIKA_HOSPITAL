const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String },
    patientSearch: { type: String, default: '' },
    patientName: { type: String, default: '' },
    patientMobile: { type: String, default: '' },
    department: { type: String, required: true },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    appointmentDate: { type: String, required: true }, // YYYY-MM-DD
    selectedSlot: { type: String, default: '' },
    availableSlotsAtBooking: { type: [String], default: [] },
    bookingType: { type: String, enum: ['Slot', 'Walk-in'], default: 'Slot' },
    tokenAutoGenerate: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
    tokenNumber: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

appointmentSchema.index({ tokenNumber: 1 }, { unique: true });
appointmentSchema.index({ appointmentId: 1 }, { unique: true, sparse: true });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
