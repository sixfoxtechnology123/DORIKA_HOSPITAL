const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
  designationID: { type: String, required: true, unique: true },
  designationName: { type: String, required: true, unique: true },
  departmentName: { type: String, required: true }, // store department name directly
  grade: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
});

module.exports = mongoose.model('Designation_Master', designationSchema);
