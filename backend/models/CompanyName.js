const mongoose = require('mongoose');

const companyNameSchema = new mongoose.Schema({
    companyId: { type: String, required: true, unique: true }, // Format: COMP-1
    companyName: { type: String, required: true },
    contactName: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('CompanyName', companyNameSchema);
