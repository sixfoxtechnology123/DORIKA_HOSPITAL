const mongoose = require('mongoose');

const UserManagementSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Manual User ID
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Receptionist' },
    status: { type: String, default: 'Active' },
    permissions: [{ type: String }] // Stores paths like '/GRN', '/Stock'
}, { timestamps: true });

module.exports = mongoose.model('UserManagement', UserManagementSchema);