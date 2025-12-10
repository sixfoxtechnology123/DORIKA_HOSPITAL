// models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  locationID: { type: String, required: true, unique: true }, // e.g. LOC01
  locationName: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: false });

module.exports = mongoose.model('Location_Master', locationSchema);
