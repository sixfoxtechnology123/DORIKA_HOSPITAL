const mongoose = require('mongoose');

const medicineCategorySchema = new mongoose.Schema(
  {
    category_id: { type: String, required: true, unique: true },
    category_name: { type: String, required: true, unique: true },
    type: { type: String, default: '', trim: true },
    // description: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicineCategory', medicineCategorySchema);
