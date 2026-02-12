const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  employeeUserId: { type: String, required: true, index: true }, // Indexing makes searching fast
  name: { type: String, required: true },
  action: { type: String, required: true }, // e.g., "ADD", "UPDATE", "DELETE"
  module: { type: String, required: true }, // e.g., "Department", "Employee", "Admin"
  details: { type: String, required: true }, // e.g., "Updated department name from HR to Human Resources"
  ipAddress: { type: String }
}, { 
  timestamps: true // Automatically adds precise createdAt and updatedAt
});

module.exports = mongoose.model("Activity", activitySchema);