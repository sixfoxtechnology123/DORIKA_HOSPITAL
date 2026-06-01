const mongoose = require('mongoose');

const roundVal = (v) => Math.round(Number(v || 0));

const pharmacyBillSchema = new mongoose.Schema(
  {
    bill_id: { type: String, unique: true, index: true },
    patient_name: { type: String, required: true, trim: true },
    patient_type: { type: String, enum: ['inside', 'outside'], default: 'outside' },
    phone_number: { type: String },
    doctor_name: { type: String },
    prescription_id: { type: String, default: null },
    payment_mode: { type: String, default: 'Cash' },
    payment_breakdown: [
      {
        mode: { type: String },
        amount: { type: Number, default: 0 }
      }
    ],
    items: [
      {
        medicine_id: { type: String, required: true },
        stock_id: { type: String, default: '' },
        generic_id: { type: String, default: '' },
        medicine_name: { type: String },
        batch_number: { type: String, default: '', uppercase: true, trim: true },
        expiry_date: { type: String, default: '' },
        qty: { type: Number, required: true},
       per_medicine_mrp: Number,
        discount_percent: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        gst_percent: { type: Number, default: 0 },
        taxable_value: { type: Number, default: 0 }, 
    
        gst_amount: { type: Number, default: 0 }, // REMOVED roundVal
        total: { type: Number, default: 0 }
      }
    ],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    overall_discount_amount: { type: Number, default: 0 },
    gst_amount: { type: Number, default: 0 },
    total_line_discount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    billing_date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

pharmacyBillSchema.pre('save', async function () {
  if (!this.isNew || this.bill_id) return;

  const last = await this.constructor.findOne().sort({ createdAt: -1 }).select('bill_id');
  let seq = 1;
  if (last && last.bill_id) {
    const parts = last.bill_id.split('-');
    const lastSeq = parseInt(parts[1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  this.bill_id = `PB-${seq}`;
});

module.exports = mongoose.model('PharmacyBill', pharmacyBillSchema);
