const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    supplier_id: { type: String, required: true, unique: true },
    supplier_name: { type: String, required: true, unique: true },
    contact_person: { type: String, default: '' },
    mobile_number: { type: String, default: '' },
    email: { type: String, default: '' },
    village_town: { type: String, default: '' },
    po: { type: String, default: '' },
    ps: { type: String, default: '' },
    district: { type: String, default: '' },
    pin: { type: String, default: '' },
    state: { type: String, default: '' },
    GST_number: { type: String, default: '' },
    drug_license_number: { type: String, default: '' },
    payment_terms: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
