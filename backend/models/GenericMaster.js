const mongoose = require('mongoose');

const genericMasterSchema = new mongoose.Schema({
    genericId: { type: String, required: true, unique: true }, // Format: GEN-1
    type: { type: String, required: true },
    category: { type: String, required: true },
    genericName: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('GenericMaster', genericMasterSchema);