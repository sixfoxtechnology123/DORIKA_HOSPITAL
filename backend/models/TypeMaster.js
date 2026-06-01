const mongoose = require('mongoose');

const typeMasterSchema = new mongoose.Schema({
    typeId: { type: String, required: true, unique: true }, // Format: TYPE-1
    typeName: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('TypeMaster', typeMasterSchema);