const mongoose = require('mongoose');

const unitMeasurementSchema = new mongoose.Schema(
  {
    unit_id: { type: String, required: true, unique: true },
    base_unit_name: { type: String, required: true, unique: false },
    purchase_unit_name: { type: String, required: false },
    status: { 
      type: String, 
      enum: ['Active', 'Inactive'], 
      default: 'Active' 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UnitMeasurement', unitMeasurementSchema);
