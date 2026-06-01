const mongoose = require('mongoose');

const ConsultationBillSchema = new mongoose.Schema(
  {
    billId: { type: String, unique: true },
    patientName: { type: String, required: true },
    patientPhone: { type: String, default: '' },
    appointmentRef: { type: String },
    doctorName: { type: String },
    consultationFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConsultationBill', ConsultationBillSchema);
