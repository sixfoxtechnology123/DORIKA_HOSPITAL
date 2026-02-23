const mongoose = require('mongoose');

const QualificationSchema = new mongoose.Schema({
    qualCode: { type: String, required: true, unique: true },
    qualName: { type: String, required: true },
    status: { type: String, default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Qualification', QualificationSchema);