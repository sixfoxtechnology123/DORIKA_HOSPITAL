const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  deptCode: { type: String, required: true, unique: true },
  deptName: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: false });

module.exports = mongoose.model('Department_Master', departmentSchema);
