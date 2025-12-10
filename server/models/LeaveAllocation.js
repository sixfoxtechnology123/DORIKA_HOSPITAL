import mongoose from "mongoose";

const leaveAllocationSchema = new mongoose.Schema(
  {
    employeeID: {
      type: String,
      required: true, // make it required since we fetch employee by ID
    },
    leaveType: {
      type: String,
      required: true,
    },
    employee: {
      type: String,
      required: true,
    },
    maxLeave: {
      type: Number,
      required: true,
    },
    openingBalance: {
      type: Number,
      required: true,
    },
    leaveInHand: {
      type: Number,
      required: true,
    },
    monthYear: {
      type: String, // format: "2025-01"
      required: true,
    },
  },
  { timestamps: true }
);

const LeaveAllocation = mongoose.model("LeaveAllocation", leaveAllocationSchema);
export default LeaveAllocation;
