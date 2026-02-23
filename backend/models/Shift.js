const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema({
  shiftID: { type: String, required: true, unique: true },
  shiftName: { type: String, required: true, unique: true },
  shiftCode: { type: String, required: true },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true },
  breakDuration: { type: Number },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
});

module.exports = mongoose.model("Shift_Master", shiftSchema);
