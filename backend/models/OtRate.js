const mongoose = require("mongoose");

const otRateSchema = new mongoose.Schema(
  {
    employeeId: String,
    employeeUserId: String,
    employeeName: String,

    departmentName: String,
    designationName: String,

    rateType: {
      type: String,
      enum: ["EMPLOYEE", "DESIGNATION", "DEPARTMENT"],
      required: true,
    },

    otRatePerHour: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

otRateSchema.index(
  { employeeUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { rateType: "EMPLOYEE" },
  }
);

module.exports = mongoose.model("OtRate", otRateSchema);