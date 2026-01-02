const mongoose = require("mongoose");

const shiftManagementSchema = new mongoose.Schema(
  {
    employeeID: {
      type: String,
      required: true,
    },
     employeeName:
      {
         type: String, 
        required: true 
      },
    designation: {
      type: String,
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    shifts: {
      type: Map,            // ✅ USE MAP
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

shiftManagementSchema.index({ employeeID: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("ShiftManagement", shiftManagementSchema);
