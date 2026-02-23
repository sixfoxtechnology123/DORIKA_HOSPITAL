const mongoose = require("mongoose");

const DepartmentHeadSchema = new mongoose.Schema(
  {
    departmentHeadId: { type: String, required: true, unique: true, index: true },
    employeeUserId: { type: String, required: true, index: true },
    employeeID: { type: String, required: true, index: true },
    employeeName: { type: String, default: "" },
    departmentHeadName: { type: String, default: "" },
    departmentID: { type: String, default: "" },
    departmentName: { type: String, required: true },
    designationData: {
      type: [
        {
          id: { type: String, default: "" },
          name: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DepartmentHead", DepartmentHeadSchema);
