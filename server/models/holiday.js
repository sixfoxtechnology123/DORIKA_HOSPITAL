const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  holidayID: { type: String, required: true, unique: true },
  holidayName: { type: String, required: true },
  holidayDate: { type: String, required: true },
  location: { type: String, default: "All" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
});

module.exports =   mongoose.models.Holiday_Master || mongoose.model("Holiday_Master", holidaySchema);
