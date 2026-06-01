const mongoose = require('mongoose');

const SpecializationSchema = new mongoose.Schema({
    specId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    specName: { 
        type: String, 
        required: true, 
        uppercase: true, 
        trim: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Specialization', SpecializationSchema);