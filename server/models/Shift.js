const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema({
  shiftID: { type: String, required: true, unique: true },
  shiftName: { type: String, required: true, unique: true },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true },
  breakDuration: { type: Number, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
});

module.exports = mongoose.model("Shift_Master", shiftSchema);
